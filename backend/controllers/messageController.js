
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const getConversations = async (req, res) => {
  try {
    const userId = req.userId;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "username displayName profilePicture")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username displayName",
        },
      })
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    return res.status(200).json({
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({
      message: "Failed to fetch conversations.",
    });
  }
};

const createConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { recipientId } = req.body;

    if (!recipientId || !isValidObjectId(recipientId)) {
      return res.status(400).json({
        message: "A valid recipientId is required.",
      });
    }

    if (recipientId === userId.toString()) {
      return res.status(400).json({
        message: "You cannot start a conversation with yourself.",
      });
    }

    const recipient = await User.findById(recipientId).select(
      "_id username displayName profilePicture"
    );

    if (!recipient) {
      return res.status(404).json({
        message: "Recipient not found.",
      });
    }

    let conversation = await Conversation.findOne({
      participants: {
        $all: [userId, recipientId],
        $size: 2,
      },
    })
      .populate("participants", "username displayName profilePicture")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username displayName",
        },
      });

    if (conversation) {
      return res.status(200).json({
        message: "Conversation already exists.",
        conversation,
      });
    }

    conversation = await Conversation.create({
      participants: [userId, recipientId],
    });

    conversation = await Conversation.findById(conversation._id)
      .populate("participants", "username displayName profilePicture")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username displayName",
        },
      });

    return res.status(201).json({
      message: "Conversation created successfully.",
      conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    return res.status(500).json({
      message: "Failed to create conversation.",
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({
        message: "Invalid conversation ID.",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found.",
      });
    }

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "username displayName profilePicture")
      .sort({ createdAt: -1 })
      .limit(100);

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        readBy: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
      }
    );

    return res.status(200).json({
      count: messages.length,
      messages: messages.reverse(),
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({
      message: "Failed to fetch messages.",
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;
    const text =
      typeof req.body.text === "string" ? req.body.text.trim() : "";

    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({
        message: "Invalid conversation ID.",
      });
    }

    if (!text) {
      return res.status(400).json({
        message: "Message text is required.",
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({
        message: "Messages cannot exceed 2000 characters.",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found.",
      });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      text,
      readBy: [userId],
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "username displayName profilePicture"
    );

    return res.status(201).json({
      message: "Message sent successfully.",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({
      message: "Failed to send message.",
    });
  }
};

module.exports = {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
};

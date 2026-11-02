
const mongoose = require("mongoose");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

const createPost = async (req, res) => {
  try {
    const { imageUrl, caption } = req.body;

    if (
      typeof imageUrl !== "string" ||
      !imageUrl.trim()
    ) {
      return res.status(400).json({
        message: "A valid image URL is required.",
      });
    }

    if (
      caption !== undefined &&
      typeof caption !== "string"
    ) {
      return res.status(400).json({
        message: "Caption must be a string.",
      });
    }

    const trimmedImageUrl = imageUrl.trim();
    const trimmedCaption =
      caption === undefined ? "" : caption.trim();

    if (trimmedImageUrl.length > 2048) {
      return res.status(400).json({
        message: "Image URL cannot exceed 2048 characters.",
      });
    }

    if (trimmedCaption.length > 500) {
      return res.status(400).json({
        message: "Caption cannot exceed 500 characters.",
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(trimmedImageUrl);
    } catch {
      return res.status(400).json({
        message: "Please provide a valid image URL.",
      });
    }

    if (
      !["http:", "https:"].includes(parsedUrl.protocol)
    ) {
      return res.status(400).json({
        message: "Image URL must use HTTP or HTTPS.",
      });
    }

    const post = await Post.create({
      createdBy: req.userId,
      imageUrl: trimmedImageUrl,
      caption: trimmedCaption,
    });

    return res.status(201).json({
      message: "Post created successfully.",
      post: {
        id: post._id,
        createdBy: post.createdBy,
        imageUrl: post.imageUrl,
        caption: post.caption,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  } catch (error) {
    console.error("Create post error:", error.message);

    return res.status(500).json({
      message: "An unexpected error occurred while creating the post.",
    });
  }
};

const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    const post = await Post.findById(id).populate(
      "createdBy",
      "username displayName profilePicture"
    );

    if (!post) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    return res.status(200).json({
      post: {
        id: post._id,
        createdBy: post.createdBy,
        imageUrl: post.imageUrl,
        caption: post.caption,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get post error:", error.message);

    return res.status(500).json({
      message: "An unexpected error occurred while retrieving the post.",
    });
  }
};

const getFeed = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate(
        "createdBy",
        "username displayName profilePicture"
      );

    return res.status(200).json({
      count: posts.length,
      posts: posts.map((post) => ({
        id: post._id,
        createdBy: post.createdBy,
        imageUrl: post.imageUrl,
        caption: post.caption,
        likesCount: post.likes.length,
        likedByMe: post.likes.some(
          (likedUserId) =>
            likedUserId.toString() === req.userId
        ),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get feed error:", error.message);

    return res.status(500).json({
      message: "An unexpected error occurred while fetching the feed.",
    });
  }
};

const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const alreadyLiked = post.likes.some(
      (likedUserId) => likedUserId.toString() === userId
    );

    if (alreadyLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.addToSet(userId);
    }

    await post.save();

    if (
      !alreadyLiked &&
      post.createdBy.toString() !== userId
    ) {
      await Notification.create({
        recipient: post.createdBy,
        actor: userId,
        type: "like",
        post: post._id,
      });
    }

    return res.status(200).json({
      message: alreadyLiked
        ? "Post unliked successfully."
        : "Post liked successfully.",
      likesCount: post.likes.length,
      liked: !alreadyLiked,
    });
  } catch (error) {
    console.error("Toggle like error:", error.message);

    return res.status(500).json({
      message: "An unexpected error occurred while updating the like.",
    });
  }
};

const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        message: "Comment text is required.",
      });
    }

    const trimmedText = text.trim();

    if (trimmedText.length > 1000) {
      return res.status(400).json({
        message: "Comment cannot exceed 1000 characters.",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    post.comments.push({
      user: req.userId,
      text: trimmedText,
    });

    await post.save();

    if (post.createdBy.toString() !== req.userId) {
      await Notification.create({
        recipient: post.createdBy,
        actor: req.userId,
        type: "comment",
        post: post._id,
      });
    }

    await post.populate(
      "comments.user",
      "username displayName profilePicture"
    );

    const comment = post.comments[post.comments.length - 1];

    return res.status(201).json({
      message: "Comment added successfully.",
      comment: {
        id: comment._id,
        user: comment.user,
        text: comment.text,
        createdAt: comment.createdAt,
      },
    });
  } catch (error) {
    console.error("Add comment error:", error.message);

    return res.status(500).json({
      message: "An unexpected error occurred while adding the comment.",
    });
  }
};

const getComments = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    const post = await Post.findById(id).select("comments");

    if (!post) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    await post.populate(
      "comments.user",
      "username displayName profilePicture"
    );

    return res.status(200).json({
      count: post.comments.length,
      comments: post.comments.map((comment) => ({
        id: comment._id,
        user: comment.user,
        text: comment.text,
        createdAt: comment.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get comments error:", error.message);

    return res.status(500).json({
      message: "An unexpected error occurred while fetching comments.",
    });
  }
};

// Delete a post (only its owner can delete it)
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    if (post.createdBy.toString() !== req.userId) {
      return res.status(403).json({
        message: "You are not authorized to delete this post.",
      });
    }

    await post.deleteOne();

    return res.status(200).json({
      message: "Post deleted successfully.",
      postId: id,
    });
  } catch (error) {
    console.error("Delete post error:", error.message);

    return res.status(500).json({
      message: "An unexpected error occurred while deleting the post.",
    });
  }
};

module.exports = {
  createPost,
  getPostById,
  getFeed,
  toggleLike,
  addComment,
  getComments,
  deletePost,
};

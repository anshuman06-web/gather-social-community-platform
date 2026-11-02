const mongoose = require("mongoose");
const User = require("../models/User");
const Notification = require("../models/Notification");

const toggleFollow = async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const currentUserId = req.userId;

    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({
        message: "You cannot follow yourself.",
      });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const alreadyFollowing = currentUser.following.some(
      (userId) => userId.toString() === targetUserId
    );

    if (alreadyFollowing) {
      currentUser.following.pull(targetUserId);
      targetUser.followers.pull(currentUserId);
    } else {
      currentUser.following.addToSet(targetUserId);
      targetUser.followers.addToSet(currentUserId);
    }

    await Promise.all([
      currentUser.save(),
      targetUser.save(),
    ]);

    if (!alreadyFollowing) {
    await Notification.create({
    recipient: targetUserId,
    actor: currentUserId,
    type: "follow",
    });
    }

    return res.status(200).json({
      message: alreadyFollowing
        ? "User unfollowed successfully."
        : "User followed successfully.",
      following: !alreadyFollowing,
    });
  } catch (error) {
    console.error("Toggle follow error:", error.message);

    return res.status(500).json({
      message: "An unexpected error occurred while updating the follow.",
    });
  }
};

module.exports = { toggleFollow };
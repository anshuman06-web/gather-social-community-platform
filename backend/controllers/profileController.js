const User = require("../models/User");

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "username email displayName bio profilePicture followers following createdAt"
    );

    if (!user) {
      return res.status(404).json({
        message: "User profile not found.",
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        profilePicture: user.profilePicture,
        followers: user.followers,
        following: user.following,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error.message);

    return res.status(500).json({
      message: "An unexpected error occurred while fetching the profile.",
    });
  }
};


const updateMyProfile = async (req, res) => {
  try {
    const allowedFields = [
      "displayName",
      "bio",
      "profilePicture",
    ];

    const submittedFields = Object.keys(req.body);

    const hasUnexpectedField = submittedFields.some(
      (field) => !allowedFields.includes(field)
    );

    if (hasUnexpectedField) {
      return res.status(400).json({
        message: "Request contains unsupported fields.",
      });
    }

    for (const field of submittedFields) {
      if (typeof req.body[field] !== "string") {
        return res.status(400).json({
          message: `${field} must be a string.`,
        });
      }
    }

    const displayName =
      req.body.displayName === undefined
        ? undefined
        : req.body.displayName.trim();

    const bio =
      req.body.bio === undefined
        ? undefined
        : req.body.bio.trim();

    const profilePicture =
      req.body.profilePicture === undefined
        ? undefined
        : req.body.profilePicture.trim();

    if (
      displayName !== undefined &&
      displayName.length > 50
    ) {
      return res.status(400).json({
        message: "Display name cannot exceed 50 characters.",
      });
    }

    if (bio !== undefined && bio.length > 160) {
      return res.status(400).json({
        message: "Bio cannot exceed 160 characters.",
      });
    }

    if (
      profilePicture !== undefined &&
      profilePicture.length > 2048
    ) {
      return res.status(400).json({
        message: "Profile picture URL is too long.",
      });
    }

    const updates = {};

    if (displayName !== undefined) {
      updates.displayName = displayName;
    }

    if (bio !== undefined) {
      updates.bio = bio;
    }

    if (profilePicture !== undefined) {
      updates.profilePicture = profilePicture;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one profile field to update.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "username email displayName bio profilePicture followers following createdAt"
    );

    if (!user) {
      return res.status(404).json({
        message: "User profile not found.",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        profilePicture: user.profilePicture,
        followers: user.followers,
        following: user.following,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      message: "An unexpected error occurred while updating the profile.",
    });
  }
};


module.exports = { getMyProfile, updateMyProfile};

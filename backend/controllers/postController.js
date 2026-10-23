const mongoose = require("mongoose");
const Post = require("../models/Post");

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

module.exports = {createPost, getPostById};


const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    imageUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },

    caption: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    likes: [
    {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    },
    ],

    comments: [
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
],

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Post", postSchema);

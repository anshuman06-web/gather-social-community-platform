
const express = require("express");

const {
  createPost,
  getPostById,
  getFeed,
  toggleLike,
  addComment,
  getComments,
  deletePost,
} = require("../controllers/postController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createPost);
router.get("/feed", protect, getFeed);
router.patch("/:id/like", protect, toggleLike);
router.post("/:id/comments", protect, addComment);
router.get("/:id/comments", protect, getComments);
router.delete("/:id", protect, deletePost);
router.get("/:id", getPostById);

module.exports = router;

const express = require("express");

const {
  createPost,
  getPostById,
} = require("../controllers/postController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createPost);

router.get("/:id", getPostById);

module.exports = router;

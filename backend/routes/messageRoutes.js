const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
} = require("../controllers/messageController");

router.use(protect);

router.get("/conversations", getConversations);
router.post("/conversations", createConversation);

router.get("/conversations/:conversationId/messages", getMessages);
router.post("/conversations/:conversationId/messages", sendMessage);

module.exports = router;

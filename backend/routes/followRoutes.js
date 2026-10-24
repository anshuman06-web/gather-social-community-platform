const express = require("express");
const { toggleFollow } = require("../controllers/followController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.patch("/:id", protect, toggleFollow);

module.exports = router;
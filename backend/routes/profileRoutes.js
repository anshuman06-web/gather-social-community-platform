const express = require("express");
const { getMyProfile , updateMyProfile , searchUsers , getUserProfile} = require("../controllers/profileController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", protect, getMyProfile);
router.patch("/me", protect, updateMyProfile);
router.get("/search", protect, searchUsers);
router.get("/:id", protect, getUserProfile);

module.exports = router;

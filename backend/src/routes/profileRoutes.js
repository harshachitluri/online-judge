const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
    getProfile,
    updateProfile,
    deleteProfile,
    getAnalytics,
    getProgress
} = require("../controllers/profileController");

// GET    /api/profile/me        — fetch own profile + stats
// PUT    /api/profile           — update profile fields
// DELETE /api/profile           — delete account
// GET    /api/profile/analytics — detailed submission analytics
// GET    /api/profile/progress  — difficulty / topic / company progress
router.get("/me", protect, getProfile);
router.get("/analytics", protect, getAnalytics);
router.get("/progress", protect, getProgress);
router.put("/", protect, updateProfile);
router.delete("/", protect, deleteProfile);

module.exports = router;

const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { chat } = require("../controllers/aiController");

// POST /api/ai/chat — signed-in only; each call spends real Gemini quota
router.post("/chat", protect, chat);

module.exports = router;

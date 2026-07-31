const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { ai: aiLimiter } = require("../middleware/rateLimiters");
const { chat } = require("../controllers/aiController");

// POST /api/ai/chat — signed-in only; each call spends real Gemini quota
router.post("/chat", protect, aiLimiter, chat);

module.exports = router;

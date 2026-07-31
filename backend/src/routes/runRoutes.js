const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { run: runLimiter } = require("../middleware/rateLimiters");
const { run } = require("../controllers/runController");

// POST /api/run — compile + run in playground mode (auth required)
router.post("/", protect, runLimiter, run);

module.exports = router;

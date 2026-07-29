const express = require("express");
const router = express.Router();

const { getLeaderboard } = require("../controllers/leaderboardController");

// GET /api/leaderboard?limit=20 — public endpoint, no auth required
router.get("/", getLeaderboard);

module.exports = router;

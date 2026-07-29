const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { run } = require("../controllers/runController");

// POST /api/run — compile + run in playground mode (auth required)
router.post("/", protect, run);

module.exports = router;

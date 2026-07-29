const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const {
    createSubmission,
    getSubmissionById,
    getMySubmissions,
    getProblemSubmissions
} = require("../controllers/submissionController");

// Create a new submission
router.post(
    "/",
    protect,
    createSubmission
);

// Get all submissions of logged-in user
router.get(
    "/my",
    protect,
    getMySubmissions
);

// Get all submissions for a particular problem (Admin only)
router.get(
    "/problem/:problemId",
    protect,
    adminOnly,
    getProblemSubmissions
);

// Get a particular submission by ID
router.get(
    "/:id",
    protect,
    getSubmissionById
);

module.exports = router;
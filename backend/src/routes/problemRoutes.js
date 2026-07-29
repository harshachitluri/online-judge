const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const {
    createProblem,
    getProblems,
    getProblemBySlug,
    getProblemById,
    updateProblem,
    deleteProblem,
    getProblemsByTopics,
    getProblemsByCompanies
} = require("../controllers/ProblemController");

// Aggregation routes (must come before the :slug param route)
router.get("/topics", getProblemsByTopics);
router.get("/companies", getProblemsByCompanies);

// Admin lookup by id — also declared before :slug so "id" isn't read as a slug
router.get("/id/:id", protect, adminOnly, getProblemById);

// CRUD routes
router.post(
    "/",
    protect,
    adminOnly,
    createProblem
);
// optionalAuth: anonymous users see published problems only, admins see drafts too
router.get("/", optionalAuth, getProblems);
router.get("/:slug", optionalAuth, getProblemBySlug);
router.put(
    "/:id",
    protect,
    adminOnly,
    updateProblem
);
router.delete(
    "/:id",
    protect,
    adminOnly,
    deleteProblem
);

module.exports = router;

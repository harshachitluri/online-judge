const express = require("express");

const router = express.Router();

const {
    createTestCase,
    getTestCasesByProblem,
    getAdminTestCasesByProblem,
    updateTestCase,
    deleteTestCase
} = require("../controllers/testCaseController");

const protect = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

router.post(
    "/",
    protect,
    adminOnly,
    createTestCase
);
// Public: sample test cases of published problems (admins also see drafts')
router.get(
    "/problem/:problemId",
    optionalAuth,
    getTestCasesByProblem
);
router.get(
    "/admin/problem/:problemId",
    protect,
    adminOnly,
    getAdminTestCasesByProblem
);
router.put(
    "/:id",
    protect,
    adminOnly,
    updateTestCase
);
router.delete(
    "/:id",
    protect,
    adminOnly,
    deleteTestCase
);

module.exports = router;
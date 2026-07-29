const User = require("../models/User");
const Submission = require("../models/Submission");
const Problem = require("../models/Problem");

const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { cookieOptions } = require("../utils/cookieOptions");

/*
 |--------------------------------------------------------------------------
 | Profile Controller
 |--------------------------------------------------------------------------
 | GET    /api/profile/me        — fetch own profile + submission stats
 | PUT    /api/profile           — update profile fields
 | DELETE /api/profile           — delete own account
 | GET    /api/profile/analytics — detailed submission analytics
 | GET    /api/profile/progress  — solved-vs-available progress per
 |                                 difficulty, topic and company bundle
 */

const DIFFICULTY_ORDER = ["Easy", "Medium", "Hard"];

/** Percentage of `total` represented by `solved`, rounded, 0 when total is 0. */
const percent = (solved, total) =>
    total > 0 ? Math.round((solved / total) * 100) : 0;

/**
 * GET /api/profile/me
 * Returns the logged-in user's profile alongside their submission statistics.
 */
const getProfile = asyncHandler(async (req, res) => {

    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    // Run all stats queries in parallel for efficiency
    const [totalSubmissions, acceptedSubmissions, solvedProblemIds] = await Promise.all([
        Submission.countDocuments({ userId: req.user._id }),
        Submission.countDocuments({ userId: req.user._id, verdict: "Accepted" }),
        Submission.distinct("problemId", { userId: req.user._id, verdict: "Accepted" })
    ]);

    // Get difficulty breakdown of solved problems
    let difficultyBreakdown = { Easy: 0, Medium: 0, Hard: 0 };
    if (solvedProblemIds.length > 0) {
        const solvedProblems = await Problem.find(
            { _id: { $in: solvedProblemIds } },
            { difficulty: 1 }
        );
        solvedProblems.forEach((p) => {
            if (difficultyBreakdown[p.difficulty] !== undefined) {
                difficultyBreakdown[p.difficulty]++;
            }
        });
    }

    return res.status(200).json(
        new ApiResponse(200, "Profile fetched successfully.", {
            user,
            stats: {
                totalSubmissions,
                acceptedSubmissions,
                problemsSolved: solvedProblemIds.length,
                acceptanceRate: totalSubmissions > 0
                    ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
                    : 0,
                difficultyBreakdown
            }
        })
    );

});

/**
 * PUT /api/profile
 * Update the logged-in user's profile fields.
 */
const updateProfile = asyncHandler(async (req, res) => {

    const {
        username, email, bio, location,
        githubUrl, linkedinUrl, college, preferredLanguage
    } = req.body;

    const updates = {};

    // String() guards against non-string JSON values (numbers, objects, null),
    // which used to throw "x.trim is not a function" and surface as a 500.
    const clean = (value) => String(value ?? "").trim();

    // Basic fields
    if (username !== undefined) {
        const trimmed = clean(username);

        if (!trimmed) {
            throw new ApiError(400, "Username cannot be empty.");
        }

        updates.username = trimmed;
    }

    if (bio !== undefined) updates.bio = clean(bio);
    if (location !== undefined) updates.location = clean(location);
    if (githubUrl !== undefined) updates.githubUrl = clean(githubUrl);
    if (linkedinUrl !== undefined) updates.linkedinUrl = clean(linkedinUrl);
    if (college !== undefined) updates.college = clean(college);
    if (preferredLanguage) updates.preferredLanguage = preferredLanguage;

    // Email uniqueness check
    if (email !== undefined) {
        // Emails are stored lower-cased; compare in the same space or the
        // duplicate check silently misses "USER@x.com" vs "user@x.com".
        const normalizedEmail = clean(email).toLowerCase();

        if (!normalizedEmail) {
            throw new ApiError(400, "Email cannot be empty.");
        }

        const emailInUse = await User.findOne({
            email: normalizedEmail,
            _id: { $ne: req.user._id }
        });

        if (emailInUse) {
            throw new ApiError(409, "Email is already in use by another account.");
        }

        updates.email = normalizedEmail;
    }

    if (Object.keys(updates).length === 0) {
        throw new ApiError(400, "At least one field is required to update.");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(200, "Profile updated successfully.", updatedUser)
    );

});

/**
 * DELETE /api/profile
 * Permanently delete the logged-in user's account.
 */
const deleteProfile = asyncHandler(async (req, res) => {

    await User.findByIdAndDelete(req.user._id);

    // The session cookie would otherwise survive and point at a deleted user
    res.clearCookie("token", cookieOptions());

    return res.status(200).json(
        new ApiResponse(200, "Account deleted successfully.")
    );

});

/**
 * GET /api/profile/analytics
 * Returns detailed submission analytics for the logged-in user.
 */
const getAnalytics = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    // Run all aggregations in parallel
    const [
        verdictDistribution,
        languageDistribution,
        recentSubmissions,
        totalSubmissions,
        solvedProblemIds
    ] = await Promise.all([
        // Verdict distribution
        Submission.aggregate([
            { $match: { userId } },
            { $group: { _id: "$verdict", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),

        // Language distribution
        Submission.aggregate([
            { $match: { userId } },
            { $group: { _id: "$language", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),

        // Last 20 submissions for timeline
        Submission.find({ userId })
            .select("problemId verdict language executionTime createdAt")
            .populate("problemId", "title difficulty slug")
            .sort({ createdAt: -1 })
            .limit(20),

        Submission.countDocuments({ userId }),

        Submission.distinct("problemId", { userId, verdict: "Accepted" })
    ]);

    // Difficulty breakdown of solved problems
    let difficultyBreakdown = { Easy: 0, Medium: 0, Hard: 0 };
    if (solvedProblemIds.length > 0) {
        const solvedProblems = await Problem.find(
            { _id: { $in: solvedProblemIds } },
            { difficulty: 1 }
        );
        solvedProblems.forEach((p) => {
            if (difficultyBreakdown[p.difficulty] !== undefined) {
                difficultyBreakdown[p.difficulty]++;
            }
        });
    }

    // Submission activity by date (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const activityData = await Submission.aggregate([
        {
            $match: {
                userId,
                createdAt: { $gte: ninetyDaysAgo }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return res.status(200).json(
        new ApiResponse(200, "Analytics fetched successfully.", {
            totalSubmissions,
            problemsSolved: solvedProblemIds.length,
            difficultyBreakdown,
            verdictDistribution: verdictDistribution.map((v) => ({
                verdict: v._id,
                count: v.count
            })),
            languageDistribution: languageDistribution.map((l) => ({
                language: l._id,
                count: l.count
            })),
            recentSubmissions,
            activityData: activityData.map((a) => ({
                date: a._id,
                count: a.count
            }))
        })
    );

});

/**
 * GET /api/profile/progress
 *
 * Progress tracker: how much of the published catalogue the user has solved,
 * broken down by difficulty, curriculum topic and company bundle.
 *
 * Everything is measured against *published* problems only, so the
 * denominators match what the user can actually see and attempt.
 */
const getProgress = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    const solvedIds = await Submission.distinct("problemId", {
        userId,
        verdict: "Accepted"
    });

    // Marks each problem as solved (1) or not (0) so the $group stages below
    // can simply sum it up.
    const withSolvedFlag = [
        { $match: { isPublished: true } },
        {
            $addFields: {
                isSolved: { $cond: [{ $in: ["$_id", solvedIds] }, 1, 0] }
            }
        }
    ];

    const [byDifficultyRaw, byTopicRaw, byCompanyRaw, totals] = await Promise.all([

        Problem.aggregate([
            ...withSolvedFlag,
            {
                $group: {
                    _id: "$difficulty",
                    total: { $sum: 1 },
                    solved: { $sum: "$isSolved" }
                }
            }
        ]),

        Problem.aggregate([
            ...withSolvedFlag,
            { $match: { topicCategory: { $nin: ["", null] } } },
            {
                $group: {
                    _id: "$topicCategory",
                    total: { $sum: 1 },
                    solved: { $sum: "$isSolved" }
                }
            },
            { $sort: { _id: 1 } }
        ]),

        Problem.aggregate([
            ...withSolvedFlag,
            { $match: { company: { $exists: true, $ne: [] } } },
            { $unwind: "$company" },
            {
                $group: {
                    _id: "$company",
                    total: { $sum: 1 },
                    solved: { $sum: "$isSolved" }
                }
            },
            { $sort: { total: -1, _id: 1 } }
        ]),

        Problem.aggregate([
            ...withSolvedFlag,
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    solved: { $sum: "$isSolved" }
                }
            }
        ])

    ]);

    const overall = totals[0] || { total: 0, solved: 0 };

    // Keep the canonical Easy → Medium → Hard order and include difficulties
    // that have no problems yet, so the UI layout stays stable.
    const byDifficulty = DIFFICULTY_ORDER.map((difficulty) => {
        const row = byDifficultyRaw.find((d) => d._id === difficulty);
        const solved = row?.solved || 0;
        const total = row?.total || 0;

        return { difficulty, solved, total, percentage: percent(solved, total) };
    });

    const shape = (key) => (row) => ({
        [key]: row._id,
        solved: row.solved,
        total: row.total,
        percentage: percent(row.solved, row.total),
        completed: row.total > 0 && row.solved === row.total
    });

    return res.status(200).json(
        new ApiResponse(200, "Progress fetched successfully.", {
            overall: {
                solved: overall.solved,
                total: overall.total,
                percentage: percent(overall.solved, overall.total)
            },
            byDifficulty,
            topics: byTopicRaw.map(shape("topic")),
            companies: byCompanyRaw.map(shape("company"))
        })
    );

});

module.exports = { getProfile, updateProfile, deleteProfile, getAnalytics, getProgress };

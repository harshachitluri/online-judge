const Submission = require("../models/Submission");

const asyncHandler = require("../middleware/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");

/*
 |--------------------------------------------------------------------------
 | Leaderboard Controller
 |--------------------------------------------------------------------------
 | GET /api/leaderboard?limit=20
 |
 | Returns top users ranked by:
 |   1. Unique problems solved (distinct problemIds with verdict=Accepted)
 |   2. Total accepted submissions (tiebreaker)
 */

const getLeaderboard = asyncHandler(async (req, res) => {

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const leaderboard = await Submission.aggregate([

        // Step 1: Only consider accepted submissions
        {
            $match: { verdict: "Accepted" }
        },

        // Step 2: Group by userId
        //   - acceptedCount: total accepted submissions
        //   - solvedProblems: set of distinct problemIds solved
        {
            $group: {
                _id: "$userId",
                acceptedCount: { $sum: 1 },
                solvedProblems: { $addToSet: "$problemId" }
            }
        },

        // Step 3: Compute unique problems solved count
        {
            $addFields: {
                solvedCount: { $size: "$solvedProblems" }
            }
        },

        // Step 4: Rank — most problems solved first, then most accepted
        {
            $sort: { solvedCount: -1, acceptedCount: -1 }
        },

        { $limit: limit },

        // Step 5: Join user info from the users collection
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user"
            }
        },
        { $unwind: "$user" },

        // Step 6: Project final shape (exclude sensitive fields)
        {
            $project: {
                solvedProblems: 0,       // don't leak the problem IDs
                "user.password": 0,
                "user.__v": 0
            }
        }

    ]);
    

    // Attach sequential rank (1-based)
    const ranked = leaderboard.map((entry, index) => ({
        rank: index + 1,
        userId: entry._id,
        username: entry.user.username,
        joinedAt: entry.user.createdAt,
        solvedCount: entry.solvedCount,
        acceptedCount: entry.acceptedCount
    }));

    return res.status(200).json(
        new ApiResponse(200, "Leaderboard fetched successfully.", ranked)
    );

});

module.exports = { getLeaderboard };

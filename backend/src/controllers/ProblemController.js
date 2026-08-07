const Problem = require("../models/Problem");
const TestCase = require("../models/TestCase");
const slugify = require("slugify");

const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const ApiFeatures = require("../utils/ApiFeatures");
const { getPaginationMeta } = require("../utils/pagination");
const asyncHandler = require("../middleware/asyncHandler");

// Routes that expose problems use `optionalAuth`, so req.user may be null.
const isAdmin = (req) => req.user?.role === "admin";

const createProblem = asyncHandler(async (req, res) => {

    const {
        title,
        description,
        difficulty,
        constraints,
        tags,
        examples,
        starterCode,
        supportedLanguages,
        functionName,
        timeLimit,
        memoryLimit,
        isPublished,
        company,
        topicCategory
    } = req.body;

    // Naming the missing fields, rather than just "something is missing" —
    // functionName in particular is easy to omit from an API call, and a
    // generic message sends the caller hunting through the whole payload.
    const missing = Object.entries({
        title,
        description,
        difficulty,
        functionName
    })
        .filter(([, value]) => !value)
        .map(([field]) => field);

    if (missing.length > 0) {
        throw new ApiError(
            400,
            `Required field${missing.length === 1 ? "" : "s"} missing: ${missing.join(", ")}.`
        );
    }

    const slug = slugify(title, {
        lower: true,
        strict: true,
        trim: true
    });

    const existingProblem = await Problem.findOne({
        slug
    });

    if (existingProblem) {
        throw new ApiError(
            409,
            "Problem already exists."
        );
    }

    const problem = new Problem({
        title,
        slug,
        description,
        difficulty,
        constraints,
        tags,
        examples,
        starterCode,
        supportedLanguages,
        functionName,
        timeLimit,
        memoryLimit,
        createdBy: req.user._id,
        isPublished,
        company: company || [],
        topicCategory: topicCategory || ""
    });

    await problem.save();

    return res.status(201).json(
        new ApiResponse(
            201,
            "Problem created successfully.",
            problem
        )
    );
});

const getProblems = asyncHandler(async (req, res) => {

    const features = new ApiFeatures(req.query)
        .filter()
        .search()
        .sort()
        .paginate();

    const filterObj = { ...features.filterObject };

    // Drafts must never reach non-admins. Admins keep the ability to filter
    // explicitly (?isPublished=false) so the admin dashboard can list drafts.
    if (!isAdmin(req)) {
        filterObj.isPublished = true;
    }

    // Sorting by { $meta: "textScore" } requires the score to be projected —
    // MongoDB rejects the sort otherwise.
    const query = Problem.find(filterObj);

    if (features.isTextSearch) {
        query.select({ score: { $meta: "textScore" } });
    }

    const [problems, totalProblems] = await Promise.all([
        query
            .sort(features.sortObject)
            .skip(features.skip)
            .limit(features.limit),
        Problem.countDocuments(filterObj)
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            "Problems fetched successfully.",
            {
                problems,
                totalProblems,
                ...getPaginationMeta(features.page, features.limit, totalProblems)
            }
        )
    );

});

const getProblemBySlug = asyncHandler(async (req, res) => {

    const { slug } = req.params;

    const problem = await Problem.findOne({
        slug: String(slug).toLowerCase()
    });

    // Unpublished problems are invisible to everyone but admins — 404 rather
    // than 403 so drafts can't be enumerated by slug.
    if (!problem || (!problem.isPublished && !isAdmin(req))) {
        throw new ApiError(
            404,
            "Problem not found."
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            "Problem fetched successfully.",
            problem
        )
    );

});

/**
 * GET /api/problems/id/:id  (admin only)
 * The admin editor addresses problems by _id. It used to page through
 * /api/problems and search the result client-side, which silently broke
 * once there were more problems than one page.
 */
const getProblemById = asyncHandler(async (req, res) => {

    const problem = await Problem.findById(req.params.id);

    if (!problem) {
        throw new ApiError(404, "Problem not found.");
    }

    return res.status(200).json(
        new ApiResponse(200, "Problem fetched successfully.", problem)
    );

});

const updateProblem = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const problem = await Problem.findById(id);

    if (!problem) {
        throw new ApiError(404, "Problem not found.");
    }

    const allowedFields = [
        "title",
        "description",
        "difficulty",
        "constraints",
        "tags",
        "examples",
        "starterCode",
        "supportedLanguages",
        "functionName",
        "timeLimit",
        "memoryLimit",
        "isPublished",
        "company",
        "topicCategory"
    ];

    let isUpdated = false;
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            problem[field] = req.body[field];
            isUpdated = true;
        }
    });

    if (!isUpdated) {
        throw new ApiError(400, "No valid fields provided for update.");
    }

    if (req.body.title) {
        problem.slug = slugify(req.body.title, {
            lower: true,
            strict: true
        });
    }

    await problem.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            "Problem updated successfully.",
            problem
        )
    );

});

const deleteProblem = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const problem = await Problem.findById(id);

    if (!problem) {
        throw new ApiError(
            404,
            "Problem not found."
        );
    }

    await problem.deleteOne();

    // Cascade: orphaned test cases would otherwise linger forever
    await TestCase.deleteMany({ problemId: problem._id });

    return res.status(200).json(
        new ApiResponse(
            200,
            "Problem deleted successfully."
        )
    );

});

/**
 * GET /api/problems/topics
 * Returns problems grouped by topicCategory for curriculum display.
 */
const getProblemsByTopics = asyncHandler(async (req, res) => {

    const topics = await Problem.aggregate([
        {
            $match: {
                isPublished: true,
                topicCategory: { $ne: "" }
            }
        },
        {
            $group: {
                _id: "$topicCategory",
                problems: {
                    $push: {
                        _id: "$_id",
                        title: "$title",
                        slug: "$slug",
                        difficulty: "$difficulty",
                        tags: "$tags",
                        acceptedCount: "$acceptedCount",
                        submissionCount: "$submissionCount"
                    }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return res.status(200).json(
        new ApiResponse(200, "Problems by topics fetched successfully.", topics)
    );

});

/**
 * GET /api/problems/companies
 * Returns problems grouped by company for company bundles display.
 */
const getProblemsByCompanies = asyncHandler(async (req, res) => {

    const companies = await Problem.aggregate([
        {
            $match: {
                isPublished: true,
                company: { $exists: true, $ne: [] }
            }
        },
        { $unwind: "$company" },
        {
            $group: {
                _id: "$company",
                problems: {
                    $push: {
                        _id: "$_id",
                        title: "$title",
                        slug: "$slug",
                        difficulty: "$difficulty",
                        tags: "$tags",
                        topicCategory: "$topicCategory"
                    }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    return res.status(200).json(
        new ApiResponse(200, "Problems by companies fetched successfully.", companies)
    );

});

module.exports = {
    createProblem,
    getProblems,
    getProblemBySlug,
    getProblemById,
    updateProblem,
    deleteProblem,
    getProblemsByTopics,
    getProblemsByCompanies
};
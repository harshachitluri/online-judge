const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const TestCase = require("../models/TestCase");

const asyncHandler = require("../middleware/asyncHandler");

const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { SUPPORTED_LANGUAGES } = require("../config/languages");
const { getPagination, getPaginationMeta } = require("../utils/pagination");

const createSubmission = asyncHandler(async (req, res) => {

    let { problemId, language, sourceCode } = req.body;
    
    if (typeof sourceCode !== "string") sourceCode = String(sourceCode);

    // Validate required fields
    if (!problemId || !language || !sourceCode) {
        throw new ApiError(
            400,
            "Problem ID, language and source code are required."
        );
    }

    // Check if problem exists
    const problem = await Problem.findById(problemId);

    if (!problem) {
        throw new ApiError(404, "Problem not found.");
    }

    // Draft problems can't be submitted to by regular users
    if (!problem.isPublished && req.user.role !== "admin") {
        throw new ApiError(404, "Problem not found.");
    }

    // The judge can only execute languages the runner image supports
    if (!SUPPORTED_LANGUAGES.includes(language)) {
        throw new ApiError(
            400,
            `Language '${language}' is not supported. Supported: ${SUPPORTED_LANGUAGES.join(", ")}.`
        );
    }

    // Check supported language
    if (!problem.supportedLanguages.includes(language)) {
        throw new ApiError(
            400,
            "Language is not supported for this problem."
        );
    }

    // Count active test cases
    const totalTestCases = await TestCase.countDocuments({
        problemId,
        isActive: true
    });

    if (totalTestCases === 0) {
        throw new ApiError(
            409,
            "This problem has no test cases yet and cannot be judged."
        );
    }

    // Create submission
    const submission = await Submission.create({
        userId: req.user._id,
        problemId,
        language,
        sourceCode,
        totalTestCases
        // status and verdict are automatically assigned by schema defaults
    });

    // Acceptance-rate statistics — the counter was never incremented, so every
    // problem showed 0% acceptance on the problems list.
    await Problem.updateOne(
        { _id: problem._id },
        { $inc: { submissionCount: 1 } }
    );

    return res.status(201).json(
        new ApiResponse(201, "Submission created successfully.", submission)
    );

});

const getSubmissionById = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const submission = await Submission.findById(id)
        .populate("problemId", "title difficulty slug")
        .populate("userId", "username email");

    if (!submission) {
        throw new ApiError(404, "Submission not found.");
    }

    // User can only view their own submission; admins can view any
    // userId may populate to null if the author's account was deleted
    if (
        submission.userId?._id?.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
    ) {
        throw new ApiError(
            403,
            "You are not authorized to view this submission."
        );
    }

    return res.status(200).json(
        new ApiResponse(200, "Submission fetched successfully.", submission)
    );

});

const getMySubmissions = asyncHandler(async (req, res) => {

    const { page, limit, skip } = getPagination(req.query, { maxLimit: 50 });

    const filter = { userId: req.user._id };

    const [submissions, total] = await Promise.all([
        Submission.find(filter)
            // Include problemId so that .populate() below can resolve it
            .select("problemId language status verdict executionTime memoryUsed createdAt")
            .populate("problemId", "title difficulty slug")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Submission.countDocuments(filter)
    ]);

    return res.status(200).json(
        new ApiResponse(200, "Submissions fetched successfully.", {
            submissions,
            totalSubmissions: total,
            ...getPaginationMeta(page, limit, total)
        })
    );

});

const getProblemSubmissions = asyncHandler(async (req, res) => {

    const { problemId } = req.params;

    const problem = await Problem.findById(problemId);

    if (!problem) {
        throw new ApiError(404, "Problem not found.");
    }

    const { page, limit, skip } = getPagination(req.query, { maxLimit: 50 });

    const filter = { problemId };

    const [submissions, total] = await Promise.all([
        Submission.find(filter)
            .select("problemId userId language status verdict executionTime memoryUsed createdAt")
            .populate("userId", "username email")
            .populate("problemId", "title difficulty slug")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Submission.countDocuments(filter)
    ]);

    return res.status(200).json(
        new ApiResponse(200, "Problem submissions fetched successfully.", {
            submissions,
            totalSubmissions: total,
            ...getPaginationMeta(page, limit, total)
        })
    );

});

module.exports = {
    createSubmission,
    getSubmissionById,
    getMySubmissions,
    getProblemSubmissions
};
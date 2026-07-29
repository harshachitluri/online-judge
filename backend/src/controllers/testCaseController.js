const TestCase = require("../models/TestCase");
const Problem = require("../models/Problem");

const asyncHandler = require("../middleware/asyncHandler");

const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const createTestCase = asyncHandler(async (req, res) => {

    const {
        problemId,
        input,
        expectedOutput,
        isSample,
        explanation,
        order,
        weight
    } = req.body;

    // Note: an empty input is legitimate (programs that read nothing),
    // so only `undefined`/`null` count as missing.
    if (!problemId || input === undefined || input === null || !expectedOutput) {
        throw new ApiError(
            400,
            "Problem ID, input and expected output are required."
        );
    }

    const problem = await Problem.findById(problemId);

    if (!problem) {
        throw new ApiError(
            404,
            "Problem not found."
        );
    }

    // `order` is required by the schema. Rather than failing with a raw
    // validation error, default it to the next free slot for this problem.
    let resolvedOrder = Number(order);

    if (!Number.isFinite(resolvedOrder)) {
        const existingCount = await TestCase.countDocuments({ problemId });
        resolvedOrder = existingCount + 1;
    }

    const testCase = await TestCase.create({

        problemId,
        input: String(input),
        expectedOutput: String(expectedOutput),
        isSample,
        explanation,
        order: resolvedOrder,
        weight

    });

    return res.status(201).json(

        new ApiResponse(

            201,
            "Test case created successfully.",
            testCase

        )

    );

});
const getTestCasesByProblem = asyncHandler(async (req, res) => {

    const { problemId } = req.params;

    const problem = await Problem.findById(problemId);

    // Sample test cases of a draft problem must stay hidden too
    if (!problem || (!problem.isPublished && req.user?.role !== "admin")) {

        throw new ApiError(
            404,
            "Problem not found."
        );

    }

    const testCases = await TestCase.find({

        problemId,
        isActive: true,
        isSample: true

    }).populate(
        "problemId",
        "title difficulty tags"
    )
     .sort({

        order: 1

    });

    return res.status(200).json(

        new ApiResponse(

            200,
            "Test cases fetched successfully.",
            testCases

        )

    );

});
const getAdminTestCasesByProblem = asyncHandler(async (req, res) => {

    const { problemId } = req.params;

    const problem = await Problem.findById(problemId);

    if (!problem) {
        throw new ApiError(404, "Problem not found.");
    }

    const testCases = await TestCase.find({
        problemId
    }).populate(
        "problemId",
        "title difficulty tags"
    ).sort({
        order: 1
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            "Admin test cases fetched successfully.",
            testCases
        )
    );

});
const updateTestCase = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const testCase = await TestCase.findById(id);

    if (!testCase) {
        throw new ApiError(404, "Test case not found.");
    }

    const allowedFields = [
        "input",
        "expectedOutput",
        "isSample",
        "explanation",
        "order",
        "weight",
        "isActive"
    ];

    let isUpdated = false;

    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            testCase[field] = req.body[field];
            isUpdated = true;
        }
    });

    if (!isUpdated) {
        throw new ApiError(
            400,
            "No valid fields provided for update."
        );
    }

    await testCase.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            "Test case updated successfully.",
            testCase
        )
    );

});
const deleteTestCase = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const testCase = await TestCase.findById(id);

    if (!testCase) {

        throw new ApiError(
            404,
            "Test case not found."
        );

    }

    await testCase.deleteOne();

    return res.status(200).json(

        new ApiResponse(
            200,
            "Test case deleted successfully."
        )

    );

});
module.exports = {
    createTestCase,
    getTestCasesByProblem,
    getAdminTestCasesByProblem,
    updateTestCase,
    deleteTestCase
};
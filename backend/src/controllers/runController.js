const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const { compileCode, runCode, cleanupJob } = require("../services/compilerService");
const { SUPPORTED_LANGUAGES } = require("../config/languages");

// Cap playground input so a huge paste can't be pushed through the sandbox
const MAX_INPUT_LENGTH = 100000;
const MAX_SOURCE_LENGTH = 100000;

/*
 |--------------------------------------------------------------------------
 | Run Controller
 |--------------------------------------------------------------------------
 | POST /api/run
 |
 | Compiles and runs user code against custom user-provided input.
 | Does NOT create a Submission or judge against stored test cases.
 | This is the "playground / run" mode — equivalent to LeetCode's Run button.
 */

const run = asyncHandler(async (req, res) => {

    let { language, sourceCode, input = "" } = req.body;

    if (typeof input !== "string") input = String(input);
    if (typeof sourceCode !== "string") sourceCode = String(sourceCode);

    if (!language || !sourceCode) {
        throw new ApiError(400, "Language and source code are required.");
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
        throw new ApiError(
            400,
            `Language '${language}' is not supported. Supported: ${SUPPORTED_LANGUAGES.join(", ")}.`
        );
    }

    if (sourceCode.length > MAX_SOURCE_LENGTH) {
        throw new ApiError(400, "Source code is too large.");
    }

    if (input.length > MAX_INPUT_LENGTH) {
        throw new ApiError(400, "Custom input is too large.");
    }

    let jobId = null;

    try {

        const { jobId: id, executablePath } = await compileCode(language, sourceCode);
        jobId = id;

        const startTime = Date.now();

        const output = await runCode(
            language,
            executablePath,
            input,
            10000 // 10s limit for playground
        );

        const executionTime = Date.now() - startTime;

        return res.status(200).json(
            new ApiResponse(200, "Code executed successfully.", {
                output,
                executionTime,
                error: false
            })
        );

    } catch (error) {

        // Return execution errors as a 200 HTTP response so the
        // frontend can display them inline in the output panel
        return res.status(200).json(
            new ApiResponse(200, "Code execution failed.", {
                output: error.message || "An unknown error occurred.",
                executionTime: 0,
                error: true,
                type: error.type || "Runtime Error"
            })
        );

    } finally {

        if (jobId) cleanupJob(jobId, language);

    }

});

module.exports = { run };

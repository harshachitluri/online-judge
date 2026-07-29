const Submission = require("../models/Submission");
const TestCase = require("../models/TestCase");
const Problem = require("../models/Problem");

const { compileCode, runCode, cleanupJob } = require("./compilerService");

/**
 * Normalise program output before comparing it to the expected output.
 * Trailing spaces and \r (Windows line endings in seeded test data) are
 * judging noise, not wrong answers.
 */
const normalizeOutput = (value = "") =>
    String(value)
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.replace(/\s+$/, ""))
        .join("\n")
        .trim();

/**
 * Mark a submission as finished and persist it.
 */
const finish = async (submission, fields) => {
    submission.status = "Completed";
    Object.assign(submission, fields);
    await submission.save();
};

const judgeService = async (submission) => {

    console.log(`Judge Service Started for ${submission._id}`);

    const testCases = await TestCase.find({
        problemId: submission.problemId,
        isActive: true
    }).sort({ order: 1 });

    console.log(`${testCases.length} Test Cases Loaded`);

    // A problem with no test cases used to pass vacuously — the loop body
    // never ran and every submission was marked Accepted without executing.
    if (testCases.length === 0) {
        await finish(submission, {
            verdict: "Runtime Error",
            errorMessage: "This problem has no active test cases configured.",
            passedTestCases: 0,
            totalTestCases: 0
        });
        return;
    }

    // Fetch the time limit from the problem (ms), add a 1s buffer for process startup
    const problem = await Problem.findById(submission.problemId).select("timeLimit");
    const timeLimit = (problem?.timeLimit || 1000) + 1000;

    let jobId = null;

    try {

        // ─── Compile ONCE ────────────────────────────────────────────────
        const compiled = await compileCode(
            submission.language,
            submission.sourceCode
        );

        jobId = compiled.jobId;
        const executablePath = compiled.executablePath;

        // ─── Run per test case ───────────────────────────────────────────
        let passed = 0;
        let maxExecutionTime = 0;

        for (const testCase of testCases) {

            const start = Date.now();

            try {

                const output = await runCode(
                    submission.language,
                    executablePath,
                    testCase.input,
                    timeLimit
                );

                maxExecutionTime = Math.max(maxExecutionTime, Date.now() - start);

                if (normalizeOutput(output) === normalizeOutput(testCase.expectedOutput)) {
                    passed++;
                } else {
                    // Fail fast on first wrong answer
                    await finish(submission, {
                        verdict: "Wrong Answer",
                        passedTestCases: passed,
                        totalTestCases: testCases.length,
                        executionTime: maxExecutionTime
                    });
                    return;
                }

            } catch (runError) {

                await finish(submission, {
                    verdict: runError.type || "Runtime Error",
                    errorMessage: runError.message || "",
                    passedTestCases: passed,
                    totalTestCases: testCases.length,
                    executionTime: maxExecutionTime
                });
                return;

            }

        }

        // ─── All test cases passed ───────────────────────────────────────
        await finish(submission, {
            verdict: "Accepted",
            passedTestCases: passed,
            totalTestCases: testCases.length,
            executionTime: maxExecutionTime
        });

        // Count each solver once, so acceptedCount stays a count of people who
        // solved the problem rather than of repeated accepted submissions.
        const previouslyAccepted = await Submission.countDocuments({
            _id: { $ne: submission._id },
            userId: submission.userId,
            problemId: submission.problemId,
            verdict: "Accepted"
        });

        if (previouslyAccepted === 0) {
            await Problem.updateOne(
                { _id: submission.problemId },
                { $inc: { acceptedCount: 1 } }
            );
        }

        console.log(`Submission ${submission._id} Accepted`);

    } catch (compileError) {

        // Compilation failed — classify it properly
        await finish(submission, {
            verdict: compileError.type || "Compilation Error",
            errorMessage: compileError.message || ""
        });

    } finally {

        // ─── Always clean up temp files ──────────────────────────────────
        if (jobId) {
            cleanupJob(jobId, submission.language);
        }

    }

};

module.exports = judgeService;

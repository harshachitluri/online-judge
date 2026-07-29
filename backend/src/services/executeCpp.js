const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

const outputDir = path.join(__dirname, "../temp/outputs");

// Create outputs folder if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Compile a C++ source file.
 * @param {string} filePath - Absolute path to the .cpp source file.
 * @returns {Promise<string>} - Resolves with the path to the compiled executable.
 */
const compileCpp = (filePath) => {

    const jobId = path.basename(filePath, ".cpp");
    const executablePath = path.join(outputDir, jobId);

    return new Promise((resolve, reject) => {

        // execFile does NOT spawn a shell — avoids shell injection
        execFile(
            "g++",
            [filePath, "-o", executablePath],
            (error, stdout, stderr) => {

                if (error) {
                    return reject({
                        type: "Compilation Error",
                        message: stderr || error.message
                    });
                }

                resolve(executablePath);

            }
        );

    });

};

/**
 * Run a compiled C++ executable with given input.
 * @param {string} executablePath - Path to the compiled binary.
 * @param {string} input - Stdin to feed the program.
 * @param {number} timeLimit - Milliseconds before TLE is declared.
 * @returns {Promise<string>} - Resolves with trimmed stdout.
 */
const runCpp = (executablePath, input = "", timeLimit = 5000) => {

    return new Promise((resolve, reject) => {

        const child = execFile(
            executablePath,
            [],
            // Enforce the time limit; kill with SIGKILL so it can't be caught
            {
                timeout: timeLimit,
                killSignal: "SIGKILL",
                maxBuffer: 10 * 1024 * 1024 // 10 MB — avoid ENOBUFS on chatty output
            },
            (error, stdout, stderr) => {

                if (error) {
                    // error.killed is true when the process was killed by timeout
                    if (error.killed || error.signal === "SIGKILL") {
                        return reject({
                            type: "Time Limit Exceeded",
                            message: "Execution exceeded the allowed time limit."
                        });
                    }

                    return reject({
                        type: "Runtime Error",
                        message: stderr || error.message
                    });
                }

                // A clean exit (code 0) is a success even when the program
                // wrote to stderr — debug prints are not runtime errors.
                resolve(stdout.trim());

            }
        );

        // A program that exits before reading its input makes this write fail
        // with EPIPE. Unhandled, that error crashes the whole Node process.
        child.stdin.on("error", () => {});

        // Feed stdin
        if (input) {
            child.stdin.write(input);
        }

        child.stdin.end();

    });

};

module.exports = { compileCpp, runCpp };
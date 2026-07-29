const { execFile } = require("child_process");
/**
 * Execute a Python source file.
 *
 * @param {string} filePath  - Absolute path to the .py file
 * @param {string} input     - Stdin to feed the script
 * @param {number} timeLimit - Milliseconds before TLE is declared
 * @returns {Promise<string>} Trimmed stdout
 */
const runPython = (filePath, input = "", timeLimit = 10000) => {

    return new Promise((resolve, reject) => {

        const child = execFile(
            "python3",
            [filePath],
            {
                timeout: timeLimit,
                killSignal: "SIGKILL",
                maxBuffer: 10 * 1024 * 1024
            },
            (error, stdout, stderr) => {

                if (error) {
                    if (error.killed || error.signal === "SIGKILL") {
                        return reject({
                            type: "Time Limit Exceeded",
                            message: "Execution exceeded the allowed time limit."
                        });
                    }

                    // Tracebacks arrive here: an uncaught exception exits non-zero
                    return reject({
                        type: "Runtime Error",
                        message: stderr || error.message
                    });
                }

                // Exit code 0 = success even if the script printed warnings
                // to stderr (DeprecationWarning, etc.).
                resolve(stdout.trim());

            }
        );

        // Guard against EPIPE when the script exits without reading stdin
        child.stdin.on("error", () => {});

        if (input) child.stdin.write(input);
        child.stdin.end();

    });

};

module.exports = { runPython };

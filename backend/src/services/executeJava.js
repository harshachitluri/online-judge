const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

/*
 |--------------------------------------------------------------------------
 | Java Execution Service
 |--------------------------------------------------------------------------
 | Java requires the filename to match the public class name.
 | We enforce the class to be named "Main" and the file "Main.java".
 | Compilation produces Main.class in the same directory.
 |
 | Flow:
 |   1. compileJava(filePath)  → resolves with classDir
 |   2. runJava(classDir, ...)  → resolves with stdout
 */

/**
 * Compile a Java source file named Main.java.
 *
 * @param {string} filePath - Absolute path to Main.java
 * @returns {Promise<string>} classDir - Directory containing Main.class
 */
const compileJava = (filePath) => {

    const classDir = path.dirname(filePath);

    return new Promise((resolve, reject) => {

        // javac outputs Main.class into the same directory as Main.java
        execFile("javac", [filePath], (error, stdout, stderr) => {

            if (error) {
                return reject({
                    type: "Compilation Error",
                    message: stderr || error.message
                });
            }

            resolve(classDir);

        });

    });

};

/**
 * Run the compiled Main class.
 *
 * @param {string} classDir - Directory that contains Main.class
 * @param {string} input    - Stdin to feed the program
 * @param {number} timeLimit - Milliseconds before TLE is declared
 * @returns {Promise<string>} Trimmed stdout
 */
const runJava = (classDir, input = "", timeLimit = 5000) => {

    return new Promise((resolve, reject) => {

        const child = execFile(
            "java",
            ["-cp", classDir, "Main"],
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

                    return reject({
                        type: "Runtime Error",
                        message: stderr || error.message
                    });
                }

                // Exit code 0 means success. stderr alone must not fail the run:
                // the JVM writes notices there (e.g. "Picked up _JAVA_OPTIONS"),
                // which used to turn every correct Java solution into a
                // Runtime Error.
                resolve(stdout.trim());

            }
        );

        // Guard against EPIPE when the program exits without reading stdin
        child.stdin.on("error", () => {});

        if (input) child.stdin.write(input);
        child.stdin.end();

    });

};

module.exports = { compileJava, runJava };

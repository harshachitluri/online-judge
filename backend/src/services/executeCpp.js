const { execFile, execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const outputDir = path.join(__dirname, "../temp/outputs");

// Headers we ship to paper over toolchain gaps — currently just the
// bits/stdc++.h that libc++ has no equivalent of. See that file for why.
const shimIncludeDir = path.join(__dirname, "../support/cpp");

// Create outputs folder if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

/*
 |--------------------------------------------------------------------------
 | Toolchain resolution
 |--------------------------------------------------------------------------
 | Resolved once, on first compile, and cached — probing the compiler on
 | every submission would add a process spawn to the hot path.
 |
 | Real GCC is preferred when it is installed, because that is what the
 | judge's runner container uses and what the problems are written against.
 | On macOS `g++` is a symlink to Apple clang, which is close enough for
 | almost everything except the GNU-only headers, so the shim covers the gap.
 */

const GCC_CANDIDATES = ["g++-15", "g++-14", "g++-13", "g++-12", "g++-11"];

// Not user input: only the fixed names above and CPP_COMPILER from the
// server's own environment ever reach here.
const canRun = (binary) => {
    try {
        execFileSync(binary, ["--version"], { stdio: "ignore", timeout: 5000 });
        return true;
    } catch {
        return false;
    }
};

let toolchain = null;

const resolveToolchain = () => {
    if (toolchain) return toolchain;

    const configured = process.env.CPP_COMPILER;
    const compiler =
        (configured && canRun(configured) && configured) ||
        GCC_CANDIDATES.find(canRun) ||
        "g++";

    /*
     | Does this compiler already know <bits/stdc++.h>? Ask it, rather than
     | inferring from the platform — "macOS means clang" stops being true the
     | moment someone runs `brew install gcc`, and a wrong guess here is a
     | compile error on every submission.
     */
    let needsShim = true;

    try {
        const probe = path.join(os.tmpdir(), `codejudge-probe-${process.pid}.cpp`);
        fs.writeFileSync(probe, "#include <bits/stdc++.h>\nint main(){return 0;}\n");

        try {
            execFileSync(compiler, ["-fsyntax-only", probe], {
                stdio: "ignore",
                timeout: 20000
            });
            needsShim = false;
        } catch {
            needsShim = true;
        } finally {
            fs.rmSync(probe, { force: true });
        }
    } catch {
        // Probe couldn't be written at all — assume the shim is wanted. A
        // redundant include path is harmless; a missing one is not.
    }

    console.log(
        `[executeCpp] C++ toolchain: ${compiler}` +
        (needsShim ? " (shimming <bits/stdc++.h>)" : " (native <bits/stdc++.h>)")
    );

    toolchain = { compiler, needsShim };
    return toolchain;
};

/**
 * Compile a C++ source file.
 * @param {string} filePath - Absolute path to the .cpp source file.
 * @returns {Promise<string>} - Resolves with the path to the compiled executable.
 */
const compileCpp = (filePath) => {

    const jobId = path.basename(filePath, ".cpp");
    const executablePath = path.join(outputDir, jobId);
    const { compiler, needsShim } = resolveToolchain();

    const args = [
        // gnu++17 rather than plain c++17: competitive code leans on GNU
        // extensions (__int128, __builtin_popcount, the pbds headers) and
        // this matches what most judges compile with.
        "-std=gnu++17",
        "-O2",
        // -isystem, not -I: warnings from inside the shim aren't the
        // submitter's problem and shouldn't clutter their compiler output.
        ...(needsShim ? ["-isystem", shimIncludeDir] : []),
        filePath,
        "-o", executablePath
    ];

    return new Promise((resolve, reject) => {

        // execFile does NOT spawn a shell — avoids shell injection
        execFile(
            compiler,
            args,
            // A pathological template can compile essentially forever. The
            // run phase has a time limit; without one here, the compile
            // phase would pin a core until the process died.
            { timeout: 20000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 },
            (error, stdout, stderr) => {

                if (error) {
                    if (error.killed || error.signal === "SIGKILL") {
                        return reject({
                            type: "Compilation Error",
                            message: "Compilation timed out after 20 seconds."
                        });
                    }

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

module.exports = { compileCpp, runCpp, resolveToolchain };
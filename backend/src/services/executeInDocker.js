const { execFile } = require("child_process");
const path = require("path");
const fs   = require("fs");

/*
 |--------------------------------------------------------------------------
 | Docker Execution Service
 |--------------------------------------------------------------------------
 | Runs untrusted user code inside an isolated Docker container.
 |
 | Security guarantees applied to EVERY container:
 |
 |   --network=none          Zero network access (no HTTP calls, no DNS)
 |   --memory=256m           Hard memory cap (OOM-killed if exceeded)
 |   --memory-swap=256m      No swap — same value as memory to disable it
 |   --cpus=0.5              Maximum 50% of one CPU core
 |   --pids-limit=50         Prevents fork bombs (max 50 processes)
 |   --read-only             Container filesystem is read-only
 |   --tmpfs /tmp:size=64m   Small writable tmp (JVM temp files, etc.)
 |   -v code:/sandbox:ro     Source code mounted as read-only
 |   --rm                    Container deleted immediately after exit
 |
 | Timeout strategy (double-guarded):
 |   1. `timeout Ns <cmd>` inside the container exits with code 124 on TLE
 |   2. Node.js execFile timeout kills the docker process if it runs long
 |
 | All functions resolve with trimmed stdout on success, or reject with:
 |   { type: "Compilation Error" | "Runtime Error" | "Time Limit Exceeded",
 |     message: string }
 */

const DOCKER_IMAGE     = process.env.DOCKER_RUNNER_IMAGE  || "codejudge-runner:latest";
const DOCKER_MEMORY    = process.env.DOCKER_MEMORY         || "256m";
const DOCKER_CPUS      = process.env.DOCKER_CPUS           || "0.5";
const DOCKER_PIDS      = Number(process.env.DOCKER_PIDS_LIMIT) || 50;

const outputDir = path.join(__dirname, "../temp/outputs");

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

/* ── Security flag builder ───────────────────────────────────────── */

/**
 * Returns common Docker security flags shared by every run invocation.
 * These flags are the primary defence against malicious code.
 */
const baseSecurityFlags = () => [
    "--rm",                            // auto-remove after exit
    "--init",                          // ensure signals are handled properly
    "--network=none",                  // no internet
    `--memory=${DOCKER_MEMORY}`,       // memory hard cap
    `--memory-swap=${DOCKER_MEMORY}`,  // disable swap
    `--cpus=${DOCKER_CPUS}`,           // CPU quota
    `--pids-limit=${DOCKER_PIDS}`,     // block fork bombs
    "--read-only",                     // immutable filesystem
    "--tmpfs", "/tmp:size=64m",        // small writable scratch space
];

/* ── Docker run helper ───────────────────────────────────────────── */

/**
 * Spawn `docker run` with the given args, feed `input` to stdin,
 * and resolve/reject based on the exit code.
 *
 * @param {string[]} dockerArgs  - All arguments after `docker run`
 * @param {string}   input       - Stdin to write to the container
 * @param {number}   nodeTimeout - ms before Node.js kills the docker process
 */
const spawnContainer = (dockerArgs, input = "", nodeTimeout = 15000) => {
    return new Promise((resolve, reject) => {

        const child = execFile(
            "docker",
            ["run", ...dockerArgs],
            {
                timeout:   nodeTimeout,
                killSignal: "SIGTERM", // Let docker gracefully stop via --init
                maxBuffer: 10 * 1024 * 1024 // 10 MB stdout buffer
            },
            (error, stdout, stderr) => {

                if (error) {
                    // Node.js killed the process (outer timeout or maxBuffer)
                    if (error.killed || error.signal === "SIGTERM") {
                        return reject({
                            type: "Time Limit Exceeded",
                            message: "Execution exceeded the allowed time limit."
                        });
                    }
                    // Exit code 124 = `timeout` inside container fired
                    if (error.code === 124) {
                        return reject({
                            type: "Time Limit Exceeded",
                            message: "Execution exceeded the allowed time limit."
                        });
                    }
                    // Any other non-zero exit = runtime error
                    return reject({
                        type: "Runtime Error",
                        message: stderr || stdout || error.message
                    });
                }

                resolve(stdout.trim());

            }
        );

        // The container can exit before reading stdin — an unhandled EPIPE
        // here would crash the Node process.
        child.stdin.on("error", () => {});

        // Write stdin and close the stream
        if (input) child.stdin.write(input);
        child.stdin.end();

    });
};

/* ── Compile-only helper (no stdin, captures stderr as error) ─────── */

/**
 * Run a compile step inside Docker.
 * Compilation errors come through stderr (non-zero exit).
 *
 * @param {string[]} dockerArgs
 */
const compileInContainer = (dockerArgs) => {
    return new Promise((resolve, reject) => {
        execFile(
            "docker",
            ["run", ...dockerArgs],
            { timeout: 30000 },
            (error, stdout, stderr) => {
                if (error) {
                    return reject({
                        type: "Compilation Error",
                        message: stderr || stdout || error.message
                    });
                }
                resolve();
            }
        );
    });
};

/*
 |==========================================================================
 | C++ — compile then run
 |==========================================================================
 */

/**
 * Compile a C++ source file inside Docker.
 * The compiled binary is written to the host's `outputDir`.
 *
 * @param {string} filePath - Host absolute path to .cpp file
 * @param {string} jobId    - Unique job identifier → binary name
 * @returns {Promise<string>} Host path to the compiled binary
 */
const compileDockerCpp = async (filePath, jobId) => {

    const absFilePath  = path.resolve(filePath);
    const absOutputDir = path.resolve(outputDir);

    // Mount: source (read-only) + output dir (writable for the binary)
    const args = [
        "--rm",
        "--network=none",
        `--memory=${DOCKER_MEMORY}`,
        `--memory-swap=${DOCKER_MEMORY}`,
        `--cpus=${DOCKER_CPUS}`,
        "-v", `${absFilePath}:/code/main.cpp:ro`,
        "-v", `${absOutputDir}:/output`,
        DOCKER_IMAGE,
        // g++ compiles to /output/{jobId}; error messages go to stderr.
        // -std=gnu++17 matches the host path in executeCpp.js — a submission
        // must not compile in development and fail in the container because
        // the two disagree about the language level.
        "sh", "-c", `g++ -std=gnu++17 /code/main.cpp -O2 -o /output/${jobId} 2>&1`
    ];

    await compileInContainer(args);

    return path.join(outputDir, jobId); // host path to binary

};

/**
 * Run a compiled C++ binary inside a sandboxed container.
 *
 * @param {string} binaryPath  - Host absolute path to the compiled binary
 * @param {string} input       - Test case stdin
 * @param {number} timeLimitMs - Time limit in milliseconds
 */
const runDockerCpp = (binaryPath, input = "", timeLimitMs = 5000) => {

    const absBinaryPath  = path.resolve(binaryPath);
    const timeLimitSecs  = Math.ceil(timeLimitMs / 1000);
    const nodeTimeout    = timeLimitMs + 5000; // buffer for Docker overhead

    const args = [
        "-i",                      // interactive mode (stdin)
        ...baseSecurityFlags(),
        "-v", `${absBinaryPath}:/sandbox/prog:ro`,
        DOCKER_IMAGE,
        // `timeout` is the first process — kills /sandbox/prog on TLE
        "timeout", `${timeLimitSecs}s`, "/sandbox/prog"
    ];

    return spawnContainer(args, input, nodeTimeout);

};

/*
 |==========================================================================
 | Java — compile then run
 |==========================================================================
 */

/**
 * Compile Main.java inside Docker.
 * javac writes Main.class into the same host directory (mounted writable).
 *
 * @param {string} javaFilePath - Host absolute path to Main.java
 * @returns {Promise<string>}   Host path to class directory
 */
const compileDockerJava = async (javaFilePath) => {

    const classDir    = path.dirname(javaFilePath);
    const absClassDir = path.resolve(classDir);

    const args = [
        "--rm",
        "--network=none",
        `--memory=${DOCKER_MEMORY}`,
        `--memory-swap=${DOCKER_MEMORY}`,
        "-v", `${absClassDir}:/code`,  // writable so javac can write .class
        DOCKER_IMAGE,
        "sh", "-c", "javac /code/Main.java 2>&1"
    ];

    await compileInContainer(args);

    return classDir; // host path; Main.class is now in this dir

};

/**
 * Run a compiled Java class inside a sandboxed container.
 *
 * Note: --read-only is kept; JVM temp files go to /tmp (tmpfs).
 *       -Xmx limits heap to stay well within the container memory cap.
 *
 * @param {string} classDir    - Host path containing Main.class
 * @param {string} input       - Test case stdin
 * @param {number} timeLimitMs - Time limit in milliseconds
 */
const runDockerJava = (classDir, input = "", timeLimitMs = 5000) => {

    const absClassDir = path.resolve(classDir);
    const timeLimitSecs = Math.ceil(timeLimitMs / 1000);
    const nodeTimeout   = timeLimitMs + 8000; // JVM startup is slower

    const args = [
        "-i",
        ...baseSecurityFlags(),
        "-v", `${absClassDir}:/sandbox:ro`,
        DOCKER_IMAGE,
        "timeout", `${timeLimitSecs}s`,
        "java",
        "-cp", "/sandbox",
        "-Xmx200m",    // heap cap well below container memory limit
        "-Xss8m",      // stack size
        "-Xshare:off", // no class data sharing (needs write access)
        "Main"
    ];

    return spawnContainer(args, input, nodeTimeout);

};

/*
 |==========================================================================
 | Python — interpreted, no compile step
 |==========================================================================
 */

/**
 * Run a Python script inside a sandboxed container.
 *
 * @param {string} filePath    - Host absolute path to .py file
 * @param {string} input       - Test case stdin
 * @param {number} timeLimitMs - Time limit in milliseconds
 */
const runDockerPython = (filePath, input = "", timeLimitMs = 10000) => {

    const absFilePath   = path.resolve(filePath);
    const timeLimitSecs = Math.ceil(timeLimitMs / 1000);
    const nodeTimeout   = timeLimitMs + 5000;

    const args = [
        "-i",
        ...baseSecurityFlags(),
        // Suppress .pyc generation (--read-only prevents writes anyway)
        "-e", "PYTHONDONTWRITEBYTECODE=1",
        "-e", "PYTHONUNBUFFERED=1",
        "-v", `${absFilePath}:/sandbox/solution.py:ro`,
        DOCKER_IMAGE,
        "timeout", `${timeLimitSecs}s`, "python3", "/sandbox/solution.py"
    ];

    return spawnContainer(args, input, nodeTimeout);

};

module.exports = {
    compileDockerCpp,
    runDockerCpp,
    compileDockerJava,
    runDockerJava,
    runDockerPython
};

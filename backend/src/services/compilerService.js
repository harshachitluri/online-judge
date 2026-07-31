const fs   = require("fs");
const path = require("path");

const generateFile = require("./generateFile");

// ── Direct (host) execution services ─────────────────────────────────
const { compileCpp, runCpp }     = require("./executeCpp");
const { compileJava, runJava }   = require("./executeJava");
const { runPython }              = require("./executePython");

// ── Docker (sandboxed) execution services ────────────────────────────
const {
    compileDockerCpp,  runDockerCpp,
    compileDockerJava, runDockerJava,
    runDockerPython
} = require("./executeInDocker");

/*
 |--------------------------------------------------------------------------
 | Compiler Service — Strategy Pattern
 |--------------------------------------------------------------------------
 | Central facade over all language execution backends.
 |
 | DOCKER_ENABLED env variable controls which backend is used:
 |
 |   DOCKER_ENABLED=true  → All code runs inside an isolated Docker container.
 |                          Required for production / any public deployment.
 |
 |   DOCKER_ENABLED=false → Code runs directly on the host machine.
 |                          Suitable only for local development.
 |                          WARNING: unsafe — no isolation from the host.
 |
 | Public API (unchanged for all callers):
 |
 |   compileCode(language, sourceCode) → { jobId, executablePath }
 |   runCode(language, executablePath, input, timeLimitMs) → stdout
 |   cleanupJob(jobId, language) → void  (best-effort)
 |
 | "executablePath" meaning per language:
 |   cpp    → absolute path to compiled binary
 |   java   → absolute path to class directory (for -cp flag)
 |   python → absolute path to .py file
 */

const USE_DOCKER = process.env.DOCKER_ENABLED === "true";

if (USE_DOCKER) {
    console.log("[compilerService] Docker mode ENABLED — code runs in sandboxed containers.");
} else {
    console.warn("[compilerService] Docker mode DISABLED — code runs directly on host (dev only).");
}

const codeDir   = path.join(__dirname, "../temp/codes");
const outputDir = path.join(__dirname, "../temp/outputs");

const extensionMap = {
    cpp: "cpp",
    python: "py",
    javascript: "js"
};

/* ── Compile ──────────────────────────────────────────────────────── */

/**
 * Compiler diagnostics quote the full path of the generated temp file, which
 * leaks the server's directory layout to every user who triggers a compile
 * error. Replace those paths with a neutral file name.
 */
const sanitizeCompilerMessage = (message = "", jobId = "") => {
    let cleaned = String(message)
        .split(path.resolve(codeDir) + path.sep).join("")
        .split(path.resolve(outputDir) + path.sep).join("")
        .split(codeDir + path.sep).join("")
        .split(outputDir + path.sep).join("");

    if (jobId) {
        cleaned = cleaned.split(jobId).join("solution");
    }

    return cleaned;
};

/**
 * Compile source code for the given language.
 * For Python (interpreted), this only writes the file — no compilation.
 *
 * Call this ONCE per submission, then call runCode() per test case.
 *
 * @param {string} language    - "cpp" | "java" | "python"
 * @param {string} sourceCode  - Raw source code string
 * @returns {Promise<{ jobId: string, executablePath: string }>}
 */
const compileCode = async (language, sourceCode) => {

    const { jobId, filePath } = generateFile(language, sourceCode);

    try {
        return await compileForLanguage(language, jobId, filePath);
    } catch (error) {
        /*
         | Clean up here, not in the caller. Both callers wrap this in
         | try/finally and clean up by jobId — but they only learn the jobId
         | from a *successful* return, so on a compile error their `jobId`
         | is still null and the finally block does nothing. Every failed
         | compilation leaked its source file (and, for Java, a whole
         | directory) permanently.
         */
        cleanupJob(jobId, language);

        throw {
            type: error.type || "Compilation Error",
            message: sanitizeCompilerMessage(error.message, jobId),
            // Exposed so a caller that wants to clean up itself can, even
            // though none needs to now.
            jobId
        };
    }

};

const compileForLanguage = async (language, jobId, filePath) => {

    switch (language) {

        case "cpp": {
            const executablePath = USE_DOCKER
                ? await compileDockerCpp(filePath, jobId)   // Docker: binary in outputDir
                : await compileCpp(filePath);               // Host: binary in outputDir
            return { jobId, executablePath };
        }

        case "java": {
            // Both Docker and host return the class directory path
            const classDir = USE_DOCKER
                ? await compileDockerJava(filePath)
                : await compileJava(filePath);
            return { jobId, executablePath: classDir };
        }

        case "python": {
            // Python is interpreted — no compilation step in either mode
            return { jobId, executablePath: filePath };
        }

        default:
            throw new Error(`Unsupported language: '${language}'.`);

    }

};

/* ── Run ──────────────────────────────────────────────────────────── */

/**
 * Execute the compiled/prepared artifact against one test case.
 *
 * @param {string} language
 * @param {string} executablePath - Value from compileCode()
 * @param {string} input          - Stdin for this test case
 * @param {number} timeLimitMs    - Milliseconds before TLE
 * @returns {Promise<string>} Trimmed stdout
 */
const runCode = async (language, executablePath, input = "", timeLimitMs = 5000) => {

    if (USE_DOCKER) {
        switch (language) {
            case "cpp":    return runDockerCpp(executablePath, input, timeLimitMs);
            case "java":   return runDockerJava(executablePath, input, timeLimitMs);
            case "python": return runDockerPython(executablePath, input, timeLimitMs);
            default:       throw new Error(`Unsupported language: '${language}'.`);
        }
    }

    // Direct host execution (dev mode)
    switch (language) {
        case "cpp":    return runCpp(executablePath, input, timeLimitMs);
        case "java":   return runJava(executablePath, input, timeLimitMs);
        case "python": return runPython(executablePath, input, timeLimitMs);
        default:       throw new Error(`Unsupported language: '${language}'.`);
    }

};

/* ── Cleanup ──────────────────────────────────────────────────────── */

/**
 * Delete all temporary files / directories created for a job.
 * Identical cleanup logic regardless of Docker or host mode.
 * Never throws — always best-effort.
 *
 * @param {string} jobId
 * @param {string} language
 */
const cleanupJob = (jobId, language) => {

    try {

        if (language === "java") {
            // Java uses a whole subdirectory (Main.java + Main.class)
            const jobDir = path.join(codeDir, jobId);
            if (fs.existsSync(jobDir)) {
                fs.rmSync(jobDir, { recursive: true, force: true });
            }

        } else {
            const ext        = extensionMap[language] || language;
            const sourceFile = path.join(codeDir, `${jobId}.${ext}`);
            const binaryFile = path.join(outputDir, jobId); // cpp binary

            for (const filePath of [sourceFile, binaryFile]) {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }

    } catch (_) {
        // Best-effort — never crash the worker on cleanup failure
    }

};

/*
 | Per-job cleanup covers the normal path, but nothing survives a hard stop:
 | a crash, a `kill -9`, or a nodemon restart mid-compile leaves the job's
 | files behind with no one left to remove them. This sweeps whatever is old
 | enough that it cannot belong to a running job.
 |
 | One hour is far beyond any job's lifetime — compilation is capped at 20
 | seconds and every run has a time limit — so this can never race a live
 | submission.
 */
const STALE_AFTER_MS = 60 * 60 * 1000;

const sweepTempArtifacts = (maxAgeMs = STALE_AFTER_MS) => {

    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;

    for (const dir of [codeDir, outputDir]) {

        let entries;

        try {
            entries = fs.readdirSync(dir);
        } catch {
            continue; // directory not created yet — nothing to sweep
        }

        for (const entry of entries) {
            const target = path.join(dir, entry);

            try {
                if (fs.statSync(target).mtimeMs > cutoff) continue;

                fs.rmSync(target, { recursive: true, force: true });
                removed += 1;
            } catch {
                // Raced with a live job, or unreadable. Best-effort by design.
            }
        }
    }

    if (removed > 0) {
        console.log(`[compilerService] Swept ${removed} stale temp artifact(s).`);
    }

    return removed;

};

module.exports = { compileCode, runCode, cleanupJob, sweepTempArtifacts };
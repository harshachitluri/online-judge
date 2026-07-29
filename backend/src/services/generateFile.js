const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

/*
 |--------------------------------------------------------------------------
 | Generate File Service
 |--------------------------------------------------------------------------
 | Creates a temporary source file for a given language.
 |
 | Java special case:
 |   Java requires the filename to match the public class name.
 |   We enforce the class name "Main", so for Java we create:
 |     temp/codes/{jobId}/Main.java
 |   (a subdirectory per job, so multiple Java jobs don't collide)
 |
 | All other languages:
 |   temp/codes/{jobId}.{ext}
 */

const codeDir = path.join(__dirname, "../temp/codes");

if (!fs.existsSync(codeDir)) {
    fs.mkdirSync(codeDir, { recursive: true });
}

const extensionMap = {
    cpp: "cpp",
    python: "py",
    javascript: "js"
    // Java is handled separately below
};

/**
 * @param {string} language - "cpp" | "java" | "python" | "javascript"
 * @param {string} code     - Source code to write
 * @returns {{ jobId: string, filePath: string }}
 */
const generateFile = (language, code) => {

    const jobId = uuid();

    if (language === "java") {
        // Create a dedicated subdirectory per job to isolate Main.java / Main.class
        const jobDir = path.join(codeDir, jobId);
        fs.mkdirSync(jobDir, { recursive: true });

        const filePath = path.join(jobDir, "Main.java");
        fs.writeFileSync(filePath, code);

        return { jobId, filePath };
    }

    const extension = extensionMap[language] || language;
    const filePath = path.join(codeDir, `${jobId}.${extension}`);
    fs.writeFileSync(filePath, code);

    return { jobId, filePath };

};

module.exports = generateFile;
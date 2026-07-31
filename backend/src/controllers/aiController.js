const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { isConfigured, generateReply } = require("../services/geminiService");

/*
 |--------------------------------------------------------------------------
 | AI Assistant controller
 |--------------------------------------------------------------------------
 | POST /api/ai/chat
 |
 | A single endpoint, mode-routed, rather than one route per feature — chat,
 | hints and review all reduce to "one message in, one reply out" with a
 | different system prompt, so splitting them into separate routes would
 | just duplicate the request/response plumbing three times.
 |
 | Every caller must be signed in (see aiRoutes) — this call costs real
 | quota against a real API key, so it isn't exposed anonymously.
 */

// Generous but bounded — a whole file pasted in is fine, a whole repository
// pasted in is a quota-draining mistake (or an abuse attempt) either way.
const MAX_CODE_LENGTH = 20000;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 12;

const MODES = ["chat", "hint", "review", "complexity"];

/*
 | The reply is rendered by a real Markdown renderer on the client (headings,
 | lists, fenced code, tables), so the formatting rules below are worth being
 | explicit about — a model left to its own devices alternates between a wall
 | of prose and a heading for every sentence, and neither reads well in a
 | chat bubble beside an editor.
 */
const FORMAT_RULES =
    `\n\nFORMAT — your reply is rendered as Markdown, so use it properly:\n` +
    `- Lead with a one- or two-sentence direct answer. No preamble, no restating the question.\n` +
    `- Then structure the detail: short \`###\` headings only when there are genuinely ` +
    `distinct sections, bullet lists for parallel points, numbered lists for ordered steps.\n` +
    `- Put every code snippet in a fenced block with its language tag ` +
    `(\`\`\`cpp, \`\`\`python, …). Never indent code as plain text.\n` +
    `- Use \`backticks\` for identifiers, function names, values and complexities like \`O(n log n)\`.\n` +
    `- NEVER use LaTeX or math markup. There is no math renderer — \`$\\mathcal{O}(N)$\` ` +
    `reaches the reader as those literal characters. Write complexity as plain \`O(n)\`, ` +
    `\`O(n log n)\`, \`O(1)\` in backticks. No \`$\`, no \`\\(\`, no \`\\mathcal\`, no \`\\frac\`, ` +
    `no \`\\times\` — write "×" or "*" directly.\n` +
    `- Use **bold** for the handful of words that carry the answer, not for whole sentences.\n` +
    `- A comparison of two or more options belongs in a small table.\n` +
    `- Keep it tight: aim for under 250 words unless the question genuinely needs more. ` +
    `No filler openers ("Great question!"), no summary of what you just said.`;

const buildSystemPrompt = ({ mode, language, problem }) => {
    const base =
        `You are the AI Assistant inside CodeJudge, an online judge for competitive ` +
        `programming. You sit next to a code editor` +
        (language ? ` currently set to ${language}` : "") +
        `, and you are talking to someone who is mid-problem and wants to move forward.\n\n` +
        `Be concrete and specific. Refer to the user's actual variables, loops and ` +
        `functions by name rather than describing code in the abstract. State complexities ` +
        `explicitly. When something is wrong, say what is wrong, why it is wrong, and what ` +
        `the fix is — in that order.\n\n` +
        `Never claim to have executed, compiled or tested the code: you can only read it. ` +
        `If the code is incomplete or the question is ambiguous, say which reading you ` +
        `assumed and answer under that assumption rather than asking and stopping. If you ` +
        `are unsure, say so plainly instead of guessing confidently.`;

    const problemContext = problem
        ? `\n\nThe user has this problem open:\nTitle: ${problem.title}\n` +
          `Difficulty: ${problem.difficulty || "unknown"}\n` +
          (problem.tags?.length ? `Tags: ${problem.tags.join(", ")}\n` : "") +
          (problem.description ? `Statement: ${String(problem.description).slice(0, 1500)}\n` : "") +
          (problem.constraints ? `Constraints: ${problem.constraints}\n` : "")
        : "";

    const modeInstructions = {
        chat:
            "\n\nTASK — answer whatever the user asks: complexity, correctness, approach, " +
            "debugging, or general concepts. If code is attached, ground the answer in that " +
            "code specifically. When you suggest a change, show the changed lines in a fenced " +
            "block rather than restating the whole program.",
        hint:
            "\n\nTASK — give exactly ONE graduated hint toward the open problem. Never the " +
            "full solution, and never working code for the core logic. Nudge toward the " +
            "technique or the key observation and stop there. If asked for 'the next hint', " +
            "go one level deeper than the previous one did. Two or three sentences, plus at " +
            "most one short illustrative snippet of something adjacent (never the answer). " +
            "Do not use headings for a hint.",
        review:
            "\n\nTASK — review the code. Structure the reply as a list of concrete findings, " +
            "most important first. Each finding: what the issue is in **bold**, then the " +
            "specific line or construct it applies to, then the fix. Cover correctness risks " +
            "and edge cases (empty input, single element, overflow, off-by-one) before style. " +
            "Finish with the current time and space complexity. If the code is genuinely " +
            "solid, say so plainly instead of inventing nitpicks.",
        complexity:
            "\n\nTASK — state the time and space complexity. Open with both on their own " +
            "line as `Time: O(...)` and `Space: O(...)`, then justify each by pointing " +
            "at the actual structure (which loop, which recursion, which container). If a " +
            "better complexity is reachable, name it and the technique that gets there, in " +
            "one sentence. Flag explicitly if any part of the estimate is uncertain."
    };

    return (
        base +
        problemContext +
        (modeInstructions[mode] || modeInstructions.chat) +
        FORMAT_RULES
    );
};

const chat = asyncHandler(async (req, res) => {

    if (!isConfigured()) {
        throw new ApiError(
            501,
            "The AI Assistant isn't configured on this server (missing GEMINI_API_KEY)."
        );
    }

    const { mode = "chat", message, code, language, problem, history } = req.body;

    if (!MODES.includes(mode)) {
        throw new ApiError(400, `Unknown mode. Expected one of: ${MODES.join(", ")}.`);
    }

    if (!message || !String(message).trim()) {
        throw new ApiError(400, "A message is required.");
    }

    if (String(message).length > MAX_MESSAGE_LENGTH) {
        throw new ApiError(400, "That message is too long.");
    }

    if (code && String(code).length > MAX_CODE_LENGTH) {
        throw new ApiError(400, "The code is too large to send to the assistant.");
    }

    const safeHistory = Array.isArray(history)
        ? history
              .slice(-MAX_HISTORY_TURNS)
              .filter((turn) => turn && (turn.role === "user" || turn.role === "model") && turn.text)
              .map((turn) => ({ role: turn.role, text: String(turn.text).slice(0, MAX_MESSAGE_LENGTH) }))
        : [];

    const systemPrompt = buildSystemPrompt({ mode, language, problem });

    // The current code, if any, rides along with the user's message rather
    // than the system prompt — it's the thing being discussed, not a rule.
    const userTurn = code
        ? `${message}\n\n\`\`\`${language || ""}\n${code}\n\`\`\``
        : message;

    let reply;

    try {
        reply = await generateReply({ systemPrompt, history: safeHistory, message: userTurn });
    } catch (error) {
        if (error.message === "GEMINI_NOT_CONFIGURED") {
            throw new ApiError(501, "The AI Assistant isn't configured on this server.");
        }
        // Logged in full server-side for diagnosis; the client only ever
        // sees a clean message, never the SDK's raw error shape.
        console.error("[aiController] Gemini call failed:", error);
        throw new ApiError(502, "The AI Assistant couldn't respond just now. Please try again.");
    }

    return res.status(200).json(
        new ApiResponse(200, "AI reply generated.", { reply, mode })
    );

});

module.exports = { chat };

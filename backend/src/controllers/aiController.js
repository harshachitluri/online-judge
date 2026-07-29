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

const buildSystemPrompt = ({ mode, language, problem }) => {
    const base =
        `You are the AI Assistant inside CodeJudge, an online judge for competitive ` +
        `programming. You are embedded next to a code editor` +
        (language ? ` currently set to ${language}` : "") +
        `. Keep replies concise (a few short paragraphs or a short list at most) ` +
        `and use Markdown-style **bold**/\`code\` sparingly. Never claim to have ` +
        `executed the user's code — you can only read it.`;

    const problemContext = problem
        ? `\n\nThe user has this problem open:\nTitle: ${problem.title}\n` +
          `Difficulty: ${problem.difficulty || "unknown"}\n` +
          (problem.tags?.length ? `Tags: ${problem.tags.join(", ")}\n` : "") +
          (problem.description ? `Statement: ${String(problem.description).slice(0, 1500)}\n` : "") +
          (problem.constraints ? `Constraints: ${problem.constraints}\n` : "")
        : "";

    const modeInstructions = {
        chat:
            "\n\nAnswer whatever the user asks — complexity, correctness, approach, " +
            "debugging, or general concepts. If they paste code, refer to it directly.",
        hint:
            "\n\nGive ONE graduated hint toward solving the open problem — never the " +
            "full solution or working code. Nudge toward the technique or the key " +
            "insight, and stop there. If asked for 'the next hint', go one level " +
            "deeper than a typical first hint would.",
        review:
            "\n\nReview the user's code for correctness risks, complexity, and style. " +
            "Structure the reply as a short list of concrete findings. If the code " +
            "looks solid, say so plainly instead of inventing nitpicks.",
        complexity:
            "\n\nEstimate the time and space complexity of the user's code. State the " +
            "Big-O for both, then a one-sentence justification referencing the actual " +
            "structure (loops, recursion, data structures used). Flag if you're unsure."
    };

    return base + problemContext + (modeInstructions[mode] || modeInstructions.chat);
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

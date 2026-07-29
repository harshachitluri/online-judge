import client, { unwrap } from "../api/client";

/*
 |==========================================================================
 | AI Assistant — real Gemini-backed calls
 |==========================================================================
 | Every call here goes to the backend, which holds the actual Gemini API
 | key and never exposes it to the browser. This means (unlike Sage's local
 | heuristics in services/sage.js) the code and message *do* leave the
 | device — the UI must be honest about that rather than implying otherwise.
 |
 | The backend returns a clean, user-safe message on failure (quota,
 | timeout, not configured), so callers can surface `error.response.data`
 | .message directly.
 */

/**
 * @param {"chat"|"hint"|"review"|"complexity"} mode
 * @param {string} message
 * @param {string} [code]
 * @param {string} [language]
 * @param {object} [problem]      { title, difficulty, tags, description, constraints }
 * @param {Array<{role:'user'|'model', text:string}>} [history]
 */
export const askAssistant = async ({ mode = "chat", message, code, language, problem, history }) => {
    const res = await client.post("/ai/chat", {
        mode,
        message,
        code,
        language,
        // Trim the statement so a long problem description doesn't dominate
        // the request — the backend also caps this, this just keeps the
        // payload lean on the way out.
        problem: problem
            ? {
                  title: problem.title,
                  difficulty: problem.difficulty,
                  tags: problem.tags,
                  description: problem.description?.slice(0, 1500),
                  constraints: problem.constraints
              }
            : undefined,
        history
    });

    return unwrap(res); // { reply, mode }
};

/** True once the backend has told us the assistant is unavailable this session. */
export const AI_UNAVAILABLE_STATUS = 501;

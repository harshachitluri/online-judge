const { GoogleGenerativeAI } = require("@google/generative-ai");

/*
 |==========================================================================
 | Gemini service
 |==========================================================================
 | A single client built from GEMINI_API_KEY, lazily — so a deployment that
 | never touches the AI Assistant doesn't fail to boot just because the key
 | is unset. Every caller goes through `isConfigured()` first and gets a
 | clear ApiError otherwise, rather than a confusing SDK stack trace.
 */

let client = null;

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

const getModel = () => {
    if (!isConfigured()) return null;

    if (!client) {
        client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    return client.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        generationConfig: {
            // Kept tight: this is a coding assistant reply, not an essay,
            // and a hard ceiling bounds both latency and API cost per call.
            maxOutputTokens: 1024,
            temperature: 0.4
        }
    });
};

/**
 * @param {string} systemPrompt   sets the assistant's role and constraints
 * @param {Array<{role: 'user'|'model', text: string}>} history  prior turns
 * @param {string} message        the new user turn
 * @returns {Promise<string>}
 */
const generateReply = async ({ systemPrompt, history = [], message }) => {
    const model = getModel();

    if (!model) {
        throw new Error("GEMINI_NOT_CONFIGURED");
    }

    const chat = model.startChat({
        // The SDK has no separate "system" role for this model family, so
        // the system prompt is seeded as the first exchange instead —
        // a user turn stating the rules, a model turn acknowledging them.
        history: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Understood. I'll follow those constraints." }] },
            ...history.map((turn) => ({
                role: turn.role,
                parts: [{ text: turn.text }]
            }))
        ]
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
};

module.exports = { isConfigured, generateReply };

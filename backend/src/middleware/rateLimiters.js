const rateLimit = require("express-rate-limit");

/*
 |==========================================================================
 | Rate limiters
 |==========================================================================
 | Only routes that cost real money or are a plausible abuse target get a
 | dedicated limiter. Everything else is covered by `standard`.
 |
 | trustProxy must be set on the Express app itself (app.set("trust proxy", 1))
 | when this sits behind Caddy/nginx — otherwise every request appears to
 | come from the proxy's IP and one limiter bucket covers all visitors.
 */

const jsonMessage = (message) => ({
    success: false,
    message
});

/** Sign-in, register, Google exchange — brute-force and account-creation spam. */
const auth = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonMessage("Too many attempts. Try again in a few minutes.")
});

/*
 | Email one-time codes. Tighter than `auth` and keyed by IP (not email) —
 | the endpoints already respond identically for registered and unregistered
 | addresses, so limiting by email would leak registration status through
 | timing/limit behavior. IP-based keeps that property intact.
 */
const otp = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonMessage("Too many code requests. Try again in a few minutes.")
});

/** AI Assistant — every call spends real Gemini quota. */
const ai = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonMessage("You're asking the AI Assistant too quickly. Wait a moment.")
});

/** Code execution — compiling and running is the most CPU-expensive path. */
const run = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonMessage("Too many run requests. Slow down a little.")
});

/** Generous default for everything else, mainly to blunt scraping/bots. */
const standard = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonMessage("Too many requests. Try again shortly.")
});

module.exports = { auth, otp, ai, run, standard };

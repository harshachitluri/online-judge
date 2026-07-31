/*
 |--------------------------------------------------------------------------
 | Auth Cookie Options
 |--------------------------------------------------------------------------
 | Single source of truth for the session cookie flags.
 |
 | Setting and clearing a cookie must use identical flags — otherwise the
 | browser treats them as different cookies and "logout" silently leaves the
 | session in place.
 */

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Flags shared by set and clear.
 *
 * SameSite is configurable because it depends on how the app is deployed,
 * and the two cases have genuinely different security properties:
 *
 *   · Same origin (Caddy serves the SPA and proxies /api on one domain) —
 *     "lax" is correct and strictly safer: the cookie is simply not sent on
 *     cross-site requests, which removes the CSRF exposure for free.
 *   · Split origins (SPA on Netlify, API elsewhere) — the browser will drop
 *     the cookie entirely unless it is "none", which requires Secure and
 *     accepts the CSRF surface that comes with it.
 *
 * Defaulting to "lax" means the safer option is what you get by accident;
 * the riskier one has to be asked for.
 */
const sameSite = () => {
    const configured = (process.env.COOKIE_SAMESITE || "").toLowerCase();
    if (["lax", "none", "strict"].includes(configured)) return configured;
    return "lax";
};

const cookieOptions = () => ({
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? sameSite() : "lax",
    path: "/"
});

/** Flags for setting the cookie, including its lifetime. */
const authCookieOptions = () => ({
    ...cookieOptions(),
    maxAge: TOKEN_TTL_MS
});

module.exports = { cookieOptions, authCookieOptions, TOKEN_TTL_MS };

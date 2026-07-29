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
 * Flags shared by set and clear. In production the API and the SPA usually
 * live on different origins, which requires SameSite=None; Secure.
 */
const cookieOptions = () => ({
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? "none" : "lax",
    path: "/"
});

/** Flags for setting the cookie, including its lifetime. */
const authCookieOptions = () => ({
    ...cookieOptions(),
    maxAge: TOKEN_TTL_MS
});

module.exports = { cookieOptions, authCookieOptions, TOKEN_TTL_MS };

import client, { unwrap, tokenStore } from "../api/client";

/*
 |==========================================================================
 | Account services — auth, profile, standings
 |==========================================================================
 | Every function returns already-unwrapped data so callers never reach into
 | `res.data.data` themselves.
 */

/* ── Auth ──────────────────────────────────────────────────────────────── */

export const register = async ({ username, email, password }) => {
    const res = await client.post("/auth/register", { username, email, password });
    const data = unwrap(res);
    if (data?.token) tokenStore.set(data.token);
    return data?.user;
};

export const login = async ({ email, password }) => {
    const res = await client.post("/auth/login", { email, password });
    const data = unwrap(res);
    if (data?.token) tokenStore.set(data.token);
    return data?.user;
};

/**
 * Exchanges a Google ID credential for a CodeJudge session.
 *
 * The backend mints the same httpOnly JWT it does for password login, so
 * everything downstream is identical — Google is an identity provider, not
 * a parallel session type.
 */
export const loginWithGoogle = async (credential) => {
    const res = await client.post("/auth/google", { credential });
    const data = unwrap(res);
    if (data?.token) tokenStore.set(data.token);
    return data?.user;
};

export const logout = async () => {
    try {
        await client.post("/auth/logout");
    } finally {
        // The local token must go even if the network call fails, otherwise
        // the user stays "logged in" on this device after clicking sign out.
        tokenStore.clear();
    }
};

/* ── Profile ───────────────────────────────────────────────────────────── */

/** The session probe. Returns `{ user, stats }` or throws 401 when signed out. */
export const fetchMe = async () => {
    const res = await client.get("/profile/me");
    return unwrap(res);
};

export const updateProfile = async (updates) => {
    const res = await client.put("/profile", updates);
    return unwrap(res);
};

export const deleteAccount = async () => {
    await client.delete("/profile");
    tokenStore.clear();
};

export const fetchAnalytics = async () => {
    const res = await client.get("/profile/analytics");
    return unwrap(res);
};

export const fetchProgress = async () => {
    const res = await client.get("/profile/progress");
    return unwrap(res);
};

/* ── Standings ─────────────────────────────────────────────────────────── */

export const fetchLeaderboard = async (limit = 50) => {
    const res = await client.get("/leaderboard", { params: { limit } });
    return unwrap(res) || [];
};

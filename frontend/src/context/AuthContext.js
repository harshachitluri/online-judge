import React, {
    createContext, useContext, useState, useEffect, useCallback, useMemo, useRef
} from "react";
import { useNavigate, useLocation } from "react-router-dom";

import * as account from "../services/account";
import { onSessionExpired } from "../api/client";

/*
 |==========================================================================
 | AuthContext
 |==========================================================================
 | Owns the session: who is signed in, their aggregate stats, and the four
 | ways in and out (register, login, Google, logout).
 |
 | `status` is a three-state machine rather than a pair of booleans, because
 | "still checking" and "definitely signed out" are genuinely different and
 | routes need to tell them apart — treating unresolved as signed-out flashes
 | the sign-in page on every hard refresh.
 */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [status, setStatus] = useState("resolving"); // resolving | authenticated | anonymous

    const navigate = useNavigate();
    const location = useLocation();

    // Held in a ref so the expiry subscription below doesn't have to
    // re-subscribe on every navigation.
    const locationRef = useRef(location);
    locationRef.current = location;

    /* ── Session probe ─────────────────────────────────────────────────── */

    const refresh = useCallback(async () => {
        try {
            const data = await account.fetchMe();
            setUser(data.user);
            setStats(data.stats);
            setStatus("authenticated");
            return data.user;
        } catch {
            setUser(null);
            setStats(null);
            setStatus("anonymous");
            return null;
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    /* ── Expiry mid-session ────────────────────────────────────────────── */

    useEffect(
        () =>
            onSessionExpired(() => {
                setUser(null);
                setStats(null);
                setStatus("anonymous");

                const { pathname, search } = locationRef.current;
                const onPublicPage = ["/", "/enter", "/join", "/recover"].includes(pathname);

                if (!onPublicPage) {
                    // Router navigation rather than a hard redirect, so the
                    // toast queue and in-flight state survive.
                    navigate(`/enter?from=${encodeURIComponent(pathname + search)}`, {
                        replace: true
                    });
                }
            }),
        [navigate]
    );

    /* ── Entry points ──────────────────────────────────────────────────── */

    const applySession = useCallback(async (signedInUser) => {
        setUser(signedInUser);
        setStatus("authenticated");

        // The auth endpoints return the user but no stats block, and the
        // Command Deck renders from stats — fetch the full profile now so it
        // doesn't land on an empty dashboard.
        try {
            const data = await account.fetchMe();
            setUser(data.user);
            setStats(data.stats);
        } catch { /* session is valid regardless; stats fill in on next load */ }

        return signedInUser;
    }, []);

    const login = useCallback(
        async (credentials) => applySession(await account.login(credentials)),
        [applySession]
    );

    const register = useCallback(
        async (details) => applySession(await account.register(details)),
        [applySession]
    );

    const loginWithGoogle = useCallback(
        async (credential) => applySession(await account.loginWithGoogle(credential)),
        [applySession]
    );

    // Passwordless: the emailed code is exchanged for the same session
    // cookie every other entry point issues, so nothing downstream differs.
    const loginWithCode = useCallback(
        async ({ email, code }) => applySession(await account.loginWithCode({ email, code })),
        [applySession]
    );

    const logout = useCallback(async () => {
        await account.logout();
        setUser(null);
        setStats(null);
        setStatus("anonymous");
        navigate("/", { replace: true });
    }, [navigate]);

    /* ── Local mutations ───────────────────────────────────────────────── */

    const updateUser = useCallback((patch) => {
        setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    }, []);

    const value = useMemo(
        () => ({
            user,
            stats,
            status,
            resolving: status === "resolving",
            isAuthenticated: status === "authenticated",
            isAdmin: user?.role === "admin",
            login,
            register,
            loginWithGoogle,
            loginWithCode,
            logout,
            refresh,
            updateUser
        }),
        [user, stats, status, login, register, loginWithGoogle, loginWithCode, logout, refresh, updateUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside an AuthProvider.");
    return context;
};

export default AuthContext;

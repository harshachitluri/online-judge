import axios from "axios";

/*
 |==========================================================================
 | HTTP client
 |==========================================================================
 | The API issues a JWT as an httpOnly cookie, so `withCredentials` is what
 | actually authenticates a request. A bearer token is *also* attached when
 | one is present in storage: it costs nothing, and it keeps the app working
 | in Safari's cross-site cookie blocking and in any deployment where the
 | API sits on a different registrable domain than the frontend.
 */

export const API_BASE =
    process.env.REACT_APP_API_URL || "http://localhost:5001/api";

export const TOKEN_KEY = "axiom.token";

export const tokenStore = {
    get: () => {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            // Storage throws in private mode on some browsers — the cookie
            // is still the primary credential, so this is recoverable.
            return null;
        }
    },
    set: (token) => {
        try {
            if (token) localStorage.setItem(TOKEN_KEY, token);
        } catch { /* non-fatal, see above */ }
    },
    clear: () => {
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch { /* non-fatal, see above */ }
    }
};

const client = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
    timeout: 30000
});

client.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

/*
 | Endpoints where a 401 is a legitimate answer rather than an expired
 | session. Redirecting on these would bounce anonymous visitors off the
 | public landing page and would blow away a login form on a wrong password.
 */
const SILENT_401 = ["/profile/me", "/auth/login", "/auth/register", "/auth/logout", "/auth/google"];

const isSilent = (url = "") => SILENT_401.some((path) => url.includes(path));

/** Subscribers notified when the session dies mid-flight (see AuthContext). */
const sessionListeners = new Set();

export const onSessionExpired = (fn) => {
    sessionListeners.add(fn);
    return () => sessionListeners.delete(fn);
};

client.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || "";

        if (status === 401 && !isSilent(url)) {
            tokenStore.clear();
            // React Router handles the redirect so in-flight state and the
            // toast queue survive; a hard location change would discard both.
            sessionListeners.forEach((fn) => fn());
        }

        return Promise.reject(error);
    }
);

/*
 | Unwraps the ApiResponse envelope the backend always sends:
 |   { statusCode, message, data, success }
 */
export const unwrap = (response) => response?.data?.data;

/** A human-readable message for any axios failure, never "[object Object]". */
export const errorMessage = (error, fallback = "Something went wrong.") => {
    if (error?.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (error?.message === "Network Error") {
        return "Can't reach the CodeJudge server. Check your connection and try again.";
    }
    return error?.response?.data?.message || error?.message || fallback;
};

export default client;

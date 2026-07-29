import axios from "axios";

/*
 |--------------------------------------------------------------------------
 | Axios Instance
 |--------------------------------------------------------------------------
 | Central axios instance with:
 |   - Base URL from environment variable
 |   - Cookie-based auth (withCredentials)
 |   - Response interceptor: redirects to /login when a *protected* request
 |     comes back 401
 */

const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:5001/api",
    headers: {
        "Content-Type": "application/json"
    },
    withCredentials: true
});

/*
 | Requests whose 401 is an expected answer rather than a session expiry:
 |
 |   /profile/me → the "am I logged in?" probe fired on every page load.
 |                 Redirecting on it bounced anonymous visitors off the public
 |                 home page straight to /login.
 |   /auth/*     → a wrong password must render an inline error, not trigger a
 |                 full page reload that wipes the form.
 */
const SILENT_401_PATHS = [
    "/profile/me",
    "/auth/login",
    "/auth/register",
    "/auth/logout"
];

const isSilent401 = (url = "") =>
    SILENT_401_PATHS.some((path) => url.includes(path));

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || "";
        const onAuthPage = ["/login", "/register"].includes(window.location.pathname);

        if (status === 401 && !isSilent401(url) && !onAuthPage) {
            window.location.href = "/login";
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;

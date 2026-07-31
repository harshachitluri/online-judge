require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");

/* ── Route Imports ──────────────────────────────────────────────────── */

const authRoutes = require("./routes/authRoutes");
const problemRoutes = require("./routes/problemRoutes");
const testCaseRoutes = require("./routes/testCaseRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const runRoutes = require("./routes/runRoutes");
const profileRoutes = require("./routes/profileRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const aiRoutes = require("./routes/aiRoutes");

/* ── Worker & Middleware ────────────────────────────────────────────── */

const judgeWorker = require("./workers/judgeWorker");
const { sweepTempArtifacts } = require("./services/compilerService");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

/*
 | In production this sits behind Caddy, which terminates TLS and proxies to
 | this process over localhost. Without `trust proxy`, every request appears
 | to originate from Caddy's own address — req.ip is wrong, the rate
 | limiters below bucket every visitor together, and `secure` cookies can
 | misbehave. `1` trusts exactly one hop, matching a single reverse proxy.
 */
if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
}

/* ── CORS ───────────────────────────────────────────────────────────── */

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (curl, Postman, mobile)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: origin '${origin}' not allowed.`));
            }
        },
        credentials: true
    })
);

/* ── Body Parser ────────────────────────────────────────────────────── */

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(helmet());
app.use(mongoSanitize());

/* ── Health Check ───────────────────────────────────────────────────── */

app.get("/", (req, res) => {
    res.json({ message: "Online Judge API Running...", version: "1.0.0" });
});

// Unauthenticated, no rate limit, no DB round-trip — this is what a load
// balancer or uptime monitor should poll, not "/".
app.get("/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
});

/* ── Rate limiting ──────────────────────────────────────────────────── */
// Route-specific limiters (auth, AI, run) are declared on those routers;
// this is the floor everything else falls back to.
app.use("/api", require("./middleware/rateLimiters").standard);

/* ── API Routes ─────────────────────────────────────────────────────── */

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/testcases", testCaseRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/run", runRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/ai", aiRoutes);

/* ── 404 — unknown route ────────────────────────────────────────────── */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found.`
    });
});

/* ── Global Error Handler ───────────────────────────────────────────── */

app.use(errorHandler);

/* ── Start Server ───────────────────────────────────────────────────── */

const PORT = process.env.PORT || 5001;

/* ── Required configuration ─────────────────────────────────────────── */

// Without JWT_SECRET, jwt.sign() throws on every login and jwt.verify()
// rejects every request — fail loudly at boot instead.
for (const key of ["MONGO_URI", "JWT_SECRET"]) {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            judgeWorker();

            /*
             | Anything left in the temp directories predates this process, so
             | no running job owns it — a previous run was killed mid-compile.
             | Repeated hourly so a long-lived server doesn't accumulate the
             | debris of jobs that died to a crash rather than an error.
             */
            sweepTempArtifacts();
            setInterval(sweepTempArtifacts, 60 * 60 * 1000).unref();
        });

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

// A rejected promise anywhere (judge worker, DB blip) would otherwise take
// the whole API down with an opaque crash.
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
});

startServer();
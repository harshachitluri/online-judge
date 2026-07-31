const crypto = require("crypto");

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { cookieOptions, authCookieOptions } = require("../utils/cookieOptions");
const { sendMail } = require("../services/emailService");

const MIN_PASSWORD_LENGTH = 6;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/* ── One-time codes ──────────────────────────────────────────────────────
 | Short enough to type from a phone, short-lived enough that a code sitting
 | in an inbox is not a standing key to the account.
 */
const OTP_TTL_MS = 10 * 60 * 1000;        // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends
const OTP_MAX_ATTEMPTS = 5;               // wrong guesses before the code dies
const OTP_PURPOSES = ["login", "reset"];

// The reset token minted after a code is verified is deliberately far
// shorter-lived than an emailed link: the user is already at the keyboard
// with the new-password form open.
const OTP_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const issueToken = (res, user) => {

    const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("token", token, authCookieOptions());

};

// Shape sent back to the client — never includes the password hash.
const publicUser = (user) => ({
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    createdAt: user.createdAt
});

const register = asyncHandler(async (req, res) => {

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        throw new ApiError(400, "Username, email and password are required.");
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
        throw new ApiError(400, "Please provide a valid email address.");
    }

    if (String(password).length < MIN_PASSWORD_LENGTH) {
        throw new ApiError(
            400,
            `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
        );
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        throw new ApiError(409, "An account with that email already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        username: String(username).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "user"
    });

    issueToken(res, user);

    return res.status(201).json(
        new ApiResponse(201, "User registered successfully.", {
            user: publicUser(user)
        })
    );

});

const login = asyncHandler(async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required.");
    }

    const user = await User.findOne({
        email: String(email).trim().toLowerCase()
    });

    if (!user) {
        throw new ApiError(401, "Invalid credentials.");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        throw new ApiError(401, "Invalid credentials.");
    }

    issueToken(res, user);

    return res.status(200).json(
        new ApiResponse(200, "Login successful.", { user: publicUser(user) })
    );

});

const logout = asyncHandler(async (req, res) => {

    res.clearCookie("token", cookieOptions());

    return res.status(200).json(
        new ApiResponse(200, "Logout successful.")
    );

});

/*
 |--------------------------------------------------------------------------
 | Google Sign-In
 |--------------------------------------------------------------------------
 | POST /api/auth/google  { credential }
 |
 | `credential` is the ID token Google Identity Services hands the browser.
 | It is verified server-side against Google's published keys — trusting the
 | client's decoded copy would let anyone mint a token for any email.
 |
 | Google is only an identity provider here: on success we issue the same
 | httpOnly JWT that password login does, so every downstream route is
 | unchanged.
 */

const googleAuth = asyncHandler(async (req, res) => {

    const { credential } = req.body;

    if (!credential) {
        throw new ApiError(400, "A Google credential is required.");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;

    // Without the audience to check against, verification is meaningless —
    // fail loudly rather than accepting a token issued for another app.
    if (!clientId) {
        throw new ApiError(
            501,
            "Google sign-in is not configured on this server."
        );
    }

    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(clientId);

    let payload;

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: clientId
        });
        payload = ticket.getPayload();
    } catch (error) {
        throw new ApiError(401, "That Google credential could not be verified.");
    }

    if (!payload?.email) {
        throw new ApiError(401, "Google did not return an email address.");
    }

    // An unverified Google address proves nothing about who controls it.
    if (payload.email_verified === false) {
        throw new ApiError(403, "That Google account's email is not verified.");
    }

    const email = String(payload.email).trim().toLowerCase();

    let user = await User.findOne({ email });

    if (!user) {
        /*
         | First sign-in creates the account. The password column is
         | required by the schema, so it gets a hash of a random secret that
         | is never returned anywhere — the account is reachable only
         | through Google until the user sets a password.
         */
        const placeholder = await bcrypt.hash(
            `google:${payload.sub}:${Date.now()}:${Math.random()}`,
            10
        );

        // Google display names collide freely, and username has no unique
        // index, so this is a display value rather than an identifier.
        const username =
            String(payload.name || email.split("@")[0]).trim().slice(0, 32) || "solver";

        user = await User.create({
            username,
            email,
            password: placeholder,
            role: "user"
        });
    }

    issueToken(res, user);

    return res.status(200).json(
        new ApiResponse(200, "Google sign-in successful.", {
            user: publicUser(user)
        })
    );

});

/*
 |--------------------------------------------------------------------------
 | Forgot / Reset password
 |--------------------------------------------------------------------------
 | POST /api/auth/forgot-password  { email }
 | POST /api/auth/reset-password   { token, password }
 |
 | The response is identical whether or not the email is registered — the
 | endpoint always returns 200 with the same message, so it can't be used to
 | enumerate which addresses have accounts. Only the server log (via the
 | email service's console fallback) reveals whether a mail actually went
 | out, which is fine because that log isn't reachable from the request.
 |
 | The token itself is never stored: only its SHA-256 hash is. A copy of the
 | database is therefore not enough to forge a reset — you'd also need the
 | random token that was emailed, which never touches the DB.
 */

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/*
 |--------------------------------------------------------------------------
 | One-time code helpers
 |--------------------------------------------------------------------------
 | Shared by the "sign in with a code" and "reset with a code" flows, which
 | differ only in what verification grants at the end.
 */

// randomInt, not Math.random — a predictable code is not a code.
const generateCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

const normalizeCode = (code) => String(code ?? "").replace(/\D/g, "");

/** Constant-time comparison, so a wrong code can't be narrowed by timing. */
const codeMatches = (rawCode, storedHash) => {
    if (!storedHash) return false;

    const candidate = Buffer.from(hashToken(rawCode), "utf8");
    const stored = Buffer.from(storedHash, "utf8");

    return (
        candidate.length === stored.length &&
        crypto.timingSafeEqual(candidate, stored)
    );
};

const clearCode = (user) => {
    user.otpHash = undefined;
    user.otpPurpose = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
};

/** True while the last code for this account is still inside its cooldown. */
const isCoolingDown = (user) =>
    Boolean(user.otpSentAt) &&
    Date.now() - new Date(user.otpSentAt).getTime() < OTP_RESEND_COOLDOWN_MS;

/**
 * Attaches a fresh code to the user document (without saving) and returns
 * it in plaintext for the caller to email. Any previous code is replaced.
 */
const attachCode = (user, purpose) => {
    const code = generateCode();

    user.otpHash = hashToken(code);
    user.otpPurpose = purpose;
    user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
    user.otpAttempts = 0;
    user.otpSentAt = new Date();

    return code;
};

/* The code is spaced in the subject line so it survives the notification
   preview on a phone, where the body may never be opened. */
const codeEmail = ({ code, purpose }) => {
    const minutes = Math.round(OTP_TTL_MS / 60000);

    const intro =
        purpose === "login"
            ? "Here is your one-time sign-in code for CodeJudge."
            : "We received a request to reset your CodeJudge password.";

    return {
        subject: `${code} is your CodeJudge ${purpose === "login" ? "sign-in" : "password reset"} code`,
        text:
            `${intro}\n\n` +
            `Your code is: ${code}\n\n` +
            `It expires in ${minutes} minutes and can only be used once.\n\n` +
            `If you didn't request this, ignore this email — nothing has changed ` +
            `on your account.`,
        html: `
            <p>${intro}</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:8px;margin:24px 0">${code}</p>
            <p>This code expires in ${minutes} minutes and can only be used once.</p>
            <p>If you didn't request this, ignore this email — nothing has changed on your account.</p>
        `
    };
};

/*
 |--------------------------------------------------------------------------
 | POST /api/auth/request-code  { email }
 |--------------------------------------------------------------------------
 | Passwordless sign-in: emails a 6-digit code that /verify-code exchanges
 | for a session. Like forgot-password, the response is identical whether or
 | not the address is registered.
 */

const requestLoginCode = asyncHandler(async (req, res) => {

    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required.");
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
        throw new ApiError(400, "Please provide a valid email address.");
    }

    const genericResponse = () =>
        res.status(200).json(
            new ApiResponse(200, "If that email is registered, a sign-in code is on its way.", {
                expiresInSeconds: OTP_TTL_MS / 1000,
                resendInSeconds: OTP_RESEND_COOLDOWN_MS / 1000
            })
        );

    const user = await User.findOne({ email: normalizedEmail }).select("+otpSentAt");

    // Unknown address, or a code sent moments ago — either way the caller
    // gets the same answer, so neither reveals anything.
    if (!user || isCoolingDown(user)) {
        return genericResponse();
    }

    const code = attachCode(user, "login");
    await user.save({ validateBeforeSave: false });

    await sendMail({ to: user.email, ...codeEmail({ code, purpose: "login" }) });

    return genericResponse();

});

/*
 |--------------------------------------------------------------------------
 | POST /api/auth/verify-code  { email, code, purpose }
 |--------------------------------------------------------------------------
 | purpose "login" → issues the session cookie directly.
 | purpose "reset" → returns a short-lived reset token for /reset-password,
 |                   so the password change itself stays on one endpoint
 |                   whether the user arrived by emailed link or by code.
 |
 | Every failure returns the same message. "No such account" and "wrong
 | code" being distinguishable would turn this into an account oracle.
 */

const verifyCode = asyncHandler(async (req, res) => {

    const { email, code, purpose = "login" } = req.body;

    if (!OTP_PURPOSES.includes(purpose)) {
        throw new ApiError(400, `Unknown purpose. Expected one of: ${OTP_PURPOSES.join(", ")}.`);
    }

    if (!email || !code) {
        throw new ApiError(400, "An email and a code are required.");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCode = normalizeCode(code);

    const rejected = () =>
        new ApiError(400, "That code is incorrect or has expired. Request a new one.");

    if (normalizedCode.length !== 6) {
        throw rejected();
    }

    const user = await User.findOne({ email: normalizedEmail })
        .select("+otpHash +otpPurpose +otpExpires +otpAttempts");

    if (!user || !user.otpHash || user.otpPurpose !== purpose) {
        throw rejected();
    }

    if (!user.otpExpires || user.otpExpires.getTime() <= Date.now()) {
        clearCode(user);
        await user.save({ validateBeforeSave: false });
        throw rejected();
    }

    if ((user.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
        clearCode(user);
        await user.save({ validateBeforeSave: false });
        throw new ApiError(429, "Too many incorrect attempts. Request a new code.");
    }

    if (!codeMatches(normalizedCode, user.otpHash)) {
        user.otpAttempts = (user.otpAttempts || 0) + 1;
        await user.save({ validateBeforeSave: false });
        throw rejected();
    }

    // Correct — burn it immediately. A code that survives its own use is a
    // password with an expiry date.
    clearCode(user);

    if (purpose === "login") {
        await user.save({ validateBeforeSave: false });
        issueToken(res, user);

        return res.status(200).json(
            new ApiResponse(200, "Signed in with a one-time code.", {
                user: publicUser(user)
            })
        );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = Date.now() + OTP_RESET_TOKEN_TTL_MS;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, "Code verified. Choose a new password.", {
            resetToken: rawToken,
            expiresInSeconds: OTP_RESET_TOKEN_TTL_MS / 1000
        })
    );

});

const forgotPassword = asyncHandler(async (req, res) => {

    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required.");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+otpSentAt");

    // Always the same response — see the comment above.
    const genericResponse = () =>
        res.status(200).json(
            new ApiResponse(
                200,
                "If that email is registered, a reset code is on its way.",
                {
                    expiresInSeconds: OTP_TTL_MS / 1000,
                    resendInSeconds: OTP_RESEND_COOLDOWN_MS / 1000
                }
            )
        );

    // The cooldown is what stops this endpoint being used to flood someone
    // else's inbox. A caller inside it is answered as if nothing happened.
    if (!user || isCoolingDown(user)) {
        return genericResponse();
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = Date.now() + RESET_TOKEN_TTL_MS;

    // One email carries both routes in: a code to type back into the tab
    // they already have open, and a link for when the request came from a
    // different device than the inbox is on.
    const code = attachCode(user, "reset");

    // Only the reset/code fields changed — skip re-validating the rest of a
    // document that may predate a later required field.
    await user.save({ validateBeforeSave: false });

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    const minutes = Math.round(OTP_TTL_MS / 60000);

    await sendMail({
        to: user.email,
        subject: `${code} is your CodeJudge password reset code`,
        text:
            `We received a request to reset your CodeJudge password.\n\n` +
            `Your verification code is: ${code}\n` +
            `Enter it on the page you requested it from. It expires in ${minutes} minutes.\n\n` +
            `On a different device? Use this link instead (expires in 1 hour):\n${resetUrl}\n\n` +
            `If you didn't request this, you can safely ignore this email.`,
        html: `
            <p>We received a request to reset your CodeJudge password.</p>
            <p>Enter this verification code on the page you requested it from:</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:8px;margin:24px 0">${code}</p>
            <p>It expires in ${minutes} minutes and can only be used once.</p>
            <p>On a different device? <a href="${resetUrl}">Use this link instead</a> — it expires in 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
        `
    });

    return genericResponse();

});

const resetPassword = asyncHandler(async (req, res) => {

    const { token, password } = req.body;

    if (!token || !password) {
        throw new ApiError(400, "A reset token and new password are required.");
    }

    if (String(password).length < MIN_PASSWORD_LENGTH) {
        throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    const user = await User.findOne({
        resetPasswordToken: hashToken(token),
        resetPasswordExpires: { $gt: Date.now() }
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
        throw new ApiError(400, "That reset link is invalid or has expired.");
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    // A pending code from the same email is now moot — leaving it live would
    // mean one request handed out two independent ways in.
    clearCode(user);
    await user.save();

    // Issue a session immediately — resetting a password and then being
    // asked to log in again with it is a needless extra step.
    issueToken(res, user);

    return res.status(200).json(
        new ApiResponse(200, "Password reset successfully.", { user: publicUser(user) })
    );

});

module.exports = {
    register, login, logout, googleAuth,
    forgotPassword, resetPassword,
    requestLoginCode, verifyCode
};

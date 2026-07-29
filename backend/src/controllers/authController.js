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

const forgotPassword = asyncHandler(async (req, res) => {

    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required.");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Always the same response — see the comment above.
    const genericResponse = () =>
        res.status(200).json(
            new ApiResponse(
                200,
                "If that email is registered, a reset link is on its way."
            )
        );

    if (!user) {
        return genericResponse();
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = Date.now() + RESET_TOKEN_TTL_MS;
    // Only the two reset fields changed — skip re-validating the rest of a
    // document that may predate a later required field.
    await user.save({ validateBeforeSave: false });

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await sendMail({
        to: user.email,
        subject: "Reset your CodeJudge password",
        text:
            `We received a request to reset your CodeJudge password.\n\n` +
            `Reset it here (expires in 1 hour): ${resetUrl}\n\n` +
            `If you didn't request this, you can safely ignore this email.`,
        html: `
            <p>We received a request to reset your CodeJudge password.</p>
            <p><a href="${resetUrl}">Click here to choose a new password</a> — this link expires in 1 hour.</p>
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
    await user.save();

    // Issue a session immediately — resetting a password and then being
    // asked to log in again with it is a needless extra step.
    issueToken(res, user);

    return res.status(200).json(
        new ApiResponse(200, "Password reset successfully.", { user: publicUser(user) })
    );

});

module.exports = { register, login, logout, googleAuth, forgotPassword, resetPassword };

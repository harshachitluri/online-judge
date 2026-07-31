const express = require("express");

const router = express.Router();

const {
    register, login, logout, googleAuth,
    forgotPassword, resetPassword,
    requestLoginCode, verifyCode
} = require("../controllers/authController");
const { auth: authLimiter, otp: otpLimiter } = require("../middleware/rateLimiters");

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);

// Exchanges a Google ID token for the same session cookie password login issues
router.post("/google", authLimiter, googleAuth);

// Password recovery — see authController for why both always respond 200.
// otpLimiter, not authLimiter: this sends real email, which is the scarcer
// resource here — a tighter cap than login attempts need.
router.post("/forgot-password", otpLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

/*
 | One-time email codes. `request-code` is passwordless sign-in;
 | `verify-code` serves both that and the reset flow, branching on `purpose`
 | — see authController for why a login code can't be spent as a reset code.
 */
router.post("/request-code", otpLimiter, requestLoginCode);
router.post("/verify-code", authLimiter, verifyCode);

module.exports = router;

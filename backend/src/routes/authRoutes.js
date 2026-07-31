const express = require("express");

const router = express.Router();

const {
    register, login, logout, googleAuth,
    forgotPassword, resetPassword,
    requestLoginCode, verifyCode
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login",login);
router.post("/logout", logout);

// Exchanges a Google ID token for the same session cookie password login issues
router.post("/google", googleAuth);

// Password recovery — see authController for why both always respond 200
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

/*
 | One-time email codes. `request-code` is passwordless sign-in;
 | `verify-code` serves both that and the reset flow, branching on `purpose`
 | — see authController for why a login code can't be spent as a reset code.
 */
router.post("/request-code", requestLoginCode);
router.post("/verify-code", verifyCode);

module.exports = router;

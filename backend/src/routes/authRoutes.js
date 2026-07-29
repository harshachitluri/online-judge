const express = require("express");

const router = express.Router();

const {
    register, login, logout, googleAuth, forgotPassword, resetPassword
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login",login);
router.post("/logout", logout);

// Exchanges a Google ID token for the same session cookie password login issues
router.post("/google", googleAuth);

// Password recovery — see authController for why both always respond 200
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;

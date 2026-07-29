const mongoose = require("mongoose");
const { SUPPORTED_LANGUAGES } = require("../config/languages");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        // Normalised so "A@x.com" and "a@x.com" can't become two accounts
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ['user', 'admin'],
        default: "user"
    },

    /* ── Extended Profile Fields ────────────────────────────────── */

    bio: {
        type: String,
        default: "",
        maxlength: 500
    },

    location: {
        type: String,
        default: "",
        trim: true
    },

    githubUrl: {
        type: String,
        default: "",
        trim: true
    },

    linkedinUrl: {
        type: String,
        default: "",
        trim: true
    },

    college: {
        type: String,
        default: "",
        trim: true
    },

    preferredLanguage: {
        type: String,
        enum: SUPPORTED_LANGUAGES,
        default: "cpp"
    },

    /* ── Password reset ─────────────────────────────────────────── */
    // Only the SHA-256 hash of the reset token is stored, mirroring how the
    // password itself is never kept in plaintext — a database leak alone
    // must not be enough to let someone reset an account.
    resetPasswordToken: {
        type: String,
        default: undefined,
        select: false
    },

    resetPasswordExpires: {
        type: Date,
        default: undefined,
        select: false
    }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
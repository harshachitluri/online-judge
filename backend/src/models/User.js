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
    },

    /* ── One-time email codes ───────────────────────────────────── */
    // Used for both "sign in with a code" and "reset my password with a
    // code". Only one code is live per account at a time — requesting a new
    // one overwrites the last, so an old code in an old email can't be
    // replayed. Like the reset token, only the SHA-256 hash is stored.
    //
    // All of these are `select: false`: nothing that reads a user for
    // ordinary purposes (profile, leaderboard) should be carrying credential
    // material around with it.
    otpHash: {
        type: String,
        default: undefined,
        select: false
    },

    // Which flow the code was issued for. A code emailed for a password
    // reset must not be accepted as a login, so the purpose is checked on
    // verification rather than treated as interchangeable.
    otpPurpose: {
        type: String,
        enum: ["login", "reset"],
        default: undefined,
        select: false
    },

    otpExpires: {
        type: Date,
        default: undefined,
        select: false
    },

    // Wrong guesses against the current code. Six digits is only a million
    // possibilities, so unlimited attempts would make the code guessable.
    otpAttempts: {
        type: Number,
        default: 0,
        select: false
    },

    // Backs the resend cooldown — without it, "resend" is an open relay for
    // mailing someone else's inbox.
    otpSentAt: {
        type: Date,
        default: undefined,
        select: false
    }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
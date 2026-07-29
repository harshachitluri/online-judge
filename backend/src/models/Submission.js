const mongoose = require("mongoose");
const { SUPPORTED_LANGUAGES } = require("../config/languages");

const submissionSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    problemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem",
        required: true
    },

    language: {
        type: String,
        enum: SUPPORTED_LANGUAGES,
        required: true
    },

    sourceCode: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: [
            "Queued",
            "Running",
            "Completed"
        ],
        default: "Queued"
    },

    verdict: {
        type: String,
        enum: [
            "Pending",
            "Accepted",
            "Wrong Answer",
            "Compilation Error",
            "Runtime Error",
            "Time Limit Exceeded",
            "Memory Limit Exceeded"
        ],
        default: "Pending"
    },

    executionTime: {
        type: Number,
        default: 0
    },

    memoryUsed: {
        type: Number,
        default: 0
    },

    passedTestCases: {
        type: Number,
        default: 0
    },

    totalTestCases: {
        type: Number,
        default: 0
    },

    errorMessage: {
        type: String,
        default: ""
    }

}, { timestamps: true });

/* ── Indexes ────────────────────────────────────────────────────────── */

// Worker dequeue: find oldest Queued submission
submissionSchema.index({ status: 1, createdAt: 1 });

// "My submissions" listing and per-user stats
submissionSchema.index({ userId: 1, createdAt: -1 });

// Per-problem submission listing
submissionSchema.index({ problemId: 1, createdAt: -1 });

module.exports = mongoose.model("Submission", submissionSchema);
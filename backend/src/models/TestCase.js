const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    // Reference to the problem
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },

    // Input for the program
    input: {
      type: String,
      default: "",
    },

    // Expected output
    expectedOutput: {
      type: String,
      default: "",
    },

    // Sample testcase shown to users
    isSample: {
      type: Boolean,
      default: false,
    },

    // Explanation for sample testcase
    explanation: {
      type: String,
      default: "",
    },

    // Execution order
    order: {
      type: Number,
      required: true,
    },

    // Weight for future contest scoring
    weight: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Soft delete / enable-disable testcase
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes

testCaseSchema.index({ problemId: 1, order: 1 });

module.exports = mongoose.model("TestCase", testCaseSchema);
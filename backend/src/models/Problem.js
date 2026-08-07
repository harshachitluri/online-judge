const mongoose = require("mongoose");
const { SUPPORTED_LANGUAGES } = require("../config/languages");

/*
|--------------------------------------------------------------------------
| Example Schema
|--------------------------------------------------------------------------
| Stores the examples shown to the user.
| These are NOT the hidden test cases used for judging.
*/

const exampleSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: true,
      trim: true,
    },

    output: {
      type: String,
      required: true,
      trim: true,
    },

    explanation: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/*
|--------------------------------------------------------------------------
| Starter Code Schema
|--------------------------------------------------------------------------
| Default code displayed in the editor for each language.
*/

const starterCodeSchema = new mongoose.Schema(
  {
    cpp: {
      type: String,
      default: "",
    },

    java: {
      type: String,
      default: "",
    },

    python: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);

/*
|--------------------------------------------------------------------------
| Problem Schema
|--------------------------------------------------------------------------
*/

const problemSchema = new mongoose.Schema(
  {
    // Problem Title
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // URL Friendly Name
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Complete Problem Statement
    description: {
      type: String,
      required: true,
    },

    // Easy | Medium | Hard
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },

    // Constraints shown to the user
    constraints: {
      type: String,
      default: "",
    },

    // Topic Tags
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Visible Examples
    examples: [exampleSchema],

    // Starter Code for all languages
    starterCode: starterCodeSchema,

    // Languages allowed for this problem — must be executable by the judge
    supportedLanguages: {
      type: [String],
      enum: SUPPORTED_LANGUAGES,
      default: () => [...SUPPORTED_LANGUAGES],
    },

    // Function Name to Implement
    functionName: {
      type: String,
      required: true,
    },

    // Time Limit (milliseconds)
    timeLimit: {
      type: Number,
      default: 1000,
    },

    // Memory Limit (MB)
    memoryLimit: {
      type: Number,
      default: 256,
    },

    // Statistics
    acceptedCount: {
      type: Number,
      default: 0,
    },

    submissionCount: {
      type: Number,
      default: 0,
    },

    // Admin who created this problem
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Visible to users or not
    isPublished: {
      type: Boolean,
      default: false,
    },

    // Company associations (e.g., "Google", "Amazon")
    company: [
      {
        type: String,
        trim: true,
      },
    ],

    // Topic category for curriculum grouping
    topicCategory: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

/*
 | Full-text search.
 |
 | The weights are the point. Unweighted, a description that happens to use
 | the words "two" and "sum" scored the same as the problem actually titled
 | "Two Sum" — so searching for a problem by its exact name buried it below
 | a dozen unrelated ones. Title matches are what people are almost always
 | after, so the title is weighted an order of magnitude higher.
 |
 | ApiFeatures sorts by textScore whenever a search term is present; without
 | that these weights would be computed and then ignored.
 */
problemSchema.index(
  {
    title: "text",
    description: "text",
  },
  {
    weights: { title: 10, description: 1 },
    name: "problem_text_search",
  }
);

// Faster filtering — isPublished leads because every public query filters on it
problemSchema.index({
  isPublished: 1,
  difficulty: 1,
  tags: 1,
});

// Curriculum / company-bundle aggregations
problemSchema.index({ topicCategory: 1 });
problemSchema.index({ company: 1 });

module.exports = mongoose.model("Problem", problemSchema);
require("dotenv").config({ path: __dirname + "/../../.env" });

const mongoose = require("mongoose");

const Problem = require("../models/Problem");
const { SUPPORTED_LANGUAGES } = require("../config/languages");

/*
|--------------------------------------------------------------------------
| Migration — drop retired languages from existing problems
|--------------------------------------------------------------------------
| "javascript" was offered in the UI and stored on problems, but the judge has
| no JavaScript backend (the runner image ships g++, javac and python3 only),
| so every JS submission failed.
|
| supportedLanguages is now enum-validated. Documents still holding a retired
| value fail validation on save(), which blocks admin edits, so this migration
| must run once against any database seeded before that change.
|
| Usage:  node src/scripts/migrateLanguages.js
*/

const migrate = async () => {

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const stale = await Problem.find({
        supportedLanguages: { $nin: [...SUPPORTED_LANGUAGES, []] }
    }).select("_id");

    if (stale.length === 0) {
        console.log("Nothing to migrate — all problems already use supported languages only.");
        return;
    }

    const { modifiedCount } = await Problem.updateMany(
        { supportedLanguages: { $nin: SUPPORTED_LANGUAGES } },
        {
            $pull: { supportedLanguages: { $nin: SUPPORTED_LANGUAGES } },
            $unset: { "starterCode.javascript": "" }
        }
    );

    console.log(`Migrated ${modifiedCount} problem(s).`);

};

migrate()
    .catch((error) => {
        console.error("Migration failed:", error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());

require("dotenv").config();

const mongoose = require("mongoose");
const Problem = require("../models/Problem");

/*
 |==========================================================================
 | reindexSearch — rebuild the problem text index with title weighting
 |==========================================================================
 | MongoDB permits exactly one text index per collection, and refuses to
 | change an existing one's options in place — so adding weights to the
 | title/description index means dropping the old one first. Mongoose's
 | autoIndex cannot do that on its own: it sees a text index already there
 | and either leaves it alone or fails with IndexOptionsConflict.
 |
 | Without this, searching a problem by its exact title ranked it below any
 | problem whose *description* happened to reuse the same common words.
 |
 | Safe to re-run: it no-ops once the weighted index is in place.
 |
 |   node src/scripts/reindexSearch.js
 */

const TARGET_NAME = "problem_text_search";

const run = async () => {
    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not set — check .env");
        process.exitCode = 1;
        return;
    }

    await mongoose.connect(process.env.MONGO_URI);

    try {
        const collection = mongoose.connection.db.collection("problems");
        const indexes = await collection.indexes();
        const textIndexes = indexes.filter((i) => i.textIndexVersion);

        console.log(`Found ${textIndexes.length} text index(es):`);
        textIndexes.forEach((i) =>
            console.log(`  · ${i.name}  weights=${JSON.stringify(i.weights)}`)
        );

        const alreadyCorrect = textIndexes.find(
            (i) => i.name === TARGET_NAME && i.weights?.title === 10
        );

        if (alreadyCorrect) {
            console.log("\nAlready weighted correctly — nothing to do.");
            return;
        }

        for (const index of textIndexes) {
            console.log(`\nDropping "${index.name}"…`);
            await collection.dropIndex(index.name);
        }

        console.log("Creating weighted index…");
        // Built from the schema definition so this can never drift from the
        // model — Problem.js is the single source of truth for the weights.
        await Problem.syncIndexes();

        const after = (await collection.indexes()).filter((i) => i.textIndexVersion);
        console.log("\nText index now:");
        after.forEach((i) =>
            console.log(`  · ${i.name}  weights=${JSON.stringify(i.weights)}`)
        );
        console.log("\nDone. Search now ranks title matches first.");

    } finally {
        await mongoose.disconnect();
    }
};

run().catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
});

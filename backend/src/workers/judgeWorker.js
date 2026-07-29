const Submission = require("../models/Submission");
const judgeService = require("../services/judgeService");

/*
|--------------------------------------------------------------------------
| Judge Worker — Enhanced with Concurrency Control
|--------------------------------------------------------------------------
| Processes queued submissions in FIFO order (oldest createdAt first).
| Supports concurrent processing with a configurable max concurrency limit.
| When the queue is busy, polls faster; when idle, polls slower.
|
| Handles 500+ submissions at a time by:
|   - Processing up to MAX_CONCURRENT jobs in parallel
|   - Using findOneAndUpdate for atomic queue dequeue (no duplicates)
|   - Adaptive polling interval based on queue depth
*/

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_JOBS, 10) || 5;
const POLL_FAST_MS   = 100;   // Poll interval when queue has items
const POLL_IDLE_MS   = 2000;  // Poll interval when queue is empty

const DEPTH_LOG_INTERVAL_MS = 10000; // throttle queue-depth logging

let activeJobs = 0;
let lastDepthLogAt = 0;

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Dequeue the oldest queued submission and start judging it.
 * Returns true if a submission was picked up, false if queue was empty.
 */
const processNextSubmission = async () => {

    // Atomically pick the oldest queued submission and set it to Running
    const submission = await Submission.findOneAndUpdate(
        { status: "Queued" },
        { $set: { status: "Running" } },
        {
            returnDocument: "after",
            sort: { createdAt: 1 }  // FIFO — oldest first
        }
    );

    if (!submission) {
        return false; // No submissions in queue
    }

    activeJobs++;
    console.log(
        `⚡ Judging Submission: ${submission._id} | Active: ${activeJobs}/${MAX_CONCURRENT}`
    );

    // Run judging asynchronously (don't await — allows concurrency)
    judgeService(submission)
        .catch(async (error) => {
            console.error(`❌ Judge error for ${submission._id}:`, error.message);

            // Never leave the submission in "Running": the client polls it
            // until it reaches a terminal state.
            try {
                await Submission.updateOne(
                    { _id: submission._id, status: { $ne: "Completed" } },
                    {
                        $set: {
                            status: "Completed",
                            verdict: "Runtime Error",
                            errorMessage: "The judge failed to evaluate this submission."
                        }
                    }
                );
            } catch (updateError) {
                console.error("Failed to mark submission as failed:", updateError.message);
            }
        })
        .finally(() => {
            activeJobs--;
        });

    return true;
};

/**
 * Main worker loop — continuously polls for queued submissions.
 */
const judgeWorker = async () => {

    console.log(`🚀 Judge Worker Started | Max Concurrency: ${MAX_CONCURRENT}`);

    // Submissions left in "Running" by a crash/restart would never be picked
    // up again — the client polls them forever. Requeue them on startup.
    try {
        const { modifiedCount } = await Submission.updateMany(
            { status: "Running" },
            { $set: { status: "Queued" } }
        );

        if (modifiedCount > 0) {
            console.log(`♻️  Requeued ${modifiedCount} submission(s) stuck in Running.`);
        }
    } catch (error) {
        console.error("Failed to requeue stale submissions:", error.message);
    }

    while (true) {

        try {

            // Don't exceed concurrency limit
            if (activeJobs >= MAX_CONCURRENT) {
                await sleep(POLL_FAST_MS);
                continue;
            }

            // Queue-depth logging is throttled: counting on every 100 ms poll
            // put a pointless permanent read load on MongoDB.
            if (Date.now() - lastDepthLogAt > DEPTH_LOG_INTERVAL_MS) {
                lastDepthLogAt = Date.now();

                const queueDepth = await Submission.countDocuments({ status: "Queued" });

                if (queueDepth > 0) {
                    console.log(`📋 Queue depth: ${queueDepth} | Active: ${activeJobs}/${MAX_CONCURRENT}`);
                }
            }

            const pickedUp = await processNextSubmission();

            // Adaptive polling: fast when busy, slow when idle
            if (pickedUp) {
                await sleep(POLL_FAST_MS);
            } else {
                await sleep(POLL_IDLE_MS);
            }

        } catch (error) {

            console.error("🔥 Worker loop error:", error.message);
            await sleep(POLL_IDLE_MS);

        }

    }

};

module.exports = judgeWorker;
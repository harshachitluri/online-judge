const ApiError = require("../utils/ApiError");

/*
 |--------------------------------------------------------------------------
 | Global Error Handler
 |--------------------------------------------------------------------------
 | Translates the errors that actually reach this layer into meaningful HTTP
 | statuses. Without this, every Mongoose validation failure, bad ObjectId or
 | duplicate key surfaced to the client as an opaque 500.
 */

const errorHandler = (err, req, res, next) => {

    let statusCode = err.statusCode || 500;
    let message    = err.message || "Internal Server Error";

    // Invalid ObjectId (e.g. GET /api/submissions/not-an-id)
    if (err.name === "CastError") {
        statusCode = 400;
        message    = `Invalid value '${err.value}' for field '${err.path}'.`;
    }

    // Mongoose schema validation
    else if (err.name === "ValidationError") {
        statusCode = 400;
        message    = Object.values(err.errors || {})
            .map((e) => e.message)
            .join(" ") || "Validation failed.";
    }

    // Duplicate key on a unique index (email, slug, …)
    else if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `A record with that ${field} already exists.`;
    }

    // Malformed JSON body
    else if (err.type === "entity.parse.failed") {
        statusCode = 400;
        message    = "Request body is not valid JSON.";
    }

    // Body larger than the configured limit
    else if (err.type === "entity.too.large") {
        statusCode = 413;
        message    = "Request body is too large.";
    }

    // An ApiError's message is always hand-written for the client (e.g.
    // "The AI Assistant isn't configured on this server") and safe to send
    // even at a 5xx status — only a *raw*, unexpected error (a thrown SDK
    // exception, a bug) risks leaking internals like a stack trace or a
    // dependency's file paths, so only those get replaced.
    if (statusCode >= 500) {
        console.error("Unhandled error:", err);

        if (!(err instanceof ApiError)) {
            message = "Internal Server Error";
        }
    }

    res.status(statusCode).json({
        success: false,
        message
    });

};

module.exports = errorHandler;

const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Resolve the logged-in user from the auth cookie.
 * Returns null when the cookie is missing/invalid or the user no longer exists.
 */
const resolveUser = async (req) => {

    const token = req.cookies?.token;

    if (!token) {
        return null;
    }

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }

    return User.findById(decoded.userId).select("-password");

};

/**
 * Hard auth guard — rejects the request when there is no valid session.
 */
const protect = async (req, res, next) => {

    try {

        const user = await resolveUser(req);

        if (!user) {

            // Deliberately generic: never leak whether the token was
            // malformed, expired, or pointing at a deleted user.
            return res.status(401).json({
                success: false,
                message: "Not authorized. Please log in."
            });

        }

        req.user = user;

        next();

    }

    catch (error) {

        return next(error);

    }

};

/**
 * Soft auth — attaches req.user when a valid session exists, otherwise
 * continues as an anonymous request. Used by public endpoints that expose
 * extra data to admins (e.g. unpublished problems).
 */
const optionalAuth = async (req, res, next) => {

    try {
        req.user = (await resolveUser(req)) || null;
    } catch (error) {
        req.user = null;
    }

    next();

};

module.exports = protect;
module.exports.protect = protect;
module.exports.optionalAuth = optionalAuth;

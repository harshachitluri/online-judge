const adminOnly = (req, res, next) => {

    // req.user is set by `protect`; guard anyway so a mis-ordered route
    // returns 403 instead of throwing a TypeError.
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin only."
        });
    }

    next();
};

module.exports = adminOnly;
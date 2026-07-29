const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { cookieOptions, authCookieOptions } = require("../utils/cookieOptions");

const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const issueToken = (res, user) => {

    const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("token", token, authCookieOptions());

};

// Shape sent back to the client — never includes the password hash.
const publicUser = (user) => ({
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    createdAt: user.createdAt
});

const register = asyncHandler(async (req, res) => {

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        throw new ApiError(400, "Username, email and password are required.");
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
        throw new ApiError(400, "Please provide a valid email address.");
    }

    if (String(password).length < MIN_PASSWORD_LENGTH) {
        throw new ApiError(
            400,
            `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
        );
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        throw new ApiError(409, "An account with that email already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        username: String(username).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "user"
    });

    issueToken(res, user);

    return res.status(201).json(
        new ApiResponse(201, "User registered successfully.", {
            user: publicUser(user)
        })
    );

});

const login = asyncHandler(async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required.");
    }

    const user = await User.findOne({
        email: String(email).trim().toLowerCase()
    });

    if (!user) {
        throw new ApiError(401, "Invalid credentials.");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        throw new ApiError(401, "Invalid credentials.");
    }

    issueToken(res, user);

    return res.status(200).json(
        new ApiResponse(200, "Login successful.", { user: publicUser(user) })
    );

});

const logout = asyncHandler(async (req, res) => {

    res.clearCookie("token", cookieOptions());

    return res.status(200).json(
        new ApiResponse(200, "Logout successful.")
    );

});

module.exports = { register, login, logout };

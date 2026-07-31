require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

/*
 |==========================================================================
 | makeAdmin — grant, revoke and list admin access
 |==========================================================================
 | Admin is a role on the user document, and nothing in the application ever
 | sets it: registration always creates a plain user, and the admin panel is
 | itself admin-gated. Without this script the only admin that can ever exist
 | is the one seedProblems.js happens to create — so a real deployment has no
 | way to promote anyone, and a forgotten seed password locks the panel shut.
 |
 | This is deliberately a CLI script rather than an endpoint. "Make me an
 | admin" must require access to the server, not merely a session.
 |
 | Usage:
 |   node src/scripts/makeAdmin.js <email>                  grant admin
 |   node src/scripts/makeAdmin.js <email> --revoke         back to user
 |   node src/scripts/makeAdmin.js <email> --password <pw>  also set a password
 |   node src/scripts/makeAdmin.js --list                   show all admins
 */

const MIN_PASSWORD_LENGTH = 6;

const parseArgs = (argv) => {
    const args = { email: null, revoke: false, password: null, list: false };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];

        if (arg === "--list") args.list = true;
        else if (arg === "--revoke" || arg === "--demote") args.revoke = true;
        else if (arg === "--password") { args.password = argv[i + 1]; i += 1; }
        else if (!arg.startsWith("-")) args.email = arg;
    }

    return args;
};

const usage = () => {
    console.log(`
Usage:
  node src/scripts/makeAdmin.js <email>                  grant admin
  node src/scripts/makeAdmin.js <email> --revoke         back to a normal user
  node src/scripts/makeAdmin.js <email> --password <pw>  also set a password
  node src/scripts/makeAdmin.js --list                   list current admins
`);
};

const run = async () => {
    const args = parseArgs(process.argv.slice(2));

    if (!args.list && !args.email) {
        usage();
        process.exitCode = 1;
        return;
    }

    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not set — check backend/.env");
        process.exitCode = 1;
        return;
    }

    await mongoose.connect(process.env.MONGO_URI);

    try {
        if (args.list) {
            const admins = await User.find({ role: "admin" })
                .select("username email createdAt")
                .sort({ createdAt: 1 });

            if (!admins.length) {
                console.log("No admin accounts exist.");
                console.log("Grant one with: node src/scripts/makeAdmin.js <email>");
                return;
            }

            console.log(`${admins.length} admin account(s):`);
            admins.forEach((a) => console.log(`  · ${a.username}  <${a.email}>`));
            return;
        }

        const email = String(args.email).trim().toLowerCase();
        const user = await User.findOne({ email });

        if (!user) {
            console.error(`No account found for ${email}.`);
            console.error("Register through the app first, then run this again.");
            process.exitCode = 1;
            return;
        }

        const nextRole = args.revoke ? "user" : "admin";

        if (args.password) {
            if (String(args.password).length < MIN_PASSWORD_LENGTH) {
                console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
                process.exitCode = 1;
                return;
            }
            // Covers the usual dead end: an admin exists but nobody remembers
            // the seeded password, so the panel is unreachable.
            user.password = await bcrypt.hash(String(args.password), 10);
        }

        if (user.role === nextRole && !args.password) {
            console.log(`${user.username} <${user.email}> is already ${nextRole}. Nothing to do.`);
            return;
        }

        user.role = nextRole;
        // Only role/password changed — skip re-validating a document that may
        // predate a later required field.
        await user.save({ validateBeforeSave: false });

        console.log(
            args.revoke
                ? `Revoked admin from ${user.username} <${user.email}>.`
                : `${user.username} <${user.email}> is now an admin.`
        );

        if (args.password) console.log("Password updated.");
        if (!args.revoke) console.log('Sign out and back in — "Admin" then appears in the sidebar.');

    } finally {
        await mongoose.disconnect();
    }
};

run().catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
});

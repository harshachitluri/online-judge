const nodemailer = require("nodemailer");

/*
 |==========================================================================
 | Email service
 |==========================================================================
 | A single transporter built from SMTP_* env vars. Without them configured,
 | `sendMail` logs the message to the console instead of throwing — so local
 | development keeps working, and the reset link is still visible (in the
 | server log) for testing the flow end to end without real SMTP creds.
 */

let transporter = null;
let attemptedInit = false;

const isConfigured = () =>
    Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
    if (attemptedInit) return transporter;
    attemptedInit = true;

    if (!isConfigured()) return null;

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        // Port 465 is implicit TLS; anything else (587, 25) negotiates
        // STARTTLS instead — mixing these up is the most common SMTP bug.
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    return transporter;
};

/**
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 * @param {string} text  plaintext fallback for clients that don't render HTML
 */
const sendMail = async ({ to, subject, html, text }) => {
    const client = getTransporter();
    const from = process.env.SMTP_FROM || "CodeJudge <no-reply@codejudge.local>";

    if (!client) {
        // Loud in the server log, silent to the caller — the API response
        // must not reveal whether email delivery is actually configured.
        console.warn(
            `[emailService] SMTP is not configured — email to ${to} was not sent.\n` +
            `Subject: ${subject}\n${text || html}`
        );
        return { delivered: false };
    }

    await client.sendMail({ from, to, subject, html, text });
    return { delivered: true };
};

module.exports = { sendMail, isConfigured };

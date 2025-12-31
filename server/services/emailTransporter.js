// Nodemailer config for Gmail
const nodemailer = require('nodemailer');

function normalizeGmailAppPassword(value) {
  // Gmail app passwords are often displayed in 4-char groups with spaces.
  // SMTP auth expects the raw token.
  return String(value || '').replace(/\s+/g, '').trim();
}

const gmailUser = String(process.env.GMAIL_USER || '').trim();
const gmailAppPassword = normalizeGmailAppPassword(process.env.GMAIL_APP_PASSWORD);

if (!gmailUser || !gmailAppPassword) {
  // Keep behavior deterministic and readable during dev scripts.
  // Nodemailer will throw later anyway; this makes the root cause obvious.
  console.warn('[emailTransporter] Gmail credentials missing. Set GMAIL_USER and GMAIL_APP_PASSWORD in server/.env');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailAppPassword,
  },
});

module.exports = transporter;

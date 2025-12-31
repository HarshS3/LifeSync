// Smoke test: reminders + notifications scheduler.
// Safe by default: set REMINDER_EMAIL_DRY_RUN=1 to avoid sending real emails.
// Usage (PowerShell):
//   cd server
//   $env:REMINDER_EMAIL_DRY_RUN='1'; node .\scripts\dev_reminder_smoke.js
//
// To test real email sending, remove DRY_RUN and ensure:
//   GMAIL_USER + GMAIL_APP_PASSWORD are configured in server/.env

// Load server/.env explicitly (scripts may be run from repo root).
try {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });
} catch {
  require('dotenv').config({ override: true });
}

// Prevent the background cron scheduler from running during this one-off script.
process.env.REMINDER_SCHEDULER_DISABLE_CRON = '1';

const mongoose = require('mongoose');
const User = require('../models/User');
const { Habit } = require('../models/Habit');
const transporter = require('../services/emailTransporter');
const { runReminderTick } = require('../services/reminderScheduler');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function roundDownTo5Minutes(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  d.setMinutes(m - (m % 5));
  return d;
}

async function main() {
  const hasUser = Boolean(String(process.env.GMAIL_USER || '').trim());
  const hasPass = Boolean(String(process.env.GMAIL_APP_PASSWORD || '').trim());
  console.log('[dev_reminder_smoke] gmail env:', { hasUser, hasPass });

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';
  await mongoose.connect(mongoUri);

  const now = roundDownTo5Minutes(new Date());
  const currentTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  console.log('[dev_reminder_smoke] tick time:', currentTime);

  const testTo = String(process.env.REMINDER_TEST_TO || '').trim();
  const email = `reminder-smoke+${Date.now()}@lifesync.dev`;

  const dryRun = String(process.env.REMINDER_EMAIL_DRY_RUN || '').trim() === '1';
  const allowFakeTo = String(process.env.REMINDER_ALLOW_FAKE_TO || '').trim() === '1';
  if (!dryRun && !testTo && !allowFakeTo) {
    console.error('[dev_reminder_smoke] Refusing to send real email to a fake address.');
    console.error('Set REMINDER_TEST_TO to your real email, or set REMINDER_ALLOW_FAKE_TO=1 (not recommended).');
    process.exitCode = 2;
    return;
  }

  const recipient = testTo || email;

  console.log('[dev_reminder_smoke] recipient:', recipient);
  console.log('[dev_reminder_smoke] mode:', dryRun ? 'DRY_RUN (no emails sent)' : 'REAL_SEND');
  const user = await User.create({
    name: 'Reminder Smoke',
    email,
    password: 'test1234!',
    reminders: {
      email: true,
      push: false,
      habitReminders: true,
      workoutReminders: true,
      medicationReminders: true,
      reminderTimes: {
        morning: currentTime,
        evening: currentTime,
        workout: currentTime,
      },
    },
  });

  await Habit.create({
    user: user._id,
    name: 'Smoke Habit',
    isActive: true,
    category: 'other',
  });

  // Verify SMTP config (does not send an email).
  try {
    await transporter.verify();
    console.log('[dev_reminder_smoke] email transporter: OK');
  } catch (e) {
    console.log('[dev_reminder_smoke] email transporter: NOT OK');
    console.log('  reason:', e?.message || e);
  }

  const result = await runReminderTick(now, {
    onlyUserId: user._id,
    recipientOverride: recipient,
  });
  console.log('[dev_reminder_smoke] tick result:', result);

  console.log('[dev_reminder_smoke] user email (recipient):', recipient);
}

main()
  .catch((err) => {
    console.error('[dev_reminder_smoke] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  });

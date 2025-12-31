// Reminder scheduler using node-cron
const cron = require('node-cron');
const User = require('../models/User');
const { Habit } = require('../models/Habit');
const transporter = require('./emailTransporter');

const REMINDER_DEBUG = String(process.env.REMINDER_DEBUG || '').trim() === '1';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function normalizeHHMM(value) {
  const s = String(value || '').trim();
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function currentTimeVariants(now) {
  const hh = now.getHours();
  const mm = now.getMinutes();
  const hourPad = pad2(hh);
  const minutePad = pad2(mm);
  const hourNoPad = String(hh);
  const minuteNoPad = String(mm);
  return Array.from(
    new Set([
      `${hourPad}:${minutePad}`,
      `${hourNoPad}:${minutePad}`,
      `${hourPad}:${minuteNoPad}`,
      `${hourNoPad}:${minuteNoPad}`,
    ])
  );
}

function getClientBaseUrl() {
  return (
    String(process.env.CLIENT_URL || '').trim() ||
    String(process.env.FRONTEND_URL || '').trim() ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
}

function buildReminderText({ user, kind, currentTime, habits }) {
  const name = String(user?.name || '').trim();
  const greetingName = name ? ` ${name}` : '';
  const appUrl = getClientBaseUrl();

  const lines = [];
  lines.push(`Hi${greetingName},`);
  lines.push('');

  if (kind === 'habit') {
    const habitNames = Array.isArray(habits) ? habits.map(h => h?.name).filter(Boolean) : [];
    if (habitNames.length) {
      lines.push(`Habit reminder (${currentTime}): ${habitNames.join(', ')}`);
    } else {
      lines.push(`Habit reminder (${currentTime}).`);
    }
  } else if (kind === 'workout') {
    lines.push(`Workout reminder (${currentTime}).`);
    const preferred = Array.isArray(user?.preferredWorkouts)
      ? user.preferredWorkouts.map(String).map(s => s.trim()).filter(Boolean)
      : [];
    if (preferred.length) {
      lines.push(`Your preferred workouts: ${preferred.slice(0, 5).join(', ')}`);
    }
  } else if (kind === 'medication') {
    lines.push(`Medication reminder (${currentTime}).`);
    const meds = Array.isArray(user?.medications)
      ? user.medications.map(m => m?.name).filter(Boolean)
      : [];
    if (meds.length) {
      lines.push(`Your meds on file: ${meds.slice(0, 5).join(', ')}`);
    }
  } else {
    lines.push(`Reminder (${currentTime}).`);
  }

  lines.push('');
  lines.push('You can adjust reminders in your LifeSync settings.');
  lines.push(appUrl);

  return lines.join('\n');
}

// Helper to send email
async function sendReminderEmail(to, subject, text) {
  const dryRun = String(process.env.REMINDER_EMAIL_DRY_RUN || '').trim() === '1';
  if (dryRun) {
    if (REMINDER_DEBUG) {
      console.log('[ReminderEmail][DRY_RUN] enabled by env', {
        REMINDER_EMAIL_DRY_RUN: process.env.REMINDER_EMAIL_DRY_RUN,
      });
    }
    console.log('[ReminderEmail][DRY_RUN]', { to, subject, text });
    return;
  }
  if (REMINDER_DEBUG) console.log('[ReminderEmail] sending', { to, subject });
  const info = await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
  });
  if (REMINDER_DEBUG) {
    console.log('[ReminderEmail] sent', {
      to,
      subject,
      messageId: info?.messageId,
      accepted: info?.accepted,
      rejected: info?.rejected,
    });
  }
}

async function runReminderTick(now = new Date(), options = {}) {
  const currentTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const timeVariants = currentTimeVariants(now);
  if (REMINDER_DEBUG) console.log('[ReminderScheduler] tick', { currentTime, timeVariants });

  const recipientOverride = String(options.recipientOverride || '').trim();
  const onlyUserId = options.onlyUserId;

  // Find users who want email reminders at this time
  const userQuery = {
    'reminders.email': true,
    $or: [
      { 'reminders.reminderTimes.morning': { $in: timeVariants } },
      { 'reminders.reminderTimes.evening': { $in: timeVariants } },
      { 'reminders.reminderTimes.workout': { $in: timeVariants } },
    ],
  };

  if (onlyUserId) {
    userQuery._id = onlyUserId;
  }

  const users = await User.find(userQuery);
  if (REMINDER_DEBUG) console.log('[ReminderScheduler] candidates', { count: users.length });

  for (const user of users) {
    const to = recipientOverride || user.email;

    const morningTime = normalizeHHMM(user?.reminders?.reminderTimes?.morning);
    const eveningTime = normalizeHHMM(user?.reminders?.reminderTimes?.evening);
    const workoutTime = normalizeHHMM(user?.reminders?.reminderTimes?.workout);

    // For each type, check if enabled and time matches
    if (user.reminders.habitReminders && morningTime === currentTime) {
      // Get today's habits
      const habits = await Habit.find({ user: user._id, isActive: true });
      if (habits.length > 0) {
        await sendReminderEmail(
          to,
          'Habit Reminder',
          buildReminderText({ user, kind: 'habit', currentTime, habits })
        );
      }
    }
    if (user.reminders.workoutReminders && workoutTime === currentTime) {
      await sendReminderEmail(
        to,
        'Workout Reminder',
        buildReminderText({ user, kind: 'workout', currentTime })
      );
    }
    if (user.reminders.medicationReminders && eveningTime === currentTime) {
      await sendReminderEmail(
        to,
        'Medication Reminder',
        buildReminderText({ user, kind: 'medication', currentTime })
      );
    }
    // Add more types as needed
  }

  return { currentTime, usersNotified: users.length };
}

// Main reminder job: run every minute so any selected HH:MM works.
const DISABLE_CRON = String(process.env.REMINDER_SCHEDULER_DISABLE_CRON || '').trim() === '1';
if (!DISABLE_CRON) {
  cron.schedule('* * * * *', async () => {
    try {
      await runReminderTick(new Date());
    } catch (err) {
      console.error('[ReminderScheduler] tick failed:', err?.message || err);
    }
  });
}

module.exports = { runReminderTick };

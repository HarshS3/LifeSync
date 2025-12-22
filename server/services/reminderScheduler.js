// Reminder scheduler using node-cron
const cron = require('node-cron');
const User = require('../models/User');
const { Habit } = require('../models/Habit');
const transporter = require('./emailTransporter');

// Helper to send email
async function sendReminderEmail(to, subject, text) {
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
  });
}

// Main reminder job: runs every 5 minutes, checks for reminders to send
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${hour}:${minute}`;

  // Find users who want email reminders at this time
  const users = await User.find({
    'reminders.email': true,
    $or: [
      { 'reminders.reminderTimes.morning': currentTime },
      { 'reminders.reminderTimes.evening': currentTime },
      { 'reminders.reminderTimes.workout': currentTime },
    ],
  });

  for (const user of users) {
    // For each type, check if enabled and time matches
    if (user.reminders.habitReminders && user.reminders.reminderTimes.morning === currentTime) {
      // Get today's habits
      const habits = await Habit.find({ user: user._id, isActive: true });
      if (habits.length > 0) {
        await sendReminderEmail(
          user.email,
          'Habit Reminder',
          `Don't forget your habits today: ${habits.map(h => h.name).join(', ')}`
        );
      }
    }
    if (user.reminders.workoutReminders && user.reminders.reminderTimes.workout === currentTime) {
      await sendReminderEmail(
        user.email,
        'Workout Reminder',
        `It's time for your workout! Stay strong!`
      );
    }
    if (user.reminders.medicationReminders && user.reminders.reminderTimes.evening === currentTime) {
      await sendReminderEmail(
        user.email,
        'Medication Reminder',
        `Don't forget to take your medication tonight.`
      );
    }
    // Add more types as needed
  }
});

module.exports = {};

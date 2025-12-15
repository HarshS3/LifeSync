const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: String,
    icon: { type: String, default: '✓' },
    color: { type: String, default: '#6366f1' },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'weekdays', 'weekends', 'custom'],
      default: 'daily',
    },
    // For custom frequency - which days of week (0=Sun, 1=Mon, ..., 6=Sat)
    customDays: [{ type: Number, min: 0, max: 6 }],
    targetPerDay: { type: Number, default: 1 }, // e.g., 8 glasses of water
    unit: String, // e.g., 'glasses', 'minutes', 'pages'
    reminderTime: String, // HH:mm format
    isActive: { type: Boolean, default: true },
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    category: {
      type: String,
      enum: ['health', 'fitness', 'mindfulness', 'productivity', 'learning', 'social', 'other'],
      default: 'other',
    },
  },
  { timestamps: true }
);

const HabitLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    habit: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
    date: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    value: { type: Number, default: 0 }, // For habits with targetPerDay > 1
    notes: String,
  },
  { timestamps: true }
);

// Index for efficient querying
HabitLogSchema.index({ user: 1, habit: 1, date: 1 }, { unique: true });
HabitLogSchema.index({ user: 1, date: 1 });

module.exports = {
  Habit: mongoose.model('Habit', HabitSchema),
  HabitLog: mongoose.model('HabitLog', HabitLogSchema),
};

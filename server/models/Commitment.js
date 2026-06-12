/**
 * Commitment + CommitmentLog: a unified model for "do/don't-do this on most days,
 * track streaks" goals.
 *
 * Replaces the parallel Habit and LongTermGoal models, but the old models stay live
 * during the transition (their routes still work; their collections are independent).
 *
 * `kind` discriminates:
 *   - 'habit'           — recurring positive action (e.g. drink water, journal). Has frequency rules.
 *   - 'long_term_goal'  — sustained streak goal (abstain / build / reduce). Has targetDays.
 *
 * Optional fields are kind-specific. Reads should always check `kind` before assuming
 * a field is meaningful.
 */

const mongoose = require('mongoose');

const CommitmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    kind: { type: String, enum: ['habit', 'long_term_goal'], required: true, index: true },
    name: { type: String, required: true },
    description: String,
    icon: { type: String, default: '✓' },
    color: { type: String, default: '#6366f1' },
    category: { type: String, default: 'other' },

    // Habit-specific
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'weekdays', 'weekends', 'custom'],
      default: 'daily',
    },
    customDays: [{ type: Number, min: 0, max: 6 }],
    targetPerDay: { type: Number, default: 1 },
    unit: String,
    reminderTime: String,

    // Long-term-goal-specific
    goalType: { type: String, enum: ['abstain', 'build', 'reduce'], default: undefined },
    targetDays: { type: Number, default: undefined },
    motivationText: String,
    rewards: [String],
    totalRelapses: { type: Number, default: 0 },

    // Shared streak state (computed by service on each log write)
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CommitmentSchema.index({ user: 1, isActive: 1, kind: 1 });

const CommitmentLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    commitment: { type: mongoose.Schema.Types.ObjectId, ref: 'Commitment', required: true, index: true },
    date: { type: Date, required: true, index: true },

    // Habit shape: { completed, value, notes }
    completed: { type: Boolean, default: false },
    value: { type: Number, default: 0 },

    // LongTermGoal shape: { status, relapseCount, intensity, trigger, contributionType, urgeLevel, mood, lessonsLearned }
    status: {
      type: String,
      enum: ['success', 'relapse', 'partial', 'skip'],
      default: undefined,
    },
    relapseCount: { type: Number, default: 0 },
    intensity: { type: Number, min: 1, max: 10 },
    trigger: String,
    contributionType: { type: String, enum: ['major', 'minor', 'maintenance', 'negative'] },
    timeSpent: Number,
    urgeLevel: { type: Number, min: 1, max: 10 },
    mood: { type: Number, min: 1, max: 10 },
    lessonsLearned: String,

    notes: String,
  },
  { timestamps: true }
);

CommitmentLogSchema.index({ user: 1, commitment: 1, date: 1 }, { unique: true });
CommitmentLogSchema.index({ user: 1, date: 1 });

module.exports = {
  Commitment: mongoose.model('Commitment', CommitmentSchema),
  CommitmentLog: mongoose.model('CommitmentLog', CommitmentLogSchema),
};

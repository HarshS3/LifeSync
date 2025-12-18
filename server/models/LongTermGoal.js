const mongoose = require('mongoose');

// Long Term Goal Schema - for goals like NoFap, skill building, etc.
const LongTermGoalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true }, // e.g., "NoFap", "Learn Guitar", "Quit Smoking"
    description: String,
    category: {
      type: String,
      enum: ['addiction', 'skill', 'health', 'career', 'relationship', 'financial', 'other'],
      default: 'other',
    },
    goalType: {
      type: String,
      enum: ['abstain', 'build', 'reduce'], // abstain = avoid something, build = develop skill, reduce = decrease frequency
      default: 'abstain',
    },
    color: { type: String, default: '#8b5cf6' },
    icon: { type: String, default: '🎯' },
    startDate: { type: Date, default: Date.now },
    targetDays: { type: Number, default: 90 }, // Target streak (e.g., 90 days)
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalRelapses: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    motivationText: String, // Why they want to achieve this
    rewards: [String], // Milestones/rewards at certain days
  },
  { timestamps: true }
);

// Daily Log for Long Term Goals
const LongTermGoalLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    goal: { type: mongoose.Schema.Types.ObjectId, ref: 'LongTermGoal', required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['success', 'relapse', 'partial', 'skip'], // success = good day, relapse = failed, partial = struggled but survived, skip = not applicable
      required: true,
    },
    // For relapse tracking (e.g., NoFap)
    relapseCount: { type: Number, default: 0 }, // How many times if relapsed
    intensity: { type: Number, min: 1, max: 10 }, // Severity/intensity of relapse
    trigger: String, // What triggered the relapse
    // For positive tracking
    contributionType: {
      type: String,
      enum: ['major', 'minor', 'maintenance', 'negative'],
    },
    timeSpent: Number, // Minutes spent on skill building
    // General
    urgeLevel: { type: Number, min: 1, max: 10 }, // How strong was the urge today
    mood: { type: Number, min: 1, max: 10 },
    notes: String,
    lessonsLearned: String,
  },
  { timestamps: true }
);

// Indexes
LongTermGoalLogSchema.index({ user: 1, goal: 1, date: 1 }, { unique: true });
LongTermGoalLogSchema.index({ user: 1, date: 1 });

module.exports = {
  LongTermGoal: mongoose.model('LongTermGoal', LongTermGoalSchema),
  LongTermGoalLog: mongoose.model('LongTermGoalLog', LongTermGoalLogSchema),
};

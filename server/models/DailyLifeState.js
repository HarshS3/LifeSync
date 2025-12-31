const mongoose = require('mongoose');

const NormalizedSignalSchema = new mongoose.Schema(
  {
    value: { type: Number, default: null, min: 0, max: 1 },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const SummaryStateSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      enum: ['unknown', 'stable', 'overloaded', 'depleted', 'recovering'],
      default: 'unknown',
      index: true,
    },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
    reasons: { type: [String], default: [] },
  },
  { _id: false }
);

const EvidencePointersSchema = new mongoose.Schema(
  {
    mentalLogIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    nutritionLogIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    fitnessLogIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    habitLogIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    symptomLogIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    labReportIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    journalEntryIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  },
  { _id: false }
);

const DailyLifeStateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    dayKey: { type: String, required: true, index: true },

    dateStart: { type: Date, required: true, index: true },
    dateEnd: { type: Date, required: true },

    signals: {
      sleep: { type: NormalizedSignalSchema, default: () => ({}) },
      mood: { type: NormalizedSignalSchema, default: () => ({}) },
      stress: { type: NormalizedSignalSchema, default: () => ({}) },
      energy: { type: NormalizedSignalSchema, default: () => ({}) },
      trainingLoad: { type: NormalizedSignalSchema, default: () => ({}) },
      nutrition: { type: NormalizedSignalSchema, default: () => ({}) },
      habits: { type: NormalizedSignalSchema, default: () => ({}) },

      symptomsContext: { type: NormalizedSignalSchema, default: () => ({}) },
      labsContext: { type: NormalizedSignalSchema, default: () => ({}) },
      reflectionContext: { type: NormalizedSignalSchema, default: () => ({}) },
    },

    summaryState: { type: SummaryStateSchema, default: () => ({}) },

    evidence: { type: EvidencePointersSchema, default: () => ({}) },

    computedAt: { type: Date, default: Date.now, index: true },
    computeVersion: { type: Number, default: 1 },
    inputsHash: { type: String, default: '' },
  },
  { timestamps: true }
);

DailyLifeStateSchema.index({ user: 1, dayKey: 1 }, { unique: true });
DailyLifeStateSchema.index({ user: 1, dateStart: -1 });

module.exports = mongoose.model('DailyLifeState', DailyLifeStateSchema);

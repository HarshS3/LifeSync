const mongoose = require('mongoose')

const DiseaseSensitivitySchema = new mongoose.Schema(
  {
    effect: { type: String, enum: ['positive', 'negative', 'neutral'], required: true },
    strength: { type: Number, default: 0.5 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
)

const RiskTriggerSchema = new mongoose.Schema(
  {
    pattern: { type: String, required: true },
    windowDays: { type: Number, default: 7 },
    riskLevel: { type: String, enum: ['low', 'moderate', 'high'], default: 'moderate' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
)

const SystemLimitsSchema = new mongoose.Schema(
  {
    noDiagnosis: { type: Boolean, default: true },
    noMedicationAdvice: { type: Boolean, default: true },
    noDosageSuggestions: { type: Boolean, default: true },
  },
  { _id: false }
)

const DiseaseProfileSchema = new mongoose.Schema(
  {
    diseaseId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    aliases: { type: [String], default: [], index: true },
    category: { type: String, default: '' },
    chronic: { type: Boolean, default: true },
    locale: { type: String, default: 'en', index: true },

    affectedAxes: { type: [String], default: [] },

    sensitivities: {
      type: Map,
      of: DiseaseSensitivitySchema,
      default: () => ({}),
    },

    riskTriggers: { type: [RiskTriggerSchema], default: [] },

    systemLimits: { type: SystemLimitsSchema, default: () => ({}) },

    source: { type: String, default: 'manual' },
    confidence: { type: Number, default: 0.7 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

module.exports = mongoose.model('DiseaseProfile', DiseaseProfileSchema)

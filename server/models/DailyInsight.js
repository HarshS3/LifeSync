const mongoose = require('mongoose');

const DailyInsightFoodSchema = new mongoose.Schema(
  {
    name: { type: String, default: '', trim: true },
    canonicalId: { type: String, default: '', trim: true },
    occurrences: { type: Number, default: 1 },
    derivedMetrics: { type: mongoose.Schema.Types.Mixed, default: null },
    interactions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    uncertainty: { type: mongoose.Schema.Types.Mixed, default: null },
    scoring: { type: mongoose.Schema.Types.Mixed, default: null },
    diseaseAnalysis: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const DailyInsightSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true },

    status: { type: String, enum: ['ok', 'no_data', 'error'], default: 'ok' },
    inputsUpdatedAt: { type: Date, default: null },
    computedAt: { type: Date, default: () => new Date() },
    version: { type: Number, default: 1 },

    nutrition: {
      logId: { type: mongoose.Schema.Types.ObjectId, ref: 'NutritionLog', default: null },
      mealsCount: { type: Number, default: 0 },
      foodsCount: { type: Number, default: 0 },
      waterIntake: { type: Number, default: 0 },
      dailyTotalsLogged: { type: mongoose.Schema.Types.Mixed, default: null },
      mealSignals: { type: mongoose.Schema.Types.Mixed, default: null },
      foods: { type: [DailyInsightFoodSchema], default: [] },
      aggregate: { type: mongoose.Schema.Types.Mixed, default: null },
      bullets: { type: [String], default: [] },
    },

    symptoms: {
      windowDays: { type: Number, default: 2 },
      items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },

    labs: {
      windowDays: { type: Number, default: 14 },
      items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },

    narrative: {
      text: { type: String, default: '' },
      hash: { type: String, default: '' },
      model: { type: String, default: '' },
      updatedAt: { type: Date, default: null },
    },

    errors: { type: [String], default: [] },
  },
  { timestamps: true }
);

DailyInsightSchema.index({ user: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('DailyInsight', DailyInsightSchema);

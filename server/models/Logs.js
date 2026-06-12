const mongoose = require('mongoose');
const { buildNumericSchemaFragment } = require('./nutritionFields');

const NUTRIENT_FRAGMENT = buildNumericSchemaFragment();

const FitnessLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    type: { type: String },
    focus: { type: String },
    intensity: { type: Number, min: 1, max: 10 },
    fatigue: { type: Number, min: 1, max: 10 },
    notes: String,
  },
  { timestamps: true }
);

const NutritionLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    meals: [
      {
        name: String,
        mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout'], default: 'snack' },
        time: String,
        mealTime: { type: Date, default: null },
        loggedAt: String,
        foods: [
          {
            name: String,
            quantity: Number,
            unit: { type: String, default: 'g' },
            baseServingQty: { type: Number, default: 0 },
            baseServingUnit: { type: String, default: '' },
            servingLabel: { type: String, default: '' },
            servingWeightG: { type: Number, default: null },
            sourceFoodId: { type: String, default: '' },
            sourceKind: { type: String, default: '' },
            ...NUTRIENT_FRAGMENT,
            // Per-nutrient quality: { [nutrientKey]: { confidence: 0..1, source: string } }
            // Populated by ingest paths that know nutrient provenance (barcode AI estimation,
            // recipe resolution, manual entry). Absent => assume primary-source / full confidence.
            nutrientQuality: { type: mongoose.Schema.Types.Mixed, default: {} },
          },
        ],
        totalCalories: { type: Number, default: 0 },
        totalProtein: { type: Number, default: 0 },
        totalCarbs: { type: Number, default: 0 },
        totalFat: { type: Number, default: 0 },
        notes: String,
        // ── Bioavailability Engine output ──────────────────────────
        bioavailability: {
          overallConfidence: { type: String, default: '' }, // 'low'|'medium'|'high'
          narratives: [{ type: String }],
          interactionsApplied: [{ type: mongoose.Schema.Types.Mixed }],
          results: { type: mongoose.Schema.Types.Mixed, default: {} }, // keyed by nutrient
          mealContext: { type: mongoose.Schema.Types.Mixed, default: {} }, // isHemeSource etc.
        },
      },
    ],
    supplements: [
      {
        name: String,
        nutriments: { type: mongoose.Schema.Types.Mixed, default: {} },
        takenAt: String,
      }
    ],
    waterIntake: { type: Number, default: 0 }, // in ml
    dailyTotals: { ...NUTRIENT_FRAGMENT },
    // ── Effective nutrient totals (after bioavailability adjustments) ──
    effectiveNutrientTotals: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: String,
  },
  { timestamps: true }
);

const WeightLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    time: String,
    weightKg: { type: Number },
  },
  { timestamps: true }
);

const StepsLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    stepsCount: { type: Number, min: 0 },
  },
  { timestamps: true }
);

const MentalLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    mood: { type: String, enum: ['very-low', 'low', 'neutral', 'good', 'great'], default: 'neutral' },
    moodScore: { type: Number, min: 1, max: 10 },
    stressLevel: { type: Number, min: 1, max: 10 },
    energyLevel: { type: Number, min: 1, max: 10 },
    hungerLevel: { type: Number, min: 1, max: 10 },
    bodyFeel: { type: Number, min: 1, max: 10 },
    sleepHours: { type: Number, min: 0, max: 24 },
    sleepQuality: { type: Number, min: 1, max: 10 },
    restingHeartRate: { type: Number, min: 30, max: 200 },
    medsTaken: [String], // Names of medications taken that day
    journalSnippet: String,
    notes: String,
  },
  { timestamps: true }
);

const MemorySummarySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    periodLabel: String,
    from: Date,
    to: Date,
    summary: String,
    tags: [String],
  },
  { timestamps: true }
);

NutritionLogSchema.index({ user: 1, date: 1 });
FitnessLogSchema.index({ user: 1, date: 1 });
MentalLogSchema.index({ user: 1, date: 1 });
WeightLogSchema.index({ user: 1, date: 1 });

module.exports = {
  FitnessLog: mongoose.model('FitnessLog', FitnessLogSchema),
  NutritionLog: mongoose.model('NutritionLog', NutritionLogSchema),
  WeightLog: mongoose.model('WeightLog', WeightLogSchema),
  StepsLog: mongoose.model('StepsLog', StepsLogSchema),
  MentalLog: mongoose.model('MentalLog', MentalLogSchema),
  MemorySummary: mongoose.model('MemorySummary', MemorySummarySchema),
};

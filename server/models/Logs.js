const mongoose = require('mongoose');

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
            calories: { type: Number, default: 0 },
            protein: { type: Number, default: 0 },
            carbs: { type: Number, default: 0 },
            fat: { type: Number, default: 0 },
            fiber: { type: Number, default: 0 },
            sugar: { type: Number, default: 0 },
            sodium: { type: Number, default: 0 },
            potassium: { type: Number, default: 0 },
            iron: { type: Number, default: 0 },
            calcium: { type: Number, default: 0 },
            vitaminB: { type: Number, default: 0 },
            magnesium: { type: Number, default: 0 },
            zinc: { type: Number, default: 0 },
            vitaminC: { type: Number, default: 0 },
            omega3: { type: Number, default: 0 },
            saturatedFat: { type: Number, default: 0 },
            monounsaturatedFat: { type: Number, default: 0 },
            polyunsaturatedFat: { type: Number, default: 0 },
            cholesterol: { type: Number, default: 0 },
            phosphorus: { type: Number, default: 0 },
            copper: { type: Number, default: 0 },
            selenium: { type: Number, default: 0 },
            manganese: { type: Number, default: 0 },
            vitaminA: { type: Number, default: 0 },
            vitaminE: { type: Number, default: 0 },
            vitaminD2: { type: Number, default: 0 },
            vitaminD3: { type: Number, default: 0 },
            vitaminD: { type: Number, default: 0 },
            vitaminB1: { type: Number, default: 0 },
            vitaminB2: { type: Number, default: 0 },
            vitaminB3: { type: Number, default: 0 },
            vitaminB5: { type: Number, default: 0 },
            vitaminB6: { type: Number, default: 0 },
            vitaminB7: { type: Number, default: 0 },
            vitaminB9: { type: Number, default: 0 },
            vitaminB12: { type: Number, default: 0 },
            folate: { type: Number, default: 0 },
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
    dailyTotals: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      fiber: { type: Number, default: 0 },
      sugar: { type: Number, default: 0 },
      sodium: { type: Number, default: 0 },
      potassium: { type: Number, default: 0 },
      iron: { type: Number, default: 0 },
      calcium: { type: Number, default: 0 },
      vitaminB: { type: Number, default: 0 },
      magnesium: { type: Number, default: 0 },
      zinc: { type: Number, default: 0 },
      vitaminC: { type: Number, default: 0 },
      omega3: { type: Number, default: 0 },
      saturatedFat: { type: Number, default: 0 },
      monounsaturatedFat: { type: Number, default: 0 },
      polyunsaturatedFat: { type: Number, default: 0 },
      cholesterol: { type: Number, default: 0 },
      phosphorus: { type: Number, default: 0 },
      copper: { type: Number, default: 0 },
      selenium: { type: Number, default: 0 },
      manganese: { type: Number, default: 0 },
      vitaminA: { type: Number, default: 0 },
      vitaminE: { type: Number, default: 0 },
      vitaminD2: { type: Number, default: 0 },
      vitaminD3: { type: Number, default: 0 },
      vitaminD: { type: Number, default: 0 },
      vitaminB1: { type: Number, default: 0 },
      vitaminB2: { type: Number, default: 0 },
      vitaminB3: { type: Number, default: 0 },
      vitaminB5: { type: Number, default: 0 },
      vitaminB6: { type: Number, default: 0 },
      vitaminB7: { type: Number, default: 0 },
      vitaminB9: { type: Number, default: 0 },
      vitaminB12: { type: Number, default: 0 },
      folate: { type: Number, default: 0 },
    },
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

const GoalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    domain: { type: String, enum: ['fitness', 'nutrition', 'mental', 'lifestyle'], required: true },
    target: String,
    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
    startDate: Date,
    targetDate: Date,
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

module.exports = {
  FitnessLog: mongoose.model('FitnessLog', FitnessLogSchema),
  NutritionLog: mongoose.model('NutritionLog', NutritionLogSchema),
  WeightLog: mongoose.model('WeightLog', WeightLogSchema),
  StepsLog: mongoose.model('StepsLog', StepsLogSchema),
  MentalLog: mongoose.model('MentalLog', MentalLogSchema),
  Goal: mongoose.model('Goal', GoalSchema),
  MemorySummary: mongoose.model('MemorySummary', MemorySummarySchema),
};

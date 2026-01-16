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
        foods: [
          {
            name: String,
            quantity: Number,
            unit: { type: String, default: 'g' },
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
          },
        ],
        totalCalories: { type: Number, default: 0 },
        totalProtein: { type: Number, default: 0 },
        totalCarbs: { type: Number, default: 0 },
        totalFat: { type: Number, default: 0 },
        notes: String,
      },
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
    },
    notes: String,
  },
  { timestamps: true }
);

const WeightLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
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
    bodyFeel: { type: Number, min: 1, max: 10 },
    sleepHours: { type: Number, min: 0, max: 24 },
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

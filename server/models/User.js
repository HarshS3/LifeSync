const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema(
  {
    name: String,
    dosage: String,
    schedule: String,
  },
  { _id: false }
);

const LabValueSchema = new mongoose.Schema(
  {
    value: Number,
    unit: String,
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    
    // Basic Info
    age: Number,
    gender: String,
    
    // Body Stats
    height: Number,
    weight: Number,
    bodyFat: Number,
    restingHeartRate: Number,
    bloodType: String,
    
    // Health
    conditions: [String],
    allergies: [String],
    injuries: [String],
    medications: [MedicationSchema],
    supplements: [String],

    // Key Lab Markers (manual entry or OCR import)
    labMarkers: {
      hemoglobin: LabValueSchema,
      ferritin: LabValueSchema,
      iron: LabValueSchema,
      vitaminB12: LabValueSchema,
      vitaminD: LabValueSchema,
      tsh: LabValueSchema,
      crp: LabValueSchema,
      fastingGlucose: LabValueSchema,
      hba1c: LabValueSchema,
      lipids: {
        totalCholesterol: LabValueSchema,
        ldl: LabValueSchema,
        hdl: LabValueSchema,
        triglycerides: LabValueSchema,
      },
      updatedAt: Date,
      source: { type: String, enum: ['manual', 'ocr'], default: 'manual' },
    },
    
    // Diet Preferences
    dietType: { type: String, default: 'omnivore' },
    mealsPerDay: { type: Number, default: 3 },
    fastingWindow: String,
    avoidFoods: [String],
    favoriteFoods: [String],
    dailyCalorieTarget: Number,
    dailyProteinTarget: Number,
    hydrationGoal: { type: Number, default: 8 },
    
    // Workout Preferences
    trainingExperience: { type: String, default: 'intermediate' },
    preferredWorkouts: [String],
    workoutFrequency: { type: Number, default: 4 },
    workoutDuration: { type: Number, default: 60 },
    gymAccess: { type: Boolean, default: true },
    homeEquipment: [String],
    trainingGoals: [String],
    
    // Mental & Energy Patterns
    chronotype: { type: String, default: 'neutral' },
    averageSleep: { type: Number, default: 7 },
    stressTriggers: [String],
    motivators: [String],
    energyPeakTime: { type: String, default: 'morning' },
    focusChallenges: [String],
    
    // Style Preferences
    stylePreference: { type: String, default: 'casual' },
    favoriteColors: [String],
    avoidColors: [String],
    bodyConfidence: { type: Number, default: 5 },
    styleGoals: [String],
    
    // Personal Notes
    biggestChallenges: String,
    whatWorkedBefore: String,
    whatDidntWork: String,
    longTermVision: String,
    
    // Onboarding
    onboardingCompleted: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 0 },
    
    // Reminders & Notifications
    reminders: {
      habitReminders: { type: Boolean, default: true },
      medicationReminders: { type: Boolean, default: true },
      workoutReminders: { type: Boolean, default: true },
      wellnessCheckIn: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: true },
      reminderTimes: {
        morning: { type: String, default: '08:00' },
        evening: { type: String, default: '20:00' },
        workout: { type: String, default: '07:00' },
      },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },

    // Password reset (forgot-password)
    resetPasswordTokenHash: String,
    resetPasswordExpiresAt: Date,
    
    // Premium / Subscription
    subscription: {
      plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
      status: { type: String, enum: ['active', 'cancelled', 'expired', 'trial'], default: 'active' },
      trialEndsAt: Date,
      currentPeriodEnd: Date,
      stripeCustomerId: String,
      stripeSubscriptionId: String,
    },
    
    // Legacy - keep for compatibility
    preferences: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);

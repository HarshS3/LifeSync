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

const BodyMeasurementsSchema = new mongoose.Schema(
  {
    waistCm: Number,
    hipCm: Number,
    chestCm: Number,
    neckCm: Number,
    wristCm: Number,
    bicepCm: Number,
    thighCm: Number,
    bmi: Number,
    updatedAt: Date,
    source: { type: String, enum: ['manual', 'ocr'], default: 'manual' },
  },
  { _id: false }
);

const SegmentalSideSchema = new mongoose.Schema(
  {
    rightArm: Number,
    leftArm: Number,
    trunk: Number,
    rightLeg: Number,
    leftLeg: Number,
  },
  { _id: false }
);

const BodyCompositionSchema = new mongoose.Schema(
  {
    // Common InBody/Tanita-style metrics
    bmi: Number,
    bodyFatPercent: Number,
    fatMassKg: Number,
    smmKg: Number,
    proteinKg: Number,
    mineralKg: Number,
    tbwKg: Number,
    bmrKcal: Number,
    metabolicAge: Number,
    visceralFatLevel: Number,

    // Segmental fat values (some reports provide kg, some provide %)
    segmentalFatKg: SegmentalSideSchema,
    segmentalFatPercent: SegmentalSideSchema,

    // Segmental muscle mass (kg) - shown on many reports
    segmentalMuscleKg: SegmentalSideSchema,

    updatedAt: Date,
    source: { type: String, enum: ['manual', 'ocr'], default: 'manual' },
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
    education: String,
    profession: String,
    skills: [String],
    
    // Body Stats
    height: Number,
    weight: Number,
    bodyFat: Number,
    restingHeartRate: Number,
    bloodType: String,

    // Measurements (manual entry)
    bodyMeasurements: BodyMeasurementsSchema,
    bodyMeasurementLogs: [BodyMeasurementsSchema],

    // Body composition (manual entry or OCR import)
    bodyComposition: BodyCompositionSchema,
    
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
    // User's preferred meal times — used as defaults for chat-logged meals
    mealSchedule: {
      breakfast: { type: String, default: '08:00' },
      lunch:     { type: String, default: '13:00' },
      dinner:    { type: String, default: '20:00' },
      snack:     { type: String, default: '16:00' },
    },
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

    // Personality (optional)
    personality: {
      introversion: Number, // 1..10 (introvert -> extrovert)
      bigFive: {
        openness: Number,
        conscientiousness: Number,
        extraversion: Number,
        agreeableness: Number,
        neuroticism: Number,
      },
      decisionStyle: String,
      updatedAt: Date,
    },
    
    // Style Preferences
    stylePreference: { type: String, default: 'casual' },
    favoriteColors: [String],
    avoidColors: [String],
    bodyConfidence: { type: Number, default: 5 },
    styleGoals: [String],
    
    // Personal Notes
    biggestChallenges: String,
    fearMost: String,
    whatMattersMost: String,
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

    // Scientific Metabolic & Dietary Profile (DRI/BMR Calculation Engine)
    biologicalProfile: {
      biologicalSex: { 
        type: String, 
        enum: ['male', 'female', 'other', 'prefer-not'],
        default: 'other'
      },
      dob: Date,
      heightCm: Number,
      weightKg: Number,
      bodyFatPercentage: Number,
      activityLevel: { 
        type: String, 
        enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'], 
        default: 'sedentary' 
      },
      metabolicGoal: { 
        type: String, 
        enum: ['aggressive_loss', 'mild_loss', 'maintenance', 'lean_gain', 'aggressive_gain'], 
        default: 'maintenance' 
      },
      pregnancyStatus: { 
        type: String, 
        enum: ['none', 'pregnant_trimester_1', 'pregnant_trimester_2', 'pregnant_trimester_3', 'lactating'], 
        default: 'none' 
      },
      dietaryPreference: { 
        type: String, 
        enum: ['omnivore', 'pescatarian', 'vegetarian', 'vegan', 'keto', 'paleo', 'jain', 'halal', 'kosher'], 
        default: 'omnivore' 
      },
      hypertension: { type: Boolean, default: false },
      insulinSensitivity: { 
        type: String, 
        enum: ['high', 'normal', 'low', 'insulin_resistant', 'diabetic'], 
        default: 'normal' 
      },
      defaultSleepTime: { type: String, default: '22:30' },
      useAdaptiveTdee: { type: Boolean, default: true }
    },
    // Comprehensive calculated targets stored as a structured object
    clinicalTargets: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

// Safe seed script for LifeSync: creates (or reuses) a test user and adds sample data
// without deleting any existing data.
//
// Usage (PowerShell):
//   $env:MONGO_URI="mongodb://localhost:27017/lifesync"
//   $env:SEED_TEST_EMAIL="testuser@example.com"  # optional
//   node .\seed_test_user_safe.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const { Habit, HabitLog } = require('./models/Habit');
const { FitnessLog, NutritionLog, MentalLog, Goal, MemorySummary } = require('./models/Logs');
const { LongTermGoal, LongTermGoalLog } = require('./models/LongTermGoal');
const { WardrobeItem, Outfit } = require('./models/Wardrobe');
const SymptomLog = require('./models/SymptomLog');
const LabReport = require('./models/LabReport');

const MONGO_URI = process.env.MONGO_URI;
const SEED_TEST_EMAIL = process.env.SEED_TEST_EMAIL || 'testuser@example.com';

function dayAtMidnight(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayAtMidnight(d);
}

async function ensureUser() {
  const existing = await User.findOne({ email: SEED_TEST_EMAIL });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash('testpassword', 10);

  // Only set on insert; do not overwrite if user already exists.
  return User.create({
    name: 'Test User',
    email: SEED_TEST_EMAIL,
    password: passwordHash,

    // Profile/health
    age: 28,
    gender: 'male',
    height: 178,
    weight: 75,
    bodyFat: 15,
    restingHeartRate: 60,
    bloodType: 'O+',
    conditions: ['asthma'],
    allergies: ['pollen'],
    injuries: ['ankle sprain'],
    medications: [{ name: 'Ventolin', dosage: '2 puffs', schedule: 'as needed' }],
    supplements: ['Vitamin D'],

    // Nutrition
    dietType: 'omnivore',
    mealsPerDay: 3,
    fastingWindow: '16:8',
    avoidFoods: ['peanuts'],
    favoriteFoods: ['pizza', 'salad'],
    dailyCalorieTarget: 2500,
    dailyProteinTarget: 150,
    hydrationGoal: 10,

    // Training
    trainingExperience: 'advanced',
    preferredWorkouts: ['weightlifting', 'yoga'],
    workoutFrequency: 5,
    workoutDuration: 75,
    gymAccess: true,
    homeEquipment: ['dumbbells'],
    trainingGoals: ['muscle gain'],

    // Mindset
    chronotype: 'morning',
    averageSleep: 7.5,
    stressTriggers: ['work'],
    motivators: ['progress'],
    energyPeakTime: 'morning',
    focusChallenges: ['distractions'],

    // Style
    stylePreference: 'casual',
    favoriteColors: ['blue', 'black'],
    avoidColors: ['yellow'],
    bodyConfidence: 7,
    styleGoals: ['look sharp'],

    // Onboarding/meta
    biggestChallenges: 'Consistency',
    whatWorkedBefore: 'Accountability',
    whatDidntWork: 'Crash diets',
    longTermVision: 'Be healthy and happy',
    onboardingCompleted: true,
    onboardingStep: 5,

    reminders: {
      habitReminders: true,
      medicationReminders: true,
      workoutReminders: true,
      wellnessCheckIn: true,
      weeklyReport: true,
      reminderTimes: {
        morning: '07:30',
        evening: '21:00',
        workout: '18:00',
      },
      email: true,
      push: true,
    },

    subscription: {
      plan: 'pro',
      status: 'active',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
    },

    preferences: { darkMode: true },
  });
}

async function ensureHabits(userId) {
  const existing = await Habit.find({ user: userId });
  if (existing.length) return existing;

  return Habit.insertMany([
    {
      user: userId,
      name: 'Drink Water',
      description: 'Drink 8 glasses of water',
      icon: '💧',
      color: '#00bcd4',
      frequency: 'daily',
      customDays: [],
      targetPerDay: 8,
      unit: 'glasses',
      reminderTime: '09:00',
      isActive: true,
      streak: 10,
      longestStreak: 14,
      startDate: daysAgo(14),
      category: 'health',
    },
    {
      user: userId,
      name: 'Read Book',
      description: 'Read 20 pages',
      icon: '📚',
      color: '#ff9800',
      frequency: 'daily',
      customDays: [],
      targetPerDay: 20,
      unit: 'pages',
      reminderTime: '20:00',
      isActive: true,
      streak: 7,
      longestStreak: 10,
      startDate: daysAgo(14),
      category: 'learning',
    },
  ]);
}

async function ensureHabitLogs(userId, habits) {
  for (let i = 0; i < 14; i++) {
    const date = daysAgo(i);

    // Habit 1
    const h1 = habits[0];
    const h1Exists = await HabitLog.exists({ user: userId, habit: h1._id, date });
    if (!h1Exists) {
      await HabitLog.create({
        user: userId,
        habit: h1._id,
        date,
        completed: true,
        value: 8,
        notes: `Day ${i + 1} - Hydrated!`,
      });
    }

    // Habit 2
    const h2 = habits[1];
    const h2Exists = await HabitLog.exists({ user: userId, habit: h2._id, date });
    if (!h2Exists) {
      const completed = i % 2 === 0;
      await HabitLog.create({
        user: userId,
        habit: h2._id,
        date,
        completed,
        value: completed ? 20 : 0,
        notes: completed ? `Day ${i + 1} - Read!` : '',
      });
    }
  }
}

async function ensureFitnessLogs(userId) {
  for (let i = 0; i < 14; i++) {
    const date = daysAgo(i);
    const exists = await FitnessLog.exists({ user: userId, date });
    if (exists) continue;

    await FitnessLog.create({
      user: userId,
      date,
      type: i % 2 === 0 ? 'cardio' : 'strength',
      focus: i % 2 === 0 ? 'endurance' : 'muscle',
      intensity: 7 + (i % 3),
      fatigue: 5 + (i % 4),
      notes: `Workout notes for day ${i + 1}`,
    });
  }
}

async function ensureNutritionLogs(userId) {
  for (let i = 0; i < 14; i++) {
    const date = daysAgo(i);
    const exists = await NutritionLog.exists({ user: userId, date });
    if (exists) continue;

    await NutritionLog.create({
      user: userId,
      date,
      meals: [
        {
          name: 'Breakfast',
          mealType: 'breakfast',
          time: '08:00',
          foods: [
            { name: 'Oats', quantity: 50, unit: 'g', calories: 200, protein: 7, carbs: 35, fat: 3, fiber: 5, sugar: 1, sodium: 10 },
            { name: 'Eggs', quantity: 2, unit: 'pcs', calories: 140, protein: 12, carbs: 1, fat: 10, fiber: 0, sugar: 0, sodium: 120 },
          ],
          totalCalories: 340,
          totalProtein: 19,
          totalCarbs: 36,
          totalFat: 13,
          notes: 'Good breakfast',
        },
        {
          name: 'Lunch',
          mealType: 'lunch',
          time: '13:00',
          foods: [
            { name: 'Chicken', quantity: 150, unit: 'g', calories: 250, protein: 30, carbs: 0, fat: 10, fiber: 0, sugar: 0, sodium: 70 },
            { name: 'Rice', quantity: 100, unit: 'g', calories: 130, protein: 3, carbs: 28, fat: 0, fiber: 1, sugar: 0, sodium: 1 },
          ],
          totalCalories: 380,
          totalProtein: 33,
          totalCarbs: 28,
          totalFat: 10,
          notes: 'Lunch was filling',
        },
      ],
      waterIntake: 2000 + i * 50,
      dailyTotals: {
        calories: 2500,
        protein: 150,
        carbs: 300,
        fat: 70,
        fiber: 30,
        sugar: 40,
        sodium: 2000,
      },
      notes: `Nutrition notes for day ${i + 1}`,
    });
  }
}

async function ensureMentalLogs(userId) {
  const moods = ['very-low', 'low', 'neutral', 'good', 'great'];
  for (let i = 0; i < 14; i++) {
    const date = daysAgo(i);
    const exists = await MentalLog.exists({ user: userId, date });
    if (exists) continue;

    await MentalLog.create({
      user: userId,
      date,
      mood: moods[i % moods.length],
      moodScore: 5 + (i % 6),
      stressLevel: 3 + (i % 5),
      energyLevel: 6 + (i % 4),
      bodyFeel: 5 + (i % 5),
      sleepHours: 6 + (i % 3),
      medsTaken: ['Ventolin'],
      journalSnippet: `Journal for day ${i + 1}`,
      notes: `Mental notes for day ${i + 1}`,
    });
  }
}

async function ensureGoal(userId) {
  const existing = await Goal.findOne({ user: userId, title: 'Lose 5kg' });
  if (existing) return existing;

  return Goal.create({
    user: userId,
    title: 'Lose 5kg',
    domain: 'fitness',
    target: '70kg',
    status: 'active',
    startDate: daysAgo(14),
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
}

async function ensureMemorySummary(userId) {
  const existing = await MemorySummary.findOne({ user: userId, periodLabel: 'Last 2 Weeks' });
  if (existing) return existing;

  return MemorySummary.create({
    user: userId,
    periodLabel: 'Last 2 Weeks',
    from: daysAgo(14),
    to: daysAgo(0),
    summary: 'Great progress in habits and fitness.',
    tags: ['progress', 'fitness'],
  });
}

async function ensureSymptomsAndLabs(userId) {
  const symptomCount = await SymptomLog.countDocuments({ user: userId });
  if (symptomCount === 0) {
    for (let i = 0; i < 10; i++) {
      const date = daysAgo(i);
      await SymptomLog.create({
        user: userId,
        date,
        symptomName: i % 2 === 0 ? 'headache' : 'nausea',
        severity: i % 2 === 0 ? 5 + (i % 4) : 2 + (i % 3),
        tags: i % 2 === 0 ? ['screen', 'stress'] : ['stomach'],
        notes: `Seed symptom log for day ${i + 1}`,
      });
    }
  }

  const labCount = await LabReport.countDocuments({ user: userId });
  if (labCount === 0) {
    await LabReport.create({
      user: userId,
      date: daysAgo(5),
      panelName: 'CBC',
      source: 'seed',
      notes: 'Seed lab report',
      results: [
        { name: 'Hemoglobin', value: 12.1, unit: 'g/dL', refRangeLow: 13.5, refRangeHigh: 17.5, flag: 'low' },
        { name: 'WBC', value: 6.2, unit: 'x10^9/L', refRangeLow: 4.0, refRangeHigh: 11.0, flag: 'normal' },
      ],
    });
  }
}

async function ensureLongTermGoal(userId) {
  let goal = await LongTermGoal.findOne({ user: userId, name: '30 Days Abstinence' });
  if (!goal) {
    goal = await LongTermGoal.create({
      user: userId,
      name: '30 Days Abstinence',
      description: 'Maintain abstinence for 30 days',
      category: 'addiction',
      goalType: 'abstain',
      color: '#8b5cf6',
      icon: '🎯',
      startDate: daysAgo(14),
      targetDays: 30,
      currentStreak: 14,
      longestStreak: 14,
      totalRelapses: 1,
      isActive: true,
      motivationText: 'Stay strong',
      rewards: ['Ice cream', 'Movie night'],
    });
  }

  const logsCount = await LongTermGoalLog.countDocuments({ user: userId, goal: goal._id });
  if (logsCount === 0) {
    for (let i = 0; i < 14; i++) {
      const date = daysAgo(i);
      await LongTermGoalLog.create({
        user: userId,
        goal: goal._id,
        date,
        status: i === 7 ? 'relapse' : 'success',
        relapseCount: i === 7 ? 1 : 0,
        intensity: i === 7 ? 8 : 1,
        trigger: i === 7 ? 'stress' : '',
        contributionType: i % 3 === 0 ? 'major' : 'maintenance',
        timeSpent: 30 + i,
        urgeLevel: 5 + (i % 5),
        mood: 6 + (i % 4),
        notes: `Long term goal notes for day ${i + 1}`,
        lessonsLearned: i === 7 ? 'Avoid stress triggers' : '',
      });
    }
  }

  return goal;
}

async function ensureWardrobe(userId) {
  const itemCount = await WardrobeItem.countDocuments({ user: userId });
  let items;
  if (itemCount === 0) {
    items = await WardrobeItem.insertMany([
      {
        user: userId,
        name: 'Blue T-Shirt',
        category: 'tops',
        colors: ['blue'],
        occasions: ['casual'],
        seasons: ['summer', 'all-season'],
        brand: 'Uniqlo',
        imageUrl: '',
        favorite: true,
        notes: 'Comfy',
        timesWorn: 10,
        lastWorn: daysAgo(0),
      },
      {
        user: userId,
        name: 'Black Jeans',
        category: 'bottoms',
        colors: ['black'],
        occasions: ['casual', 'work'],
        seasons: ['fall', 'winter', 'all-season'],
        brand: 'Levis',
        imageUrl: '',
        favorite: false,
        notes: 'Classic',
        timesWorn: 15,
        lastWorn: daysAgo(0),
      },
    ]);
  } else {
    items = await WardrobeItem.find({ user: userId }).limit(10);
  }

  const outfitExists = await Outfit.exists({ user: userId, name: 'Casual Friday' });
  if (!outfitExists && items.length) {
    await Outfit.create({
      user: userId,
      name: 'Casual Friday',
      items: items.map(i => i._id),
      occasion: 'casual',
      weather: 'mild',
      description: 'Perfect for a relaxed day',
      favorite: true,
      timesWorn: 3,
    });
  }
}

async function main() {
  if (!MONGO_URI) {
    console.error('Missing MONGO_URI. Set MONGO_URI in your environment before running seed_test_user_safe.js');
    process.exit(1);
  }

  const started = Date.now();
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10_000 });

  try {
    const user = await ensureUser();
    const userId = user._id;

    const habits = await ensureHabits(userId);
    if (habits.length >= 2) {
      await ensureHabitLogs(userId, habits);
    }

    await ensureFitnessLogs(userId);
    await ensureNutritionLogs(userId);
    await ensureMentalLogs(userId);

    await ensureGoal(userId);
    await ensureMemorySummary(userId);

    await ensureSymptomsAndLabs(userId);
    await ensureLongTermGoal(userId);
    await ensureWardrobe(userId);

    const elapsedMs = Date.now() - started;
    console.log(`Safe seed complete for ${SEED_TEST_EMAIL} (${elapsedMs}ms). Existing data was preserved.`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  });
}


// Enhanced seed script for LifeSync: creates a user and fills all fields for 2 weeks for all major models

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { Habit, HabitLog } = require('./models/Habit');
const { FitnessLog, NutritionLog, MentalLog, Goal, MemorySummary } = require('./models/Logs');
const { LongTermGoal, LongTermGoalLog } = require('./models/LongTermGoal');
const { WardrobeItem, Outfit } = require('./models/Wardrobe');
const SymptomLog = require('./models/SymptomLog');
const LabReport = require('./models/LabReport');
require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI;
const SEED_TEST_EMAIL = process.env.SEED_TEST_EMAIL || 'testuser@example.com';

if (!MONGO_URI) {
  console.error('Missing MONGO_URI. Set MONGO_URI in your environment before running seed.js');
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGO_URI);

  // IMPORTANT: Only wipe data for the seed test user.
  // Never delete entire collections, or you'll wipe real user data.
  const existingUser = await User.findOne({ email: SEED_TEST_EMAIL });
  if (existingUser?._id) {
    const userId = existingUser._id;
    await HabitLog.deleteMany({ user: userId });
    await Habit.deleteMany({ user: userId });
    await FitnessLog.deleteMany({ user: userId });
    await NutritionLog.deleteMany({ user: userId });
    await MentalLog.deleteMany({ user: userId });
    await Goal.deleteMany({ user: userId });
    await MemorySummary.deleteMany({ user: userId });
    await SymptomLog.deleteMany({ user: userId });
    await LabReport.deleteMany({ user: userId });
    await LongTermGoal.deleteMany({ user: userId });
    await LongTermGoalLog.deleteMany({ user: userId });
    await WardrobeItem.deleteMany({ user: userId });
    await Outfit.deleteMany({ user: userId });
    await User.deleteOne({ _id: userId });
  }

  // Create user with all fields
  const passwordHash = await bcrypt.hash('testpassword', 10);
  const user = await User.create({
    name: 'Test User',
    email: SEED_TEST_EMAIL,
    password: passwordHash,
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
    dietType: 'omnivore',
    mealsPerDay: 3,
    fastingWindow: '16:8',
    avoidFoods: ['peanuts'],
    favoriteFoods: ['pizza', 'salad'],
    dailyCalorieTarget: 2500,
    dailyProteinTarget: 150,
    hydrationGoal: 10,
    trainingExperience: 'advanced',
    preferredWorkouts: ['weightlifting', 'yoga'],
    workoutFrequency: 5,
    workoutDuration: 75,
    gymAccess: true,
    homeEquipment: ['dumbbells'],
    trainingGoals: ['muscle gain'],
    chronotype: 'morning',
    averageSleep: 7.5,
    stressTriggers: ['work'],
    motivators: ['progress'],
    energyPeakTime: 'morning',
    focusChallenges: ['distractions'],
    stylePreference: 'casual',
    favoriteColors: ['blue', 'black'],
    avoidColors: ['yellow'],
    bodyConfidence: 7,
    styleGoals: ['look sharp'],
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

  // Create habits
  const habits = await Habit.insertMany([
    {
      user: user._id,
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
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      category: 'health',
    },
    {
      user: user._id,
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
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      category: 'learning',
    },
  ]);

  // Create 14 days of logs for each habit
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    await HabitLog.create({
      user: user._id,
      habit: habits[0]._id,
      date,
      completed: true,
      value: 8,
      notes: `Day ${i + 1} - Hydrated!`,
    });
    await HabitLog.create({
      user: user._id,
      habit: habits[1]._id,
      date,
      completed: i % 2 === 0,
      value: i % 2 === 0 ? 20 : 0,
      notes: i % 2 === 0 ? `Day ${i + 1} - Read!` : '',
    });
    // Fitness log
    await FitnessLog.create({
      user: user._id,
      date,
      type: i % 2 === 0 ? 'cardio' : 'strength',
      focus: i % 2 === 0 ? 'endurance' : 'muscle',
      intensity: 7 + (i % 3),
      fatigue: 5 + (i % 4),
      notes: `Workout notes for day ${i + 1}`,
    });
    // Nutrition log
    await NutritionLog.create({
      user: user._id,
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
    // Mental log
    await MentalLog.create({
      user: user._id,
      date,
      mood: ['very-low', 'low', 'neutral', 'good', 'great'][i % 5],
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

  // Phase 3: Create sample symptom logs + a lab report
  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    await SymptomLog.create({
      user: user._id,
      date,
      symptomName: i % 2 === 0 ? 'headache' : 'nausea',
      severity: i % 2 === 0 ? 5 + (i % 4) : 2 + (i % 3),
      tags: i % 2 === 0 ? ['screen', 'stress'] : ['stomach'],
      notes: `Seed symptom log for day ${i + 1}`,
    });
  }

  await LabReport.create({
    user: user._id,
    date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
    panelName: 'CBC',
    source: 'seed',
    notes: 'Seed lab report',
    results: [
      { name: 'Hemoglobin', value: 12.1, unit: 'g/dL', refRangeLow: 13.5, refRangeHigh: 17.5, flag: 'low' },
      { name: 'WBC', value: 6.2, unit: 'x10^9/L', refRangeLow: 4.0, refRangeHigh: 11.0, flag: 'normal' },
    ],
  });

  // Create a goal
  const goal = await Goal.create({
    user: user._id,
    title: 'Lose 5kg',
    domain: 'fitness',
    target: '70kg',
    status: 'active',
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  // Create a memory summary
  await MemorySummary.create({
    user: user._id,
    periodLabel: 'Last 2 Weeks',
    from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    to: today,
    summary: 'Great progress in habits and fitness.',
    tags: ['progress', 'fitness'],
  });

  // Create a long term goal and logs
  const ltGoal = await LongTermGoal.create({
    user: user._id,
    name: '30 Days Abstinence',
    description: 'Maintain abstinence for 30 days',
    category: 'addiction',
    goalType: 'abstain',
    color: '#8b5cf6',
    icon: '🎯',
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    targetDays: 30,
    currentStreak: 14,
    longestStreak: 14,
    totalRelapses: 1,
    isActive: true,
    motivationText: 'Stay strong',
    rewards: ['Ice cream', 'Movie night'],
  });
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    await LongTermGoalLog.create({
      user: user._id,
      goal: ltGoal._id,
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

  // Create wardrobe items and an outfit
  const items = await WardrobeItem.insertMany([
    {
      user: user._id,
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
      lastWorn: today,
    },
    {
      user: user._id,
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
      lastWorn: today,
    },
  ]);
  await Outfit.create({
    user: user._id,
    name: 'Casual Friday',
    items: items.map(i => i._id),
    occasion: 'casual',
    weather: 'mild',
    description: 'Perfect for a relaxed day',
    favorite: true,
    timesWorn: 3,
  });

  console.log(`Full seed data created for ${SEED_TEST_EMAIL}`);
  mongoose.disconnect();
}

seed();

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { WeightLog, NutritionLog, MentalLog, FitnessLog, StepsLog } = require('../models/Logs');
const JournalEntry = require('../models/JournalEntry');
const Workout = require('../models/Workout');
const { Habit, HabitLog } = require('../models/Habit');
const { LongTermGoal, LongTermGoalLog } = require('../models/LongTermGoal');

// Services
const { analyzeCorrelations } = require('../services/insights/correlationEngine');
const { computeWeeklyMacroAggregation } = require('../services/nutritionAggregation/weeklyAggregator');
const { upsertDailyLifeState } = require('../services/dailyLifeState/upsertDailyLifeState');
const { dayKeyFromDate } = require('../services/dailyLifeState/dayKey');
const DailyLifeState = require('../models/DailyLifeState');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';

async function runComprehensiveTests() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB for Comprehensive Testing');

  const email = `comp_test_${Date.now()}@example.com`;
  let user;
  try {
    user = await User.create({
      name: 'Comprehensive Test User',
      email,
      password: 'password123',
      weight: 75,
      biologicalProfile: {
        weight: 75,
        biologicalSex: 'female',
        heightCm: 165,
        activityLevel: 'moderately_active'
      },
      hydrationGoal: 2.5,
      dailyCalorieTarget: 2000,
      dailyProteinTarget: 120
    });
  } catch (err) {
    console.error('User creation failed:', err);
    await mongoose.disconnect();
    return;
  }

  console.log(`Created test user: ${user._id}`);

  // Create Habit
  const habit = await Habit.create({
    user: user._id,
    name: 'Morning Meditation',
    frequency: 'daily',
    category: 'mindfulness'
  });

  // Create Long Term Goal
  const goal = await LongTermGoal.create({
    user: user._id,
    name: 'Run a 5K',
    startDate: new Date(),
    targetDays: 30,
    category: 'health',
    goalType: 'build'
  });

  // Seed 14 days of data
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const nutritions = [];
  const mentals = [];
  const workouts = [];
  const steps = [];
  const habitsLogs = [];
  const journals = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(12, 0, 0, 0);
    
    // Pattern: High stress on days with poor sleep. Poor sleep on days with late coffee.
    const hasLateCoffee = i % 3 === 0;
    const sleepHours = hasLateCoffee ? 5 : 8;
    const stress = hasLateCoffee ? 8 : 3;

    nutritions.push({
      user: user._id,
      date: d,
      dailyTotals: { 
        calories: 1800 + (Math.random() * 400), 
        protein: 100 + (Math.random() * 40), 
        carbs: 150, 
        fat: 60,
        waterIntake: 2000 
      },
      meals: [
        {
          name: 'Dinner',
          foods: hasLateCoffee ? [{ name: 'Coffee', calories: 5 }] : []
        }
      ]
    });

    mentals.push({
      user: user._id,
      date: d,
      sleepHours,
      sleepQuality: sleepHours >= 7 ? 8 : 4,
      energyLevel: sleepHours >= 7 ? 8 : 4,
      stressLevel: stress,
      mood: sleepHours >= 7 ? 'good' : 'low'
    });

    steps.push({
      user: user._id,
      date: d,
      stepsCount: 5000 + Math.floor(Math.random() * 5000)
    });

    if (i % 2 === 0) {
      workouts.push({
        user: user._id,
        date: d,
        name: 'Leg Day',
        exercises: [
          { name: 'Squat', muscleGroup: 'legs', sets: [{ reps: 10, weight: 60 }, { reps: 8, weight: 65 }] }
        ]
      });
    }

    if (sleepHours >= 7) {
      habitsLogs.push({
        user: user._id,
        habit: habit._id,
        date: d,
        completed: true
      });
    }

    journals.push({
      user: user._id,
      date: d,
      text: hasLateCoffee ? "Felt anxious and couldn't sleep well." : "Great day, lots of energy."
    });
  }

  await NutritionLog.insertMany(nutritions);
  await MentalLog.insertMany(mentals);
  await StepsLog.insertMany(steps);
  await Workout.insertMany(workouts);
  await HabitLog.insertMany(habitsLogs);
  await JournalEntry.insertMany(journals);

  // ----------------------------------------------------
  // TEST 1: Correlation Engine
  // ----------------------------------------------------
  console.log('\n>>> TEST 1: Correlation Engine <<<');
  try {
    const correlations = await analyzeCorrelations(user._id);
    console.log(`Found ${correlations.length} correlations.`);
    console.log(JSON.stringify(correlations, null, 2));
  } catch (err) {
    console.error('Correlation Engine Failed:', err);
  }

  // ----------------------------------------------------
  // TEST 2: Weekly Macro Aggregation
  // ----------------------------------------------------
  console.log('\n>>> TEST 2: Weekly Macro Aggregation <<<');
  try {
    const weekKey = `${now.getFullYear()}-W${String(Math.ceil((((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)).padStart(2, '0')}`;
    const macros = await computeWeeklyMacroAggregation(user._id, weekKey);
    console.log(`Weekly Macros for ${weekKey}:`);
    console.log(JSON.stringify(macros, null, 2));
  } catch (err) {
    console.error('Macro Aggregation Failed:', err);
  }

  // ----------------------------------------------------
  // TEST 3: Daily Life State Recompute
  // ----------------------------------------------------
  console.log('\n>>> TEST 3: Daily Life State Recompute <<<');
  try {
    const todayKey = dayKeyFromDate(now);
    await upsertDailyLifeState({ userId: user._id, dayKey: todayKey });
    const dls = await DailyLifeState.findOne({ user: user._id, dayKey: todayKey });
    console.log('Daily Life State (Today):');
    console.log(JSON.stringify({
      dayKey: dls?.dayKey,
      signals: dls?.signals ? Object.keys(dls.signals) : [],
      summary: dls?.summaryState
    }, null, 2));
  } catch (err) {
    console.error('Daily Life State Recompute Failed:', err);
  }

  // Cleanup
  console.log('\nCleaning up comprehensive test user...');
  await User.findByIdAndDelete(user._id);
  await NutritionLog.deleteMany({ user: user._id });
  await MentalLog.deleteMany({ user: user._id });
  await StepsLog.deleteMany({ user: user._id });
  await Workout.deleteMany({ user: user._id });
  await Habit.deleteMany({ userId: user._id });
  await HabitLog.deleteMany({ habitId: habit._id });
  await LongTermGoal.deleteMany({ user: user._id });
  await JournalEntry.deleteMany({ user: user._id });
  await DailyLifeState.deleteMany({ user: user._id });

  await mongoose.disconnect();
  console.log('Done.');
}

runComprehensiveTests().catch(console.error);

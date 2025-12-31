/*
  Seed demo showcase data for LifeSync (non-destructive, deterministic).

  Goal: create a rich 30-day storyline that reliably produces:
  - DailyLifeState summaries with confidence >= 0.6
  - PatternMemory / IdentityMemory signals (sleep, stress, training, nutrition)
  - Data across modules (habits, symptoms, labs, journal, goals, wardrobe, gym)

  Usage (PowerShell):
    $env:MONGO_URI="mongodb://localhost:27017/lifesync"
    $env:SEED_SHOWCASE_EMAIL="showcase.user@lifesync.local"   # optional
    $env:SEED_SHOWCASE_PASSWORD="demopassword"                # optional
    $env:SEED_SHOWCASE_DAYS="30"                              # optional
    node .\scripts\seed_demo_showcase.js

  Notes:
  - Does NOT delete existing data.
  - Uses upserts keyed by (user + day) and tags notes with "seed_showcase".
*/

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const { Habit, HabitLog } = require('../models/Habit');
const { FitnessLog, NutritionLog, MentalLog, Goal } = require('../models/Logs');
const { LongTermGoal, LongTermGoalLog } = require('../models/LongTermGoal');
const { WardrobeItem, Outfit } = require('../models/Wardrobe');
const SymptomLog = require('../models/SymptomLog');
const LabReport = require('../models/LabReport');
const JournalEntry = require('../models/JournalEntry');
const MemoryOverride = require('../models/MemoryOverride');

const DailyLifeState = require('../models/DailyLifeState');
const PatternMemory = require('../models/PatternMemory');
const IdentityMemory = require('../models/IdentityMemory');
const { upsertDailyLifeState } = require('../services/dailyLifeState/upsertDailyLifeState');
const { computePatternMemory } = require('../services/patternMemory/computePatternMemory');
const { computeIdentityMemory } = require('../services/identityMemory/computeIdentityMemory');

const SEED_TAG = '[seed:demo:showcase]';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';
const SEED_EMAIL = process.env.SEED_SHOWCASE_EMAIL || 'showcase.user@lifesync.local';
const SEED_PASSWORD = process.env.SEED_SHOWCASE_PASSWORD || 'demopassword';
const SEED_NAME = process.env.SEED_SHOWCASE_NAME || 'Showcase User';
const SEED_DAYS = Math.max(7, Math.min(90, Number(process.env.SEED_SHOWCASE_DAYS || 30)));

function dayKeyFromDateLocal(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function dateForDayKeyLocalNoon(dayKey) {
  return new Date(`${dayKey}T12:00:00`);
}

function dateForDayKeyLocalLate(dayKey, hh, mm) {
  const h = String(Number(hh) || 0).padStart(2, '0');
  const m = String(Number(mm) || 0).padStart(2, '0');
  return new Date(`${dayKey}T${h}:${m}:00`);
}

function dayRangeLocal(dayKey) {
  const noon = dateForDayKeyLocalNoon(dayKey);
  const start = new Date(noon);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end, noon };
}

function dayKeyPlus(dayKey, deltaDays) {
  const [y, m, d] = String(dayKey).split('-').map((x) => Number(x));
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + deltaDays);
  return dayKeyFromDateLocal(dt);
}

function buildDayKeys({ days, endDayKey }) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(dayKeyPlus(endDayKey, -i));
  }
  return out;
}

async function ensureUser() {
  const existing = await User.findOne({ email: SEED_EMAIL });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  return User.create({
    name: SEED_NAME,
    email: SEED_EMAIL,
    password: passwordHash,

    // Keep profile light; this is a demo user.
    age: 28,
    gender: 'male',
    height: 176,
    weight: 74,

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
      push: false,
    },

    preferences: { darkMode: true },
  });
}

async function ensureHabits(userId) {
  const habitDefs = [
    {
      name: 'Drink Water',
      description: 'Hydration baseline',
      icon: '💧',
      color: '#00bcd4',
      frequency: 'daily',
      targetPerDay: 2000,
      unit: 'ml',
      reminderTime: '09:00',
      isActive: true,
      category: 'health',
    },
    {
      name: 'Walk',
      description: 'Steps / light movement',
      icon: '🚶',
      color: '#22c55e',
      frequency: 'daily',
      targetPerDay: 8000,
      unit: 'steps',
      reminderTime: '17:30',
      isActive: true,
      category: 'fitness',
    },
    {
      name: 'Read',
      description: '20 pages',
      icon: '📚',
      color: '#ff9800',
      frequency: 'daily',
      targetPerDay: 20,
      unit: 'pages',
      reminderTime: '20:00',
      isActive: true,
      category: 'learning',
    },
    {
      name: 'Bedtime Routine',
      description: 'Screens off, wind down',
      icon: '🌙',
      color: '#6366f1',
      frequency: 'daily',
      targetPerDay: 1,
      unit: 'done',
      reminderTime: '22:00',
      isActive: true,
      category: 'other',
    },
    {
      name: 'Protein',
      description: 'Hit protein target',
      icon: '🥚',
      color: '#ef4444',
      frequency: 'daily',
      targetPerDay: 130,
      unit: 'g',
      reminderTime: '19:30',
      isActive: true,
      category: 'health',
    },
    {
      name: 'Meditation',
      description: '10 minutes',
      icon: '🧘',
      color: '#14b8a6',
      frequency: 'daily',
      targetPerDay: 10,
      unit: 'min',
      reminderTime: '07:00',
      isActive: true,
      category: 'mindfulness',
    },
  ];

  const existing = await Habit.find({ user: userId, isActive: true });
  const existingByName = new Map(existing.map((h) => [String(h.name || '').toLowerCase(), h]));

  for (const def of habitDefs) {
    const key = def.name.toLowerCase();
    if (existingByName.has(key)) continue;
    await Habit.create({
      user: userId,
      ...def,
      startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      streak: 0,
      longestStreak: 0,
    });
  }

  return Habit.find({ user: userId, isActive: true }).sort({ createdAt: 1 });
}

function storylineForOffset(offsetFromStart, totalDays) {
  // offsetFromStart: 0..(totalDays-1)
  // Three-act arc:
  // - Act 1 (first ~10 days): stable baseline
  // - Act 2 (middle ~10 days): heavier training + a "temporary phase" window
  // - Act 3 (last ~10 days): recovery + consistent routine

  const t = offsetFromStart / Math.max(1, totalDays - 1);

  const phase = t < 0.34 ? 'baseline' : t < 0.67 ? 'pressure' : 'recovery';

  // Deterministic anchors to reliably trigger PatternMemory constraints:
  // - Low sleep days spaced by >=2 days and spanning >2 weeks.
  // - High stress days spaced.
  // - Low nutrition days spaced.
  // - High training days spaced.

  // Keep pattern triggers spaced by >= 2 days so they all qualify.
  // We intentionally create enough occurrences to push PatternMemory above the "active" threshold.
  const isLowSleepDay = offsetFromStart >= 2
    && offsetFromStart <= totalDays - 2
    && (offsetFromStart % 2 === 0); // ~14 supports in 30 days
  const prevWasLowSleep = offsetFromStart > 0 && (offsetFromStart - 1) >= 2 && ((offsetFromStart - 1) % 2 === 0);

  const isHighStressDay = offsetFromStart >= 2
    && offsetFromStart <= totalDays - 2
    && (offsetFromStart % 3 === 2); // ~9-10 supports in 30 days
  const isLowNutritionDay = offsetFromStart >= 3
    && offsetFromStart <= totalDays - 2
    && (offsetFromStart % 7 === 3); // ~4 supports

  const isHighTrainingDay = offsetFromStart >= 4
    && offsetFromStart <= totalDays - 2
    && (offsetFromStart % 6 === 4); // ~4-5 supports
  const prevWasHighTraining = offsetFromStart > 0 && (offsetFromStart - 1) >= 4 && ((offsetFromStart - 1) % 6 === 4);

  // "Temporary phase" is a short block inside Act 2.
  const isTemporaryPhase = offsetFromStart >= 12 && offsetFromStart <= 17;

  const sleepHours = isLowSleepDay ? 5.2 : phase === 'pressure' ? 6.6 : 7.4;

  const stressLevel = isHighStressDay
    ? 8.2
    : isTemporaryPhase
      ? 7.8
      : phase === 'pressure'
        ? 5.6
        : phase === 'recovery'
          ? 4.1
          : 4.6;

  // Patterns look for "next day" low energy after low sleep / high training.
  const energyLevel = (prevWasLowSleep || prevWasHighTraining)
    ? 3.2
    : isHighStressDay
      ? 3.4
      : isTemporaryPhase
        ? 4.0
      : phase === 'pressure'
        ? 5.5
        : 7.2;

  const energyLevelFinal = isLowNutritionDay ? Math.min(energyLevel, 3.8) : energyLevel;

  // Nutrition: keep confidence >= 0.6 always, but make some days "low nutrition".
  const nutrition = isLowNutritionDay
    ? { calories: 900, protein: 0, carbs: 0, fat: 0, waterMl: 0 }
    : phase === 'pressure'
      ? { calories: 2300, protein: 140, carbs: 240, fat: 70, waterMl: 1800 }
      : { calories: 2100, protein: 130, carbs: 220, fat: 60, waterMl: 2000 };

  // Fitness logs for trainingLoad signal.
  const fitness = isHighTrainingDay
    ? { intensity: 9, fatigue: 8, type: 'strength', focus: 'push' }
    : (phase === 'pressure' && offsetFromStart % 3 === 0)
      ? { intensity: 7, fatigue: 6, type: 'cardio', focus: 'conditioning' }
      : null;

  // Habit completion dip in temporary phase.
  const habitsCompletionFactor = isTemporaryPhase ? 0.55 : phase === 'pressure' ? 0.75 : 0.88;

  // Symptoms as supporting evidence (not in summaryState, but in DLS context).
  const symptoms = [];
  if (isLowSleepDay || isHighStressDay || isTemporaryPhase) {
    symptoms.push({ symptomName: 'Headache', severity: isHighStressDay ? 7 : 5, tags: ['stress'] });
    symptoms.push({ symptomName: 'Neck tension', severity: 5, tags: ['work'] });
  }
  if (isLowNutritionDay) {
    symptoms.push({ symptomName: 'Stomach discomfort', severity: 5, tags: ['diet'] });
  }

  return {
    phase,
    isTemporaryPhase,
    sleepHours,
    stressLevel,
    energyLevel: energyLevelFinal,
    nutrition,
    fitness,
    habitsCompletionFactor,
    symptoms,
  };
}

async function upsertMentalForDay(userId, dayKey, { sleepHours, stressLevel, energyLevel }) {
  const { start, end, noon } = dayRangeLocal(dayKey);
  const date = dateForDayKeyLocalLate(dayKey, 23, 50);

  await MentalLog.updateOne(
    { user: userId, date: { $gte: start, $lt: end }, notes: `${SEED_TAG} mental` },
    {
      $set: {
        user: userId,
        date,
        mood: energyLevel <= 3.5 ? 'low' : energyLevel >= 7 ? 'great' : 'neutral',
        moodScore: Math.max(1, Math.min(10, Math.round(energyLevel * 1.2))),
        stressLevel: Math.max(1, Math.min(10, Math.round(stressLevel))),
        energyLevel: Math.max(1, Math.min(10, Math.round(energyLevel))),
        sleepHours: Math.max(0, Math.min(24, Number(sleepHours) || 0)),
        notes: `${SEED_TAG} mental`,
      },
    },
    { upsert: true }
  );
}

async function upsertNutritionForDay(userId, dayKey, { calories, protein, carbs, fat, waterMl }) {
  const { start, end, noon } = dayRangeLocal(dayKey);
  const date = dateForDayKeyLocalLate(dayKey, 23, 40);

  const dailyTotals = {
    calories: Math.max(0, Number(calories) || 0),
    protein: Math.max(0, Number(protein) || 0),
    carbs: Math.max(0, Number(carbs) || 0),
    fat: Math.max(0, Number(fat) || 0),
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };

  const meals = dailyTotals.calories
    ? [
        {
          name: 'Seed day',
          mealType: 'lunch',
          time: '13:00',
          foods: [
            {
              name: 'Seed macros',
              quantity: 1,
              unit: 'serving',
              calories: dailyTotals.calories,
              protein: dailyTotals.protein,
              carbs: dailyTotals.carbs,
              fat: dailyTotals.fat,
              fiber: 0,
              sugar: 0,
              sodium: 0,
            },
          ],
          totalCalories: dailyTotals.calories,
          totalProtein: dailyTotals.protein,
          totalCarbs: dailyTotals.carbs,
          totalFat: dailyTotals.fat,
          notes: `${SEED_TAG} nutrition`,
        },
      ]
    : [];

  await NutritionLog.updateOne(
    { user: userId, date: { $gte: start, $lt: end }, notes: `${SEED_TAG} nutrition` },
    {
      $set: {
        user: userId,
        date,
        meals,
        waterIntake: Math.max(0, Number(waterMl) || 0),
        dailyTotals,
        notes: `${SEED_TAG} nutrition`,
      },
    },
    { upsert: true }
  );
}

async function upsertFitnessForDay(userId, dayKey, fitness) {
  const { start, end, noon } = dayRangeLocal(dayKey);
  const date = dateForDayKeyLocalLate(dayKey, 23, 30);

  if (!fitness) {
    // Non-destructive: do nothing when not training that day.
    return;
  }

  await FitnessLog.updateOne(
    { user: userId, date: { $gte: start, $lt: end }, type: 'seed_showcase' },
    {
      $set: {
        user: userId,
        date,
        type: 'seed_showcase',
        focus: fitness.focus || 'seed',
        intensity: Math.max(1, Math.min(10, Number(fitness.intensity) || 5)),
        fatigue: Math.max(1, Math.min(10, Number(fitness.fatigue) || 5)),
        notes: `${SEED_TAG} fitness`,
      },
    },
    { upsert: true }
  );
}

async function upsertHabitLogsForDay(userId, dayKey, habits, completionFactor) {
  const { noon } = dayRangeLocal(dayKey);

  // Deterministic completion selection.
  const sorted = [...habits].sort((a, b) => String(a.name).localeCompare(String(b.name)));

  for (let i = 0; i < sorted.length; i++) {
    const habit = sorted[i];
    const complete = (i / Math.max(1, sorted.length - 1)) < completionFactor;

    const name = String(habit.name || '').toLowerCase();
    const value = name.includes('water')
      ? (complete ? 2000 : 700)
      : name.includes('walk')
        ? (complete ? 9000 : 2500)
        : name.includes('read')
          ? (complete ? 24 : 0)
          : name.includes('protein')
            ? (complete ? 135 : 60)
            : name.includes('meditation')
              ? (complete ? 10 : 0)
              : complete ? 1 : 0;

    await HabitLog.updateOne(
      { user: userId, habit: habit._id, date: noon },
      {
        $set: {
          user: userId,
          habit: habit._id,
          date: noon,
          completed: Boolean(complete),
          value,
          notes: `${SEED_TAG} habit`,
        },
      },
      { upsert: true }
    );
  }
}

async function upsertSymptomsForDay(userId, dayKey, symptoms) {
  if (!symptoms || !symptoms.length) return;
  const { start, end, noon } = dayRangeLocal(dayKey);

  for (const s of symptoms) {
    await SymptomLog.updateOne(
      { user: userId, date: { $gte: start, $lt: end }, symptomName: s.symptomName, notes: `${SEED_TAG} symptom` },
      {
        $set: {
          user: userId,
          date: noon,
          symptomName: s.symptomName,
          severity: Math.max(0, Math.min(10, Number(s.severity) || 0)),
          tags: Array.isArray(s.tags) ? s.tags : [],
          notes: `${SEED_TAG} symptom`,
        },
      },
      { upsert: true }
    );
  }
}

async function ensureLongTermGoals(userId, endDayKey) {
  const goals = [
    {
      name: 'Build a calm baseline',
      description: 'Fewer spikes; more stable days.',
      category: 'health',
      goalType: 'build',
      icon: '🧭',
      color: '#0ea5e9',
      targetDays: 60,
      motivationText: 'I want consistency without pressure.',
      rewards: ['7 days steady', '30 days steady'],
    },
    {
      name: 'Reduce doom scrolling',
      description: 'Less late-night screen time.',
      category: 'other',
      goalType: 'reduce',
      icon: '📵',
      color: '#f97316',
      targetDays: 45,
      motivationText: 'Better sleep and attention.',
      rewards: ['14 days less scrolling'],
    },
  ];

  const existing = await LongTermGoal.find({ user: userId });
  const existingByName = new Map(existing.map((g) => [String(g.name).toLowerCase(), g]));

  const ensured = [];
  for (const g of goals) {
    const key = g.name.toLowerCase();
    if (existingByName.has(key)) {
      ensured.push(existingByName.get(key));
      continue;
    }
    const created = await LongTermGoal.create({
      user: userId,
      ...g,
      startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      currentStreak: 0,
      longestStreak: 0,
      totalRelapses: 0,
      isActive: true,
    });
    ensured.push(created);
  }

  // Seed logs for the last ~14 days for the first goal.
  const dayKeys = buildDayKeys({ days: 14, endDayKey });
  const goal0 = ensured[0];
  for (let i = 0; i < dayKeys.length; i++) {
    const dayKey = dayKeys[i];
    const { noon } = dayRangeLocal(dayKey);
    const status = i % 9 === 0 ? 'partial' : 'success';

    await LongTermGoalLog.updateOne(
      { user: userId, goal: goal0._id, date: noon },
      {
        $set: {
          user: userId,
          goal: goal0._id,
          date: noon,
          status,
          mood: status === 'success' ? 7 : 5,
          notes: `${SEED_TAG} long-term-goal`,
        },
      },
      { upsert: true }
    );
  }

  return ensured;
}

async function ensureGoals(userId) {
  const goals = [
    { title: 'Sleep by 11:30pm', domain: 'mental', target: 'Most weekdays', status: 'active' },
    { title: 'Train 3x / week', domain: 'fitness', target: 'Strength + cardio', status: 'active' },
    { title: 'Hit protein target', domain: 'nutrition', target: '130g', status: 'active' },
  ];

  for (const g of goals) {
    await Goal.updateOne(
      { user: userId, title: g.title },
      {
        $setOnInsert: {
          user: userId,
          ...g,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      { upsert: true }
    );
  }
}

async function ensureWardrobe(userId) {
  const items = [
    { name: 'Black Tee', category: 'tops', colors: ['black'], occasions: ['casual'], seasons: ['all-season'], brand: 'Basics', favorite: true },
    { name: 'Navy Overshirt', category: 'outerwear', colors: ['navy'], occasions: ['work', 'casual'], seasons: ['fall', 'winter'], brand: 'Workwear', favorite: true },
    { name: 'Grey Jeans', category: 'bottoms', colors: ['grey'], occasions: ['casual', 'work'], seasons: ['all-season'], brand: 'Denim', favorite: false },
    { name: 'White Sneakers', category: 'shoes', colors: ['white'], occasions: ['casual', 'workout'], seasons: ['all-season'], brand: 'Everyday', favorite: true },
    { name: 'Training Shorts', category: 'activewear', colors: ['black'], occasions: ['workout'], seasons: ['summer', 'all-season'], brand: 'Gym', favorite: false },
  ];

  const existing = await WardrobeItem.find({ user: userId });
  const existingByName = new Map(existing.map((w) => [String(w.name).toLowerCase(), w]));

  const ensured = [];
  for (const it of items) {
    const key = it.name.toLowerCase();
    if (existingByName.has(key)) {
      ensured.push(existingByName.get(key));
      continue;
    }
    const created = await WardrobeItem.create({
      user: userId,
      ...it,
      notes: `${SEED_TAG} wardrobe`,
      timesWorn: 3,
      lastWorn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
    ensured.push(created);
  }

  // Outfit
  const outfitName = 'Minimal Workday Fit';
  const outfitExists = await Outfit.findOne({ user: userId, name: outfitName });
  if (!outfitExists) {
    const pick = ensured.filter((x) => ['Black Tee', 'Navy Overshirt', 'Grey Jeans', 'White Sneakers'].includes(x.name));
    await Outfit.create({
      user: userId,
      name: outfitName,
      items: pick.map((p) => p._id),
      occasion: 'work',
      description: `${SEED_TAG} outfit`,
      favorite: true,
      timesWorn: 2,
    });
  }
}

function getOrCreateWorkoutModel() {
  // Gym module defines schema inline in routes; seed script defines the same model if not already registered.
  const existing = mongoose.models.Workout;
  if (existing) return existing;

  const WorkoutSchema = new mongoose.Schema(
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      date: { type: Date, default: Date.now },
      duration: Number,
      exercises: [
        {
          name: String,
          muscleGroup: String,
          sets: [
            {
              weight: Number,
              reps: Number,
              completed: { type: Boolean, default: true },
            },
          ],
        },
      ],
      notes: String,
    },
    { timestamps: true }
  );

  return mongoose.model('Workout', WorkoutSchema);
}

async function seedGymWorkouts(userId, dayKeys) {
  const Workout = getOrCreateWorkoutModel();

  // Create ~6 workouts over the range.
  const pickOffsets = [1, 5, 10, 17, 22, 28].filter((o) => o >= 0 && o < dayKeys.length);

  for (const offset of pickOffsets) {
    const dayKey = dayKeys[offset];
    const { start, end, noon } = dayRangeLocal(dayKey);

    await Workout.updateOne(
      { user: userId, date: { $gte: start, $lt: end }, notes: `${SEED_TAG} gym` },
      {
        $set: {
          user: userId,
          name: offset % 2 === 0 ? 'Full Body' : 'Upper + Cardio',
          date: noon,
          duration: 55 * 60,
          exercises: [
            {
              name: 'Squat',
              muscleGroup: 'legs',
              sets: [
                { weight: 60 + offset * 1.5, reps: 8, completed: true },
                { weight: 60 + offset * 1.5, reps: 8, completed: true },
              ],
            },
            {
              name: 'Bench Press',
              muscleGroup: 'chest',
              sets: [
                { weight: 40 + offset * 1.2, reps: 8, completed: true },
                { weight: 40 + offset * 1.2, reps: 8, completed: true },
              ],
            },
          ],
          notes: `${SEED_TAG} gym`,
        },
      },
      { upsert: true }
    );
  }
}

async function seedLabs(userId, endDayKey) {
  const dayKey = dayKeyPlus(endDayKey, -12);
  const { start, end, noon } = dayRangeLocal(dayKey);

  await LabReport.updateOne(
    { user: userId, date: { $gte: start, $lt: end }, panelName: 'Basic Wellness Panel', source: 'manual', notes: `${SEED_TAG} labs` },
    {
      $set: {
        user: userId,
        date: noon,
        panelName: 'Basic Wellness Panel',
        source: 'manual',
        notes: `${SEED_TAG} labs`,
        results: [
          { name: 'Vitamin D', value: 19, unit: 'ng/mL', refRangeLow: 30, refRangeHigh: 100, flag: 'low', notes: '' },
          { name: 'LDL', value: 142, unit: 'mg/dL', refRangeLow: 0, refRangeHigh: 129, flag: 'high', notes: '' },
          { name: 'HbA1c', value: 5.3, unit: '%', refRangeLow: 4, refRangeHigh: 5.6, flag: 'normal', notes: '' },
        ],
      },
    },
    { upsert: true }
  );
}

async function seedJournal(userId, endDayKey) {
  const entries = [
    { offset: 27, text: 'Felt calm today. A simple routine is working.' },
    { offset: 16, text: 'Work got intense. Sleep slipped. Trying to stay gentle with myself.' },
    { offset: 10, text: 'Noticed I feel drained the day after late nights.' },
    { offset: 3, text: 'Back to baseline. Energy is steadier when I eat and sleep consistently.' },
  ];

  for (const e of entries) {
    const dayKey = dayKeyPlus(endDayKey, -e.offset);
    const { start, end, noon } = dayRangeLocal(dayKey);

    await JournalEntry.updateOne(
      { user: userId, date: { $gte: start, $lt: end }, text: new RegExp(`^${SEED_TAG} journal`) },
      {
        $set: {
          user: userId,
          date: noon,
          text: `${SEED_TAG} journal — ${e.text}`,
        },
      },
      { upsert: true }
    );
  }
}

async function seedTemporaryPhaseOverride(userId, dayKeys) {
  // Based on storylineForOffset() where temporary phase is offsets 12..17.
  const startDayKey = dayKeys[12];
  const endDayKey = dayKeys[17];

  // Attenuate reinforcement (does not change raw logs or DailyLifeState).
  await MemoryOverride.updateOne(
    { user: userId, startDayKey, endDayKey, scope: 'sleep' },
    {
      $set: {
        user: userId,
        startDayKey,
        endDayKey,
        scope: 'sleep',
        type: 'temporary_phase',
        strength: 0.6,
        note: `${SEED_TAG} "temporary phase" for demo: stress period should not define identity`,
      },
    },
    { upsert: true }
  );

  await MemoryOverride.updateOne(
    { user: userId, startDayKey, endDayKey, scope: 'stress' },
    {
      $set: {
        user: userId,
        startDayKey,
        endDayKey,
        scope: 'stress',
        type: 'temporary_phase',
        strength: 0.6,
        note: `${SEED_TAG} "temporary phase" for demo: stress period should not define identity`,
      },
    },
    { upsert: true }
  );

  return { startDayKey, endDayKey };
}

async function recomputeDailyLifeState(userId, dayKeys) {
  for (const dayKey of dayKeys) {
    await upsertDailyLifeState({ userId, dayKey });
  }

  const lastDayKey = dayKeys[dayKeys.length - 1];
  await computePatternMemory({ userId, dayKey: lastDayKey });
  await computeIdentityMemory({ userId, dayKey: lastDayKey });

  return lastDayKey;
}

async function main() {
  console.log(`${SEED_TAG} connecting`, MONGO_URI);
  await mongoose.connect(MONGO_URI);

  console.log(`${SEED_TAG} ensure user`, SEED_EMAIL);
  const user = await ensureUser();
  const userId = user._id;

  const endDayKey = dayKeyFromDateLocal(new Date());
  const dayKeys = buildDayKeys({ days: SEED_DAYS, endDayKey });

  console.log(`${SEED_TAG} ensure habits`);
  const habits = await ensureHabits(userId);

  console.log(`${SEED_TAG} seed goals / wardrobe / labs / journal / long-term goals`);
  await Promise.all([
    ensureGoals(userId),
    ensureWardrobe(userId),
    seedLabs(userId, endDayKey),
    seedJournal(userId, endDayKey),
    ensureLongTermGoals(userId, endDayKey),
  ]);

  console.log(`${SEED_TAG} seed daily logs (days=${dayKeys.length})`);
  for (let i = 0; i < dayKeys.length; i++) {
    const dayKey = dayKeys[i];
    const story = storylineForOffset(i, dayKeys.length);

    await upsertMentalForDay(userId, dayKey, story);
    await upsertNutritionForDay(userId, dayKey, story.nutrition);
    await upsertFitnessForDay(userId, dayKey, story.fitness);
    await upsertHabitLogsForDay(userId, dayKey, habits, story.habitsCompletionFactor);
    await upsertSymptomsForDay(userId, dayKey, story.symptoms);
  }

  console.log(`${SEED_TAG} seed gym workouts`);
  await seedGymWorkouts(userId, dayKeys);

  console.log(`${SEED_TAG} upsert memory override window (temporary phase)`);
  const override = await seedTemporaryPhaseOverride(userId, dayKeys);

  console.log(`${SEED_TAG} recompute DailyLifeState + Pattern/IdentityMemory`);
  const lastDayKey = await recomputeDailyLifeState(userId, dayKeys);

  // Quick validation summary for the last day.
  const last = await DailyLifeState.findOne({ user: userId, dayKey: lastDayKey }).lean();

  const expectedPatternKeys = [
    'next_day:low_sleep=>low_energy',
    'same_day:high_stress=>low_energy',
    'next_day:high_training_load=>next_day_fatigue',
    'same_day:low_nutrition=>low_energy',
  ];

  const patterns = await PatternMemory.find({ user: userId, patternKey: { $in: expectedPatternKeys } })
    .sort({ confidence: -1 })
    .lean();

  const identities = await IdentityMemory.find({ user: userId, status: 'active' })
    .sort({ confidence: -1 })
    .limit(6)
    .lean();

  console.log('');
  console.log(`${SEED_TAG} DONE`);
  console.log('Demo login:');
  console.log('  email   :', SEED_EMAIL);
  console.log('  password:', SEED_PASSWORD);
  console.log('Seeded range:');
  console.log('  from:', dayKeys[0]);
  console.log('  to  :', dayKeys[dayKeys.length - 1]);
  console.log('Temporary phase override:');
  console.log('  from:', override.startDayKey);
  console.log('  to  :', override.endDayKey);
  console.log('Latest DailyLifeState summary:');
  console.log('  label     :', last?.summaryState?.label || '(missing)');
  console.log('  confidence:', Number(last?.summaryState?.confidence || 0).toFixed(3));

  console.log('');
  console.log('Expected patterns to appear (PatternMemory.patternKey):');
  console.log('  - next_day:low_sleep=>low_energy');
  console.log('  - same_day:high_stress=>low_energy');
  console.log('  - next_day:high_training_load=>next_day_fatigue');
  console.log('  - same_day:low_nutrition=>low_energy');

  console.log('');
  console.log('PatternMemory (actual):');
  if (!patterns.length) {
    console.log('  (none found yet)');
  } else {
    for (const p of patterns) {
      console.log(
        `  - ${p.patternKey} | conf=${Number(p.confidence || 0).toFixed(3)} | status=${p.status} | support=${p.supportCount}`
      );
    }
  }

  console.log('');
  console.log('IdentityMemory (top active):');
  if (!identities.length) {
    console.log('  (none active)');
  } else {
    for (const im of identities) {
      console.log(
        `  - ${im.identityKey} | conf=${Number(im.confidence || 0).toFixed(3)} | stability=${Number(im.stabilityScore || 0).toFixed(3)}`
      );
    }
  }

  console.log('');
  console.log('UI demo suggestions:');
  console.log('  - Dashboard: recent days should show Stable / Recovering vs Overloaded');
  console.log('  - Chat: ask "How am I doing today?" (reflect) then "Why do I feel tired so often?" (insight gated)');
  console.log('  - Memory control: point out temporary phase window does not over-define identity');
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(`${SEED_TAG} failed:`, err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await mongoose.disconnect();
      } catch {
        // ignore
      }
    });
}

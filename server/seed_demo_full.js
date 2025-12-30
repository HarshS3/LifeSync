// Full demo seed for LifeSync: preserves existing data, creates/reuses a demo user,
// and fills key collections so the frontend can exercise most features.
//
// Usage (PowerShell):
//   $env:MONGO_URI="mongodb://localhost:27017/lifesync"
//   $env:SEED_DEMO_EMAIL="demo.user@lifesync.local"        # optional
//   $env:SEED_DEMO_PASSWORD="demopassword"                 # optional
//   $env:SEED_INCLUDE_KNOWLEDGE="1"                        # optional (default 1)
//   node .\seed_demo_full.js
//
// Notes:
// - Does NOT delete existing data.
// - Uses idempotent checks to avoid duplicates.

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { spawn } = require('child_process');

const User = require('./models/User');
const { Habit, HabitLog } = require('./models/Habit');
const { FitnessLog, NutritionLog, MentalLog, Goal, MemorySummary } = require('./models/Logs');
const { LongTermGoal, LongTermGoalLog } = require('./models/LongTermGoal');
const { WardrobeItem, Outfit } = require('./models/Wardrobe');
const SymptomLog = require('./models/SymptomLog');
const LabReport = require('./models/LabReport');
const JournalEntry = require('./models/JournalEntry');

const MONGO_URI = process.env.MONGO_URI;
const SEED_DEMO_EMAIL = process.env.SEED_DEMO_EMAIL || 'demo.user@lifesync.local';
const SEED_DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'demopassword';
const SEED_DEMO_NAME = process.env.SEED_DEMO_NAME || 'Demo User';
const SEED_INCLUDE_KNOWLEDGE = String(process.env.SEED_INCLUDE_KNOWLEDGE ?? '1') !== '0';

const SEED_TAG = '[seed:demo:full]';

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

async function runChildScript(scriptName) {
  return new Promise((resolve, reject) => {
    const nodePath = process.execPath;
    const child = spawn(nodePath, [scriptName], {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env, MONGO_URI },
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

async function seedKnowledgeIfEnabled() {
  if (!SEED_INCLUDE_KNOWLEDGE) return;

  // These scripts are idempotent (upsert). Running them ensures nutrition features have backing data.
  await runChildScript('seed-meal-pipeline.js');
  await runChildScript('seed-nutrition-knowledge.js');
  await runChildScript('seed-disease-profiles.js');
}

async function ensureUser() {
  const existing = await User.findOne({ email: SEED_DEMO_EMAIL });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(SEED_DEMO_PASSWORD, 10);

  // Only set on insert; do not overwrite if user already exists.
  return User.create({
    name: SEED_DEMO_NAME,
    email: SEED_DEMO_EMAIL,
    password: passwordHash,

    // Profile/health
    age: 27,
    gender: 'male',
    height: 176,
    weight: 74,
    bodyFat: 16,
    restingHeartRate: 62,
    bloodType: 'O+',
    conditions: ['seasonal allergies'],
    allergies: ['pollen'],
    injuries: ['tight hamstring'],
    medications: [{ name: 'Cetirizine', dosage: '10mg', schedule: 'night' }],
    supplements: ['Vitamin D', 'Omega-3'],

    // Nutrition
    dietType: 'omnivore',
    mealsPerDay: 3,
    fastingWindow: '14:10',
    avoidFoods: ['peanuts'],
    favoriteFoods: ['dal', 'rice', 'paneer'],
    dailyCalorieTarget: 2300,
    dailyProteinTarget: 140,
    hydrationGoal: 10,

    // Training
    trainingExperience: 'intermediate',
    preferredWorkouts: ['strength', 'cardio'],
    workoutFrequency: 4,
    workoutDuration: 60,
    gymAccess: true,
    homeEquipment: ['resistance bands'],
    trainingGoals: ['fat loss', 'strength'],

    // Mindset
    chronotype: 'morning',
    averageSleep: 7.2,
    stressTriggers: ['deadlines'],
    motivators: ['consistency'],
    energyPeakTime: 'morning',
    focusChallenges: ['context switching'],

    // Style
    stylePreference: 'casual',
    favoriteColors: ['black', 'navy', 'white'],
    avoidColors: ['neon'],
    bodyConfidence: 7,
    styleGoals: ['look sharper', 'simplify wardrobe'],

    // Onboarding/meta
    biggestChallenges: 'Consistency',
    whatWorkedBefore: 'Tracking',
    whatDidntWork: 'All-or-nothing plans',
    longTermVision: 'Feel calm, strong, and in control',
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
      stripeCustomerId: 'cus_demo',
      stripeSubscriptionId: 'sub_demo',
    },

    preferences: { darkMode: true },
  });
}

async function ensureHabits(userId) {
  const existing = await Habit.find({ user: userId, isActive: true });
  if (existing.length >= 3) return existing;

  const toInsert = [];
  const existingNames = new Set(existing.map((h) => String(h.name || '').toLowerCase()));

  const candidates = [
    {
      name: 'Drink Water',
      description: 'Drink 8–10 glasses of water',
      icon: '💧',
      color: '#00bcd4',
      frequency: 'daily',
      customDays: [],
      targetPerDay: 8,
      unit: 'glasses',
      reminderTime: '09:00',
      isActive: true,
      streak: 8,
      longestStreak: 14,
      startDate: daysAgo(21),
      category: 'health',
    },
    {
      name: 'Read',
      description: 'Read 20 pages',
      icon: '📚',
      color: '#ff9800',
      frequency: 'daily',
      customDays: [],
      targetPerDay: 20,
      unit: 'pages',
      reminderTime: '20:00',
      isActive: true,
      streak: 5,
      longestStreak: 9,
      startDate: daysAgo(21),
      category: 'learning',
    },
    {
      name: '10k Steps',
      description: 'Walk at least 10,000 steps',
      icon: '🚶',
      color: '#22c55e',
      frequency: 'daily',
      customDays: [],
      targetPerDay: 10000,
      unit: 'steps',
      reminderTime: '17:30',
      isActive: true,
      streak: 3,
      longestStreak: 6,
      startDate: daysAgo(21),
      category: 'fitness',
    },
  ];

  for (const c of candidates) {
    if (!existingNames.has(c.name.toLowerCase())) {
      toInsert.push({ user: userId, ...c });
    }
  }

  if (toInsert.length) {
    await Habit.insertMany(toInsert);
  }

  return Habit.find({ user: userId, isActive: true }).sort({ createdAt: -1 });
}

async function ensureHabitLogs(userId, habits) {
  for (let i = 0; i < 21; i++) {
    const date = daysAgo(i);

    for (const habit of habits) {
      const exists = await HabitLog.exists({ user: userId, habit: habit._id, date });
      if (exists) continue;

      const name = String(habit.name || '').toLowerCase();
      const completed = i % 3 !== 0; // some misses
      const value = name.includes('water') ? (completed ? 8 : 0)
        : name.includes('read') ? (completed ? 20 : 0)
          : name.includes('steps') ? (completed ? 9500 + (i % 5) * 300 : 0)
            : (completed ? 1 : 0);

      await HabitLog.create({
        user: userId,
        habit: habit._id,
        date,
        completed,
        value,
        notes: `${SEED_TAG} Day ${i + 1} ${completed ? 'done' : 'missed'}`,
      });
    }
  }
}

async function ensureFitnessLogs(userId) {
  for (let i = 0; i < 21; i++) {
    const date = daysAgo(i);
    const exists = await FitnessLog.exists({ user: userId, date });
    if (exists) continue;

    await FitnessLog.create({
      user: userId,
      date,
      type: i % 2 === 0 ? 'strength' : 'cardio',
      focus: i % 2 === 0 ? 'upper/lower split' : 'zone 2',
      intensity: 6 + (i % 4),
      fatigue: 4 + (i % 5),
      notes: `${SEED_TAG} Fitness log for day ${i + 1}`,
    });
  }
}

async function ensureNutritionLogs(userId) {
  for (let i = 0; i < 21; i++) {
    const date = daysAgo(i);
    const exists = await NutritionLog.exists({ user: userId, date });
    if (exists) continue;

    const dayOffset = i;
    const waterIntake = 1800 + (dayOffset % 6) * 200;

    await NutritionLog.create({
      user: userId,
      date,
      meals: [
        {
          name: 'Breakfast',
          mealType: 'breakfast',
          time: '08:30',
          foods: [
            { name: 'Oats', quantity: 60, unit: 'g', calories: 230, protein: 8, carbs: 40, fat: 4, fiber: 6, sugar: 1, sodium: 10 },
            { name: 'Curd', quantity: 150, unit: 'g', calories: 110, protein: 6, carbs: 8, fat: 6, fiber: 0, sugar: 6, sodium: 90 },
          ],
          notes: `${SEED_TAG} breakfast`,
        },
        {
          name: 'Lunch',
          mealType: 'lunch',
          time: '13:15',
          foods: [
            { name: 'Dal', quantity: 250, unit: 'g', calories: 260, protein: 16, carbs: 38, fat: 6, fiber: 10, sugar: 3, sodium: 380 },
            { name: 'Rice', quantity: 180, unit: 'g', calories: 230, protein: 4, carbs: 49, fat: 1, fiber: 1, sugar: 0, sodium: 4 },
          ],
          notes: `${SEED_TAG} lunch`,
        },
        {
          name: 'Dinner',
          mealType: 'dinner',
          time: '20:15',
          foods: [
            { name: 'Paneer', quantity: 120, unit: 'g', calories: 320, protein: 20, carbs: 6, fat: 24, fiber: 0, sugar: 2, sodium: 260 },
            { name: 'Mixed veggies', quantity: 250, unit: 'g', calories: 140, protein: 6, carbs: 22, fat: 4, fiber: 7, sugar: 8, sodium: 180 },
          ],
          notes: `${SEED_TAG} dinner`,
        },
      ],
      waterIntake,
      dailyTotals: {
        calories: 2300 + (dayOffset % 4) * 100,
        protein: 130 + (dayOffset % 5) * 4,
        carbs: 260 + (dayOffset % 5) * 10,
        fat: 70 + (dayOffset % 4) * 3,
        fiber: 28 + (dayOffset % 4) * 2,
        sugar: 35 + (dayOffset % 3) * 3,
        sodium: 2000 + (dayOffset % 4) * 120,
      },
      notes: `${SEED_TAG} Nutrition notes for day ${i + 1}`,
    });
  }
}

async function ensureMentalLogs(userId) {
  const moods = ['very-low', 'low', 'neutral', 'good', 'great'];
  for (let i = 0; i < 21; i++) {
    const date = daysAgo(i);
    const exists = await MentalLog.exists({ user: userId, date });
    if (exists) continue;

    await MentalLog.create({
      user: userId,
      date,
      mood: moods[(i + 2) % moods.length],
      moodScore: 5 + ((i + 2) % 6),
      stressLevel: 3 + (i % 5),
      energyLevel: 5 + (i % 5),
      bodyFeel: 5 + (i % 4),
      sleepHours: 6.5 + (i % 3) * 0.5,
      medsTaken: ['Cetirizine'],
      journalSnippet: `${SEED_TAG} quick reflection day ${i + 1}`,
      notes: `${SEED_TAG} Mental notes day ${i + 1}`,
    });
  }
}

async function ensureGoals(userId) {
  const goals = [
    {
      title: 'Build a consistent gym routine',
      domain: 'fitness',
      target: '4 workouts/week',
      status: 'active',
      startDate: daysAgo(14),
      targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Hit protein target most days',
      domain: 'nutrition',
      target: '140g/day',
      status: 'active',
      startDate: daysAgo(10),
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Daily check-ins',
      domain: 'mental',
      target: '7/7 days',
      status: 'active',
      startDate: daysAgo(7),
      targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const g of goals) {
    const existing = await Goal.findOne({ user: userId, title: g.title });
    if (existing) continue;
    await Goal.create({ user: userId, ...g });
  }
}

async function ensureMemorySummary(userId) {
  const existing = await MemorySummary.findOne({ user: userId, periodLabel: 'Demo: Last 3 Weeks' });
  if (existing) return;

  await MemorySummary.create({
    user: userId,
    periodLabel: 'Demo: Last 3 Weeks',
    from: daysAgo(21),
    to: daysAgo(0),
    summary: `${SEED_TAG} Strong overall consistency with a few dips on high-stress days.`,
    tags: ['demo', 'habits', 'fitness', 'nutrition'],
  });
}

async function ensureSymptomsAndLabs(userId) {
  const symptomCount = await SymptomLog.countDocuments({ user: userId });
  if (symptomCount < 12) {
    for (let i = 0; i < 12; i++) {
      const date = daysAgo(i);
      const symptomName = i % 3 === 0 ? 'headache' : i % 3 === 1 ? 'bloating' : 'fatigue';
      const exists = await SymptomLog.exists({ user: userId, date, symptomName });
      if (exists) continue;

      await SymptomLog.create({
        user: userId,
        date,
        symptomName,
        severity: 3 + (i % 6),
        tags: symptomName === 'headache' ? ['screen', 'stress'] : symptomName === 'bloating' ? ['food'] : ['sleep'],
        notes: `${SEED_TAG} symptom log ${symptomName} day ${i + 1}`,
      });
    }
  }

  const labCount = await LabReport.countDocuments({ user: userId });
  if (labCount < 2) {
    const cbcExists = await LabReport.exists({ user: userId, panelName: 'CBC', source: 'seed' });
    if (!cbcExists) {
      await LabReport.create({
        user: userId,
        date: daysAgo(9),
        panelName: 'CBC',
        source: 'seed',
        notes: `${SEED_TAG} CBC sample`,
        results: [
          { name: 'Hemoglobin', value: 13.2, unit: 'g/dL', refRangeLow: 13.5, refRangeHigh: 17.5, flag: 'low' },
          { name: 'WBC', value: 7.1, unit: 'x10^9/L', refRangeLow: 4.0, refRangeHigh: 11.0, flag: 'normal' },
          { name: 'Platelets', value: 245, unit: 'x10^9/L', refRangeLow: 150, refRangeHigh: 450, flag: 'normal' },
        ],
      });
    }

    const lipidExists = await LabReport.exists({ user: userId, panelName: 'Lipid Panel', source: 'seed' });
    if (!lipidExists) {
      await LabReport.create({
        user: userId,
        date: daysAgo(2),
        panelName: 'Lipid Panel',
        source: 'seed',
        notes: `${SEED_TAG} Lipid panel sample`,
        results: [
          { name: 'Total Cholesterol', value: 182, unit: 'mg/dL', refRangeLow: 0, refRangeHigh: 200, flag: 'normal' },
          { name: 'HDL', value: 46, unit: 'mg/dL', refRangeLow: 40, refRangeHigh: 999, flag: 'normal' },
          { name: 'LDL', value: 118, unit: 'mg/dL', refRangeLow: 0, refRangeHigh: 100, flag: 'high' },
        ],
      });
    }
  }
}

async function ensureLongTermGoals(userId) {
  let abstainGoal = await LongTermGoal.findOne({ user: userId, name: '30 Days Abstinence' });
  if (!abstainGoal) {
    abstainGoal = await LongTermGoal.create({
      user: userId,
      name: '30 Days Abstinence',
      description: `${SEED_TAG} Maintain abstinence for 30 days`,
      category: 'addiction',
      goalType: 'abstain',
      color: '#8b5cf6',
      icon: '🎯',
      startDate: daysAgo(21),
      targetDays: 30,
      currentStreak: 10,
      longestStreak: 14,
      totalRelapses: 1,
      isActive: true,
      motivationText: 'Stay steady',
      rewards: ['Movie night', 'New book'],
    });
  }

  let buildGoal = await LongTermGoal.findOne({ user: userId, name: 'Learn Guitar (20h)' });
  if (!buildGoal) {
    buildGoal = await LongTermGoal.create({
      user: userId,
      name: 'Learn Guitar (20h)',
      description: `${SEED_TAG} Build a practice streak and reach 20 hours total.`,
      category: 'skill',
      goalType: 'build',
      color: '#0ea5e9',
      icon: '🎸',
      startDate: daysAgo(21),
      targetDays: 90,
      currentStreak: 6,
      longestStreak: 9,
      totalRelapses: 0,
      isActive: true,
      motivationText: 'Play clean chords without strain',
      rewards: ['New strings', 'Pedal'],
    });
  }

  for (const goal of [abstainGoal, buildGoal]) {
    for (let i = 0; i < 21; i++) {
      const date = daysAgo(i);
      const exists = await LongTermGoalLog.exists({ user: userId, goal: goal._id, date });
      if (exists) continue;

      const isRelapseDay = goal._id.toString() === abstainGoal._id.toString() && i === 12;
      await LongTermGoalLog.create({
        user: userId,
        goal: goal._id,
        date,
        status: isRelapseDay ? 'relapse' : 'success',
        relapseCount: isRelapseDay ? 1 : 0,
        intensity: isRelapseDay ? 8 : 2,
        trigger: isRelapseDay ? 'stress' : '',
        contributionType: goal._id.toString() === buildGoal._id.toString() ? 'major' : 'maintenance',
        timeSpent: goal._id.toString() === buildGoal._id.toString() ? 20 + (i % 3) * 10 : 0,
        urgeLevel: 4 + (i % 5),
        mood: 5 + (i % 4),
        notes: `${SEED_TAG} long-term log day ${i + 1}`,
        lessonsLearned: isRelapseDay ? 'Reduce exposure to triggers on stressful days.' : '',
      });
    }
  }
}

async function ensureWardrobe(userId) {
  const existing = await WardrobeItem.find({ user: userId }).limit(50);
  const existingNames = new Set(existing.map((i) => String(i.name || '').toLowerCase()));

  const items = [
    { name: 'Navy Oxford Shirt', category: 'tops', colors: ['navy'], occasions: ['work', 'date'], seasons: ['all-season'], brand: 'Uniqlo', favorite: true },
    { name: 'White T-Shirt', category: 'tops', colors: ['white'], occasions: ['casual'], seasons: ['all-season'], brand: 'H&M', favorite: false },
    { name: 'Black Jeans', category: 'bottoms', colors: ['black'], occasions: ['casual', 'work', 'date'], seasons: ['all-season'], brand: 'Levis', favorite: true },
    { name: 'Grey Joggers', category: 'activewear', colors: ['grey'], occasions: ['workout', 'casual'], seasons: ['all-season'], brand: 'Nike', favorite: false },
    { name: 'White Sneakers', category: 'shoes', colors: ['white'], occasions: ['casual', 'workout', 'date'], seasons: ['all-season'], brand: 'Adidas', favorite: true },
    { name: 'Black Hoodie', category: 'outerwear', colors: ['black'], occasions: ['casual'], seasons: ['fall', 'winter', 'all-season'], brand: 'Zara', favorite: false },
  ];

  for (const item of items) {
    if (existingNames.has(item.name.toLowerCase())) continue;
    await WardrobeItem.create({
      user: userId,
      ...item,
      imageUrl: '',
      notes: `${SEED_TAG} wardrobe item`,
      timesWorn: 2 + Math.floor(Math.random() * 12),
      lastWorn: daysAgo(Math.floor(Math.random() * 7)),
    });
  }

  const wardrobe = await WardrobeItem.find({ user: userId });

  const outfitExists = await Outfit.exists({ user: userId, name: 'Demo: Casual Friday' });
  if (!outfitExists && wardrobe.length >= 3) {
    const top = wardrobe.find((w) => w.category === 'tops');
    const bottom = wardrobe.find((w) => w.category === 'bottoms');
    const shoes = wardrobe.find((w) => w.category === 'shoes');
    const itemsForOutfit = [top, bottom, shoes].filter(Boolean).map((x) => x._id);

    await Outfit.create({
      user: userId,
      name: 'Demo: Casual Friday',
      items: itemsForOutfit.length ? itemsForOutfit : wardrobe.slice(0, 3).map((w) => w._id),
      occasion: 'casual',
      weather: 'mild',
      description: `${SEED_TAG} relaxed and sharp`,
      favorite: true,
      timesWorn: 3,
    });
  }
}

async function ensureJournalEntries(userId) {
  const existing = await JournalEntry.countDocuments({ user: userId });
  if (existing >= 7) return;

  const entries = [
    'Felt unusually focused this morning. Kept my phone out of the room.',
    'Work was hectic. Took a 10-minute walk and it helped.',
    'Noticed bloating after lunch; might be the portion size.',
    'Gym session felt strong. Squats were clean and controlled.',
    'Low energy afternoon. Need to improve sleep consistency.',
    'Ate more balanced today. Protein early made the day easier.',
    'Weekly reflection: consistency beats intensity. Keep it simple.',
  ];

  for (let i = 0; i < entries.length; i++) {
    const date = daysAgo(i);
    const text = `${SEED_TAG} ${entries[i]}`;
    const exists = await JournalEntry.exists({ user: userId, date, text });
    if (exists) continue;
    await JournalEntry.create({ user: userId, date, text });
  }
}

function getWorkoutModel() {
  if (mongoose.models.Workout) return mongoose.models.Workout;

  const WorkoutSchema = new mongoose.Schema(
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      date: { type: Date, default: Date.now },
      duration: Number, // in seconds
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

async function ensureGymWorkouts(userId) {
  const Workout = getWorkoutModel();

  const templates = [
    {
      name: 'Upper Body (Strength)',
      duration: 55 * 60,
      exercises: [
        { name: 'Bench Press', muscleGroup: 'chest', sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }, { weight: 55, reps: 10 }] },
        { name: 'Row', muscleGroup: 'back', sets: [{ weight: 45, reps: 10 }, { weight: 45, reps: 10 }] },
        { name: 'Overhead Press', muscleGroup: 'shoulders', sets: [{ weight: 30, reps: 8 }, { weight: 30, reps: 8 }] },
      ],
    },
    {
      name: 'Lower Body (Strength)',
      duration: 60 * 60,
      exercises: [
        { name: 'Squat', muscleGroup: 'legs', sets: [{ weight: 80, reps: 5 }, { weight: 80, reps: 5 }, { weight: 70, reps: 8 }] },
        { name: 'RDL', muscleGroup: 'hamstrings', sets: [{ weight: 70, reps: 8 }, { weight: 70, reps: 8 }] },
        { name: 'Calf Raises', muscleGroup: 'calves', sets: [{ weight: 40, reps: 12 }, { weight: 40, reps: 12 }] },
      ],
    },
    {
      name: 'Cardio (Zone 2)',
      duration: 35 * 60,
      exercises: [
        { name: 'Treadmill Walk', muscleGroup: 'cardio', sets: [{ weight: 0, reps: 1 }] },
      ],
    },
  ];

  // Seed ~10 workouts across the last 30 days.
  for (let i = 0; i < 30; i += 3) {
    const date = daysAgo(i);
    const template = templates[(i / 3) % templates.length];

    const exists = await Workout.exists({ user: userId, date, name: template.name });
    if (exists) continue;

    await Workout.create({
      user: userId,
      name: template.name,
      date,
      duration: template.duration,
      exercises: template.exercises,
      notes: `${SEED_TAG} seeded workout`,
    });
  }
}

async function printDemoIntegritySummary(userId) {
  const Workout = getWorkoutModel();

  const [
    habitsCount,
    habitLogsCount,
    fitnessLogsCount,
    nutritionLogsCount,
    mentalLogsCount,
    goalsCount,
    memoryCount,
    symptomsCount,
    labsCount,
    ltGoalsCount,
    ltGoalLogsCount,
    wardrobeCount,
    outfitsCount,
    journalCount,
    workoutsCount,
  ] = await Promise.all([
    Habit.countDocuments({ user: userId, isActive: true }),
    HabitLog.countDocuments({ user: userId }),
    FitnessLog.countDocuments({ user: userId }),
    NutritionLog.countDocuments({ user: userId }),
    MentalLog.countDocuments({ user: userId }),
    Goal.countDocuments({ user: userId }),
    MemorySummary.countDocuments({ user: userId }),
    SymptomLog.countDocuments({ user: userId }),
    LabReport.countDocuments({ user: userId }),
    LongTermGoal.countDocuments({ user: userId }),
    LongTermGoalLog.countDocuments({ user: userId }),
    WardrobeItem.countDocuments({ user: userId }),
    Outfit.countDocuments({ user: userId }),
    JournalEntry.countDocuments({ user: userId }),
    Workout.countDocuments({ user: userId }),
  ]);

  const [habitIds, habitLogHabitIds, ltGoalIds, ltLogGoalIds] = await Promise.all([
    Habit.find({ user: userId }).distinct('_id'),
    HabitLog.find({ user: userId }).distinct('habit'),
    LongTermGoal.find({ user: userId }).distinct('_id'),
    LongTermGoalLog.find({ user: userId }).distinct('goal'),
  ]);

  const habitIdSet = new Set(habitIds.map((x) => String(x)));
  const missingHabits = habitLogHabitIds.filter((id) => !habitIdSet.has(String(id)));

  const ltGoalIdSet = new Set(ltGoalIds.map((x) => String(x)));
  const missingLTGoals = ltLogGoalIds.filter((id) => !ltGoalIdSet.has(String(id)));

  const outfitDocs = await Outfit.find({ user: userId }).select({ items: 1 }).lean();
  const wardrobeIds = await WardrobeItem.find({ user: userId }).distinct('_id');
  const wardrobeIdSet = new Set(wardrobeIds.map((x) => String(x)));
  const outfitMissingItems = [];
  for (const o of outfitDocs) {
    for (const itemId of o.items || []) {
      if (!wardrobeIdSet.has(String(itemId))) outfitMissingItems.push(String(itemId));
    }
  }

  console.log('');
  console.log('Demo dataset summary (counts for demo user):');
  console.log(`- Habits: ${habitsCount} (active)`);
  console.log(`- Habit logs: ${habitLogsCount} (refs missing: ${missingHabits.length})`);
  console.log(`- Fitness logs: ${fitnessLogsCount}`);
  console.log(`- Nutrition logs: ${nutritionLogsCount}`);
  console.log(`- Mental logs: ${mentalLogsCount}`);
  console.log(`- Goals: ${goalsCount}`);
  console.log(`- Memory summaries: ${memoryCount}`);
  console.log(`- Symptoms: ${symptomsCount}`);
  console.log(`- Lab reports: ${labsCount}`);
  console.log(`- Long-term goals: ${ltGoalsCount}`);
  console.log(`- Long-term goal logs: ${ltGoalLogsCount} (refs missing: ${missingLTGoals.length})`);
  console.log(`- Wardrobe items: ${wardrobeCount}`);
  console.log(`- Outfits: ${outfitsCount} (missing item refs: ${outfitMissingItems.length})`);
  console.log(`- Journal entries: ${journalCount}`);
  console.log(`- Gym workouts: ${workoutsCount}`);
}

async function main() {
  if (!MONGO_URI) {
    console.error('Missing MONGO_URI. Set MONGO_URI before running seed_demo_full.js');
    process.exit(1);
  }

  const started = Date.now();

  await seedKnowledgeIfEnabled();

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10_000 });

  try {
    const user = await ensureUser();
    const userId = user._id;

    const habits = await ensureHabits(userId);
    if (habits.length) await ensureHabitLogs(userId, habits);

    await ensureFitnessLogs(userId);
    await ensureNutritionLogs(userId);
    await ensureMentalLogs(userId);

    await ensureGoals(userId);
    await ensureMemorySummary(userId);

    await ensureSymptomsAndLabs(userId);
    await ensureLongTermGoals(userId);
    await ensureWardrobe(userId);
    await ensureJournalEntries(userId);
    await ensureGymWorkouts(userId);

    await printDemoIntegritySummary(userId);

    const elapsedMs = Date.now() - started;
    console.log('');
    console.log('Full demo seed complete. Existing data was preserved.');
    console.log(`Demo login: ${SEED_DEMO_EMAIL}`);
    console.log(`Demo password: ${SEED_DEMO_PASSWORD}`);
    console.log(`Elapsed: ${elapsedMs}ms`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  });
}

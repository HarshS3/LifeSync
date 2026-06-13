/**
 * seed_cross_domain_demo.js
 *
 * Seeds demo.user@lifesync.local with 30 days of rich, correlated data so
 * cross-domain insights, DailyLifeState summaryState, PatternMemory, and
 * readinessEngine all have enough signal to fire.
 *
 * Storyline:
 *   - High-protein / high-carb days correlate with better workout performance next day
 *   - Low sleep (< 6h) days correlate with higher stress and lower energy
 *   - Week 3 overtraining block: 6 consecutive training days → readiness drops
 *   - Iron deficiency pattern: low iron days → low energy next day
 *   - Tea+lentil days (tannin antagonism) → iron absorption blocked
 *
 * Idempotent: uses upserts, safe to re-run.
 *
 * Usage (PowerShell):
 *   node server/scripts/seed_cross_domain_demo.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

const EMAIL    = process.env.SEED_EMAIL    || 'demo.user@lifesync.local';
const PASSWORD = process.env.SEED_PASSWORD || 'demopassword';

// ── Models ──────────────────────────────────────────────────────────────────
const User           = require('../models/User');
const Workout        = require('../models/Workout');
const { NutritionLog, MentalLog, WeightLog } = require('../models/Logs');
const DailyLifeState = require('../models/DailyLifeState');
const PatternMemory  = require('../models/PatternMemory');

// ── Helpers ─────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(2, 0, 0, 0);
  return d;
}

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function jitter(base, range) {
  return base + (Math.random() * 2 - 1) * range;
}

// ── Workout templates ────────────────────────────────────────────────────────
function makeWorkout(userId, date, name, exercises) {
  return {
    user: userId, date, name, duration: 3600,
    exercises: exercises.map(e => ({
      name: e.name, muscleGroup: e.group,
      metadata: { type: e.type || 'compound', primary: e.group },
      sets: Array.from({ length: e.sets || 4 }, () => ({
        weight: e.weight + Math.round(jitter(0, 5)),
        reps: e.reps + Math.round(jitter(0, 2)),
        completed: true,
      })),
    })),
  };
}

const PUSH_DAY = [
  { name: 'Barbell Bench Press', group: 'chest', weight: 80, reps: 8, sets: 4, type: 'compound' },
  { name: 'Incline Dumbbell Press', group: 'chest', weight: 30, reps: 10, sets: 3 },
  { name: 'Overhead Press', group: 'shoulders', weight: 50, reps: 8, sets: 4, type: 'compound' },
  { name: 'Tricep Pushdown', group: 'triceps', weight: 25, reps: 12, sets: 3 },
];
const PULL_DAY = [
  { name: 'Deadlift', group: 'back', weight: 120, reps: 5, sets: 4, type: 'compound' },
  { name: 'Barbell Row', group: 'back', weight: 70, reps: 8, sets: 4, type: 'compound' },
  { name: 'Pull-Up', group: 'back', weight: 0, reps: 8, sets: 3 },
  { name: 'Barbell Curl', group: 'biceps', weight: 35, reps: 10, sets: 3 },
];
const LEG_DAY = [
  { name: 'Back Squat', group: 'quads', weight: 100, reps: 6, sets: 4, type: 'compound' },
  { name: 'Romanian Deadlift', group: 'hamstrings', weight: 80, reps: 8, sets: 4, type: 'compound' },
  { name: 'Leg Press', group: 'quads', weight: 180, reps: 10, sets: 3 },
  { name: 'Calf Raise', group: 'calves', weight: 80, reps: 15, sets: 3 },
];

// ── Nutrition templates ───────────────────────────────────────────────────────
function makeNutrition(userId, date, opts = {}) {
  const cal   = opts.calories  || 2200;
  const prot  = opts.protein   || 140;
  const carbs = opts.carbs     || 240;
  const fat   = opts.fat       || 70;
  const iron  = opts.iron      || 14;   // mg
  const fiber = opts.fiber     || 25;
  return {
    user: userId,
    date,
    meals: [
      {
        mealType: 'breakfast',
        mealTime: new Date(date.getTime() + 2*3600*1000),
        name: opts.breakfastName || 'Oats with eggs',
        foods: [
          { name: 'Rolled oats', quantity: 80, unit: 'g', calories: 300, protein: 10, carbs: 54, fat: 5, iron: 3, fiber: 8 },
          { name: 'Whole eggs', quantity: 2, unit: 'piece', calories: 140, protein: 12, carbs: 1, fat: 10, iron: 2, fiber: 0 },
        ],
      },
      {
        mealType: 'lunch',
        mealTime: new Date(date.getTime() + 7*3600*1000),
        name: opts.lunchName || 'Dal rice',
        foods: [
          { name: opts.lentilVariant || 'Masoor Dal', quantity: 100, unit: 'g', calories: 340, protein: 24, carbs: 56, fat: 2, iron: opts.lentilIron || 7, fiber: 15 },
          { name: 'White rice', quantity: 150, unit: 'g', calories: 195, protein: 4, carbs: 44, fat: 0.5, iron: 0.5, fiber: 1 },
          ...(opts.withTea ? [{ name: 'Black tea', quantity: 200, unit: 'ml', calories: 2, protein: 0, carbs: 0, fat: 0, iron: 0, fiber: 0, notes: 'tannins present' }] : []),
        ],
      },
      {
        mealType: opts.preWorkout ? 'pre-workout' : 'snack',
        mealTime: new Date(date.getTime() + 11*3600*1000),
        name: opts.snackName || 'Banana + peanut butter',
        foods: [
          { name: 'Banana', quantity: 120, unit: 'g', calories: 107, protein: 1.3, carbs: 27, fat: 0.4, iron: 0.3, fiber: 3 },
          { name: 'Peanut butter', quantity: 30, unit: 'g', calories: 180, protein: 7, carbs: 6, fat: 16, iron: 0.5, fiber: 2 },
        ],
      },
      {
        mealType: 'dinner',
        mealTime: new Date(date.getTime() + 14*3600*1000),
        name: opts.dinnerName || 'Chicken curry + roti',
        foods: [
          { name: 'Chicken breast', quantity: 200, unit: 'g', calories: 330, protein: 62, carbs: 0, fat: 7, iron: 1.5, fiber: 0 },
          { name: 'Whole wheat roti', quantity: 3, unit: 'piece', calories: 270, protein: 10, carbs: 51, fat: 3, iron: 3, fiber: 6 },
          { name: 'Mixed vegetables', quantity: 100, unit: 'g', calories: 50, protein: 3, carbs: 8, fat: 0.5, iron: 1, fiber: 4 },
        ],
      },
    ],
    dailyTotals: {
      calories: cal, protein: prot, carbs, fat,
      iron, fiber,
      calcium: opts.calcium || 700,
      vitaminC: opts.vitaminC || 60,
      zinc: 10, magnesium: 300,
      omega3: 1.5, omega6: 12,
      vitaminD: 400, vitaminB12: 2.4,
      folate: 300, potassium: 3200,
      sodium: 1800, sugar: 40,
      saturatedFat: 22, cholesterol: 220,
      water: 2000,
    },
    waterIntake: opts.water || 2500,
  };
}

// ── Mental / wellness logs ───────────────────────────────────────────────────
function makeMental(userId, date, opts = {}) {
  return {
    user: userId,
    date,
    moodScore: opts.mood ?? 7,
    energyLevel: opts.energy ?? 7,
    stressLevel: opts.stress ?? 4,
    sleepHours: opts.sleep ?? 7.5,
    sleepQuality: opts.sleepQuality ?? 7,
    bodyFeel: opts.bodyFeel ?? 7,
    hungerLevel: opts.hunger ?? 5,
    restingHeartRate: opts.rhr ?? 58,
    notes: opts.notes || '',
  };
}

// ── DailyLifeState builder ───────────────────────────────────────────────────
function makeDLS(userId, date, opts = {}) {
  const dk = dayKey(date);
  const start = new Date(date); start.setHours(0,0,0,0);
  const end   = new Date(date); end.setHours(23,59,59,999);

  const sleepVal  = opts.sleep    ?? 0.75;
  const energyVal = opts.energy   ?? 0.72;
  const stressVal = opts.stress   ?? 0.35; // inverted: low stress = good
  const nutVal    = opts.nutrition ?? 0.8;
  const loadVal   = opts.load      ?? 0.5;
  const moodVal   = opts.mood      ?? 0.72;

  return {
    user: userId,
    dayKey: dk,
    dateStart: start,
    dateEnd: end,
    signals: {
      sleep:        { value: sleepVal,  confidence: opts.sleepConf    ?? 0.85, raw: { sleepHours: opts.sleepH ?? 7.5 } },
      energy:       { value: energyVal, confidence: opts.energyConf   ?? 0.80, raw: { energyLevel: opts.energyRaw ?? 7 } },
      stress:       { value: stressVal, confidence: opts.stressConf   ?? 0.80, raw: { stressLevel: opts.stressRaw ?? 4 } },
      nutrition:    { value: nutVal,    confidence: opts.nutConf      ?? 0.90, raw: { calories: opts.calories ?? 2200 } },
      trainingLoad: { value: loadVal,   confidence: opts.loadConf     ?? 0.75, raw: { sessionCount: opts.sessionCount ?? 1 } },
      mood:         { value: moodVal,   confidence: opts.moodConf     ?? 0.80, raw: { moodScore: opts.moodRaw ?? 7 } },
      habits:       { value: 0.70,      confidence: 0.70, raw: null },
    },
    summaryState: {
      label: opts.label ?? 'stable',
      confidence: opts.labelConf ?? 0.78,
      reasons: opts.reasons ?? ['sleep above baseline', 'nutrition adequate', 'stress within range'],
    },
    metrics: {
      readinessScore: opts.readiness ?? 7.2,
      trainingLoad: opts.trainingLoadScore ?? 45,
    },
    computedAt: new Date(),
    computeVersion: 1,
    inputsHash: `demo-${dk}`,
  };
}

// ── PatternMemory seeds ──────────────────────────────────────────────────────
function makePattern(userId, conditions, effect, window, opts = {}) {
  const key = [userId, ...conditions.sort(), effect, window].join(':');
  const crypto = require('crypto');
  const patternKey = crypto.createHash('sha1').update(key).digest('hex');
  return {
    user: userId,
    patternKey,
    conditions,
    effect,
    window,
    supportCount: opts.supportCount ?? 8,
    confidence: opts.confidence ?? 0.72,
    refuteCount: opts.refuteCount ?? 2,
    firstObserved: daysAgo(opts.firstObserved ?? 28),
    lastObserved: daysAgo(opts.lastObserved ?? 1),
    status: opts.confidence >= 0.6 ? 'active' : 'weak',
  };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Ensure demo user
  let user = await User.findOne({ email: EMAIL });
  if (!user) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    user = await User.create({
      name: 'Demo User', email: EMAIL, password: passwordHash,
      weight: 78,
      biologicalProfile: { age: 28, gender: 'male', heightCm: 178, weightKg: 78, activityLevel: 'moderate' },
    });
    console.log('Created user:', EMAIL);
  } else {
    console.log('Found existing user:', EMAIL);
  }
  const uid = user._id;

  // ── 2. Workouts — 30 days, push/pull/legs with Week 3 overtraining block ──
  const workoutSchedule = [
    // Week 1 — normal PPL
    { ago: 27, name: 'Push', tmpl: PUSH_DAY },
    { ago: 26, name: 'Pull', tmpl: PULL_DAY },
    { ago: 25, name: 'Legs', tmpl: LEG_DAY },
    { ago: 24, name: 'Push', tmpl: PUSH_DAY },
    { ago: 23, name: 'Pull', tmpl: PULL_DAY },
    // rest day 22, 21
    // Week 2 — normal
    { ago: 20, name: 'Legs', tmpl: LEG_DAY },
    { ago: 19, name: 'Push', tmpl: PUSH_DAY },
    { ago: 18, name: 'Pull', tmpl: PULL_DAY },
    { ago: 17, name: 'Legs', tmpl: LEG_DAY },
    { ago: 16, name: 'Push', tmpl: PUSH_DAY },
    // rest 15
    // Week 3 — overtraining block (6 consecutive days)
    { ago: 14, name: 'Pull', tmpl: PULL_DAY },
    { ago: 13, name: 'Legs', tmpl: LEG_DAY },
    { ago: 12, name: 'Push', tmpl: PUSH_DAY },
    { ago: 11, name: 'Pull', tmpl: PULL_DAY },
    { ago: 10, name: 'Legs', tmpl: LEG_DAY },
    { ago: 9,  name: 'Push', tmpl: PUSH_DAY },   // 6th consecutive — should trigger overtraining
    // Week 4 — recovery
    { ago: 7,  name: 'Pull', tmpl: PULL_DAY },
    { ago: 5,  name: 'Legs', tmpl: LEG_DAY },
    { ago: 3,  name: 'Push', tmpl: PUSH_DAY },
    { ago: 1,  name: 'Pull', tmpl: PULL_DAY },
  ];

  for (const w of workoutSchedule) {
    const date = daysAgo(w.ago);
    const exists = await Workout.findOne({ user: uid, date: { $gte: new Date(date.setHours(0,0,0,0)), $lt: new Date(date.setHours(23,59,59,999)) } });
    if (!exists) {
      await Workout.create(makeWorkout(uid, daysAgo(w.ago), w.name, w.tmpl));
    }
  }
  console.log('Workouts seeded');

  // ── 3. Nutrition — 30 days with deliberate patterns ───────────────────────
  for (let ago = 30; ago >= 0; ago--) {
    const date = daysAgo(ago);
    const dk = dayKey(date);
    const exists = await NutritionLog.findOne({ user: uid, date: { $gte: new Date(date.setHours(0,0,0,0)), $lt: new Date(date.setHours(23,59,59,999)) } });
    if (exists) continue;

    const isHighFuelDay   = [27, 26, 20, 19, 14, 13, 7, 5, 3].includes(ago); // pre-workout days
    const isTanninDay     = [25, 22, 18, 15, 11, 8, 4, 1].includes(ago);     // tea with lentils
    const isLowIronDay    = isTanninDay;
    const isOvertrain     = ago >= 9 && ago <= 14;

    await NutritionLog.create(makeNutrition(uid, daysAgo(ago), {
      calories:  isHighFuelDay ? Math.round(jitter(2600, 100)) : Math.round(jitter(2100, 150)),
      protein:   isHighFuelDay ? Math.round(jitter(165, 10))   : Math.round(jitter(130, 15)),
      carbs:     isHighFuelDay ? Math.round(jitter(300, 20))   : Math.round(jitter(220, 20)),
      fat:       Math.round(jitter(72, 8)),
      iron:      isLowIronDay  ? Math.round(jitter(7, 1))      : Math.round(jitter(16, 2)),
      vitaminC:  isLowIronDay  ? 20 : 80,  // low vit-C on tannin days compounds the problem
      fiber:     Math.round(jitter(26, 4)),
      water:     isOvertrain   ? Math.round(jitter(2000, 200)) : Math.round(jitter(2700, 200)),
      withTea:   isTanninDay,
      preWorkout: isHighFuelDay,
      lunchName: isTanninDay ? 'Dal + tea (tannins)' : 'Dal rice',
      lentilVariant: isTanninDay ? 'Masoor Dal' : 'Chana Dal',
      lentilIron: isTanninDay ? 5 : 8,
    }));
  }
  console.log('Nutrition logs seeded');

  // ── 4. Mental / wellness — 30 days ────────────────────────────────────────
  for (let ago = 30; ago >= 0; ago--) {
    const date = daysAgo(ago);
    const exists = await MentalLog.findOne({ user: uid, date: { $gte: new Date(date.setHours(0,0,0,0)), $lt: new Date(date.setHours(23,59,59,999)) } });
    if (exists) continue;

    const isAfterTanninDay = [24, 21, 17, 14, 10, 7, 3, 0].includes(ago); // day after iron-blocking meal
    const isOvertrain      = ago >= 8 && ago <= 13;
    const isPeakOvertrain  = ago >= 9 && ago <= 11;
    const isPostOvertrainRecovery = ago >= 4 && ago <= 7;

    await MentalLog.create(makeMental(uid, daysAgo(ago), {
      // Low energy the day after tannin (iron absorption blocked)
      energy:       isAfterTanninDay ? Math.round(jitter(4.5, 0.5)) : isPeakOvertrain ? Math.round(jitter(4, 0.5)) : Math.round(jitter(7.2, 0.8)),
      mood:         isPeakOvertrain  ? Math.round(jitter(4, 0.5))   : Math.round(jitter(7, 0.7)),
      stress:       isPeakOvertrain  ? Math.round(jitter(7.5, 0.5)) : isOvertrain ? Math.round(jitter(6, 0.5)) : Math.round(jitter(3.5, 0.8)),
      sleep:        isPeakOvertrain  ? jitter(5.5, 0.5) : isPostOvertrainRecovery ? jitter(8.5, 0.3) : jitter(7.5, 0.5),
      sleepQuality: isPeakOvertrain  ? Math.round(jitter(4, 0.5))   : Math.round(jitter(7, 0.7)),
      bodyFeel:     isPeakOvertrain  ? Math.round(jitter(3.5, 0.5)) : Math.round(jitter(7, 0.7)),
      rhr:          isPeakOvertrain  ? Math.round(jitter(67, 3))    : Math.round(jitter(57, 3)),
      hunger:       Math.round(jitter(5, 1)),
      notes:        isPeakOvertrain ? 'Feeling very fatigued, sore all over' : isAfterTanninDay ? 'Low energy, foggy in the morning' : '',
    }));
  }
  console.log('Mental/wellness logs seeded');

  // ── 5. Weight logs ────────────────────────────────────────────────────────
  for (let ago = 30; ago >= 0; ago -= 3) {
    const date = daysAgo(ago);
    const exists = await WeightLog.findOne({ user: uid, date: { $gte: new Date(date.setHours(0,0,0,0)), $lt: new Date(date.setHours(23,59,59,999)) } });
    if (!exists) {
      await WeightLog.create({ user: uid, date: daysAgo(ago), weightKg: jitter(78, 0.4) });
    }
  }
  console.log('Weight logs seeded');

  // ── 6. DailyLifeState — hand-crafted to match the storyline ──────────────
  const dlsData = [
    // Normal days
    ...Array.from({ length: 7 }, (_, i) => ({
      ago: 30 - i,
      opts: { label: 'stable', labelConf: 0.78, readiness: jitter(7.2, 0.3),
        reasons: ['sleep above baseline', 'nutrition adequate', 'stress within range'],
        sleep: 0.76, energy: 0.72, stress: 0.32, nutrition: 0.80, load: 0.5 },
    })),
    // Overtraining build-up (days 14-9 ago)
    { ago: 14, opts: { label: 'stable',     labelConf: 0.70, readiness: 6.8, reasons: ['high training load building', 'sleep slightly reduced'],    sleep: 0.68, energy: 0.65, stress: 0.55, nutrition: 0.78, load: 0.80 } },
    { ago: 13, opts: { label: 'overloaded', labelConf: 0.72, readiness: 6.2, reasons: ['5th consecutive training day', 'stress elevated', 'sleep disrupted'], sleep: 0.55, energy: 0.55, stress: 0.65, nutrition: 0.75, load: 0.88 } },
    { ago: 12, opts: { label: 'overloaded', labelConf: 0.80, readiness: 5.5, reasons: ['6 consecutive training days', 'high stress', 'energy depleting'], sleep: 0.48, energy: 0.42, stress: 0.75, nutrition: 0.68, load: 0.92 } },
    { ago: 11, opts: { label: 'overloaded', labelConf: 0.85, readiness: 4.8, reasons: ['chronic fatigue signal', 'RHR elevated', 'overtraining risk high'], sleep: 0.42, energy: 0.38, stress: 0.78, nutrition: 0.65, load: 0.95 } },
    { ago: 10, opts: { label: 'depleted',   labelConf: 0.82, readiness: 4.2, reasons: ['depleted energy reserves', 'poor sleep', 'iron low from tannin meals'], sleep: 0.40, energy: 0.35, stress: 0.80, nutrition: 0.55, load: 0.90 } },
    { ago: 9,  opts: { label: 'depleted',   labelConf: 0.88, readiness: 3.9, reasons: ['critical depletion', 'should rest today', 'sleep debt accumulating'], sleep: 0.38, energy: 0.32, stress: 0.82, nutrition: 0.58, load: 0.93 } },
    // Recovery
    { ago: 8,  opts: { label: 'recovering', labelConf: 0.75, readiness: 5.2, reasons: ['rest day', 'sleep improving', 'stress dropping'], sleep: 0.62, energy: 0.50, stress: 0.60, nutrition: 0.72, load: 0.30 } },
    { ago: 7,  opts: { label: 'recovering', labelConf: 0.80, readiness: 6.0, reasons: ['second rest day', 'energy rebounding', 'nutrition restored'], sleep: 0.72, energy: 0.62, stress: 0.45, nutrition: 0.80, load: 0.10 } },
    { ago: 6,  opts: { label: 'recovering', labelConf: 0.82, readiness: 6.5, reasons: ['sleep quality high', 'energy recovering', 'stress normalized'],  sleep: 0.78, energy: 0.68, stress: 0.38, nutrition: 0.78, load: 0.15 } },
    { ago: 5,  opts: { label: 'stable',     labelConf: 0.78, readiness: 7.0, reasons: ['training resumed', 'good fueling', 'stress in range'],     sleep: 0.76, energy: 0.72, stress: 0.34, nutrition: 0.84, load: 0.55 } },
    { ago: 4,  opts: { label: 'stable',     labelConf: 0.80, readiness: 7.3, reasons: ['strong sleep', 'high protein day', 'energy optimal'],      sleep: 0.80, energy: 0.78, stress: 0.30, nutrition: 0.88, load: 0.50 } },
    { ago: 3,  opts: { label: 'stable',     labelConf: 0.82, readiness: 7.5, reasons: ['recovery complete', 'peak performance window', 'all signals green'], sleep: 0.82, energy: 0.80, stress: 0.28, nutrition: 0.90, load: 0.58 } },
    { ago: 2,  opts: { label: 'stable',     labelConf: 0.84, readiness: 7.8, reasons: ['excellent sleep', 'high fuel day', 'low stress'],           sleep: 0.85, energy: 0.82, stress: 0.25, nutrition: 0.91, load: 0.55 } },
    { ago: 1,  opts: { label: 'stable',     labelConf: 0.83, readiness: 7.6, reasons: ["good night's sleep", 'protein target hit', 'training load moderate'], sleep: 0.82, energy: 0.79, stress: 0.30, nutrition: 0.88, load: 0.60 } },
    { ago: 0,  opts: { label: 'stable',     labelConf: 0.81, readiness: 7.4, reasons: ["today's data still accumulating", 'sleep was good', 'energy normal'], sleep: 0.80, energy: 0.76, stress: 0.32, nutrition: 0.82, load: 0.50 } },
  ];

  for (const { ago, opts } of dlsData) {
    const date = daysAgo(ago);
    const dk = dayKey(daysAgo(ago));
    await DailyLifeState.findOneAndUpdate(
      { user: uid, dayKey: dk },
      makeDLS(uid, date, { ...opts, sleepH: (opts.sleep * 9).toFixed(1) }),
      { upsert: true, new: true }
    );
  }
  console.log('DailyLifeState seeded');

  // ── 7. PatternMemory — 5 high-confidence patterns ────────────────────────
  const patterns = [
    makePattern(uid,
      ['high_protein', 'pre_workout_carbs'],
      'next_day_workout_performance_high',
      'next_day',
      { confidence: 0.78, supportCount: 10, refuteCount: 2, firstObserved: 28, lastObserved: 1 }
    ),
    makePattern(uid,
      ['tea_with_lentils', 'low_vitamin_c'],
      'next_day_energy_low',
      'next_day',
      { confidence: 0.74, supportCount: 7, refuteCount: 1, firstObserved: 26, lastObserved: 2 }
    ),
    makePattern(uid,
      ['sleep_lt_6h'],
      'stress_elevated',
      'same_day',
      { confidence: 0.81, supportCount: 6, refuteCount: 1, firstObserved: 14, lastObserved: 9 }
    ),
    makePattern(uid,
      ['6_consecutive_training_days'],
      'readiness_depleted',
      'same_day',
      { confidence: 0.85, supportCount: 5, refuteCount: 0, firstObserved: 14, lastObserved: 8 }
    ),
    makePattern(uid,
      ['high_carb_dinner', 'low_stress'],
      'sleep_quality_high',
      'same_day',
      { confidence: 0.66, supportCount: 9, refuteCount: 3, firstObserved: 28, lastObserved: 3 }
    ),
  ];

  for (const p of patterns) {
    await PatternMemory.findOneAndUpdate(
      { user: uid, patternKey: p.patternKey },
      p,
      { upsert: true, new: true }
    );
  }
  console.log('PatternMemory seeded');

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n✓ Demo data seeded for', EMAIL);
  console.log('  Login: email =', EMAIL, '| password =', PASSWORD);
  console.log('  Check home screen for "Today\'s Signal" hero card.');
  console.log('  Chat → send any message to see grounded AI reply.');
  console.log('  Insights → Monthly Report for delta badges.');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

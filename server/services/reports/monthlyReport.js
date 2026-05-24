const DailyLifeState = require('../../models/DailyLifeState');
const PatternMemory = require('../../models/PatternMemory');
const IdentityMemory = require('../../models/IdentityMemory');
const Workout = require('../../models/Workout');
const { NutritionLog, WeightLog } = require('../../models/Logs');

function isValidMonth(month) {
  return /^\d{4}-\d{2}$/.test(String(month || '').trim());
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function mean(nums) {
  const arr = (nums || []).map(Number).filter((n) => Number.isFinite(n));
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function monthRangeDayKeys(month) {
  // month: YYYY-MM
  if (!isValidMonth(month)) return null;
  const [yy, mm] = month.split('-').map((x) => Number(x));
  const start = `${month}-01`;
  const lastDay = new Date(yy, mm, 0).getDate(); 
  const end = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { startDayKey: start, endDayKey: end };
}

function pickSignal(dls, key) {
  const s = dls?.signals?.[key];
  if (!s) return { value: null, confidence: 0, raw: null };
  return {
    value: s.value == null ? null : clamp01(s.value),
    confidence: clamp01(s.confidence),
    raw: s.raw ?? null,
  };
}

function buildCsvRow(values) {
  return values
    .map((v) => {
      const s = v == null ? '' : String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    })
    .join(',');
}

function toCsv({ month, days }) {
  const header = [
    'dayKey',
    'summaryLabel',
    'summaryConfidence',
    'sleepValue',
    'sleepHours',
    'stressValue',
    'stressLevel',
    'energyValue',
    'energyLevel',
    'trainingLoadValue',
    'nutritionValue',
    'habitsValue',
  ];

  const rows = [buildCsvRow(header)];

  for (const d of days) {
    rows.push(
      buildCsvRow([
        d.dayKey,
        d.summaryStateLabel,
        d.summaryStateConfidence,
        d.sleep.value,
        d.sleep.raw?.sleepHours ?? '',
        d.stress.value,
        d.stress.raw?.stressLevel ?? '',
        d.energy.value,
        d.energy.raw?.energyLevel ?? '',
        d.trainingLoad.value,
        d.nutrition.value,
        d.habits.value,
      ])
    );
  }

  return rows.join('\n') + '\n';
}

async function generateMonthlyReport({ userId, month }) {
  if (!userId) {
    const err = new Error('Missing userId');
    err.status = 400;
    throw err;
  }

  const monthKey = String(month || '').trim();
  if (!isValidMonth(monthKey)) {
    const err = new Error('Invalid month; expected YYYY-MM');
    err.status = 400;
    throw err;
  }

  const range = monthRangeDayKeys(monthKey);
  if (!range) {
    const err = new Error('Invalid month; expected YYYY-MM');
    err.status = 400;
    throw err;
  }

  const { startDayKey, endDayKey } = range;
  const startDt = new Date(`${startDayKey}T00:00:00`);
  const endDt = new Date(`${endDayKey}T23:59:59`);

  const [states, patterns, identities, workouts, nutrition, weights] = await Promise.all([
    DailyLifeState.find({ user: userId, dayKey: { $gte: startDayKey, $lte: endDayKey } })
      .sort({ dayKey: 1 })
      .lean(),
    PatternMemory.find({ user: userId, status: 'active' }).sort({ confidence: -1 }).limit(10).lean(),
    IdentityMemory.find({ user: userId, status: 'active' }).sort({ confidence: -1 }).limit(10).lean(),
    Workout.find({ user: userId, date: { $gte: startDt, $lte: endDt } }).lean(),
    NutritionLog.find({ user: userId, date: { $gte: startDt, $lte: endDt } }).lean(),
    WeightLog.find({ user: userId, date: { $gte: startDt, $lte: endDt } }).lean(),
  ]);

  // 1. Calculate Summary (Frontend Expectations)
  const totalVolume = workouts.reduce((acc, w) => {
    return acc + (w.exercises || []).reduce((acc2, ex) => {
      return acc2 + (ex.sets || []).reduce((acc3, s) => acc3 + (s.weight || 0) * (s.reps || 0), 0);
    }, 0);
  }, 0);

  const avgCalories = nutrition.length > 0 
    ? nutrition.reduce((acc, n) => acc + (n.dailyTotals?.calories || 0), 0) / nutrition.length 
    : 0;
  
  const avgProtein = nutrition.length > 0 
    ? nutrition.reduce((acc, n) => acc + (n.dailyTotals?.protein || 0), 0) / nutrition.length 
    : 0;

  const avgSleep = states.length > 0
    ? states.reduce((acc, s) => acc + (s.signals?.sleep?.raw?.sleepHours || 0), 0) / states.length
    : 0;

  const avgWeight = weights.length > 0
    ? weights.reduce((acc, w) => acc + (w.weightKg || 0), 0) / weights.length
    : 0;

  const days = (states || []).map((dls) => {
    const sleep = pickSignal(dls, 'sleep');
    const stress = pickSignal(dls, 'stress');
    const energy = pickSignal(dls, 'energy');
    const trainingLoad = pickSignal(dls, 'trainingLoad');
    const nutrition = pickSignal(dls, 'nutrition');
    const habits = pickSignal(dls, 'habits');

    return {
      dayKey: dls.dayKey,
      summaryStateLabel: dls?.summaryState?.label || 'unknown',
      summaryStateConfidence: clamp01(dls?.summaryState?.confidence || 0),
      reasons: Array.isArray(dls?.summaryState?.reasons) ? dls.summaryState.reasons : [],
      sleep,
      stress,
      energy,
      trainingLoad,
      nutrition,
      habits,
    };
  });

  const labelCounts = days.reduce((acc, d) => {
    const k = d.summaryStateLabel || 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const meanSignal = (key) => mean(days.map((d) => d?.[key]?.value));
  const meanConfidence = (key) => mean(days.map((d) => d?.[key]?.confidence));

  const topReasons = (() => {
    const counts = new Map();
    for (const d of days) {
      for (const r of d.reasons || []) {
        const k = String(r || '').trim();
        if (!k) continue;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([reason, count]) => ({ reason, count }));
  })();

  return {
    month: monthKey,
    range: { startDayKey, endDayKey },
    summary: {
      totalWorkouts: workouts.length,
      totalVolume,
      avgCalories,
      avgProtein,
      avgSleep,
      avgWeight
    },
    totals: {
      daysWithState: days.length,
      summaryLabels: labelCounts,
    },
    aggregates: {
      signals: {
        sleep: { meanValue: meanSignal('sleep'), meanConfidence: meanConfidence('sleep') },
        stress: { meanValue: meanSignal('stress'), meanConfidence: meanConfidence('stress') },
        energy: { meanValue: meanSignal('energy'), meanConfidence: meanConfidence('energy') },
        trainingLoad: { meanValue: meanSignal('trainingLoad'), meanConfidence: meanConfidence('trainingLoad') },
        nutrition: { meanValue: meanSignal('nutrition'), meanConfidence: meanConfidence('nutrition') },
        habits: { meanValue: meanSignal('habits'), meanConfidence: meanConfidence('habits') },
      },
      topReasons,
    },
    memory: {
      patterns: (patterns || []).map((p) => ({
        patternKey: p.patternKey,
        confidence: p.confidence,
        supportCount: p.supportCount,
        conditions: p.conditions,
        effect: p.effect,
        window: p.window,
        lastObserved: p.lastObserved,
      })),
      identities: (identities || []).map((im) => ({
        identityKey: im.identityKey,
        claim: im.claim,
        confidence: im.confidence,
        stabilityScore: im.stabilityScore,
        supportingPatterns: im.supportingPatterns,
        lastReinforced: im.lastReinforced,
      })),
    },
    days,
  };
}

module.exports = { generateMonthlyReport, toCsv, isValidMonth };

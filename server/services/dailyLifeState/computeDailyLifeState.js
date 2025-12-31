const crypto = require('crypto');

const { FitnessLog, NutritionLog, MentalLog } = require('../../models/Logs');
const { HabitLog } = require('../../models/Habit');
const SymptomLog = require('../../models/SymptomLog');
const LabReport = require('../../models/LabReport');
const JournalEntry = require('../../models/JournalEntry');

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseDayKey(dayKey) {
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(String(dayKey || '').trim());
  if (!m) return null;

  const [y, mo, d] = dayKey.split('-').map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;

  const start = new Date(y, mo - 1, d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { dateStart: start, dateEnd: end };
}

function normalizeFromRange(n, low, high) {
  if (!Number.isFinite(n)) return null;
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return null;
  return clamp01((n - low) / (high - low));
}

function moodEnumTo01(mood) {
  const m = String(mood || '').trim().toLowerCase();
  if (!m) return null;
  if (m === 'very-low') return 0.1;
  if (m === 'low') return 0.25;
  if (m === 'neutral') return 0.5;
  if (m === 'good') return 0.75;
  if (m === 'great') return 0.9;
  return null;
}

function hashInputs(payload) {
  const json = JSON.stringify(payload);
  return crypto.createHash('sha1').update(json).digest('hex');
}

function avg(nums) {
  const arr = (nums || []).filter((n) => Number.isFinite(n));
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function countFinite(nums) {
  return (nums || []).filter((n) => Number.isFinite(n)).length;
}

function buildSignal({ value, confidence, raw }) {
  return {
    value: value == null ? null : clamp01(value),
    confidence: clamp01(confidence),
    raw: raw == null ? null : raw,
  };
}

function chooseSummaryState({ signals }) {
  const sleep = signals.sleep;
  const stress = signals.stress;
  const energy = signals.energy;
  const training = signals.trainingLoad;
  const nutrition = signals.nutrition;
  const habits = signals.habits;

  const candidates = [sleep, stress, energy, training, nutrition, habits].filter(
    (s) => s && typeof s.confidence === 'number'
  );

  const strongCount = candidates.filter((s) => s.confidence >= 0.6 && s.value != null).length;
  const meanConfidence = candidates.length
    ? candidates.reduce((a, s) => a + (s.confidence || 0), 0) / candidates.length
    : 0;

  if (strongCount < 2 || meanConfidence < 0.5) {
    return { label: 'unknown', confidence: clamp01(meanConfidence), reasons: [] };
  }

  const reasons = [];

  const sleepLow = sleep.value != null && sleep.value <= 0.35 && sleep.confidence >= 0.6;
  const sleepOk = sleep.value != null && sleep.value >= 0.55 && sleep.confidence >= 0.6;

  const energyLow = energy.value != null && energy.value <= 0.35 && energy.confidence >= 0.6;
  const energyMid = energy.value != null && energy.value > 0.35 && energy.value < 0.6 && energy.confidence >= 0.6;

  const stressHigh = stress.value != null && stress.value >= 0.7 && stress.confidence >= 0.6;
  const stressLow = stress.value != null && stress.value <= 0.45 && stress.confidence >= 0.6;

  const trainingHigh = training.value != null && training.value >= 0.7 && training.confidence >= 0.6;
  const nutritionLow = nutrition.value != null && nutrition.value <= 0.35 && nutrition.confidence >= 0.6;

  if ((stressHigh && (sleepLow || energyLow)) || (stressHigh && trainingHigh)) {
    if (stressHigh) reasons.push('elevated stress signal');
    if (sleepLow) reasons.push('low sleep signal');
    if (energyLow) reasons.push('low energy signal');
    if (trainingHigh) reasons.push('high training load signal');
    return { label: 'overloaded', confidence: clamp01(meanConfidence), reasons: reasons.slice(0, 4) };
  }

  if ((energyLow && sleepLow) || (trainingHigh && energyLow) || (nutritionLow && energyLow)) {
    if (energyLow) reasons.push('low energy signal');
    if (sleepLow) reasons.push('low sleep signal');
    if (trainingHigh) reasons.push('high training load signal');
    if (nutritionLow) reasons.push('low nutrition completeness signal');
    return { label: 'depleted', confidence: clamp01(meanConfidence), reasons: reasons.slice(0, 4) };
  }

  if (sleepOk && stressLow && (energyMid || energyLow) && !trainingHigh) {
    reasons.push('restorative sleep signal');
    reasons.push('lower stress signal');
    return { label: 'recovering', confidence: clamp01(meanConfidence), reasons: reasons.slice(0, 4) };
  }

  return { label: 'stable', confidence: clamp01(meanConfidence), reasons: [] };
}

async function computeDailyLifeState({ userId, dayKey }) {
  const range = parseDayKey(dayKey);
  if (!range) {
    const err = new Error('Invalid dayKey; expected YYYY-MM-DD');
    err.status = 400;
    throw err;
  }

  const { dateStart, dateEnd } = range;
  const dateQuery = { $gte: dateStart, $lt: dateEnd };

  const [mentalLogs, nutritionLogs, fitnessLogs, habitLogs, symptomLogs, labReports, journalEntries] = await Promise.all([
    MentalLog.find({ user: userId, date: dateQuery }).sort({ date: -1 }).limit(5),
    NutritionLog.find({ user: userId, date: dateQuery }).sort({ date: -1 }).limit(5),
    FitnessLog.find({ user: userId, date: dateQuery }).sort({ date: -1 }).limit(20),
    HabitLog.find({ user: userId, date: dateQuery }).sort({ date: -1 }).limit(400),
    SymptomLog.find({ user: userId, date: dateQuery }).sort({ date: -1 }).limit(200),
    LabReport.find({ user: userId, date: dateQuery }).sort({ date: -1 }).limit(20),
    JournalEntry.find({ user: userId, date: dateQuery }).sort({ date: -1 }).limit(20),
  ]);

  const latestMental = mentalLogs[0] || null;
  const latestNutrition = nutritionLogs[0] || null;

  const sleepHours = safeNumber(latestMental?.sleepHours);
  const moodScore = safeNumber(latestMental?.moodScore);
  const stressLevel = safeNumber(latestMental?.stressLevel);
  const energyLevel = safeNumber(latestMental?.energyLevel);

  const sleepValue = sleepHours == null ? null : normalizeFromRange(sleepHours, 4, 9);
  const moodValue = moodScore != null ? normalizeFromRange(moodScore, 1, 10) : moodEnumTo01(latestMental?.mood);
  const stressValue = stressLevel == null ? null : normalizeFromRange(stressLevel, 1, 10);
  const energyValue = energyLevel == null ? null : normalizeFromRange(energyLevel, 1, 10);

  const sleepSignal = buildSignal({
    value: sleepValue,
    confidence: sleepHours == null ? 0 : 1,
    raw: sleepHours == null ? null : { sleepHours },
  });

  const moodSignal = buildSignal({
    value: moodValue,
    confidence: moodScore != null ? 1 : (moodValue != null ? 0.6 : 0),
    raw: moodScore != null || latestMental?.mood ? { mood: latestMental?.mood || null, moodScore } : null,
  });

  const stressSignal = buildSignal({
    value: stressValue,
    confidence: stressLevel == null ? 0 : 1,
    raw: stressLevel == null ? null : { stressLevel },
  });

  const energySignal = buildSignal({
    value: energyValue,
    confidence: energyLevel == null ? 0 : 1,
    raw: energyLevel == null ? null : { energyLevel },
  });

  const intensityValues = fitnessLogs.map((l) => safeNumber(l?.intensity)).filter((n) => n != null);
  const fatigueValues = fitnessLogs.map((l) => safeNumber(l?.fatigue)).filter((n) => n != null);
  const intensityAvg = avg(intensityValues);
  const fatigueAvg = avg(fatigueValues);

  const trainingValue = intensityAvg == null && fatigueAvg == null
    ? null
    : normalizeFromRange(((intensityAvg || 0) + (fatigueAvg || 0)) / (countFinite([intensityAvg, fatigueAvg]) || 1), 1, 10);

  const trainingConfidence = (() => {
    const hasIntensity = intensityAvg != null;
    const hasFatigue = fatigueAvg != null;
    if (hasIntensity && hasFatigue) return 0.9;
    if (hasIntensity || hasFatigue) return 0.6;
    return 0;
  })();

  const trainingLoadSignal = buildSignal({
    value: trainingValue,
    confidence: trainingConfidence,
    raw: fitnessLogs.length
      ? {
          workoutsCount: fitnessLogs.length,
          intensityAvg,
          fatigueAvg,
        }
      : null,
  });

  const totals = latestNutrition?.dailyTotals || {};
  const calories = safeNumber(totals?.calories);
  const protein = safeNumber(totals?.protein);
  const carbs = safeNumber(totals?.carbs);
  const fat = safeNumber(totals?.fat);
  const waterMl = safeNumber(latestNutrition?.waterIntake);

  const macros = [protein, carbs, fat];
  const macroPresentCount = macros.filter((m) => m != null && m > 0).length;
  const caloriesPresent = calories != null && calories > 0;
  const waterPresent = waterMl != null && waterMl > 0;

  const nutritionCompleteness = clamp01(
    (macroPresentCount + (caloriesPresent ? 1 : 0) + (waterPresent ? 1 : 0)) / 5
  );

  const nutritionConfidence = (() => {
    if (!latestNutrition) return 0;
    if (caloriesPresent && macroPresentCount >= 2) return 0.9;
    if (caloriesPresent || macroPresentCount >= 1) return 0.6;
    return 0.4;
  })();

  const nutritionSignal = buildSignal({
    value: latestNutrition ? nutritionCompleteness : null,
    confidence: latestNutrition ? nutritionConfidence : 0,
    raw: latestNutrition
      ? {
          calories: calories || 0,
          protein: protein || 0,
          carbs: carbs || 0,
          fat: fat || 0,
          waterMl: waterMl || 0,
        }
      : null,
  });

  const habitCount = habitLogs.length;
  const completedCount = habitLogs.filter((l) => !!l?.completed).length;
  const habitCompletion = habitCount ? clamp01(completedCount / habitCount) : null;
  const habitsConfidence = habitCount >= 6 ? 0.8 : habitCount >= 2 ? 0.55 : habitCount === 1 ? 0.35 : 0;

  const habitsSignal = buildSignal({
    value: habitCompletion,
    confidence: habitsConfidence,
    raw: habitCount
      ? {
          habitLogsCount: habitCount,
          completedCount,
        }
      : null,
  });

  const symptomCount = symptomLogs.length;
  const symptomSevAvg = avg(symptomLogs.map((s) => safeNumber(s?.severity)).filter((n) => n != null));
  const symptomValue = symptomSevAvg == null ? null : clamp01(symptomSevAvg / 10);
  const symptomsConfidence = symptomCount >= 3 ? 0.75 : symptomCount >= 1 ? 0.45 : 0;

  const symptomsContext = buildSignal({
    value: symptomValue,
    confidence: symptomsConfidence,
    raw: symptomCount
      ? {
          symptomLogsCount: symptomCount,
          avgSeverity: symptomSevAvg,
        }
      : null,
  });

  const flagged = (labReports || []).flatMap((r) => (r?.results || []).filter((x) => x && (x.flag === 'high' || x.flag === 'low')));
  const flaggedCount = flagged.length;
  const labsValue = flaggedCount ? clamp01(flaggedCount / 3) : 0;
  const labsConfidence = labReports.length ? 0.55 : 0;

  const labsContext = buildSignal({
    value: labReports.length ? labsValue : null,
    confidence: labsConfidence,
    raw: labReports.length
      ? {
          reportsCount: labReports.length,
          flaggedCount,
        }
      : null,
  });

  const journalCount = journalEntries.length;
  const reflectionConfidence = journalCount >= 1 ? 0.4 : 0;

  const reflectionContext = buildSignal({
    value: journalCount ? clamp01(Math.min(1, journalEntries[0]?.text ? String(journalEntries[0].text).length / 700 : 0)) : null,
    confidence: reflectionConfidence,
    raw: journalCount
      ? {
          entriesCount: journalCount,
        }
      : null,
  });

  const signals = {
    sleep: sleepSignal,
    mood: moodSignal,
    stress: stressSignal,
    energy: energySignal,
    trainingLoad: trainingLoadSignal,
    nutrition: nutritionSignal,
    habits: habitsSignal,
    symptomsContext,
    labsContext,
    reflectionContext,
  };

  const summaryState = chooseSummaryState({ signals });

  const inputsHash = hashInputs({
    dayKey,
    dateStart: dateStart.toISOString(),
    evidence: {
      mentalLogIds: mentalLogs.map((d) => String(d._id)),
      nutritionLogIds: nutritionLogs.map((d) => String(d._id)),
      fitnessLogIds: fitnessLogs.map((d) => String(d._id)),
      habitLogIds: habitLogs.map((d) => String(d._id)),
      symptomLogIds: symptomLogs.map((d) => String(d._id)),
      labReportIds: labReports.map((d) => String(d._id)),
      journalEntryIds: journalEntries.map((d) => String(d._id)),
    },
  });

  return {
    user: userId,
    dayKey,
    dateStart,
    dateEnd,
    signals,
    summaryState,
    evidence: {
      mentalLogIds: mentalLogs.map((d) => d._id),
      nutritionLogIds: nutritionLogs.map((d) => d._id),
      fitnessLogIds: fitnessLogs.map((d) => d._id),
      habitLogIds: habitLogs.map((d) => d._id),
      symptomLogIds: symptomLogs.map((d) => d._id),
      labReportIds: labReports.map((d) => d._id),
      journalEntryIds: journalEntries.map((d) => d._id),
    },
    computedAt: new Date(),
    computeVersion: 1,
    inputsHash,
  };
}

module.exports = { computeDailyLifeState, parseDayKey };

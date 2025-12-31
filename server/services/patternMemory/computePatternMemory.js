const PatternMemory = require('../../models/PatternMemory');
const DailyLifeState = require('../../models/DailyLifeState');
const { computeIdentityMemory } = require('../identityMemory/computeIdentityMemory');
const { applyMemoryOverrides } = require('../memoryControl/applyMemoryOverrides');

const COMPUTE_VERSION = 'pm-v1';

const DEBUG_ENABLED = String(process.env.DEBUG_PATTERN_MEMORY || '').trim() === '1';

function debugLog(...args) {
  if (!DEBUG_ENABLED) return;
  console.log('[PatternMemory]', ...args);
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function daysBetween(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  const ms = db.getTime() - da.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function isoWeekId(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function makePatternKey({ conditions, effect, window }) {
  const cond = (conditions || []).map((c) => String(c).trim().toLowerCase()).filter(Boolean).sort();
  const eff = String(effect || '').trim().toLowerCase();
  const w = String(window || '').trim().toLowerCase();
  return `${w}:${cond.join('+')}=>${eff}`;
}

function getSignal(doc, key) {
  return doc?.signals?.[key] || null;
}

function signalOk(signal, { minConfidence = 0.6 } = {}) {
  return Boolean(signal) && signal.value != null && typeof signal.value === 'number' && (signal.confidence || 0) >= minConfidence;
}

function isLow(signal) {
  return signalOk(signal) && signal.value <= 0.35;
}

function isHigh(signal) {
  return signalOk(signal) && signal.value >= 0.7;
}

function qualifyObservations({ observationDays }) {
  // Apply "non-consecutive days" rule by selecting a spaced subset.
  // Deterministic: keep the earliest day, then skip any observation that is 0-1 days after the last kept.
  const sorted = [...observationDays]
    .filter((o) => o && o.dayKey && o.dateStart)
    .sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));

  const kept = [];
  for (const obs of sorted) {
    if (!kept.length) {
      kept.push(obs);
      continue;
    }
    const prev = kept[kept.length - 1];
    const gap = daysBetween(prev.dateStart, obs.dateStart);
    if (gap == null) continue;
    if (gap <= 1) continue;
    kept.push(obs);
  }

  // Must span at least 2 different ISO weeks
  const weekIds = new Set(kept.map((k) => isoWeekId(k.dateStart)).filter(Boolean));

  return {
    qualified: kept,
    spansTwoWeeks: weekIds.size >= 2,
  };
}

function confidenceFromSupportCount(supportCount) {
  // Slow logarithmic growth, capped.
  // supportCount 3 => ~0.35, 6 => ~0.47, 10 => ~0.57, 20 => ~0.67
  const base = 0.3;
  const max = 0.85;
  const s = Math.max(0, Number(supportCount) || 0);
  const scaled = Math.log1p(Math.max(0, s - 2)) / Math.log1p(30);
  return clamp01(Math.min(max, base + (max - base) * scaled));
}

function applyDecay({ confidence, daysSinceLast, graceDays = 10, decayHalfLifeDays = 30 }) {
  if (!Number.isFinite(confidence)) return 0;
  if (!Number.isFinite(daysSinceLast) || daysSinceLast <= graceDays) {
    return { confidence: clamp01(confidence), decayScore: 0 };
  }

  const t = Math.max(0, daysSinceLast - graceDays);
  const lambda = Math.log(2) / Math.max(1, decayHalfLifeDays);
  const decayed = confidence * Math.exp(-lambda * t);
  const decayScore = clamp01(1 - (decayed / Math.max(1e-6, confidence)));
  return { confidence: clamp01(decayed), decayScore };
}

function statusFromConfidence(conf) {
  const c = Number(conf) || 0;
  if (c >= 0.6) return 'active';
  if (c >= 0.35) return 'weak';
  return 'retired';
}

async function attenuatedConfidenceFromSupportDays({ userId, signalType, supportDayKeys }) {
  const keys = [...new Set((supportDayKeys || []).map(String))].filter(Boolean).sort();
  let confidence = confidenceFromSupportCount(0);
  let minAttenuationApplied = 1.0;

  for (let i = 0; i < keys.length; i++) {
    const supportCount = i + 1;
    const target = confidenceFromSupportCount(supportCount);
    const gain = target - (Number(confidence) || 0);
    if (gain <= 0) continue;

    const { attenuationFactor } = await applyMemoryOverrides({
      userId,
      dayKey: keys[i],
      signalType,
    });

    if (attenuationFactor < minAttenuationApplied) minAttenuationApplied = attenuationFactor;
    confidence = (Number(confidence) || 0) + gain * attenuationFactor;
  }

  return {
    confidence: clamp01(confidence),
    minAttenuationApplied,
    unattenuatedTargetConfidence: confidenceFromSupportCount(keys.length),
    supportCount: keys.length,
    supportDayKeysOrdered: keys,
  };
}

async function computePatternMemory({ userId, dayKey }) {
  const dlsToday = await DailyLifeState.findOne({ user: userId, dayKey });
  if (!dlsToday) return;

  let didMutatePatterns = false;
  const reinforcement = [];

  const label = dlsToday?.summaryState?.label;
  const sumConf = Number(dlsToday?.summaryState?.confidence) || 0;
  if (label === 'unknown' || sumConf < 0.6) return;

  // Load enough history to satisfy "two different weeks" constraint.
  const lookbackDays = 40;
  const start = new Date(dlsToday.dateStart);
  start.setDate(start.getDate() - lookbackDays);

  const history = await DailyLifeState.find({
    user: userId,
    dateStart: { $gte: start },
  }).sort({ dateStart: 1 });

  if (!Array.isArray(history) || history.length < 5) return;

  const byDayKey = new Map(history.map((d) => [d.dayKey, d]));

  const patterns = [
    {
      key: 'low_sleep__next_day__low_energy',
      conditions: ['low_sleep'],
      effect: 'low_energy',
      window: 'next_day',
      signalType: 'sleep',
      condition: (d) => isLow(getSignal(d, 'sleep')),
      effectCheck: (dNext) => isLow(getSignal(dNext, 'energy')),
    },
    {
      key: 'high_stress__same_day__low_energy',
      conditions: ['high_stress'],
      effect: 'low_energy',
      window: 'same_day',
      signalType: 'stress',
      condition: (d) => isHigh(getSignal(d, 'stress')),
      effectCheck: (d) => isLow(getSignal(d, 'energy')),
    },
    {
      key: 'high_training_load__next_day__fatigue',
      conditions: ['high_training_load'],
      effect: 'next_day_fatigue',
      window: 'next_day',
      signalType: 'training',
      condition: (d) => isHigh(getSignal(d, 'trainingLoad')),
      effectCheck: (dNext) => isLow(getSignal(dNext, 'energy')),
    },
    {
      key: 'low_nutrition__same_day__low_energy',
      conditions: ['low_nutrition'],
      effect: 'low_energy',
      window: 'same_day',
      signalType: 'nutrition',
      condition: (d) => isLow(getSignal(d, 'nutrition')),
      effectCheck: (d) => isLow(getSignal(d, 'energy')),
    },
  ];

  for (const p of patterns) {
    const patternKey = makePatternKey({ conditions: p.conditions, effect: p.effect, window: p.window });

    // Collect raw observation days.
    const observationDays = [];

    for (const d of history) {
      const dLabel = d?.summaryState?.label;
      const dSumConf = Number(d?.summaryState?.confidence) || 0;
      if (dLabel === 'unknown' || dSumConf < 0.6) continue;

      if (!p.condition(d)) continue;

      if (p.window === 'same_day') {
        if (!p.effectCheck(d)) continue;
        observationDays.push({ dayKey: d.dayKey, dateStart: d.dateStart });
        continue;
      }

      if (p.window === 'next_day') {
        const next = byDayKey.get(nextDayKey(d.dayKey));
        if (!next) continue;

        const nextLabel = next?.summaryState?.label;
        const nextSumConf = Number(next?.summaryState?.confidence) || 0;
        if (nextLabel === 'unknown' || nextSumConf < 0.6) continue;

        if (!p.effectCheck(next)) continue;
        observationDays.push({ dayKey: d.dayKey, dateStart: d.dateStart });
      }
    }

    const { qualified, spansTwoWeeks } = qualifyObservations({ observationDays });
    if (!spansTwoWeeks || qualified.length < 3) {
      // Still decay existing patterns over time.
      const existing = await PatternMemory.findOne({ user: userId, patternKey });
      if (!existing) continue;

      const daysSinceLast = existing.lastObserved ? daysBetween(existing.lastObserved, dlsToday.dateStart) : null;
      const decayed = applyDecay({ confidence: existing.confidence, daysSinceLast });

      const nextStatus = statusFromConfidence(decayed.confidence);
      const changed = decayed.confidence !== existing.confidence || nextStatus !== existing.status;

      if (changed) {
        existing.confidence = decayed.confidence;
        existing.decayScore = decayed.decayScore;
        existing.status = nextStatus;
        existing.computeVersion = COMPUTE_VERSION;
        await existing.save();

        didMutatePatterns = true;

        if (nextStatus === 'retired' && existing.status !== 'retired') {
          debugLog('retired', patternKey, 'confidence', existing.confidence.toFixed(3));
        } else {
          debugLog('decayed', patternKey, 'confidence', existing.confidence.toFixed(3));
        }
      }

      continue;
    }

    const qualifiedKeys = qualified.map((q) => q.dayKey);

    let doc = await PatternMemory.findOne({ user: userId, patternKey });

    if (!doc) {
      // Create only when the rule constraints are met.
      const createdConfidence = await attenuatedConfidenceFromSupportDays({
        userId,
        signalType: p.signalType,
        supportDayKeys: qualifiedKeys,
      });

      doc = await PatternMemory.create({
        user: userId,
        patternKey,
        conditions: p.conditions,
        effect: p.effect,
        window: p.window,
        supportDayKeys: createdConfidence.supportDayKeysOrdered,
        supportCount: createdConfidence.supportCount,
        confidence: createdConfidence.confidence,
        firstObserved: qualified[0].dateStart,
        lastObserved: qualified[qualified.length - 1].dateStart,
        decayScore: 0,
        status: statusFromConfidence(createdConfidence.confidence),
        computeVersion: COMPUTE_VERSION,
      });

      didMutatePatterns = true;

      debugLog(
        'created',
        patternKey,
        'support',
        doc.supportCount,
        'confidence',
        doc.confidence.toFixed(3),
        createdConfidence.minAttenuationApplied < 1 ? `(attenuation min=${createdConfidence.minAttenuationApplied.toFixed(2)})` : ''
      );
      continue;
    }

    // Apply decay first.
    const daysSinceLast = doc.lastObserved ? daysBetween(doc.lastObserved, dlsToday.dateStart) : null;
    const decayed = applyDecay({ confidence: doc.confidence, daysSinceLast });
    const prevStatus = doc.status;
    doc.confidence = decayed.confidence;
    doc.decayScore = decayed.decayScore;

    const already = new Set((doc.supportDayKeys || []).map(String));
    const newSupport = qualifiedKeys.filter((k) => !already.has(String(k)));

    if (newSupport.length > 0) {
      const prevConfidence = doc.confidence;
      const supportKeysOrdered = [...newSupport].map(String).sort();
      let minAttenuationApplied = 1.0;

      for (const supportDayKey of supportKeysOrdered) {
        doc.supportDayKeys = [...already, supportDayKey].slice(-120);
        already.add(supportDayKey);

        doc.supportCount = doc.supportDayKeys.length;

        const target = confidenceFromSupportCount(doc.supportCount);
        const gain = target - (Number(doc.confidence) || 0);
        if (gain > 0) {
          const { attenuationFactor } = await applyMemoryOverrides({
            userId,
            dayKey: supportDayKey,
            signalType: p.signalType,
          });
          if (attenuationFactor < minAttenuationApplied) minAttenuationApplied = attenuationFactor;
          doc.confidence = (Number(doc.confidence) || 0) + gain * attenuationFactor;
        } else {
          // No positive gain; keep as-is.
          doc.confidence = Number(doc.confidence) || 0;
        }
      }

      doc.lastObserved = qualified[qualified.length - 1].dateStart;
      if (!doc.firstObserved) doc.firstObserved = qualified[0].dateStart;

      doc.decayScore = 0;
      doc.computeVersion = COMPUTE_VERSION;

      doc.status = statusFromConfidence(doc.confidence);
      await doc.save();

      didMutatePatterns = true;

      reinforcement.push({
        patternKey,
        addedSupportDays: supportKeysOrdered.length,
        minAttenuationApplied,
        confidenceBefore: prevConfidence,
        confidenceAfter: doc.confidence,
        unattenuatedTargetConfidence: confidenceFromSupportCount(doc.supportCount),
      });

      debugLog('reinforced', patternKey, '+', newSupport.length, 'support', doc.supportCount, 'confidence', doc.confidence.toFixed(3));
      continue;
    }

    // No reinforcement; persist decay-driven status changes if needed.
    doc.status = statusFromConfidence(doc.confidence);
    doc.computeVersion = COMPUTE_VERSION;

    const statusChanged = doc.status !== prevStatus;
    const confidenceChanged = Math.abs((doc.confidence || 0) - (decayed.confidence || 0)) > 1e-9;

    if (statusChanged || confidenceChanged) {
      await doc.save();

      didMutatePatterns = true;
      if (doc.status === 'retired') debugLog('retired', patternKey, 'confidence', doc.confidence.toFixed(3));
      else debugLog('decayed', patternKey, 'confidence', doc.confidence.toFixed(3));
    }
  }

  const identityEnabled = String(process.env.IDENTITY_MEMORY_ENABLED || '1').trim() !== '0';
  if (identityEnabled && didMutatePatterns) {
    setImmediate(() => {
      computeIdentityMemory({ userId, dayKey }).catch((err) => {
        if (String(process.env.DEBUG_IDENTITY_MEMORY || '').trim() === '1') {
          console.log('[IdentityMemory] compute failed:', err?.message || err);
        }
      });
    });
  }

  return { didMutatePatterns, reinforcement };
}

function nextDayKey(dayKey) {
  const s = String(dayKey || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setDate(dt.getDate() + 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

module.exports = { computePatternMemory, makePatternKey };

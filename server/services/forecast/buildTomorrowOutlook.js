function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
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

function conditionSatisfied({ dls, condition }) {
  const c = String(condition || '').trim().toLowerCase();
  if (!c) return false;

  switch (c) {
    case 'low_sleep':
      return isLow(dls?.signals?.sleep);
    case 'high_stress':
      return isHigh(dls?.signals?.stress);
    case 'high_training_load':
      return isHigh(dls?.signals?.trainingLoad);
    case 'low_nutrition':
      return isLow(dls?.signals?.nutrition);
    default:
      return false;
  }
}

function effectLabel(effect) {
  const e = String(effect || '').trim().toLowerCase();
  if (e === 'low_energy') return 'Lower energy';
  if (e === 'next_day_fatigue') return 'Next-day fatigue';
  return e || 'Effect';
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

function confidenceForConditions({ dls, conditions }) {
  const confs = [];
  for (const c of conditions || []) {
    const key = String(c || '').trim().toLowerCase();
    if (key === 'low_sleep') confs.push(Number(dls?.signals?.sleep?.confidence) || 0);
    else if (key === 'high_stress') confs.push(Number(dls?.signals?.stress?.confidence) || 0);
    else if (key === 'high_training_load') confs.push(Number(dls?.signals?.trainingLoad?.confidence) || 0);
    else if (key === 'low_nutrition') confs.push(Number(dls?.signals?.nutrition?.confidence) || 0);
    else confs.push(0);
  }
  if (!confs.length) return 0;
  return clamp01(confs.reduce((a, b) => a + b, 0) / confs.length);
}

function buildTomorrowOutlook({ dlsToday, patterns }) {
  if (!dlsToday) {
    return {
      dayKey: null,
      tomorrowDayKey: null,
      outlook: 'unknown',
      confidence: 0,
      items: [],
      evidence: null,
      notes: ['No DailyLifeState available for today.'],
    };
  }

  const matched = [];

  const candidatePatterns = (patterns || [])
    .filter((p) => String(p?.window || '').toLowerCase() === 'next_day')
    .filter((p) => (Number(p?.confidence) || 0) >= 0.55)
    .filter((p) => String(p?.status || '') !== 'retired');

  for (const p of candidatePatterns) {
    const conditions = Array.isArray(p?.conditions) ? p.conditions : [];
    if (!conditions.length) continue;

    const ok = conditions.every((c) => conditionSatisfied({ dls: dlsToday, condition: c }));
    if (!ok) continue;

    const conditionConfidence = confidenceForConditions({ dls: dlsToday, conditions });
    const summaryConfidence = clamp01(Number(dlsToday?.summaryState?.confidence) || 0);

    const score = clamp01((Number(p.confidence) || 0) * (0.6 + 0.4 * conditionConfidence) * (0.7 + 0.3 * summaryConfidence));

    matched.push({
      patternKey: p.patternKey,
      effect: p.effect,
      window: p.window,
      label: effectLabel(p.effect),
      score,
      supportCount: p.supportCount || 0,
      lastObserved: p.lastObserved || null,
      conditions,
    });
  }

  matched.sort((a, b) => (b.score || 0) - (a.score || 0));

  const top = matched[0] || null;
  const confidence = top ? clamp01(top.score) : 0;
  const outlook = confidence >= 0.75 ? 'likely' : confidence >= 0.6 ? 'possible' : 'unknown';

  const nutritionRaw = dlsToday?.signals?.nutrition?.raw || null;

  return {
    dayKey: dlsToday.dayKey,
    tomorrowDayKey: nextDayKey(dlsToday.dayKey),
    outlook,
    confidence,
    items: matched.slice(0, 5),
    evidence: {
      todaySummaryState: dlsToday?.summaryState || null,
      todaySignals: {
        sleep: dlsToday?.signals?.sleep || null,
        stress: dlsToday?.signals?.stress || null,
        energy: dlsToday?.signals?.energy || null,
        trainingLoad: dlsToday?.signals?.trainingLoad || null,
        nutrition: dlsToday?.signals?.nutrition || null,
      },
      nutritionSummary: nutritionRaw,
    },
    notes: [
      'This outlook is derived from your own repeated patterns (not a diagnosis).',
      'If confidence is low, LifeSync stays quiet.',
    ],
  };
}

module.exports = { buildTomorrowOutlook };

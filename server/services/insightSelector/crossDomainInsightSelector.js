/**
 * crossDomainInsightSelector
 *
 * Returns the top-N "cross-domain" insights for a user — the insights LifeSync exists to surface:
 * food × training × wellness × glucose × labs links.
 *
 * Inputs are pulled from the existing engines (correlationEngine, readinessEngine,
 * insulinIntelligenceService, PatternMemory). This module ranks them; it does not
 * compute new signals.
 */

const PatternMemory = require('../../models/PatternMemory');
const DailyLifeState = require('../../models/DailyLifeState');
const { NutritionLog } = require('../../models/Logs');
const { analyzeCorrelations } = require('../insights/correlationEngine');
const { calculateReadiness } = require('../insights/readinessEngine');
const { analyzeMeals } = require('../insulinIntelligenceService');

const IMPACT_WEIGHT = { high: 1.0, moderate: 0.6, low: 0.3 };

function slugify(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function scoreImpact(impact) {
  return IMPACT_WEIGHT[String(impact || 'low').toLowerCase()] ?? 0.3;
}

function recencyWeight(daysAgo) {
  if (!Number.isFinite(daysAgo)) return 0.5;
  if (daysAgo <= 0) return 1.0;
  if (daysAgo <= 1) return 0.9;
  if (daysAgo <= 3) return 0.75;
  if (daysAgo <= 7) return 0.55;
  if (daysAgo <= 14) return 0.35;
  return 0.2;
}

function actionabilityWeight(insight) {
  return insight && typeof insight.action === 'string' && insight.action.trim() ? 1.0 : 0.5;
}

function makeInsight({ id, kind, title, detail, action, impact, recencyDays, evidence }) {
  const base = {
    id,
    kind,
    title: String(title || '').trim(),
    detail: String(detail || '').trim(),
    action: action ? String(action).trim() : null,
    impact: impact || 'moderate',
    evidence: evidence || null,
  };
  // High-impact insights get a recency floor of 0.6 so they aren't buried by age alone
  const effectiveRecency = (String(impact || '').toLowerCase() === 'high')
    ? Math.max(recencyWeight(recencyDays), 0.6)
    : recencyWeight(recencyDays);
  const score = scoreImpact(impact)
    * effectiveRecency
    * actionabilityWeight(base);
  return { ...base, score: Math.round(score * 100) / 100 };
}

async function fromCorrelationEngine(userId) {
  try {
    const arr = await analyzeCorrelations(userId, 30);
    if (!Array.isArray(arr)) return [];
    return arr.map((c) => makeInsight({
      id: 'corr:' + (c.type || 'unknown') + ':' + slugify(c.title),
      kind: 'correlation',
      title: c.title,
      detail: c.detail,
      action: c.action,
      impact: c.impact,
      recencyDays: 14, // correlation engine looks at 30d window — treat as 2-week-recent
    }));
  } catch (err) {
    console.warn('[crossDomainInsightSelector] correlationEngine failed:', err.message);
    return [];
  }
}

async function fromReadinessEngine(userId) {
  try {
    const r = await calculateReadiness(userId);
    if (!r) return [];
    const out = [];
    if (r.overtraining && r.overtraining.risk && r.overtraining.risk !== 'low') {
      out.push(makeInsight({
        id: `readiness:overtraining`,
        kind: 'training_recovery',
        title: `Overtraining risk: ${r.overtraining.risk}`,
        detail: r.overtraining.detail,
        action: r.recommendation,
        impact: r.overtraining.risk === 'high' ? 'high' : 'moderate',
        recencyDays: 0,
        evidence: { readinessScore: r.readinessScore, components: r.components },
      }));
    }
    // Surface the readiness signal itself when notable
    if (typeof r.readinessScore === 'number' && r.readinessScore < 5) {
      out.push(makeInsight({
        id: `readiness:low`,
        kind: 'readiness',
        title: `Today's readiness is ${r.readinessScore}/10`,
        detail: r.recommendation,
        action: r.recommendation,
        impact: r.readinessScore < 4 ? 'high' : 'moderate',
        recencyDays: 0,
        evidence: { components: r.components },
      }));
    }
    if (Array.isArray(r.stagnationAlerts)) {
      r.stagnationAlerts.slice(0, 3).forEach((s) => {
        const isRpеCreep = s.type === 'rpe_creep';
        out.push(makeInsight({
          id: 'readiness:stagnation:' + slugify(s.exercise),
          kind: isRpеCreep ? 'training_overreach' : 'training_progress',
          title: isRpеCreep
            ? `Overreaching signal: ${s.exercise}`
            : `Plateau detected: ${s.exercise}`,
          detail: isRpеCreep
            ? `RPE has risen from ${s.avgOlderRpe} to ${s.avgRecentRpe} at similar weights — effort is increasing without load progression.`
            : `Best weight in last 3 sessions: ${s.currentBest} kg — no progression.`,
          action: s.suggestion,
          impact: isRpеCreep ? 'high' : 'moderate',
          recencyDays: 2,
          evidence: s,
        }));
      });
    }
    return out;
  } catch (err) {
    console.warn('[crossDomainInsightSelector] readinessEngine failed:', err.message);
    return [];
  }
}

async function fromInsulinIntelligence(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const log = await NutritionLog.findOne({
      user: userId,
      date: { $gte: today, $lt: tomorrow },
    }).lean();
    if (!log || !Array.isArray(log.meals) || log.meals.length === 0) return [];
    const sim = analyzeMeals(log.meals);
    if (!sim || !Array.isArray(sim.mealAnalyses)) return [];

    const highSpike = sim.mealAnalyses.find(m => m.peakGlucose >= 160);
    if (!highSpike) return [];
    return [makeInsight({
      id: `insulin:spike`,
      kind: 'glucose',
      title: `${highSpike.name || 'Meal'} predicts a high glucose spike (${highSpike.peakGlucose} mg/dL)`,
      detail: `Carbs ${highSpike.carbs}g, fiber ${highSpike.fiber}g, protein ${highSpike.protein}g. High glycemic pressure correlates with afternoon energy crash.`,
      action: 'Front-load fiber or protein at this meal next time, or split carbs across two smaller portions.',
      impact: 'moderate',
      recencyDays: 0,
      evidence: { mealName: highSpike.name, peakGlucose: highSpike.peakGlucose, time: highSpike.time },
    })];
  } catch (err) {
    console.warn('[crossDomainInsightSelector] insulin sim failed:', err.message);
    return [];
  }
}

async function fromPatternMemory(userId) {
  try {
    const patterns = await PatternMemory.find({
      user: userId,
      status: 'active',
      confidence: { $gte: 0.55 },
    }).sort({ confidence: -1, lastObserved: -1 }).limit(5).lean();

    return patterns.map((p) => {
      const lastObs = p.lastObserved ? new Date(p.lastObserved) : null;
      const daysAgo = lastObs ? Math.floor((Date.now() - lastObs.getTime()) / (24 * 3600 * 1000)) : 30;
      const conds = (p.conditions || []).join(' + ');
      return makeInsight({
        id: `pattern:${p.patternKey}`,
        kind: 'pattern',
        title: `Pattern: ${conds || 'condition'} → ${p.effect}`,
        detail: `Observed ${p.supportCount} times (confidence ${Math.round(p.confidence * 100)}%). Last seen ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago.`,
        action: null,
        impact: p.confidence >= 0.75 ? 'high' : 'moderate',
        recencyDays: daysAgo,
        evidence: { patternKey: p.patternKey, supportCount: p.supportCount, confidence: p.confidence },
      });
    });
  } catch (err) {
    console.warn('[crossDomainInsightSelector] PatternMemory read failed:', err.message);
    return [];
  }
}

async function selectTopInsights(userId, { limit = 3 } = {}) {
  const [corr, readiness, insulin, patterns] = await Promise.all([
    fromCorrelationEngine(userId),
    fromReadinessEngine(userId),
    fromInsulinIntelligence(userId),
    fromPatternMemory(userId),
  ]);

  const all = [...corr, ...readiness, ...insulin, ...patterns];

  // Dedup by id (e.g. if the same correlation surfaces twice).
  const seen = new Set();
  const unique = [];
  for (const ins of all) {
    if (!ins.id || seen.has(ins.id)) continue;
    seen.add(ins.id);
    unique.push(ins);
  }

  // ── Contradiction detection ────────────────────────────────────────────────
  // When opposing signals exist (e.g. "strength up 50%" vs "muscle loss risk"),
  // flag the contradiction rather than surfacing both at face value.
  const strengthUpId = unique.findIndex(i => i.kind === 'correlation' && /performance gains/i.test(i.title));
  const muscleLossId = unique.findIndex(i => i.type === 'muscle_loss_risk' || /muscle loss/i.test(i.title));
  if (strengthUpId >= 0 && muscleLossId >= 0) {
    // Merge into a single warning; muscle loss risk is the safety-critical signal
    const merged = Object.assign({}, unique[muscleLossId], {
      id: 'contradiction:strength_vs_muscle_loss',
      title: 'Mixed signal: volume up but muscle loss risk detected',
      detail: `${unique[muscleLossId].detail} Note: short-term performance metrics can still improve while muscle protein balance is negative — address nutrition first.`,
      impact: 'high',
      score: Math.max(unique[strengthUpId].score, unique[muscleLossId].score),
    });
    const filtered = unique.filter((_, i) => i !== strengthUpId && i !== muscleLossId);
    filtered.push(merged);
    unique.length = 0;
    filtered.forEach(i => unique.push(i));
  }

  const sorted = [...unique].sort((a, b) => b.score - a.score);

  // ── Diversity rotation ─────────────────────────────────────────────────────
  // De-prioritise same-kind duplicates ONLY for non-critical insights.
  // High-impact insights are never penalised — they always need to surface.
  if (sorted.length > 1) {
    const kindCount = {};
    for (let i = 0; i < sorted.length; i++) {
      const k = sorted[i].kind;
      kindCount[k] = (kindCount[k] || 0) + 1;
      const isFirst = kindCount[k] === 1;
      const isHighImpact = String(sorted[i].impact || '').toLowerCase() === 'high';
      if (!isFirst && !isHighImpact) {
        sorted[i] = Object.assign({}, sorted[i], { score: sorted[i].score * 0.8 });
      }
    }
    sorted.sort((a, b) => b.score - a.score);
  }
  return sorted.slice(0, clamp(Number(limit) || 3, 1, 10));
}

module.exports = { selectTopInsights };

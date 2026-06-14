const express = require('express');
const jwt = require('jsonwebtoken');
const { NutritionLog, WeightLog } = require('../models/Logs');
const { NUTRIENT_FIELDS, sumNutrients } = require('../models/nutritionFields');
const User = require('../models/User');
const { searchFoods } = require('../services/nutritionProvider');
const { searchLocalFoods } = require('../services/mealPipeline/aggregator');
const { analyzeFood } = require('../services/nutritionPipeline/orchestrator');
const { resolveCanonicalFood } = require('../services/nutritionPipeline/canonicalFoodResolver');
const { proposeHypothesis, recordHypothesisFeedback } = require('../services/nutritionPipeline/hypothesisEngine');
const { KnowledgeEdge, Hypothesis, CausalLink } = require('../models/nutritionKnowledge');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');
const { lookupOpenFoodFactsByBarcode } = require('../services/nutritionSources/openFoodFacts');
const { computeWeeklyMacroAggregation, computeWeeklyMicroAggregation, getISOWeek } = require('../services/nutritionAggregation/weeklyAggregator');
const { estimateMissingMicronutrients } = require('../aiClient');
const { evaluateMealInteractions, evaluateDayInteractions } = require('../services/nutritionPipeline/nutrientInteractions');
const { calculateEffectiveNutrients } = require('../services/nutritionPipeline/bioavailabilityEngine');
const { evaluateProteinDistribution } = require('../services/nutritionPipeline/proteinDistributionEngine');
const BarcodeProduct = require('../models/BarcodeProduct');
const MealTemplate = require('../models/MealTemplate');
const { calculateAdaptiveTDEE, calculateAdaptiveTDEEForRange, calculateMetabolicMap } = require('../services/nutritionPipeline/adaptiveTdeeEngine');
const { analyzeMealTiming } = require('../services/nutritionPipeline/mealTimingEngine');
const { calculateDailyTargets } = require('../services/nutritionEngine');
const { computeWeeklyDiversity } = require('../services/nutritionPipeline/sourceDiversityEngine');
const { analyzeMeals } = require('../services/insulinIntelligenceService');
const { computePriorityGaps } = require('../services/nutritionPipeline/priorityGapsEngine');
const { computeDailyIntelligence } = require('../services/nutritionPipeline/dailyIntelligenceEngine');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';

const auth = require('../middleware/authMiddleware');

// Get consolidated daily nutrition summary
router.get('/daily-summary/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;
    const dateStr = decodeURIComponent(date);
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [log, user, stats] = await Promise.all([
      NutritionLog.findOne({ user: req.userId, date: { $gte: start, $lt: end } }).lean(),
      User.findById(req.userId).select('clinicalTargets biologicalProfile height weight gender dob bodyComposition labMarkers').lean(),
      NutritionLog.find({ user: req.userId, date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }).limit(30).lean()
    ]);

    const profile = user?.biologicalProfile;
    const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
    const effectiveProfile = profile ? {
      ...profile,
      biologicalSex: profile.biologicalSex || (user.gender === 'male' || user.gender === 'female' ? user.gender : undefined),
      heightCm: toNum(profile.heightCm) ?? toNum(user.height),
      weightKg: toNum(profile.weightKg) ?? toNum(user.weight),
      bodyFatPercentage: toNum(profile.bodyFatPercentage),
      dob: profile.dob || user.dob,
    } : null;

    const bmrOverride = toNum(user?.bodyComposition?.bmrKcal);
    const labMarkers = user?.labMarkers ? (typeof user.labMarkers.toObject === 'function' ? user.labMarkers.toObject() : user.labMarkers) : null;
    const useAdaptiveTdee = profile?.useAdaptiveTdee !== false;

    let targets = null;
    let tdeeSource = 'formula';
    let adaptiveTdeeValue = null;
    let metabolicMapData = null;

    if (effectiveProfile) {
      // Try adaptive TDEE first — gives a dynamic TDEE adjusted for real-world intake vs weight change
      if (useAdaptiveTdee) {
        try {
          const [adaptiveResult, mapResult] = await Promise.all([
            calculateAdaptiveTDEE(req.userId, 30),
            calculateMetabolicMap(req.userId, 60).catch(() => null),
          ]);
          if (adaptiveResult.status === 'success') {
            adaptiveTdeeValue = adaptiveResult.adaptiveTdee;
            tdeeSource = 'adaptive';
            // Prefer the full metabolic map's dynamic TDEE (which factors stress, training, steps)
            if (mapResult?.status === 'success' && mapResult.dynamicTDEE) {
              adaptiveTdeeValue = mapResult.dynamicTDEE;
              tdeeSource = 'metabolic_map';
              metabolicMapData = {
                baseTDEE: mapResult.baseTDEE,
                dynamicTDEE: mapResult.dynamicTDEE,
                dietPhase: mapResult.dietPhase,
                modifiers: mapResult.modifiers,
                insight: mapResult.insight,
              };
            }
          }
        } catch (_) {
          // adaptive unavailable — fall through to formula
        }
      }
      targets = calculateDailyTargets(effectiveProfile, adaptiveTdeeValue, labMarkers, bmrOverride);
    }

    // If calculation failed, fall back to stored targets
    if (!targets && user?.clinicalTargets?.targets) {
      targets = user.clinicalTargets;
      tdeeSource = 'stored';
    }

    const mealTemplates = await MealTemplate.find({ user: req.userId }).limit(20).lean();

    res.json({
      log,
      targets,
      tdeeSource,
      adaptiveTdee: adaptiveTdeeValue,
      metabolicMap: metabolicMapData,
      templates: mealTemplates,
      stats: {
        count: stats.length,
        avgCalories: stats.length ? stats.reduce((sum, s) => sum + (s.totalCalories || 0), 0) / stats.length : 0
      }
    });
  } catch (err) {
    console.error('[NutritionSummary] Error:', err);
    res.status(500).json({ error: 'Failed to fetch nutrition summary' });
  }
});

// Single source of truth lives in models/nutritionFields.js; alias for local readability.
const DAILY_TOTAL_FIELDS = NUTRIENT_FIELDS;


/**
 * Stamp per-nutrient confidence/source on a food when the ingest path knows the provenance.
 *
 * Inputs the client may send (any subset):
 *   food._estimatedFields: string[]   — keys whose values came from LLM estimation
 *   food.estimationConfidence: 'low'|'medium'|'high'
 *   food.source: 'barcode'|'recipe'|'manual'|'photo-vision'|...
 *
 * Output: food.nutrientQuality = { [nutrientKey]: { confidence: 0..1, source } }
 *
 * Non-enumerated nutrients are treated as primary-source (no entry; readers assume 1.0).
 * Idempotent: if the food already has nutrientQuality with entries, those win.
 */
const CONFIDENCE_SCALE = { low: 0.35, medium: 0.6, high: 0.85 };

function stampNutrientQuality(food) {
  if (!food || typeof food !== 'object') return;
  const existing = food.nutrientQuality && typeof food.nutrientQuality === 'object' ? food.nutrientQuality : {};

  const estimated = Array.isArray(food._estimatedFields) ? food._estimatedFields : [];
  if (estimated.length === 0) {
    if (Object.keys(existing).length === 0) delete food.nutrientQuality;
    return;
  }

  const conf = CONFIDENCE_SCALE[String(food.estimationConfidence || 'medium').toLowerCase()] ?? 0.6;
  const source = String(food.source || food.sourceKind || 'llm-estimate');

  const out = { ...existing };
  for (const key of estimated) {
    if (out[key]) continue; // don't clobber explicit caller-provided entries
    out[key] = { confidence: conf, source };
  }
  food.nutrientQuality = out;

  // Strip ingest-only fields so they don't bloat the stored doc.
  delete food._estimatedFields;
  delete food.estimationConfidence;
}

/** Combine a log date (midnight local) with an "HH:mm" string to a Date for meal timestamps. */
function deriveMealTime(logDate, timeStr) {
  if (!(logDate instanceof Date) || Number.isNaN(logDate.getTime())) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  const out = new Date(logDate);
  out.setHours(h, mm, 0, 0);
  return out;
}

/** Helper to parse a date string or object consistently into local-time midnight. */
function parseLocalDate(input) {
  if (!input) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (input instanceof Date) {
    const d = new Date(input);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const s = String(input);
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  // Fallback for full ISO strings or other formats
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

function createEmptyDailyTotals() {
  const out = {};
  DAILY_TOTAL_FIELDS.forEach((f) => {
    out[f] = 0;
  });
  return out;
}

function calculateDailyTotals(meals = [], supplements = []) {
  const allFoods = (meals || []).flatMap((m) => m?.foods || []);
  const allSupps = (supplements || []).map((s) => s?.nutriments || {});
  return sumNutrients([...allFoods, ...allSupps]);
}

function getAgeFromDob(dob) {
  if (!dob) return 30;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 30;
  const diffMs = Date.now() - d.getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

function getBComplexTargets(profile = {}) {
  const sex = profile.biologicalSex === 'female' ? 'female' : 'male';
  const age = getAgeFromDob(profile.dob);
  const pregnancyStatus = profile.pregnancyStatus || 'none';

  const vitaminB6 = sex === 'male'
    ? (age >= 51 ? 1.7 : 1.3)
    : (age >= 51 ? 1.5 : 1.3);

  return {
    vitaminB1: sex === 'male' ? 1.2 : 1.1,
    vitaminB2: sex === 'male' ? 1.3 : 1.1,
    vitaminB3: sex === 'male' ? 16 : 14,
    vitaminB5: 5,
    vitaminB6:
      pregnancyStatus === 'pregnant_trimester_1' ||
      pregnancyStatus === 'pregnant_trimester_2' ||
      pregnancyStatus === 'pregnant_trimester_3'
        ? 1.9
        : (pregnancyStatus === 'lactating' ? 2.0 : vitaminB6),
    vitaminB7: 30,
    vitaminB9:
      pregnancyStatus === 'pregnant_trimester_1' ||
      pregnancyStatus === 'pregnant_trimester_2' ||
      pregnancyStatus === 'pregnant_trimester_3'
        ? 600
        : (pregnancyStatus === 'lactating' ? 500 : 400),
    vitaminB12:
      pregnancyStatus === 'pregnant_trimester_1' ||
      pregnancyStatus === 'pregnant_trimester_2' ||
      pregnancyStatus === 'pregnant_trimester_3'
        ? 2.6
        : (pregnancyStatus === 'lactating' ? 2.8 : 2.4),
  };
}

function computeBComplexCoverage(dailyTotals = {}, profile = {}) {
  const targets = getBComplexTargets(profile);
  const subtypeMeta = [
    { key: 'vitaminB1', unit: 'mg' },
    { key: 'vitaminB2', unit: 'mg' },
    { key: 'vitaminB3', unit: 'mg' },
    { key: 'vitaminB5', unit: 'mg' },
    { key: 'vitaminB6', unit: 'mg' },
    { key: 'vitaminB7', unit: 'ug' },
    { key: 'vitaminB9', unit: 'ug' },
    { key: 'vitaminB12', unit: 'ug' },
  ];

  const contributors = [];
  subtypeMeta.forEach(({ key, unit }) => {
    const intake = Number(dailyTotals?.[key] || 0);
    const target = Number(targets[key] || 0);
    if (!(target > 0)) return;
    // Ignore fully-missing channels so sparse source data does not force a misleading near-zero score.
    if (!(intake > 0)) return;
    const ratio = intake / target;
    contributors.push({ key, unit, intake, target, ratio });
  });

  if (contributors.length === 0) {
    return {
      score: null,
      contributors: [],
      note: 'No B-vitamin subtype intake detected in current food data.',
    };
  }

  const cappedAverage = contributors.reduce((sum, c) => sum + Math.min(c.ratio, 1.5), 0) / contributors.length;
  return {
    score: Math.round(cappedAverage * 100),
    contributors,
  };
}

/**
 * Aggregates effective nutrient amounts from all meals in a day.
 * Returns a map of { nutrient: { consumed, effective, multiplier, unit } }
 */
function _aggregateEffectiveTotals(meals) {
  const totals = {};
  (meals || []).forEach(meal => {
    const bio = meal.bioavailability;
    if (!bio || !bio.results) return;
    Object.entries(bio.results).forEach(([nutrient, data]) => {
      if (!totals[nutrient]) {
        totals[nutrient] = { consumed: 0, effective: 0, unit: data.unit, confidence: data.confidence };
      }
      totals[nutrient].consumed += data.consumed_amount || 0;
      totals[nutrient].effective += data.effective_amount || 0;
    });
  });
  // Compute daily multiplier and explicit "Gap"
  Object.values(totals).forEach(t => {
    t.consumed = parseFloat(t.consumed.toFixed(3));
    t.effective = parseFloat(t.effective.toFixed(3));
    t.multiplier = t.consumed > 0 ? parseFloat((t.effective / t.consumed).toFixed(3)) : 1;
    t.gap = parseFloat(Math.max(0, t.consumed - t.effective).toFixed(3));
  });
  return totals;
}

// Get all nutrition logs for user
router.get('/logs', auth, async (req, res) => {
  try {
    const logs = await NutritionLog.find({ user: req.userId })
      .sort({ date: -1 })
      .limit(60);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition logs' });
  }
});

async function getLogForDate(req, res, dateStr) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const startDate = parseLocalDate(dateStr);
    
    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    let log = await NutritionLog.findOne({
      user: req.userId,
      date: { $gte: startDate, $lt: endDate },
    });

    const user = await User.findById(req.userId).select('biologicalProfile height weight gender bodyFat age dob');
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const profile = user?.biologicalProfile || {};
    const effectiveProfile = {
      ...profile,
      biologicalSex:
        profile.biologicalSex ||
        ((user?.gender === 'male' || user?.gender === 'female') ? user.gender : undefined),
      heightCm: toNum(profile.heightCm) ?? toNum(user?.height),
      weightKg: toNum(profile.weightKg) ?? toNum(user?.weight),
      bodyFatPercentage: toNum(profile.bodyFatPercentage) ?? toNum(user?.bodyFat),
    };

    if (!log) {
      log = {
        date: startDate,
        meals: [],
        waterIntake: 0,
        dailyTotals: createEmptyDailyTotals(),
      };
    }

    const bComplexCoverage = computeBComplexCoverage(log.dailyTotals, effectiveProfile);
    const logPayload = typeof log?.toObject === 'function' ? log.toObject() : log;

    if (logPayload.meals && logPayload.meals.length > 0) {
      logPayload.meals.forEach(meal => {
        meal.insights = evaluateMealInteractions(meal.foods);
        meal.bioavailability = calculateEffectiveNutrients(meal.foods);
      });
      // Daily interactions (cross-meal analysis)
      logPayload.dailyInsights = evaluateDayInteractions(logPayload.meals);
      // Aggregate effective daily totals across all meals
      logPayload.effectiveNutrientTotals = _aggregateEffectiveTotals(logPayload.meals);

      // Feature 2: Protein Distribution Analysis
      logPayload.proteinDistribution = await evaluateProteinDistribution(req.userId, logPayload.meals);

      // Feature 3: Insulin Intelligence Simulation
      logPayload.insulinIntelligence = analyzeMeals(logPayload.meals);
    }

    res.json({
      ...logPayload,
      derivedSignals: {
        bComplexCoverage,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition log' });
  }
}

// Get nutrition log for specific date (canonical)
router.get('/logs/date/:date', auth, async (req, res) => {
  return getLogForDate(req, res, req.params.date);
});

// Back-compat: client previously called /logs/date/:userId/:date
router.get('/logs/date/:userId/:date', auth, async (req, res) => {
  return getLogForDate(req, res, req.params.date);
});

// Advanced pipeline: resolve canonical food
router.get('/food/resolve', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'q is required' });
    const resolved = await resolveCanonicalFood({ input: q, allowProvisional: true });
    res.json(resolved);
  } catch (err) {
    console.error('[NutritionRoutes] /food/resolve error:', err);
    res.status(500).json({ error: 'Failed to resolve food' });
  }
});

// Advanced pipeline: analyze food (resolver + nutrient graph + metrics + interactions + uncertainty + optional LLM)
router.get('/food/analyze', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const includeLLM = String(req.query.includeLLM || '0') === '1';
    if (!q) return res.status(400).json({ error: 'q is required' });
    const user = await User.findById(req.userId);
    const analysis = await analyzeFood({ input: q, user, includeLLM });
    res.json(analysis);
  } catch (err) {
    console.error('[NutritionRoutes] /food/analyze error:', err);
    res.status(500).json({ error: 'Failed to analyze food' });
  }
});

router.post('/food/analyze', auth, async (req, res) => {
  try {
    const foodName = String(req.body.foodName || '').trim();
    const includeLLM = Boolean(req.body.includeLLM);
    if (!foodName) return res.status(400).json({ error: 'foodName is required' });
    const user = await User.findById(req.userId);
    const analysis = await analyzeFood({ input: foodName, user, includeLLM });
    res.json(analysis);
  } catch (err) {
    console.error('[NutritionRoutes] POST /food/analyze error:', err);
    res.status(500).json({ error: 'Failed to analyze food' });
  }
});

// Knowledge graph: outgoing edges from a food node
router.get('/food/graph', auth, async (req, res) => {
  try {
    const canonicalId = String(req.query.canonical_id || '').trim();
    if (!canonicalId) return res.status(400).json({ error: 'canonical_id is required' });
    const edges = await KnowledgeEdge.find({ fromKind: 'food', fromKey: canonicalId }).sort({ predicate: 1, toKind: 1, toKey: 1 });
    res.json({ canonical_id: canonicalId, edges });
  } catch (err) {
    console.error('[NutritionRoutes] /food/graph error:', err);
    res.status(500).json({ error: 'Failed to fetch food graph' });
  }
});

router.get('/food/causal', auth, async (req, res) => {
  try {
    const canonicalId = String(req.query.canonical_id || '').trim();
    if (!canonicalId) return res.status(400).json({ error: 'canonical_id is required' });
    const links = await CausalLink.find({ subjectKind: 'food', subjectKey: canonicalId }).sort({ cause: 1, effect: 1 });
    res.json({ canonical_id: canonicalId, causal_links: links });
  } catch (err) {
    console.error('[NutritionRoutes] /food/causal error:', err);
    res.status(500).json({ error: 'Failed to fetch causal links' });
  }
});

// Hypothesis lifecycle
router.get('/hypotheses', auth, async (req, res) => {
  try {
    const docs = await Hypothesis.find({ user: req.userId }).sort({ createdAt: -1 }).limit(50);
    res.json(docs);
  } catch (err) {
    console.error('[NutritionRoutes] /hypotheses error:', err);
    res.status(500).json({ error: 'Failed to fetch hypotheses' });
  }
});

router.post('/hypotheses/generate', auth, async (req, res) => {
  try {
    const foodName = String(req.body.foodName || '').trim();
    const includeLLM = Boolean(req.body.includeLLM);
    if (!foodName) return res.status(400).json({ error: 'foodName is required' });
    const user = await User.findById(req.userId);
    const analysis = await analyzeFood({ input: foodName, user, includeLLM });
    const doc = await proposeHypothesis({ user, analysis });
    res.status(201).json({ hypothesis: doc, analysis });
  } catch (err) {
    console.error('[NutritionRoutes] /hypotheses/generate error:', err);
    res.status(500).json({ error: 'Failed to generate hypothesis' });
  }
});

router.patch('/hypotheses/:id/feedback', auth, async (req, res) => {
  try {
    const outcome = String(req.body.outcome || '').trim();
    const note = req.body.note;
    if (outcome !== 'support' && outcome !== 'refute') {
      return res.status(400).json({ error: 'outcome must be support or refute' });
    }
    const updated = await recordHypothesisFeedback({
      userId: req.userId,
      hypothesisId: req.params.id,
      outcome,
      note,
    });
    if (!updated) return res.status(404).json({ error: 'Hypothesis not found' });
    res.json(updated);
  } catch (err) {
    console.error('[NutritionRoutes] /hypotheses/:id/feedback error:', err);
    res.status(500).json({ error: 'Failed to update hypothesis' });
  }
});

// Create or update nutrition log for a date
async function upsertNutritionLog(req, res) {
  try {
    const { date, meals, supplements, waterIntake, notes } = req.body;

    console.log('[NutritionRoutes] POST /api/nutrition/logs user', req.userId, 'date', date, 'meals', Array.isArray(meals) ? meals.length : 0, 'supplements', Array.isArray(supplements) ? supplements.length : 0)

    const logDate = parseLocalDate(date);
    const endDate = new Date(logDate);
    endDate.setDate(endDate.getDate() + 1);

    // Update meal totals for each meal object
    meals?.forEach(meal => {
      meal.foods?.forEach(stampNutrientQuality);
      meal.totalCalories = meal.foods?.reduce((s, f) => s + (f.calories || 0), 0) || 0;
      meal.totalProtein = meal.foods?.reduce((s, f) => s + (f.protein || 0), 0) || 0;
      meal.totalCarbs = meal.foods?.reduce((s, f) => s + (f.carbs || 0), 0) || 0;
      meal.totalFat = meal.foods?.reduce((s, f) => s + (f.fat || 0), 0) || 0;
      if (!meal.mealTime) {
        meal.mealTime = deriveMealTime(logDate, meal.time);
      }
    });

    const dailyTotals = calculateDailyTotals(meals || [], supplements || []);

    // Find existing log or create new
    let log = await NutritionLog.findOne({
      user: req.userId,
      date: { $gte: logDate, $lt: endDate },
    });

    if (log) {
      log.meals = meals;
      log.supplements = supplements || log.supplements;
      log.waterIntake = waterIntake || log.waterIntake;
      log.dailyTotals = dailyTotals;
      log.notes = notes || log.notes;
      await log.save();
    } else {
      log = await NutritionLog.create({
        user: req.userId,
        date: logDate,
        meals,
        supplements: supplements || [],
        waterIntake: waterIntake || 0,
        dailyTotals,
        notes,
      });
    }

    triggerDailyLifeStateRecompute({ userId: req.userId, date: logDate, reason: 'nutritionRoutes upsert log' });

    const logObj = typeof log?.toObject === 'function' ? log.toObject() : log;
    if (logObj.meals && logObj.meals.length > 0) {
      logObj.meals.forEach(meal => {
        meal.insights = evaluateMealInteractions(meal.foods);
        meal.bioavailability = calculateEffectiveNutrients(meal.foods);
      });
      logObj.effectiveNutrientTotals = _aggregateEffectiveTotals(logObj.meals);
      
      // Feature 2: Protein Distribution Analysis
      logObj.proteinDistribution = await evaluateProteinDistribution(req.userId, logObj.meals);

      // Feature 3: Insulin Intelligence Simulation
      logObj.insulinIntelligence = analyzeMeals(logObj.meals);
    }
    
    res.status(201).json(logObj);
  } catch (err) {
    console.error('[NutritionRoutes] Error in POST /api/nutrition/logs:', err);
    res.status(500).json({ error: 'Failed to save nutrition log' });
  }
}

async function getWeightForDate(req, res, dateStr) {
  try {
    const startDate = parseLocalDate(dateStr);
    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const logs = await WeightLog.find({
      user: req.userId,
      date: { $gte: startDate, $lt: endDate },
    }).select('date weightKg time').sort({ date: 1 });

    res.json({ date: startDate, weights: logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch weight log' });
  }
}

// Get weight for a specific date
router.get('/weight/date/:date', auth, async (req, res) => {
  return getWeightForDate(req, res, req.params.date);
});

// Upsert weight for a date
router.post('/weight', auth, async (req, res) => {
  try {
    const { date, weightKg, time } = req.body;
    const logDate = parseLocalDate(date);
    if (Number.isNaN(logDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    const w = Number(weightKg);
    if (!Number.isFinite(w) || w <= 0 || w > 1000) {
      return res.status(400).json({ error: 'Invalid weightKg' });
    }

    const log = await WeightLog.create({ 
      user: req.userId, 
      date: logDate, 
      weightKg: w,
      time: time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    });

    // Update user profile with latest weight
    const User = require('../models/User');
    const latestWeight = await WeightLog.findOne({ user: req.userId }).sort({ date: -1 });
    if (latestWeight) {
      await User.findByIdAndUpdate(req.userId, {
        $set: {
          weight: latestWeight.weightKg,
          'biologicalProfile.weightKg': latestWeight.weightKg
        }
      });
    }

    triggerDailyLifeStateRecompute({ userId: req.userId, date: logDate, reason: 'nutritionRoutes upsert weight' });

    res.status(201).json({ date: log.date, weightKg: log.weightKg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save weight' });
  }
});

// Range fetch for charting
router.get('/weight/range/:start/:end', auth, async (req, res) => {
  try {
    const start = new Date(req.params.start);
    const end = new Date(req.params.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid range' });
    }
    const docs = await WeightLog.find({
      user: req.userId,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .select('date weightKg time')
      .lean();
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch weight range' });
  }
});

// Canonical
router.post('/logs', auth, upsertNutritionLog);

// Back-compat: older client called /logs/:userId
router.post('/logs/:userId', auth, upsertNutritionLog);

// Add a meal to today's log
router.post('/meals', auth, async (req, res) => {
  try {
    const { meal, date } = req.body;
    
    const logDate = parseLocalDate(date);
    const endDate = new Date(logDate);
    endDate.setDate(endDate.getDate() + 1);

    // Calculate meal totals
    meal.foods?.forEach(stampNutrientQuality);
    meal.totalCalories = meal.foods?.reduce((s, f) => s + (f.calories || 0), 0) || 0;
    meal.totalProtein = meal.foods?.reduce((s, f) => s + (f.protein || 0), 0) || 0;
    meal.totalCarbs = meal.foods?.reduce((s, f) => s + (f.carbs || 0), 0) || 0;
    meal.totalFat = meal.foods?.reduce((s, f) => s + (f.fat || 0), 0) || 0;
    if (!meal.mealTime) {
      meal.mealTime = deriveMealTime(logDate, meal.time);
    }

    let log = await NutritionLog.findOne({
      user: req.userId,
      date: { $gte: logDate, $lt: endDate },
    });

    if (log) {
      log.meals.push(meal);
    } else {
      log = new NutritionLog({
        user: req.userId,
        date: logDate,
        meals: [meal],
        waterIntake: 0,
        dailyTotals: createEmptyDailyTotals(),
      });
    }

    // Recalculate daily totals
    const dailyTotals = calculateDailyTotals(log.meals || [], log.supplements || []);
    log.dailyTotals = dailyTotals;

    await log.save();

    triggerDailyLifeStateRecompute({ userId: req.userId, date: logDate, reason: 'nutritionRoutes add meal' });
    
    const logObj = typeof log?.toObject === 'function' ? log.toObject() : log;
    if (logObj.meals && logObj.meals.length > 0) {
      logObj.meals.forEach(meal => {
        meal.insights = evaluateMealInteractions(meal.foods);
      });
    }
    
    res.status(201).json(logObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add meal' });
  }
});

// Update water intake
router.patch('/water', auth, async (req, res) => {
  try {
    const { amount, date } = req.body;
    
    const logDate = parseLocalDate(date);
    const endDate = new Date(logDate);
    endDate.setDate(endDate.getDate() + 1);

    let log = await NutritionLog.findOne({
      user: req.userId,
      date: { $gte: logDate, $lt: endDate },
    });

    if (log) {
      log.waterIntake = (log.waterIntake || 0) + amount;
      await log.save();
    } else {
      log = await NutritionLog.create({
        user: req.userId,
        date: logDate,
        meals: [],
        waterIntake: amount,
        dailyTotals: createEmptyDailyTotals(),
      });
    }

    triggerDailyLifeStateRecompute({ userId: req.userId, date: logDate, reason: 'nutritionRoutes water' });

    const logObj = typeof log?.toObject === 'function' ? log.toObject() : log;
    if (logObj.meals && logObj.meals.length > 0) {
      logObj.meals.forEach(meal => {
        meal.insights = evaluateMealInteractions(meal.foods);
      });
    }
    
    res.json(logObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update water intake' });
  }
});

// Delete a meal
router.delete('/meals/:logId/:mealIndex', auth, async (req, res) => {
  try {
    const { logId, mealIndex } = req.params;
    
    const log = await NutritionLog.findOne({ _id: logId, user: req.userId });
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    log.meals.splice(parseInt(mealIndex), 1);

    // Recalculate daily totals
    const dailyTotals = calculateDailyTotals(log.meals || [], log.supplements || []);
    log.dailyTotals = dailyTotals;

    await log.save();

    triggerDailyLifeStateRecompute({ userId: req.userId, date: log?.date, reason: 'nutritionRoutes delete meal' });
    
    const logObj = typeof log?.toObject === 'function' ? log.toObject() : log;
    if (logObj.meals && logObj.meals.length > 0) {
      logObj.meals.forEach(meal => {
        meal.insights = evaluateMealInteractions(meal.foods);
      });
    }
    
    res.json(logObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// Get nutrition stats (weekly/monthly averages)
router.get('/stats', auth, async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const weekLogs = await NutritionLog.find({
      user: req.userId,
      date: { $gte: weekAgo },
    });

    const monthLogs = await NutritionLog.find({
      user: req.userId,
      date: { $gte: monthAgo },
    });

    // Calculate weekly averages
    const weeklyAvg = {
      calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, daysLogged: weekLogs.length,
    };
    weekLogs.forEach(log => {
      weeklyAvg.calories += log.dailyTotals?.calories || 0;
      weeklyAvg.protein += log.dailyTotals?.protein || 0;
      weeklyAvg.carbs += log.dailyTotals?.carbs || 0;
      weeklyAvg.fat += log.dailyTotals?.fat || 0;
      weeklyAvg.water += log.waterIntake || 0;
    });
    if (weekLogs.length > 0) {
      weeklyAvg.calories = Math.round(weeklyAvg.calories / weekLogs.length);
      weeklyAvg.protein = Math.round(weeklyAvg.protein / weekLogs.length);
      weeklyAvg.carbs = Math.round(weeklyAvg.carbs / weekLogs.length);
      weeklyAvg.fat = Math.round(weeklyAvg.fat / weekLogs.length);
      weeklyAvg.water = Math.round(weeklyAvg.water / weekLogs.length);
    }

    // Calculate monthly averages
    const monthlyAvg = {
      calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, daysLogged: monthLogs.length,
    };
    monthLogs.forEach(log => {
      monthlyAvg.calories += log.dailyTotals?.calories || 0;
      monthlyAvg.protein += log.dailyTotals?.protein || 0;
      monthlyAvg.carbs += log.dailyTotals?.carbs || 0;
      monthlyAvg.fat += log.dailyTotals?.fat || 0;
      monthlyAvg.water += log.waterIntake || 0;
    });
    if (monthLogs.length > 0) {
      monthlyAvg.calories = Math.round(monthlyAvg.calories / monthLogs.length);
      monthlyAvg.protein = Math.round(monthlyAvg.protein / monthLogs.length);
      monthlyAvg.carbs = Math.round(monthlyAvg.carbs / monthLogs.length);
      monthlyAvg.fat = Math.round(monthlyAvg.fat / monthLogs.length);
      monthlyAvg.water = Math.round(monthlyAvg.water / monthLogs.length);
    }

    // Meal type distribution
    const mealTypeCount = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, 'pre-workout': 0, 'post-workout': 0 };
    monthLogs.forEach(log => {
      log.meals?.forEach(meal => {
        if (meal.mealType && mealTypeCount[meal.mealType] !== undefined) {
          mealTypeCount[meal.mealType]++;
        }
      });
    });

    // Get user's calorie goal if available
    const user = await User.findById(req.userId);
    const calorieGoal = user?.calorieGoal || 2000;
    const proteinGoal = user?.proteinGoal || 150;

    res.json({
      weeklyAvg,
      monthlyAvg,
      mealTypeCount,
      goals: { calories: calorieGoal, protein: proteinGoal },
      totalMealsThisMonth: monthLogs.reduce((s, l) => s + (l.meals?.length || 0), 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition stats' });
  }
});

// Get logs for date range (for calendar)
router.get('/logs/range/:start/:end', auth, async (req, res) => {
  try {
    const start = new Date(req.params.start);
    const end = new Date(req.params.end);
    
    const logs = await NutritionLog.find({
      user: req.userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    // Fetch user profile for dynamic target generation
    const user = await User.findById(req.userId).select('biologicalProfile bodyComposition');
    const dynamicTargets = {};
    
    if (user?.biologicalProfile) {
      // Calculate Adaptive TDEE for each day in range if enabled
      let adaptiveMap = {};
      if (user.biologicalProfile.useAdaptiveTdee !== false) {
        adaptiveMap = await calculateAdaptiveTDEEForRange(req.userId, start, end);
      }

      const bmrOverride = user.bodyComposition?.bmrKcal;

      // Generate full targets for each day
      Object.keys(adaptiveMap).forEach(dateKey => {
        const tdee = adaptiveMap[dateKey];
        dynamicTargets[dateKey] = calculateDailyTargets(user.biologicalProfile, tdee, null, bmrOverride);
      });
    }

    res.json({ logs, dynamicTargets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition logs' });
  }
});

// Gets the highly precise, scientific personalized clinical baseline targets for the user
router.get('/clinical-targets', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('biologicalProfile height weight gender bodyFat age dob clinicalTargets labMarkers bodyComposition');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const useAdaptiveTdee = user.biologicalProfile?.useAdaptiveTdee !== false;
    const storedClinicalTargets = user.clinicalTargets && user.clinicalTargets.targets ? user.clinicalTargets : null;

    // For non-adaptive users, stored targets are authoritative.
    if (storedClinicalTargets && !useAdaptiveTdee) {
      return res.status(200).json({
        requiresSetup: false,
        ...storedClinicalTargets
      });
    }

    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const profile = user.biologicalProfile ? user.biologicalProfile.toObject() : {};
    const effectiveProfile = {
      ...profile,
      biologicalSex:
        profile.biologicalSex ||
        ((user.gender === 'male' || user.gender === 'female') ? user.gender : undefined),
      heightCm: toNum(profile.heightCm) ?? toNum(user.height),
      weightKg: toNum(profile.weightKg) ?? toNum(user.weight),
      bodyFatPercentage: toNum(profile.bodyFatPercentage) ?? toNum(user.bodyFat),
      dob: profile.dob || user.dob,
    };

    const bmrOverride = toNum(user.bodyComposition?.bmrKcal);

    const requiredFieldChecks = [
      { key: 'biologicalSex', ok: !!effectiveProfile.biologicalSex },
      { key: 'heightCm', ok: Number(effectiveProfile.heightCm) > 0 },
      { key: 'weightKg', ok: Number(effectiveProfile.weightKg) > 0 },
      { key: 'dob', ok: !!effectiveProfile.dob },
      { key: 'activityLevel', ok: !!effectiveProfile.activityLevel },
      { key: 'metabolicGoal', ok: !!effectiveProfile.metabolicGoal },
    ];
    const missingRequiredFields = requiredFieldChecks.filter((f) => !f.ok).map((f) => f.key);

    // Optional but recommended for precision
    const recommendedFields = [
      { key: 'hypertension', ok: effectiveProfile.hypertension !== undefined },
      { key: 'insulinSensitivity', ok: !!effectiveProfile.insulinSensitivity },
    ];
    const missingRecommendedFields = recommendedFields.filter(f => !f.ok).map(f => f.key);

    if (missingRequiredFields.length > 0) {
      console.log('[ClinicalTargets] Validation failed. Missing required:', missingRequiredFields);
      return res.status(200).json({
        requiresSetup: true,
        targets: null,
        missingRequiredFields,
        missingRecommendedFields
      });
    }

    const labMarkers = user.labMarkers ? user.labMarkers.toObject() : null;
    const calculatedBase = calculateDailyTargets(effectiveProfile, null, labMarkers, bmrOverride);
    
    let adaptiveOverride = null;
    let tdeeSourceLabel = 'formula';
    if (useAdaptiveTdee) {
      const adaptiveResult = await calculateAdaptiveTDEE(req.userId, 30);
      if (adaptiveResult.status === 'success') {
        adaptiveOverride = adaptiveResult.adaptiveTdee;
        tdeeSourceLabel = 'adaptive';
        console.log('[ClinicalTargets] Using Adaptive TDEE override:', adaptiveOverride);
      }
    }

    const calculated = adaptiveOverride
      ? calculateDailyTargets(effectiveProfile, adaptiveOverride, labMarkers, bmrOverride)
      : calculatedBase;

    if (!calculated) {
      if (storedClinicalTargets) {
        console.log('[ClinicalTargets] Calculation failed, falling back to stored targets for user:', req.userId);
        return res.status(200).json({
          requiresSetup: false,
          ...storedClinicalTargets,
        });
      }
      return res.status(200).json({
        requiresSetup: true,
        targets: null,
        missingRequiredFields: ['calculation_failed'],
      });
    }

    // Persist them if they weren't persisted yet
    user.clinicalTargets = calculated;
    // Also sync the top level fields if they were missing but provided in profile
    if (!user.height && effectiveProfile.heightCm) user.height = effectiveProfile.heightCm;
    if (!user.weight && effectiveProfile.weightKg) user.weight = effectiveProfile.weightKg;
    if (!user.gender && effectiveProfile.biologicalSex) user.gender = effectiveProfile.biologicalSex;
    if (!user.dob && effectiveProfile.dob) user.dob = effectiveProfile.dob;

    await user.save();

    res.status(200).json({
      requiresSetup: false,
      tdeeSource: tdeeSourceLabel,
      adaptiveTdee: adaptiveOverride,
      ...calculated
    });
  } catch (err) {
    console.error('[ClinicalTargets] Error:', err);
    res.status(500).json({ error: 'Failed to fetch clinical targets' });
  }
});

// Update the scientific metabolic parameters for the user
router.put('/clinical-profile', auth, async (req, res) => {
  try {
    const { biologicalSex, dob, heightCm, weightKg, bodyFatPercentage, activityLevel, metabolicGoal, pregnancyStatus, dietaryPreference, hypertension, defaultSleepTime } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const phaseToGoal = { bulk: "lean_gain", cut: "mild_loss", maintenance: "maintenance", recomp: "maintenance" };

    const updateData = {
      'biologicalProfile.biologicalSex': biologicalSex || user.biologicalProfile?.biologicalSex,
      'biologicalProfile.dob': dob || user.biologicalProfile?.dob,
      'biologicalProfile.heightCm': heightCm || user.biologicalProfile?.heightCm,
      'biologicalProfile.weightKg': weightKg || user.biologicalProfile?.weightKg,
      'biologicalProfile.bodyFatPercentage': bodyFatPercentage || user.biologicalProfile?.bodyFatPercentage,
      'biologicalProfile.activityLevel': activityLevel || user.biologicalProfile?.activityLevel || 'sedentary',
      'biologicalProfile.metabolicGoal': phaseToGoal[req.body.trainingPhase] || user.biologicalProfile?.metabolicGoal || 'maintenance',
      'biologicalProfile.pregnancyStatus': pregnancyStatus || user.biologicalProfile?.pregnancyStatus || 'none',
      'biologicalProfile.dietaryPreference': dietaryPreference || user.biologicalProfile?.dietaryPreference || 'omnivore',
      'biologicalProfile.hypertension': hypertension !== undefined ? hypertension : user.biologicalProfile?.hypertension || false,
      'biologicalProfile.defaultSleepTime': defaultSleepTime || user.biologicalProfile?.defaultSleepTime || '22:30',
      'biologicalProfile.trainingPhase': req.body.trainingPhase || user.biologicalProfile?.trainingPhase || 'maintenance',
      'biologicalProfile.trainingPhaseStartDate': req.body.trainingPhaseStartDate || user.biologicalProfile?.trainingPhaseStartDate || null,
      'biologicalProfile.lastDeloadDate': req.body.lastDeloadDate || user.biologicalProfile?.lastDeloadDate || null,
      'biologicalProfile.sessionDurationMinutes': req.body.sessionDurationMinutes || user.biologicalProfile?.sessionDurationMinutes || 60,
      trainingExperience: req.body.trainingExperience || user.trainingExperience || 'beginner',
    };

    // Remove empty strings so they don't break Date casting or numbers
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' || updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    await User.updateOne({ _id: req.userId }, { $set: updateData });
    const updatedUser = await User.findById(req.userId);

    const updatedProfile = updatedUser.biologicalProfile ? updatedUser.biologicalProfile.toObject() : {};
    const bmrOvr = updatedUser.bodyComposition?.bmrKcal ? Number(updatedUser.bodyComposition.bmrKcal) : null;
    const labMkrs = updatedUser.labMarkers ? (typeof updatedUser.labMarkers.toObject === 'function' ? updatedUser.labMarkers.toObject() : updatedUser.labMarkers) : null;

    // Attempt adaptive TDEE so profile updates reflect real metabolic state immediately
    let adaptiveOvr = null;
    let tdeeSource = 'formula';
    if (updatedProfile.useAdaptiveTdee !== false) {
      try {
        const aResult = await calculateAdaptiveTDEE(req.userId, 30);
        if (aResult.status === 'success') {
          adaptiveOvr = aResult.adaptiveTdee;
          tdeeSource = 'adaptive';
        }
      } catch (_) { /* not enough data yet — formula fallback is fine */ }
    }

    const calculated = calculateDailyTargets(updatedProfile, adaptiveOvr, labMkrs, bmrOvr);

    updatedUser.clinicalTargets = calculated;
    updatedUser.dailyCalorieTarget = calculated.targets.calories;
    updatedUser.dailyProteinTarget = calculated.targets.protein;
    await updatedUser.save();

    res.status(200).json({
      message: 'Profile updated',
      profile: updatedUser.biologicalProfile,
      tdeeSource,
      adaptiveTdee: adaptiveOvr,
      ...calculated
    });

  } catch (err) {
    console.error('Error updating clinical profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Search foods using local DB only (external APIs disabled as requested)
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const query = q || '';
    console.log('[NutritionRoutes] /api/nutrition/search called by user', req.userId, 'with query:', query);

    // Run ONLY local search with a high limit to return all internal results
    const local = await searchLocalFoods({ q: query, limit: 500 }).catch(e => { 
      console.error('Local search error', e); 
      return [] 
    });

    const localList = Array.isArray(local) ? local : [];

    const seen = new Set();
    const merged = [];
    
    // Process only local foods
    for (const item of localList) {
      const key = String(item?.id || item?.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }

    console.log('[NutritionRoutes] returning', merged.length, 'results (local only)');
    res.json(merged);
  } catch (err) {
    console.error('[NutritionRoutes] search error:', err);
    res.status(500).json({ error: 'Failed to search foods' });
  }
});

// --- External Food Search & Ingest (OpenFoodFacts + Gemini AI) ---

router.get('/external/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query is required' });

    console.log('[NutritionRoutes] External Live Search:', q);
    
    // 1. Fetch from OpenFoodFacts (Fast)
    const offResultsPromise = require('../services/nutritionSources/offScraper').searchOff(q).catch(e => {
      console.error('[NutritionRoutes] OFF search failed:', e.message);
      return [];
    });

    // 2. Generate via Gemini AI
    const { generateFoodNutrients } = require('../aiClient');
    const geminiResultPromise = generateFoodNutrients(q).then(nutrients => {
      if (!nutrients) return null;
      return {
        id: `gemini-${Date.now()}`,
        displayName: `${q} (AI Generated)`,
        brand: 'LifeSync AI',
        calories: nutrients.energy_kcal || 0,
        protein: nutrients.protein_g || 0,
        carbs: nutrients.carb_g || 0,
        fat: nutrients.fat_g || 0,
        fiber: nutrients.fibre_g || 0,
        sugar: nutrients.freesugar_g || 0,
        sodium: nutrients.sodium_mg || 0,
        potassium: nutrients.potassium_mg || 0,
        iron: nutrients.iron_mg || 0,
        calcium: nutrients.calcium_mg || 0,
        magnesium: nutrients.magnesium_mg || 0,
        zinc: nutrients.zinc_mg || 0,
        vitaminC: nutrients.vitc_mg || 0,
        vitaminA: nutrients.vita_ug || 0,
        vitaminD: nutrients.vitd_ug || 0,
        vitaminB12: nutrients.vitb12_ug || 0,
        saturatedFat: nutrients.sfa_mg || 0,
        cholesterol: nutrients.cholesterol_mg || 0,
        servingQty: '100',
        servingUnit: 'g',
        source: 'Gemini API'
      };
    }).catch(e => {
      console.error('[NutritionRoutes] Gemini generation failed:', e.message);
      return null;
    });

    const [offResults, geminiResult] = await Promise.all([offResultsPromise, geminiResultPromise]);

    const finalResults = [];
    if (geminiResult) finalResults.push(geminiResult);
    
    const mappedOff = offResults.map(r => {
      const n = r.nutrients || {};
      return {
        ...r,
        calories: n.energy_kcal || r.calories || 0,
        protein: n.protein_g || r.protein || 0,
        carbs: n.carb_g || r.carbs || 0,
        fat: n.fat_g || r.fat || 0,
        fiber: n.fibre_g || r.fiber || 0,
        sugar: n.freesugar_g || 0,
        sodium: n.sodium_mg || 0,
        potassium: n.potassium_mg || 0,
        iron: n.iron_mg || 0,
        calcium: n.calcium_mg || 0,
        magnesium: n.magnesium_mg || 0,
        zinc: n.zinc_mg || 0,
        vitaminC: n.vitc_mg || 0,
        vitaminA: n.vita_ug || 0,
        vitaminD: n.vitd_ug || 0,
        vitaminB12: n.vitb12_ug || 0,
        saturatedFat: n.sfa_mg || 0,
        cholesterol: n.cholesterol_mg || 0,
        source: 'OpenFoodFacts'
      };
    });

    res.json([
      ...finalResults,
      ...mappedOff
    ]);
  } catch (err) {
    console.error('[NutritionRoutes] External search error:', err);
    res.status(500).json({ error: 'Failed to search external databases' });
  }
});

router.post('/external/add', auth, async (req, res) => {
  try {
    let { food } = req.body;
    if (!food) return res.status(400).json({ error: 'Food data is required' });

    const MfpFood = require('../models/MfpFood');
    const { getEmbedding } = require('../services/nutritionAI/embeddingService');

    // Map all available nutrients from food.nutrients to columns
    const columns = [];
    if (food.nutrients) {
      Object.entries(food.nutrients).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          columns.push({ key, value });
        }
      });
    }

    // Ensure basic macros are present in columns even if not in nutrients
    const basicMacros = {
      energy_kcal: food.calories,
      protein_g: food.protein,
      carb_g: food.carbs,
      fat_g: food.fat,
      fibre_g: food.fiber
    };

    Object.entries(basicMacros).forEach(([key, value]) => {
      if (!columns.find(c => c.key === key)) {
        columns.push({ key, value: value || 0 });
      }
    });

    columns.push({ key: 'primarysource', value: `Imported from ${food.source || 'Unknown'}` });

    // Generate embedding for vector search
    const embedding = await getEmbedding(food.displayName).catch(e => {
      console.warn('Embedding generation failed for ingested food:', e.message);
      return null;
    });

    const newFood = new MfpFood({
      sourceFile: food.source === 'Gemini API' ? 'gemini_ai_gen.json' : 'off_ingest.json',
      displayName: food.displayName,
      searchText: food.displayName,
      servingQty: food.servingQty || '100',
      servingSize: food.servingUnit || 'g',
      columns,
      embedding
    });

    await newFood.save();
    console.log('[NutritionRoutes] Saved new food to DB:', food.displayName, 'from', food.source);

    res.status(201).json({ message: 'Food added to database successfully', food: newFood });
  } catch (err) {
    console.error('[NutritionRoutes] Food add error:', err);
    res.status(500).json({ error: 'Failed to add food to database' });
  }
});

router.get('/barcode/:code', auth, async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Barcode is required' });

    // 1. Check local cache first
    const cached = await BarcodeProduct.findOne({ barcode: code }).lean();
    if (cached) {
      console.log(`[NutritionRoutes] Barcode cache hit for ${code}`);
      return res.json({
        barcode: cached.barcode,
        name: cached.name,
        brand: cached.brand,
        quantityLabel: cached.quantityLabel,
        servingSize: cached.servingSize,
        imageUrl: cached.imageUrl,
        nutrimentsPer100g: cached.nutrimentsPer100g,
        source: cached.source,
        _estimatedFields: cached.estimatedFields
      });
    }

    // 2. Fetch from Open Food Facts
    const lookedUp = await lookupOpenFoodFactsByBarcode({ barcode: code });
    if (!lookedUp?.ok) {
      const status = lookedUp?.error === 'Product not found' ? 404 : 400;
      return res.status(status).json({ error: lookedUp?.error || 'Barcode lookup failed' });
    }

    const pd = lookedUp.product;
    const estimatedFields = [];

    // 3. AI Enrichment (check for 0s in key micronutrients)
    const n = pd.nutrimentsPer100g || {};
    const keyMicros = ['calciumMg', 'ironMg', 'magnesiumMg', 'zincMg', 'vitaminCMg', 'vitaminB12Ug', 'vitaminDUg', 'omega3G'];
    const missing = keyMicros.filter(k => !n[k] || n[k] === 0);

    let estimationConfidence = 'none';
    if (missing.length > 0) {
      const knownMacros = {
        caloriesKcal: n.caloriesKcal || 0,
        proteinG: n.proteinG || 0,
        carbsG: n.carbsG || 0,
        fatG: n.fatG || 0,
        fiberG: n.fiberG || 0,
      };

      console.log(`[NutritionRoutes] Estimating missing micros for ${pd.name}: ${missing.join(', ')}`);
      const estimatedResult = await estimateMissingMicronutrients(pd.name || pd.brand || 'Unknown', knownMacros, missing);
      
      if (estimatedResult && estimatedResult.estimatedNutrients) {
        estimationConfidence = estimatedResult.confidence || 'low';
        const estimated = estimatedResult.estimatedNutrients;
        for (const k of missing) {
          if (estimated[k] && typeof estimated[k] === 'number') {
            n[k] = estimated[k];
            estimatedFields.push(k);
          }
        }
      }
    }

    // 4. Save to cache
    const toSave = {
      barcode: pd.barcode,
      name: pd.name,
      brand: pd.brand,
      quantityLabel: pd.quantityLabel,
      servingSize: pd.servingSize,
      imageUrl: pd.imageUrl,
      nutrimentsPer100g: n,
      source: pd.source,
      estimatedFields,
      estimationConfidence
    };

    try {
      await BarcodeProduct.create(toSave);
    } catch (saveErr) {
      console.error('[NutritionRoutes] Failed to cache barcode product:', saveErr); // ignore unique errors
    }

    res.json({
      ...pd,
      nutrimentsPer100g: n,
      _estimatedFields: estimatedFields
    });
  } catch (err) {
    console.error('[NutritionRoutes] barcode lookup error:', err);
    res.status(500).json({ error: 'Failed to lookup barcode' });
  }
});

// ==================== AGGREGATION ROUTES (for Insights tab) ====================

// Get Adaptive TDEE
router.get('/adaptive-tdee', auth, async (req, res) => {
  try {
    const daysBack = parseInt(req.query.daysBack) || 30;
    const result = await calculateAdaptiveTDEE(req.userId, daysBack);
    res.json(result);
  } catch (err) {
    console.error('[NutritionRoutes] Adaptive TDEE error:', err);
    res.status(500).json({ error: 'Failed to calculate adaptive TDEE' });
  }
});

// Get Personal Metabolic Map (Dynamic TDEE with stress/training/adaptation modifiers)
router.get('/metabolic-map', auth, async (req, res) => {
  try {
    const daysBack = parseInt(req.query.daysBack) || 60;
    const result = await calculateMetabolicMap(req.userId, daysBack);
    res.json(result);
  } catch (err) {
    console.error('[NutritionRoutes] Metabolic Map error:', err);
    res.status(500).json({ error: 'Failed to calculate metabolic map' });
  }
});

// Get Meal Timing Analysis
router.get('/timing-analysis/:date', auth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid date' });
    const result = await analyzeMealTiming(req.userId, date);
    res.json(result);
  } catch (err) {
    console.error('[NutritionRoutes] Timing analysis error:', err);
    res.status(500).json({ error: 'Failed to compute timing analysis' });
  }
});

// Get weekly macro aggregation
router.get('/aggregation/weekly-macros/:weekKey', auth, async (req, res) => {
  try {
    const weekKey = String(req.params.weekKey || '').trim();
    if (!/^\d{4}-W\d{2}$/.test(weekKey)) {
      return res.status(400).json({ error: 'Invalid weekKey format. Expected: YYYY-Wnn' });
    }

    const data = await computeWeeklyMacroAggregation(req.userId, weekKey);
    res.json(data);
  } catch (err) {
    console.error('[NutritionRoutes] weekly macro aggregation error:', err);
    res.status(500).json({ error: 'Failed to compute weekly macro aggregation' });
  }
});

// Get weekly micro aggregation
router.get('/aggregation/weekly-micros/:weekKey', auth, async (req, res) => {
  try {
    const weekKey = String(req.params.weekKey || '').trim();
    if (!/^\d{4}-W\d{2}$/.test(weekKey)) {
      return res.status(400).json({ error: 'Invalid weekKey format. Expected: YYYY-Wnn' });
    }

    const data = await computeWeeklyMicroAggregation(req.userId, weekKey);
    res.json(data);
  } catch (err) {
    console.error('[NutritionRoutes] weekly micro aggregation error:', err);
    res.status(500).json({ error: 'Failed to compute weekly micro aggregation' });
  }
});

// Get current week key
router.get('/aggregation/current-week', auth, async (req, res) => {
  try {
    const week = getISOWeek(new Date());
    const weekKey = `${week.year}-W${String(week.week).padStart(2, '0')}`;
    res.json({ weekKey, year: week.year, week: week.week });
  } catch (err) {
    console.error('[NutritionRoutes] current week error:', err);
    res.status(500).json({ error: 'Failed to get current week' });
  }
});

// ─── DELETE /logs/last-meal ── Undo last chat-logged meal ───────────────────
//  Body (optional): { logId, mealIndex }
//  If logId + mealIndex are provided, removes that specific meal.
//  If not, removes the last meal from today's log.
router.delete('/logs/last-meal', auth, async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end   = new Date(start); end.setDate(end.getDate() + 1);

    const { logId, mealIndex } = req.body || {};

    let log;
    if (logId) {
      log = await NutritionLog.findOne({ _id: logId, user: req.userId });
    }
    if (!log) {
      log = await NutritionLog.findOne({ user: req.userId, date: { $gte: start, $lt: end } }).sort({ date: -1 });
    }

    if (!log || !log.meals || log.meals.length === 0) {
      return res.status(404).json({ error: 'No meals to undo for today.' });
    }

    const idx = (typeof mealIndex === 'number' && mealIndex >= 0 && mealIndex < log.meals.length)
      ? mealIndex
      : log.meals.length - 1;

    const removed = log.meals.splice(idx, 1)[0];

    // recompute totals
    log.dailyTotals = calculateDailyTotals(log.meals, log.supplements || []);
    await log.save();

    try {
      triggerDailyLifeStateRecompute({ userId: req.userId, date: start, reason: 'meal_undo' });
    } catch { /* non-blocking */ }

    res.json({ success: true, removed: removed?.name || 'meal', dailyTotals: log.dailyTotals });
  } catch (err) {
    console.error('[NutritionRoutes] undo last meal error:', err);
    res.status(500).json({ error: 'Failed to undo meal.' });
  }
});

// GET /api/nutrition/meal-templates — Fetch top 15 frequent meals from last 60 days
router.get('/meal-templates', auth, async (req, res) => {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const historicalLogs = await NutritionLog.find({
      user: req.userId,
      date: { $gte: sixtyDaysAgo }
    }).lean();

    const mealGroups = {}; // key: normalized name

    historicalLogs.forEach(log => {
      (log.meals || []).forEach(meal => {
        if (!meal.name || !meal.foods || meal.foods.length === 0) return;
        
        // Normalize name: lowercase, trimmed, alphabetized words for grouping
        const normKey = meal.name.toLowerCase().trim().split(/\s+/).sort().join(' ');
        
        if (!mealGroups[normKey]) {
          mealGroups[normKey] = {
            mealName: meal.name,
            mealType: meal.mealType,
            foods: meal.foods,
            totalCalories: meal.totalCalories,
            totalProtein: meal.totalProtein,
            frequency: 0,
            lastUsed: log.date
          };
        }
        
        mealGroups[normKey].frequency += 1;
        if (log.date > mealGroups[normKey].lastUsed) {
          mealGroups[normKey].lastUsed = log.date;
        }
      });
    });

    const templates = Object.values(mealGroups)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 15);

    res.json({ templates });
  } catch (err) {
    console.error('[NutritionRoutes] GET /meal-templates error:', err);
    res.status(500).json({ error: 'Failed to fetch meal templates.' });
  }
});

// POST /api/nutrition/meal-templates/relog — Relog a template to today
router.post('/meal-templates/relog', auth, async (req, res) => {
  try {
    const { mealName, mealType, foods } = req.body;
    if (!mealName || !foods || !foods.length) {
      return res.status(400).json({ error: 'Invalid meal template payload.' });
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    let log = await NutritionLog.findOne({ user: req.userId, date: { $gte: start, $lt: end } }).sort({ date: -1 });
    if (!log) {
      log = new NutritionLog({ 
        user: req.userId, 
        date: start, 
        meals: [], 
        supplements: [], 
        waterIntake: 0,
        dailyTotals: createEmptyDailyTotals()
      });
    }

    // Clone foods to avoid id conflicts and clear nested Mongo IDs
    const clonedFoods = foods.map(f => {
      const { _id, id, ...rest } = f;
      return rest;
    });

    const totalCalories = clonedFoods.reduce((s, f) => s + (f.calories || 0), 0);
    const totalProtein  = clonedFoods.reduce((s, f) => s + (f.protein || 0), 0);
    const totalCarbs    = clonedFoods.reduce((s, f) => s + (f.carbs || 0), 0);
    const totalFat      = clonedFoods.reduce((s, f) => s + (f.fat || 0), 0);

    const mealTimeStr = now.toTimeString().slice(0, 5);
    log.meals.push({
      name: mealName,
      mealType: mealType || 'snack',
      time: mealTimeStr,
      mealTime: deriveMealTime(start, mealTimeStr) || now,
      foods: clonedFoods,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat
    });

    log.dailyTotals = calculateDailyTotals(log.meals, log.supplements || []);
    await log.save();

    try { triggerDailyLifeStateRecompute({ userId: req.userId, date: start, reason: 'template_relog' }); } catch {}

    res.status(201).json({
      success: true,
      mealName,
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein * 10) / 10,
      logId: log._id.toString(),
      mealIndex: log.meals.length - 1
    });
  } catch (err) {
    console.error('[NutritionRoutes] POST /meal-templates/relog error:', err);
    res.status(500).json({ error: 'Failed to relog meal.' });
  }
});

// GET /api/nutrition/saved-templates — Fetch user-defined templates
router.get('/saved-templates', auth, async (req, res) => {
  try {
    const templates = await MealTemplate.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    console.error('[NutritionRoutes] GET /saved-templates error:', err);
    res.status(500).json({ error: 'Failed to fetch saved templates.' });
  }
});

// POST /api/nutrition/saved-templates — Create a new template from current meal
router.post('/saved-templates', auth, async (req, res) => {
  try {
    const { name, mealType, foods, notes } = req.body;
    if (!name || !foods || foods.length === 0) {
      return res.status(400).json({ error: 'Template name and foods are required.' });
    }

    const template = new MealTemplate({
      user: req.userId,
      name,
      mealType: mealType || 'snack',
      foods,
      notes
    });

    await template.save();
    res.status(201).json(template);
  } catch (err) {
    console.error('[NutritionRoutes] POST /saved-templates error:', err);
    res.status(500).json({ error: 'Failed to create template.' });
  }
});

// DELETE /api/nutrition/saved-templates/:id — Delete a template
router.delete('/saved-templates/:id', auth, async (req, res) => {
  try {
    const result = await MealTemplate.deleteOne({ _id: req.params.id, user: req.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Template not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[NutritionRoutes] DELETE /saved-templates error:', err);
    res.status(500).json({ error: 'Failed to delete template.' });
  }
});

// ── Dietary Diversity & Inflammation ───────────────────────────────────────
router.get('/insights/diversity', auth, async (req, res) => {
  try {
    const data = await computeWeeklyDiversity(req.userId);
    res.json(data);
  } catch (err) {
    console.error('[NutritionRoutes] GET /insights/diversity error:', err);
    res.status(500).json({ error: 'Failed to compute diversity insights.' });
  }
});

// Daily Intelligence — Day Profile: mode, dynamic targets, time-sensitive actions, cross-domain insight
router.get('/daily-intelligence', auth, async (req, res) => {
  try {
    const data = await computeDailyIntelligence(req.userId);
    res.json(data);
  } catch (err) {
    console.error('[DailyIntelligence] Error:', err);
    res.status(500).json({ error: 'Failed to compute daily intelligence' });
  }
});

// Priority nutrient gaps — nutrients chronically under-consumed with food fix suggestions
router.get('/priority-gaps', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('biologicalProfile clinicalTargets labMarkers bodyComposition height weight gender dob').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
    const profile = user.biologicalProfile || {};
    const effectiveProfile = {
      ...profile,
      biologicalSex: profile.biologicalSex || (user.gender === 'male' || user.gender === 'female' ? user.gender : undefined),
      heightCm: toNum(profile.heightCm) ?? toNum(user.height),
      weightKg: toNum(profile.weightKg) ?? toNum(user.weight),
      dob: profile.dob || user.dob,
    };

    // Resolve clinical targets — adaptive if available
    let clinicalTargets = user.clinicalTargets;
    if (!clinicalTargets?.targets && effectiveProfile.biologicalSex) {
      const bmrOvr = toNum(user.bodyComposition?.bmrKcal);
      const labMkrs = user.labMarkers ? (typeof user.labMarkers.toObject === 'function' ? user.labMarkers.toObject() : user.labMarkers) : null;
      let adaptiveOvr = null;
      if (profile.useAdaptiveTdee !== false) {
        try {
          const ar = await calculateAdaptiveTDEE(req.userId, 30);
          if (ar.status === 'success') adaptiveOvr = ar.adaptiveTdee;
        } catch (_) {}
      }
      clinicalTargets = calculateDailyTargets(effectiveProfile, adaptiveOvr, labMkrs, bmrOvr);
    }

    if (!clinicalTargets?.targets) {
      return res.status(200).json({ gaps: [], requiresSetup: true });
    }

    const gaps = await computePriorityGaps(req.userId, clinicalTargets);
    res.json({ gaps, daysAnalyzed: 7 });
  } catch (err) {
    console.error('[PriorityGaps] Error:', err);
    res.status(500).json({ error: 'Failed to compute priority gaps' });
  }
});

module.exports = router;

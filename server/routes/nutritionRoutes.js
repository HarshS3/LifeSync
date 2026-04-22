const express = require('express');
const jwt = require('jsonwebtoken');
const { NutritionLog, WeightLog } = require('../models/Logs');
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
const BarcodeProduct = require('../models/BarcodeProduct');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';

const DAILY_TOTAL_FIELDS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'sodium',
  'potassium',
  'iron',
  'calcium',
  'vitaminB',
  'magnesium',
  'zinc',
  'vitaminC',
  'omega3',
  'saturatedFat',
  'monounsaturatedFat',
  'polyunsaturatedFat',
  'cholesterol',
  'phosphorus',
  'copper',
  'selenium',
  'manganese',
  'vitaminA',
  'vitaminE',
  'vitaminD2',
  'vitaminD3',
  'vitaminD',
  'vitaminB1',
  'vitaminB2',
  'vitaminB3',
  'vitaminB5',
  'vitaminB6',
  'vitaminB7',
  'vitaminB9',
  'vitaminB12',
  'folate',
];

function createEmptyDailyTotals() {
  const out = {};
  DAILY_TOTAL_FIELDS.forEach((f) => {
    out[f] = 0;
  });
  return out;
}

function calculateDailyTotalsFromMeals(meals = []) {
  const dailyTotals = createEmptyDailyTotals();
  meals.forEach((meal) => {
    meal.foods?.forEach((food) => {
      DAILY_TOTAL_FIELDS.forEach((f) => {
        dailyTotals[f] += Number(food?.[f] || 0);
      });
    });
  });
  // Normalize precision everywhere to avoid floating point artifacts (e.g. 27.560000000000002)
  DAILY_TOTAL_FIELDS.forEach((f) => {
    dailyTotals[f] = Math.round(dailyTotals[f] * 10) / 10;
  });
  return dailyTotals;
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
  // Compute daily multiplier = effective / consumed
  Object.values(totals).forEach(t => {
    t.consumed = parseFloat(t.consumed.toFixed(3));
    t.effective = parseFloat(t.effective.toFixed(3));
    t.multiplier = t.consumed > 0 ? parseFloat((t.effective / t.consumed).toFixed(3)) : 1;
  });
  return totals;
}

// Auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all nutrition logs for user
router.get('/logs', authMiddleware, async (req, res) => {
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
  try {
    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);
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
router.get('/logs/date/:date', authMiddleware, async (req, res) => {
  return getLogForDate(req, res, req.params.date);
});

// Back-compat: client previously called /logs/date/:userId/:date
router.get('/logs/date/:userId/:date', authMiddleware, async (req, res) => {
  return getLogForDate(req, res, req.params.date);
});

// Advanced pipeline: resolve canonical food
router.get('/food/resolve', authMiddleware, async (req, res) => {
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
router.get('/food/analyze', authMiddleware, async (req, res) => {
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

router.post('/food/analyze', authMiddleware, async (req, res) => {
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
router.get('/food/graph', authMiddleware, async (req, res) => {
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

router.get('/food/causal', authMiddleware, async (req, res) => {
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
router.get('/hypotheses', authMiddleware, async (req, res) => {
  try {
    const docs = await Hypothesis.find({ user: req.userId }).sort({ createdAt: -1 }).limit(50);
    res.json(docs);
  } catch (err) {
    console.error('[NutritionRoutes] /hypotheses error:', err);
    res.status(500).json({ error: 'Failed to fetch hypotheses' });
  }
});

router.post('/hypotheses/generate', authMiddleware, async (req, res) => {
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

router.patch('/hypotheses/:id/feedback', authMiddleware, async (req, res) => {
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
    const { date, meals, waterIntake, notes } = req.body;

    console.log('[NutritionRoutes] POST /api/nutrition/logs user', req.userId, 'date', date, 'meals', Array.isArray(meals) ? meals.length : 0)

    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);
    const endDate = new Date(logDate);
    endDate.setDate(endDate.getDate() + 1);

    // Calculate daily totals from meals
    const dailyTotals = createEmptyDailyTotals();
    
    meals?.forEach(meal => {
      meal.totalCalories = 0;
      meal.totalProtein = 0;
      meal.totalCarbs = 0;
      meal.totalFat = 0;
      
      meal.foods?.forEach(food => {
        meal.totalCalories += food.calories || 0;
        meal.totalProtein += food.protein || 0;
        meal.totalCarbs += food.carbs || 0;
        meal.totalFat += food.fat || 0;
        
        DAILY_TOTAL_FIELDS.forEach((f) => {
          dailyTotals[f] += Number(food?.[f] || 0);
        });
      });
      // Normalize precision
      meal.totalCalories = Math.round(meal.totalCalories * 10) / 10;
      meal.totalProtein = Math.round(meal.totalProtein * 10) / 10;
      meal.totalCarbs = Math.round(meal.totalCarbs * 10) / 10;
      meal.totalFat = Math.round(meal.totalFat * 10) / 10;
    });

    DAILY_TOTAL_FIELDS.forEach((f) => {
      dailyTotals[f] = Math.round(dailyTotals[f] * 10) / 10;
    });

    // Find existing log or create new
    let log = await NutritionLog.findOne({
      user: req.userId,
      date: { $gte: logDate, $lt: endDate },
    });

    if (log) {
      log.meals = meals;
      log.waterIntake = waterIntake || log.waterIntake;
      log.dailyTotals = dailyTotals;
      log.notes = notes || log.notes;
      await log.save();
    } else {
      log = await NutritionLog.create({
        user: req.userId,
        date: logDate,
        meals,
        waterIntake: waterIntake || 0,
        dailyTotals,
        notes,
      });
    }

    triggerDailyLifeStateRecompute({ userId: req.userId, date: logDate, reason: 'nutritionRoutes upsert log' });

    console.log('[NutritionRoutes] Saved nutrition log for user', req.userId, 'on', logDate.toISOString(), 'totals', dailyTotals);
    
    const logObj = typeof log?.toObject === 'function' ? log.toObject() : log;
    if (logObj.meals && logObj.meals.length > 0) {
      logObj.meals.forEach(meal => {
        meal.insights = evaluateMealInteractions(meal.foods);
        meal.bioavailability = calculateEffectiveNutrients(meal.foods);
      });
      logObj.effectiveNutrientTotals = _aggregateEffectiveTotals(logObj.meals);
    }
    
    res.status(201).json(logObj);
  } catch (err) {
    console.error('[NutritionRoutes] Error in POST /api/nutrition/logs:', err);
    res.status(500).json({ error: 'Failed to save nutrition log' });
  }
}

async function getWeightForDate(req, res, dateStr) {
  try {
    const startDate = new Date(dateStr);
    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const log = await WeightLog.findOne({
      user: req.userId,
      date: { $gte: startDate, $lt: endDate },
    }).select('date weightKg');

    if (!log) {
      return res.json({ date: startDate, weightKg: null });
    }

    res.json({ date: log.date, weightKg: log.weightKg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch weight log' });
  }
}

// Get weight for a specific date
router.get('/weight/date/:date', authMiddleware, async (req, res) => {
  return getWeightForDate(req, res, req.params.date);
});

// Upsert weight for a date
router.post('/weight', authMiddleware, async (req, res) => {
  try {
    const { date, weightKg } = req.body;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    const w = Number(weightKg);
    if (!Number.isFinite(w) || w <= 0 || w > 1000) {
      return res.status(400).json({ error: 'Invalid weightKg' });
    }

    d.setHours(0, 0, 0, 0);
    const endDate = new Date(d);
    endDate.setDate(endDate.getDate() + 1);

    let log = await WeightLog.findOne({
      user: req.userId,
      date: { $gte: d, $lt: endDate },
    });

    if (log) {
      log.weightKg = w;
      await log.save();
    } else {
      log = await WeightLog.create({ user: req.userId, date: d, weightKg: w });
    }

    triggerDailyLifeStateRecompute({ userId: req.userId, date: d, reason: 'nutritionRoutes upsert weight' });

    res.status(201).json({ date: log.date, weightKg: log.weightKg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save weight' });
  }
});

// Range fetch for charting
router.get('/weight/range/:start/:end', authMiddleware, async (req, res) => {
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
      .select('date weightKg');
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch weight range' });
  }
});

// Canonical
router.post('/logs', authMiddleware, upsertNutritionLog);

// Back-compat: older client called /logs/:userId
router.post('/logs/:userId', authMiddleware, upsertNutritionLog);

// Add a meal to today's log
router.post('/meals', authMiddleware, async (req, res) => {
  try {
    const { meal, date } = req.body;
    
    const logDate = new Date(date || new Date());
    logDate.setHours(0, 0, 0, 0);
    const endDate = new Date(logDate);
    endDate.setDate(endDate.getDate() + 1);

    // Calculate meal totals
    meal.totalCalories = meal.foods?.reduce((s, f) => s + (f.calories || 0), 0) || 0;
    meal.totalProtein = meal.foods?.reduce((s, f) => s + (f.protein || 0), 0) || 0;
    meal.totalCarbs = meal.foods?.reduce((s, f) => s + (f.carbs || 0), 0) || 0;
    meal.totalFat = meal.foods?.reduce((s, f) => s + (f.fat || 0), 0) || 0;

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
    const dailyTotals = calculateDailyTotalsFromMeals(log.meals || []);
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
router.patch('/water', authMiddleware, async (req, res) => {
  try {
    const { amount, date } = req.body;
    
    const logDate = new Date(date || new Date());
    logDate.setHours(0, 0, 0, 0);
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
router.delete('/meals/:logId/:mealIndex', authMiddleware, async (req, res) => {
  try {
    const { logId, mealIndex } = req.params;
    
    const log = await NutritionLog.findOne({ _id: logId, user: req.userId });
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    log.meals.splice(parseInt(mealIndex), 1);

    // Recalculate daily totals
    const dailyTotals = calculateDailyTotalsFromMeals(log.meals || []);
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
router.get('/stats', authMiddleware, async (req, res) => {
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
router.get('/logs/range/:start/:end', authMiddleware, async (req, res) => {
  try {
    const start = new Date(req.params.start);
    const end = new Date(req.params.end);
    
    const logs = await NutritionLog.find({
      user: req.userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition logs' });
  }
});

const { calculateDailyTargets } = require('../services/nutritionEngine');

// Gets the highly precise, scientific personalized clinical baseline targets for the user
router.get('/clinical-targets', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('biologicalProfile height weight gender bodyFat age dob');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const profile = user.biologicalProfile || {};
    const effectiveProfile = {
      ...profile,
      biologicalSex:
        profile.biologicalSex ||
        ((user.gender === 'male' || user.gender === 'female') ? user.gender : undefined),
      heightCm: toNum(profile.heightCm) ?? toNum(user.height),
      weightKg: toNum(profile.weightKg) ?? toNum(user.weight),
      bodyFatPercentage: toNum(profile.bodyFatPercentage) ?? toNum(user.bodyFat),
      dob: profile.dob || user.dob,
      dob: profile.dob || user.dob,
    };

    const requiredFieldChecks = [
      { key: 'biologicalSex', ok: !!effectiveProfile.biologicalSex },
      { key: 'heightCm', ok: Number(effectiveProfile.heightCm) > 0 },
      { key: 'weightKg', ok: Number(effectiveProfile.weightKg) > 0 },
    ];
    const missingRequiredFields = requiredFieldChecks.filter((f) => !f.ok).map((f) => f.key);
    
    // Check if the user even has a profile setup
    if (missingRequiredFields.length > 0) {
      return res.status(200).json({
        requiresSetup: true,
        targets: null,
        missingRequiredFields,
        debugProfile: {
          biologicalSex: effectiveProfile.biologicalSex || null,
          heightCm: effectiveProfile.heightCm || null,
          weightKg: effectiveProfile.weightKg || null,
        },
      });
    }

    const calculated = calculateDailyTargets(effectiveProfile);
    if (!calculated) {
      return res.status(200).json({
        requiresSetup: true,
        targets: null,
        missingRequiredFields,
      });
    }

    res.status(200).json({
      requiresSetup: false,
      profile: effectiveProfile,
      ...calculated
    });
  } catch (err) {
    console.error('Error computing clinical targets:', err);
    res.status(500).json({ error: 'Failed to compute clinical targets' });
  }
});

// Update the scientific metabolic parameters for the user
router.put('/clinical-profile', authMiddleware, async (req, res) => {
  try {
    const { biologicalSex, dob, heightCm, weightKg, bodyFatPercentage, activityLevel, metabolicGoal, pregnancyStatus, dietaryPreference, hypertension } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.biologicalProfile = {
      biologicalSex: biologicalSex || user.biologicalProfile?.biologicalSex,
      dob: dob || user.biologicalProfile?.dob,
      heightCm: heightCm || user.biologicalProfile?.heightCm,
      weightKg: weightKg || user.biologicalProfile?.weightKg,
      bodyFatPercentage: bodyFatPercentage || user.biologicalProfile?.bodyFatPercentage,
      activityLevel: activityLevel || user.biologicalProfile?.activityLevel || 'sedentary',
      metabolicGoal: metabolicGoal || user.biologicalProfile?.metabolicGoal || 'maintenance',
      pregnancyStatus: pregnancyStatus || user.biologicalProfile?.pregnancyStatus || 'none',
      dietaryPreference: dietaryPreference || user.biologicalProfile?.dietaryPreference || 'omnivore',
      hypertension: hypertension !== undefined ? hypertension : user.biologicalProfile?.hypertension || false,
    };

    await user.save();
    
    // Recompute and return the brand new targets
    const calculated = calculateDailyTargets(user.biologicalProfile);
    
    res.status(200).json({
      message: 'Profile updated',
      profile: user.biologicalProfile,
      ...calculated
    });

  } catch (err) {
    console.error('Error updating clinical profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Search foods using local DB only (external APIs disabled as requested)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const query = q || '';
    console.log('[NutritionRoutes] /api/nutrition/search called by user', req.userId, 'with query:', query);

    // Run ONLY local search with a high limit to return all internal results
    const local = await searchLocalFoods({ q: query, limit: 100 }).catch(e => { 
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

router.get('/barcode/:code', authMiddleware, async (req, res) => {
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

    if (missing.length > 0) {
      const knownMacros = {
        caloriesKcal: n.caloriesKcal || 0,
        proteinG: n.proteinG || 0,
        carbsG: n.carbsG || 0,
        fatG: n.fatG || 0,
        fiberG: n.fiberG || 0,
      };

      console.log(`[NutritionRoutes] Estimating missing micros for ${pd.name}: ${missing.join(', ')}`);
      const estimated = await estimateMissingMicronutrients(pd.name || pd.brand || 'Unknown', knownMacros, missing);
      
      if (estimated) {
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
      estimatedFields
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

// Get weekly macro aggregation
router.get('/aggregation/weekly-macros/:weekKey', authMiddleware, async (req, res) => {
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
router.get('/aggregation/weekly-micros/:weekKey', authMiddleware, async (req, res) => {
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
router.get('/aggregation/current-week', authMiddleware, async (req, res) => {
  try {
    const week = getISOWeek(new Date());
    const weekKey = `${week.year}-W${String(week.week).padStart(2, '0')}`;
    res.json({ weekKey, year: week.year, week: week.week });
  } catch (err) {
    console.error('[NutritionRoutes] current week error:', err);
    res.status(500).json({ error: 'Failed to get current week' });
  }
});

module.exports = router;

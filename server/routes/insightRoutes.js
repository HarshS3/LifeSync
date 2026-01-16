const express = require('express');
const jwt = require('jsonwebtoken');
const DailyInsight = require('../models/DailyInsight');
const DailyLifeState = require('../models/DailyLifeState');
const PatternMemory = require('../models/PatternMemory');
const IdentityMemory = require('../models/IdentityMemory');
const User = require('../models/User');
const { fetchTextbookRag } = require('../services/ragClient');
const { generateLLMReply } = require('../aiClient');
const { buildNutritionReview } = require('../services/nutritionReview/buildNutritionReview');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';

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

// GET /api/insights/daily?date=YYYY-MM-DD (or ISO) [&refresh=1]
router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString();
    const start = new Date(date);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const doc = await DailyInsight.findOne({ user: req.userId, date: { $gte: start, $lt: end } });
    if (doc) return res.json(doc);

    // Deprecated behavior: do not compute. Return a stable no_data-shaped payload.
    return res.json({
      user: req.userId,
      date: start,
      status: 'no_data',
      inputsUpdatedAt: null,
      computedAt: new Date(),
      version: 1,
      nutrition: {
        logId: null,
        mealsCount: 0,
        foodsCount: 0,
        waterIntake: 0,
        dailyTotalsLogged: null,
        mealSignals: null,
        foods: [],
        aggregate: null,
        bullets: [],
      },
      symptoms: { windowDays: 2, items: [] },
      labs: { windowDays: 14, items: [] },
      narrative: { text: '', hash: '', model: '', updatedAt: null },
      errors: [],
    });
  } catch (err) {
    console.error('[InsightRoutes] GET /daily error:', err);
    res.status(500).json({ error: 'Failed to compute daily insight' });
  }
});

// POST /api/insights/daily/recompute { date }
router.post('/daily/recompute', authMiddleware, async (req, res) => {
  try {
    const date = req.body?.date || new Date().toISOString();
    const start = new Date(date);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // Deprecated behavior: do not compute. Return existing doc if present, else no_data.
    const doc = await DailyInsight.findOne({ user: req.userId, date: { $gte: start, $lt: end } });
    if (doc) return res.status(201).json(doc);

    return res.status(201).json({
      user: req.userId,
      date: start,
      status: 'no_data',
      inputsUpdatedAt: null,
      computedAt: new Date(),
      version: 1,
      nutrition: {
        logId: null,
        mealsCount: 0,
        foodsCount: 0,
        waterIntake: 0,
        dailyTotalsLogged: null,
        mealSignals: null,
        foods: [],
        aggregate: null,
        bullets: [],
      },
      symptoms: { windowDays: 2, items: [] },
      labs: { windowDays: 14, items: [] },
      narrative: { text: '', hash: '', model: '', updatedAt: null },
      errors: [],
    });
  } catch (err) {
    console.error('[InsightRoutes] POST /daily/recompute error:', err);
    res.status(500).json({ error: 'Failed to recompute daily insight' });
  }
});

// GET /api/insights/learning/overall?days=60
router.get('/learning/overall', authMiddleware, async (req, res) => {
  try {
    const daysRaw = Number(req.query.days ?? 60);
    const days = Number.isFinite(daysRaw) ? Math.min(365, Math.max(7, Math.floor(daysRaw))) : 60;

    const now = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [patterns, identities, states] = await Promise.all([
      PatternMemory.find({ user: req.userId, status: { $in: ['active', 'weak'] } })
        .sort({ status: 1, confidence: -1, lastObserved: -1 })
        .limit(80)
        .lean(),
      IdentityMemory.find({ user: req.userId, status: { $in: ['active', 'fading'] } })
        .sort({ status: 1, confidence: -1, lastReinforced: -1 })
        .limit(80)
        .lean(),
      DailyLifeState.find({ user: req.userId, dateStart: { $gte: since } })
        .sort({ dateStart: -1 })
        .limit(Math.min(400, days + 10))
        .lean(),
    ]);

    const summaryCounts = {
      unknown: 0,
      stable: 0,
      overloaded: 0,
      depleted: 0,
      recovering: 0,
    };

    for (const s of states) {
      const label = s?.summaryState?.label;
      if (label && Object.prototype.hasOwnProperty.call(summaryCounts, label)) {
        summaryCounts[label] += 1;
      } else {
        summaryCounts.unknown += 1;
      }
    }

    const learnedFrom = {
      dailyLifeStateSignals: [
        'sleep (MentalLog.sleepHours)',
        'mood (MentalLog.moodScore or MentalLog.mood)',
        'stress (MentalLog.stressLevel)',
        'energy (MentalLog.energyLevel)',
        'trainingLoad (FitnessLog.intensity + FitnessLog.fatigue)',
        'nutrition completeness (NutritionLog.dailyTotals macros + calories + waterIntake)',
        'habits completion (HabitLog.completed)',
      ],
      contextSignals: [
        'symptomsContext (SymptomLog.severity average)',
        'labsContext (LabReport.results flagged high/low count)',
        'reflectionContext (JournalEntry text length)',
      ],
      notes: [
        'PatternMemory and IdentityMemory currently derive from DailyLifeState signals (deterministic).',
      ],
    };

    const notYetUsed = {
      examples: [
        'steps and distance logs (do not currently affect DailyLifeState)',
        'weight logs (do not currently affect DailyLifeState)',
        'meal-level details beyond dailyTotals (not used for DailyLifeState signals)',
        'lab numeric values/trends beyond high/low flags (not used for DailyLifeState signals)',
        'symptom tags/notes beyond severity (not used for DailyLifeState signals)',
      ],
      disclaimer:
        'These fields may still be stored and displayed elsewhere; this list is only about what feeds DailyLifeState → PatternMemory → IdentityMemory today.',
    };

    res.json({
      windowDays: days,
      asOf: now,
      patterns,
      identities,
      stateSummary: {
        totalDaysWithState: states.length,
        counts: summaryCounts,
        latestDayKey: states[0]?.dayKey || null,
        latestSummaryState: states[0]?.summaryState || null,
      },
      fieldCoverage: {
        learnedFrom,
        notYetUsed,
      },
    });
  } catch (err) {
    console.error('[InsightRoutes] GET /learning/overall error:', err);
    res.status(500).json({ error: 'Failed to fetch learning overview' });
  }
});

// GET /api/insights/nutrition/review?dayKey=YYYY-MM-DD&narrate=1
router.get('/nutrition/review', authMiddleware, async (req, res) => {
  try {
    const rawDayKey = String(req.query.dayKey || '').trim();

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const defaultDayKey = `${yyyy}-${mm}-${dd}`;

    const dayKey = rawDayKey && /^\d{4}-\d{2}-\d{2}$/.test(rawDayKey) ? rawDayKey : defaultDayKey;
    const includeNarration = String(req.query.narrate || '0') === '1';

    const review = await buildNutritionReview({ userId: req.userId, dayKey });

    let narration = null;
    let ragMeta = { ok: false, confidence: 0, citationsCount: 0 };

    if (includeNarration) {
      let user = null;
      try {
        user = await User.findById(req.userId).select('age gender allergies conditions medications dietType');
      } catch {
        user = null;
      }

      // Optional textbook RAG: keeps the medical-style text grounded.
      let rag = null;
      try {
        const questionParts = [];
        questionParts.push('Create an educational, non-diagnostic nutrition review grounded in textbook excerpts.');
        questionParts.push('Focus on hydration, fiber, sodium, and common micronutrient themes.');
        questionParts.push('Use uncertainty-aware language and do not predict diseases.');
        questionParts.push('');
        questionParts.push(`Day snapshot: calories ${review.snapshot.calories} kcal, protein ${review.snapshot.protein} g, fiber ${review.snapshot.fiber} g, sodium ${review.snapshot.sodium} mg, water ${review.snapshot.waterMl} ml.`);
        if (Array.isArray(review.flags) && review.flags.length) {
          questionParts.push('Flags:');
          for (const f of review.flags.slice(0, 6)) {
            questionParts.push(`- ${f.title} (${f.key})`);
          }
        }
        rag = await fetchTextbookRag({
          question: questionParts.join('\n'),
          userProfile: user
            ? {
                age: user.age,
                gender: user.gender,
                allergies: user.allergies,
                conditions: user.conditions,
                medications: user.medications,
              }
            : null,
          allowedScope: 'medical-textbook',
        });
      } catch {
        rag = null;
      }

      ragMeta = {
        ok: Boolean(rag?.ok),
        confidence: typeof rag?.confidence === 'number' ? rag.confidence : 0,
        citationsCount: Array.isArray(rag?.citations) ? rag.citations.length : 0,
      };

      const systemPrompt = [
        'You are LifeSync. Write a medical-style nutrition review that is educational and non-judgmental.',
        'Do NOT diagnose diseases or predict medical outcomes.',
        'Do NOT prescribe treatments. You may suggest what to monitor and what to discuss with a clinician.',
        'Use the provided textbook excerpts for factual claims. If excerpts do not support a claim, say so.',
        'Format: 3 short sections with headers: Findings, What this could relate to, What to monitor/ask.',
        'Keep it under 10 lines.',
      ].join(' ');

      const memoryContext = [
        `Nutrition snapshot JSON: ${JSON.stringify(review.snapshot)}`,
        `Flags JSON: ${JSON.stringify(review.flags)}`,
        `Questions JSON: ${JSON.stringify(review.questionsForClinician)}`,
        rag?.ragContext ? `\n${rag.ragContext}` : '',
      ].join('\n');

      const message = 'Write the nutrition review now. Be calm, precise, and cite excerpts by referencing the bracketed source labels.';
      narration = await generateLLMReply({ message, memoryContext, systemPrompt });
    }

    res.json({
      dayKey,
      review,
      narration,
      rag: ragMeta,
    });
  } catch (err) {
    console.error('[InsightRoutes] GET /nutrition/review error:', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to build nutrition review' });
  }
});

module.exports = router;

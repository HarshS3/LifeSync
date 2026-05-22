const express = require('express');
const jwt = require('jsonwebtoken');
const { FitnessLog, NutritionLog, MentalLog } = require('../models/Logs');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');

const router = express.Router();

const auth = require('../middleware/authMiddleware');

// Get consolidated logs for calendar view
router.get('/calendar-summary', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const [fitness, mental, nutrition, workouts] = await Promise.all([
      FitnessLog.find({ user: req.userId, date: { $gte: startDate, $lte: endDate } }).lean(),
      MentalLog.find({ user: req.userId, date: { $gte: startDate, $lte: endDate } }).lean(),
      NutritionLog.find({ user: req.userId, date: { $gte: startDate, $lte: endDate } }).lean(),
      Workout.find({ user: req.userId, date: { $gte: startDate, $lte: endDate } }).lean(),
    ]);

    // Return as a map keyed by date string for easier frontend lookup
    const summary = {};
    const process = (logs, type) => {
      logs.forEach(log => {
        const d = new Date(log.date).toDateString();
        if (!summary[d]) summary[d] = { fitness: [], mental: [], nutrition: [], workouts: [], habits: [] };
        summary[d][type].push(log);
      });
    };

    process(fitness, 'fitness');
    process(mental, 'mental');
    process(nutrition, 'nutrition');
    process(workouts, 'workouts');

    res.json(summary);
  } catch (err) {
    console.error('[CalendarSummary] Error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar summary' });
  }
});

// GET all logs for authenticated user
router.get('/fitness', auth, async (req, res) => {
  try {
    const logs = await FitnessLog.find({ user: req.userId }).sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch fitness logs' });
  }
});

router.get('/nutrition', auth, async (req, res) => {
  try {
    const logs = await NutritionLog.find({ user: req.userId }).sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition logs' });
  }
});

router.get('/mental', auth, async (req, res) => {
  try {
    const logs = await MentalLog.find({ user: req.userId }).sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mental health logs' });
  }
});

router.post('/fitness', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const log = await FitnessLog.create({
      ...req.body,
      user: userId,
    });
    triggerDailyLifeStateRecompute({ userId, date: log?.date, reason: 'logRoutes fitness' });
    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save fitness log' });
  }
});

router.get('/fitness/:userId', async (req, res) => {
  try {
    const logs = await FitnessLog.find({ user: req.params.userId }).sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch fitness logs' });
  }
});

router.post('/nutrition', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const log = await NutritionLog.create({
      ...req.body,
      user: userId,
    });
    triggerDailyLifeStateRecompute({ userId, date: log?.date, reason: 'logRoutes nutrition' });
    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save nutrition log' });
  }
});

router.get('/nutrition/:userId', async (req, res) => {
  try {
    const logs = await NutritionLog.find({ user: req.params.userId }).sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition logs' });
  }
});

async function createMentalLog(req, res, userId) {
  try {
    if (!userId) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const allowedFields = [
      'mood',
      'moodScore',
      'stressLevel',
      'energyLevel',
      'bodyFeel',
      'sleepHours',
      'medsTaken',
      'journalSnippet',
      'notes',
    ];

    const patch = {};
    for (const key of allowedFields) {
      if (!Object.prototype.hasOwnProperty.call(req.body || {}, key)) continue;
      const value = req.body[key];

      // Allow explicit empty strings/arrays, but ignore null/undefined.
      if (value === null || typeof value === 'undefined') continue;
      patch[key] = value;
    }

    // Check if a log already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const existingLog = await MentalLog.findOne({
      user: userId,
      date: { $gte: today, $lt: tomorrow },
    });
    if (existingLog) {
      // Instead of blocking, merge any new fields into the existing log.
      if (Object.keys(patch).length) {
        Object.assign(existingLog, patch);
        await existingLog.save();
        triggerDailyLifeStateRecompute({ userId, date: existingLog?.date, reason: 'logRoutes mental update' });
      }
      return res.status(200).json(existingLog);
    }

    const log = await MentalLog.create({
      ...patch,
      user: userId,
    });
    triggerDailyLifeStateRecompute({ userId, date: log?.date, reason: 'logRoutes mental' });
    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save mental health log' });
  }
}

// Canonical (token-based)
router.post('/mental', auth, async (req, res) => {
  const userId = req.userId;
  return createMentalLog(req, res, userId);
});

// Back-compat: older client called /mental/:userId
router.post('/mental/:userId', auth, async (req, res) => {
  const userId = req.userId || req.params.userId;
  return createMentalLog(req, res, userId);
});

router.get('/mental/:userId', async (req, res) => {
  try {
    const logs = await MentalLog.find({ user: req.params.userId }).sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mental health logs' });
  }
});

// Range fetch for mental logs
router.get('/mental/range/:start/:end', auth, async (req, res) => {
  try {
    const start = new Date(req.params.start);
    const end = new Date(req.params.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid range' });
    }
    const docs = await MentalLog.find({
      user: req.userId,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .lean();
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mental range' });
  }
});

module.exports = router;

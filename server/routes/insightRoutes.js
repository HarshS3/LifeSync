const express = require('express');
const jwt = require('jsonwebtoken');
const DailyInsight = require('../models/DailyInsight');

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

module.exports = router;

const express = require('express');
const jwt = require('jsonwebtoken');
const { upsertDailyInsightForDate, ensureDailyInsightNarrative } = require('../services/insights/dailyInsightEngine');

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
    const force = String(req.query.refresh || '0') === '1';
    const includeNarrative = String(req.query.includeNarrative || '0') === '1';
    const narrativeForce = String(req.query.narrativeRefresh || '0') === '1';

    let doc = await upsertDailyInsightForDate({ userId: req.userId, date, force });
    if (includeNarrative) {
      doc = (await ensureDailyInsightNarrative({ userId: req.userId, date, force: narrativeForce || force })) || doc;
    }
    res.json(doc);
  } catch (err) {
    console.error('[InsightRoutes] GET /daily error:', err);
    res.status(500).json({ error: 'Failed to compute daily insight' });
  }
});

// POST /api/insights/daily/recompute { date }
router.post('/daily/recompute', authMiddleware, async (req, res) => {
  try {
    const date = req.body?.date || new Date().toISOString();
    const includeNarrative = Boolean(req.body?.includeNarrative);

    let doc = await upsertDailyInsightForDate({ userId: req.userId, date, force: true });
    if (includeNarrative) {
      doc = (await ensureDailyInsightNarrative({ userId: req.userId, date, force: true })) || doc;
    }
    res.status(201).json(doc);
  } catch (err) {
    console.error('[InsightRoutes] POST /daily/recompute error:', err);
    res.status(500).json({ error: 'Failed to recompute daily insight' });
  }
});

module.exports = router;

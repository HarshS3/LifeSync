const express = require('express');
const jwt = require('jsonwebtoken');

const DailyLifeState = require('../models/DailyLifeState');
const { upsertDailyLifeState } = require('../services/dailyLifeState/upsertDailyLifeState');
const { decideInsight } = require('../services/insightGatekeeper/decideInsight');
const { buildInsightPayload } = require('../services/insightGatekeeper/insightPayload');
const { buildStateReflection } = require('../services/stateReflection/buildStateReflection');

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

// GET /api/daily-life-state/:dayKey[?refresh=1]
router.get('/:dayKey', authMiddleware, async (req, res) => {
  try {
    const dayKey = String(req.params.dayKey || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      return res.status(400).json({ error: 'Invalid dayKey; expected YYYY-MM-DD' });
    }

    const force = String(req.query.refresh || '0') === '1';

    let doc = null;
    if (!force) {
      doc = await DailyLifeState.findOne({ user: req.userId, dayKey });
    }

    if (!doc) {
      doc = await upsertDailyLifeState({ userId: req.userId, dayKey });
    }

    // StateReflection: transient, gated output (no DB model, no JSON shape changes).
    // Delivered only via header so existing API consumers remain unaffected.
    let reflection = null;
    try {
      const insightDecision = await decideInsight({ userId: req.userId, dayKey, context: 'dashboard' });
      const insightPayload = buildInsightPayload({ gateDecision: insightDecision });
      reflection = buildStateReflection({ dailyLifeState: doc, insightDecision, insightPayload });
    } catch {
      reflection = null;
    }

    // Allow browser clients to read this header in CORS contexts.
    res.set('Access-Control-Expose-Headers', 'X-LifeSync-State-Reflection');
    if (reflection) {
      res.set('X-LifeSync-State-Reflection', reflection);
    }

    res.json(doc);
  } catch (err) {
    console.error('[DailyLifeStateRoutes] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch daily life state' });
  }
});

module.exports = router;

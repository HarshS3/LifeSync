const express = require('express');
const jwt = require('jsonwebtoken');
const SymptomLog = require('../models/SymptomLog');
const { dayKeyFromDate } = require('../services/dailyLifeState/dayKey');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');

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

function parseDateParam(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// List symptom logs (supports range queries)
// GET /api/symptoms?start=YYYY-MM-DD&end=YYYY-MM-DD&symptomName=headache&tag=eyes&limit=100
router.get('/', authMiddleware, async (req, res) => {
  try {
    const start = parseDateParam(req.query.start);
    const end = parseDateParam(req.query.end);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 60));

    const query = { user: req.userId };
    if (start || end) {
      query.date = {};
      if (start) query.date.$gte = start;
      if (end) query.date.$lte = end;
    }

    if (req.query.symptomName) {
      query.symptomName = String(req.query.symptomName).trim();
    }

    if (req.query.tag) {
      query.tags = String(req.query.tag).trim();
    }

    const logs = await SymptomLog.find(query).sort({ date: -1 }).limit(limit);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch symptom logs' });
  }
});

// Create symptom log
// POST /api/symptoms { date?, symptomName, severity?, notes?, tags? }
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { date, symptomName, severity, notes, tags } = req.body;
    if (!symptomName || !String(symptomName).trim()) {
      return res.status(400).json({ error: 'symptomName is required' });
    }

    const doc = await SymptomLog.create({
      user: req.userId,
      date: date ? new Date(date) : new Date(),
      symptomName: String(symptomName).trim(),
      severity: severity == null || severity === '' ? null : Number(severity),
      notes: notes ? String(notes) : '',
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [],
    });

    triggerDailyLifeStateRecompute({ userId: req.userId, date: doc?.date, reason: 'symptomRoutes create' });

    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create symptom log' });
  }
});

// Update symptom log
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const before = await SymptomLog.findOne({ _id: req.params.id, user: req.userId }).select('date');

    const updates = {};
    if (req.body.date != null) updates.date = new Date(req.body.date);
    if (req.body.symptomName != null) updates.symptomName = String(req.body.symptomName).trim();
    if (req.body.severity !== undefined) updates.severity = req.body.severity == null || req.body.severity === '' ? null : Number(req.body.severity);
    if (req.body.notes != null) updates.notes = String(req.body.notes);
    if (req.body.tags !== undefined) updates.tags = Array.isArray(req.body.tags) ? req.body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [];

    const doc = await SymptomLog.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: updates },
      { new: true }
    );

    if (!doc) return res.status(404).json({ error: 'Not found' });

    const beforeKey = before?.date ? dayKeyFromDate(before.date) : null;
    const afterKey = doc?.date ? dayKeyFromDate(doc.date) : null;
    if (beforeKey) triggerDailyLifeStateRecompute({ userId: req.userId, dayKey: beforeKey, reason: 'symptomRoutes update (before)' });
    if (afterKey && afterKey !== beforeKey) triggerDailyLifeStateRecompute({ userId: req.userId, dayKey: afterKey, reason: 'symptomRoutes update (after)' });

    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update symptom log' });
  }
});

// Delete symptom log
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await SymptomLog.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    triggerDailyLifeStateRecompute({ userId: req.userId, date: doc?.date, reason: 'symptomRoutes delete' });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete symptom log' });
  }
});

module.exports = router;

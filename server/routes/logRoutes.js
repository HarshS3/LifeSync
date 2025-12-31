const express = require('express');
const jwt = require('jsonwebtoken');
const { FitnessLog, NutritionLog, MentalLog } = require('../models/Logs');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');

const router = express.Router();

// Helper to extract userId from token
const getUserIdFromToken = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';
    const decoded = jwt.verify(token, secret);
    return decoded.userId;
  } catch (err) {
    return null;
  }
};

// Auth middleware for log routes
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET all logs for authenticated user
router.get('/fitness', authMiddleware, async (req, res) => {
  try {
    const logs = await FitnessLog.find({ user: req.userId }).sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch fitness logs' });
  }
});

router.get('/nutrition', authMiddleware, async (req, res) => {
  try {
    const logs = await NutritionLog.find({ user: req.userId }).sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition logs' });
  }
});

router.get('/mental', authMiddleware, async (req, res) => {
  try {
    const logs = await MentalLog.find({ user: req.userId }).sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mental health logs' });
  }
});

router.post('/fitness', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
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

router.post('/nutrition', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
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
      return res.status(409).json({ error: 'Already checked in today', log: existingLog });
    }

    const log = await MentalLog.create({
      ...req.body,
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
router.post('/mental', async (req, res) => {
  const userId = getUserIdFromToken(req);
  return createMentalLog(req, res, userId);
});

// Back-compat: older client called /mental/:userId
router.post('/mental/:userId', async (req, res) => {
  const userId = getUserIdFromToken(req) || req.params.userId;
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

module.exports = router;

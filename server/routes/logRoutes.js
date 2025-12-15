const express = require('express');
const jwt = require('jsonwebtoken');
const { FitnessLog, NutritionLog, MentalLog } = require('../models/Logs');

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

// GET all logs (MVP - no auth)
router.get('/fitness', async (req, res) => {
  try {
    const logs = await FitnessLog.find().sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch fitness logs' });
  }
});

router.get('/nutrition', async (req, res) => {
  try {
    const logs = await NutritionLog.find().sort({ date: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition logs' });
  }
});

router.get('/mental', async (req, res) => {
  try {
    const logs = await MentalLog.find().sort({ date: -1 }).limit(30);
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

router.post('/mental', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const log = await MentalLog.create({
      ...req.body,
      user: userId,
    });
    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save mental health log' });
  }
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

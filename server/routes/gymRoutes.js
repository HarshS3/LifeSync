const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { StepsLog } = require('../models/Logs');
const Workout = require('../models/Workout');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');

const router = express.Router();

// Auth middleware
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

async function getStepsForDate(req, res, dateStr) {
  try {
    const startDate = new Date(dateStr);
    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const log = await StepsLog.findOne({
      user: req.userId,
      date: { $gte: startDate, $lt: endDate },
    }).select('date stepsCount');

    if (!log) {
      return res.json({ date: startDate, stepsCount: null });
    }

    res.json({ date: log.date, stepsCount: log.stepsCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch steps log' });
  }
}

// Get steps for a specific date
router.get('/steps/date/:date', authMiddleware, async (req, res) => {
  return getStepsForDate(req, res, req.params.date);
});

// Upsert steps for a date
router.post('/steps', authMiddleware, async (req, res) => {
  try {
    const { date, stepsCount } = req.body;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    const s = Number(stepsCount);
    if (!Number.isFinite(s) || s < 0 || s > 200000) {
      return res.status(400).json({ error: 'Invalid stepsCount' });
    }

    d.setHours(0, 0, 0, 0);
    const endDate = new Date(d);
    endDate.setDate(endDate.getDate() + 1);

    let log = await StepsLog.findOne({
      user: req.userId,
      date: { $gte: d, $lt: endDate },
    });

    if (log) {
      log.stepsCount = s;
      await log.save();
    } else {
      log = await StepsLog.create({ user: req.userId, date: d, stepsCount: s });
    }

    triggerDailyLifeStateRecompute({ userId: req.userId, date: d, reason: 'gymRoutes upsert steps' });

    res.status(201).json({ date: log.date, stepsCount: log.stepsCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save steps' });
  }
});

// Range fetch for charting
router.get('/steps/range/:start/:end', authMiddleware, async (req, res) => {
  try {
    const start = new Date(req.params.start);
    const end = new Date(req.params.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid range' });
    }
    const docs = await StepsLog.find({
      user: req.userId,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .select('date stepsCount');

    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch steps range' });
  }
});

// Get all workouts for user
router.get('/workouts', authMiddleware, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.userId }).sort({ date: -1 }).limit(100);
    res.json(workouts);
  } catch (err) {
    console.error('Failed to fetch workouts:', err);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Get workout by ID (user-specific)
router.get('/workouts/:id', authMiddleware, async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.userId });
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json(workout);
  } catch (err) {
    console.error('Failed to fetch workout:', err);
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

// Create workout (user-specific)
router.post('/workouts', authMiddleware, async (req, res) => {
  try {
    const { name, exercises, duration, date, notes } = req.body;

    const workout = await Workout.create({
      user: req.userId,
      name: name || `Workout - ${new Date().toLocaleDateString()}`,
      exercises: exercises || [],
      duration: duration || 0,
      date: date || new Date(),
      notes,
    });

    res.status(201).json(workout);
  } catch (err) {
    console.error('Failed to create workout:', err);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// Update workout (user-specific)
router.put('/workouts/:id', authMiddleware, async (req, res) => {
  try {
    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json(workout);
  } catch (err) {
    console.error('Failed to update workout:', err);
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

// Delete workout (user-specific)
router.delete('/workouts/:id', authMiddleware, async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json({ message: 'Workout deleted' });
  } catch (err) {
    console.error('Failed to delete workout:', err);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// Get workout stats (user-specific)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.userId }).sort({ date: -1 });
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalVolume = 0;
    let weeklyWorkouts = 0;
    let monthlyWorkouts = 0;
    const muscleCount = {};
    const exerciseHistory = {};

    workouts.forEach((w) => {
      const workoutDate = new Date(w.date);
      if (workoutDate > weekAgo) weeklyWorkouts++;
      if (workoutDate > monthAgo) monthlyWorkouts++;

      w.exercises?.forEach((ex) => {
        // Count muscle groups
        const muscle = ex.muscleGroup || 'other';
        muscleCount[muscle] = (muscleCount[muscle] || 0) + 1;

        // Track exercise history for PRs
        if (!exerciseHistory[ex.name]) {
          exerciseHistory[ex.name] = [];
        }

        // Calculate volume
        ex.sets?.forEach((set) => {
          totalVolume += (set.reps || 0) * (set.weight || 0);
          exerciseHistory[ex.name].push({
            date: w.date,
            weight: set.weight,
            reps: set.reps,
          });
        });
      });
    });

    // Calculate PRs (Personal Records)
    const personalRecords = {};
    Object.entries(exerciseHistory).forEach(([exercise, history]) => {
      const maxWeight = Math.max(...history.map((h) => h.weight || 0));
      const maxVolume = Math.max(...history.map((h) => (h.weight || 0) * (h.reps || 0)));
      personalRecords[exercise] = { maxWeight, maxVolume };
    });

    res.json({
      totalWorkouts: workouts.length,
      weeklyWorkouts,
      monthlyWorkouts,
      totalVolume,
      muscleDistribution: muscleCount,
      personalRecords,
    });
  } catch (err) {
    console.error('Failed to fetch stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get workouts by date range (for calendar, user-specific)
router.get('/workouts/range/:start/:end', authMiddleware, async (req, res) => {
  try {
    const { start, end } = req.params;
    const workouts = await Workout.find({
      user: req.userId,
      date: {
        $gte: new Date(start),
        $lte: new Date(end),
      },
    }).sort({ date: -1 });
    res.json(workouts);
  } catch (err) {
    console.error('Failed to fetch workouts by range:', err);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

module.exports = router;

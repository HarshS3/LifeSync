const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { StepsLog } = require('../models/Logs');
const Workout = require('../models/Workout');
const WorkoutTemplate = require('../models/WorkoutTemplate');
const { analyzeCorrelations } = require('../services/insights/correlationEngine');
const { calculateReadiness } = require('../services/insights/readinessEngine');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');

const router = express.Router();

const auth = require('../middleware/authMiddleware');

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
router.get('/steps/date/:date', auth, async (req, res) => {
  return getStepsForDate(req, res, req.params.date);
});

// Upsert steps for a date
router.post('/steps', auth, async (req, res) => {
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
router.get('/steps/range/:start/:end', auth, async (req, res) => {
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
router.get('/workouts', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.userId }).sort({ date: -1 }).limit(100);
    res.json(workouts);
  } catch (err) {
    console.error('Failed to fetch workouts:', err);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Get workout by ID (user-specific)
router.get('/workouts/:id', auth, async (req, res) => {
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
router.post('/workouts', auth, async (req, res) => {
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
router.put('/workouts/:id', auth, async (req, res) => {
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
router.delete('/workouts/:id', auth, async (req, res) => {
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
router.get('/stats', auth, async (req, res) => {
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

// Get exercise history endpoint
router.get('/exercise-history/:exerciseName', auth, async (req, res) => {
  try {
    const { exerciseName } = req.params;
    const decodedName = decodeURIComponent(exerciseName).toLowerCase().trim();
    const workouts = await Workout.find({ user: req.userId }).sort({ date: -1 }).limit(200);
    
    const history = [];
    const allWeights = [];
    const allReps = [];
    const allRPEs = [];
    let totalSets = 0;
    
    workouts.forEach((workout) => {
      workout.exercises?.forEach((ex) => {
        const exName = ex.name?.toLowerCase().trim() || '';
        if (exName === decodedName || exName === decodedName + 's' || exName + 's' === decodedName) {
          if (ex.sets && ex.sets.length > 0) {
            const maxWeight = Math.max(...ex.sets.map(s => s.weight || 0));
            const maxReps = Math.max(...ex.sets.map(s => s.reps || 0));
            const avgRPE = ex.sets.filter(s => s.rpe).length > 0 
              ? ex.sets.reduce((sum, s) => sum + (s.rpe || 0), 0) / ex.sets.length 
              : 0;
            
            history.push({
              date: workout.date,
              sets: ex.sets,
              maxWeight,
              maxReps,
              avgRPE: avgRPE.toFixed(1),
              volume: ex.sets.reduce((sum, s) => sum + ((s.weight || 0) * (s.reps || 0)), 0)
            });
            
            ex.sets.forEach(set => {
              if (set.weight) allWeights.push(set.weight);
              if (set.reps) allReps.push(set.reps);
              if (set.rpe) allRPEs.push(set.rpe);
              totalSets++;
            });
          }
        }
      });
    });
    
    const calculateEstimated1RM = (weight, reps) => {
      if (reps === 1) return weight;
      return (weight * (1 + reps / 30)).toFixed(1);
    };
    
    const stats = {
      totalLogs: history.length,
      maxWeight: allWeights.length > 0 ? Math.max(...allWeights) : 0,
      avgWeight: allWeights.length > 0 ? Number((allWeights.reduce((a, b) => a + b) / allWeights.length).toFixed(1)) : 0,
      estimated1RM: allWeights.length > 0 ? Number(calculateEstimated1RM(Math.max(...allWeights), 5)) : 0,
      avgReps: allReps.length > 0 ? Number((allReps.reduce((a, b) => a + b) / allReps.length).toFixed(1)) : 0,
      avgSetsPerLog: history.length > 0 ? Number((totalSets / history.length).toFixed(1)) : 0,
      avgRPE: allRPEs.length > 0 ? Number((allRPEs.reduce((a, b) => a + b) / allRPEs.length).toFixed(1)) : 0,
    };
    
    res.json({ history, stats });
  } catch (err) {
    console.error('Failed to fetch exercise history:', err);
    res.status(500).json({ error: 'Failed to fetch exercise history' });
  }
});

// Get AI exercise analysis
router.post('/exercise-analysis/:exerciseName', auth, async (req, res) => {
  try {
    const { exerciseName } = req.params;
    const { history, stats } = req.body;
    
    const { generateExerciseAnalysis } = require('../aiClient');
    const analysis = await generateExerciseAnalysis({
      exerciseName: decodeURIComponent(exerciseName),
      history,
      stats
    });
    
    if (!analysis) {
      return res.status(500).json({ error: 'Failed to generate analysis' });
    }
    
    res.json(analysis);
  } catch (err) {
    console.error('Failed to generate exercise analysis:', err);
    res.status(500).json({ error: 'Failed to generate analysis' });
  }
});

// Get workouts by date range (for calendar, user-specific)
router.get('/workouts/range/:start/:end', auth, async (req, res) => {
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

// ── Workout Templates ────────────────────────────────────────────────────────

// Get all templates for user
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = await WorkoutTemplate.find({ userId: req.userId }).sort({ lastUsed: -1, createdAt: -1 });
    res.json(templates);
  } catch (err) {
    console.error('Failed to fetch templates:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create template
router.post('/templates', auth, async (req, res) => {
  try {
    const { name, exercises, description } = req.body;
    const template = await WorkoutTemplate.create({
      userId: req.userId,
      name,
      description,
      exercises: exercises || [],
    });
    res.status(201).json(template);
  } catch (err) {
    console.error('Failed to create template:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Delete template
router.delete('/templates/:id', auth, async (req, res) => {
  try {
    const template = await WorkoutTemplate.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error('Failed to delete template:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Get correlated life-sync insights
router.get('/correlations', auth, async (req, res) => {
  try {
    const insights = await analyzeCorrelations(req.userId);
    res.json(insights);
  } catch (err) {
    console.error('Failed to fetch correlations:', err);
    res.status(500).json({ error: 'Failed to fetch correlations' });
  }
});

// Get daily training readiness score + stagnation alerts
router.get('/readiness', auth, async (req, res) => {
  try {
    const result = await calculateReadiness(req.userId);
    res.json(result);
  } catch (err) {
    console.error('Failed to calculate readiness:', err);
    res.status(500).json({ error: 'Failed to calculate readiness' });
  }
});

module.exports = router;

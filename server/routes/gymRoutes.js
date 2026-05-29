const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { StepsLog } = require('../models/Logs');
const Workout = require('../models/Workout');
const WorkoutTemplate = require('../models/WorkoutTemplate');
const { analyzeCorrelations } = require('../services/insights/correlationEngine');
const { calculateReadiness } = require('../services/insights/readinessEngine');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');
const { EXERCISE_METADATA } = require('../constants/exerciseMetadata');
const { generateAiSuggestion } = require('../services/insights/gymIntelligence');

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

// Get consolidated gym summary
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [workouts, totalWorkouts, templates, readiness, correlations, volumeResult, allWorkouts] = await Promise.all([
      Workout.find({ user: userId }).sort({ date: -1 }).limit(10), 
      Workout.countDocuments({ user: userId }),
      WorkoutTemplate.find({ userId }).sort({ lastUsed: -1, createdAt: -1 }),
      calculateReadiness(userId),
      analyzeCorrelations(userId).catch(() => null),
      Workout.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        { $unwind: "$exercises" },
        { $unwind: "$exercises.sets" },
        { 
          $group: { 
            _id: null, 
            totalVolume: { 
              $sum: { $multiply: [{ $ifNull: ["$exercises.sets.weight", 0] }, { $ifNull: ["$exercises.sets.reps", 0] }] } 
            } 
          } 
        }
      ]),
      Workout.find({ user: userId }).sort({ date: -1 }).select('date exercises.muscleGroup exercises.sets')
    ]);

    const totalVolume = volumeResult[0]?.totalVolume || 0;
    const weeklyWorkouts = allWorkouts.filter(w => new Date(w.date) > weekAgo).length;

    // Calculate Streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const hasWorkout = allWorkouts.some(w => new Date(w.date).toDateString() === checkDate.toDateString());
      if (hasWorkout) currentStreak++;
      else if (i > 0) break;
    }

    // Calculate Weekly Hypertrophy (Muscle Distribution)
    const muscleDistribution = {};
    allWorkouts.filter(w => new Date(w.date) > weekAgo).forEach(w => {
      w.exercises?.forEach(ex => {
        const metadata = ex.metadata || EXERCISE_METADATA[ex.name];
        const primaryMuscle = (ex.muscleGroup || metadata?.primary || 'other').toLowerCase().trim();
        const setsCount = ex.sets?.filter(s => (s.reps || 0) > 0).length || 0;

        // Add to primary muscle (full set credit)
        muscleDistribution[primaryMuscle] = (muscleDistribution[primaryMuscle] || 0) + setsCount;

        // Add to secondary muscles (partial set credit - e.g., 0.5 sets)
        if (metadata?.secondary && Array.isArray(metadata.secondary)) {
          metadata.secondary.forEach(secMuscle => {
            const m = secMuscle.toLowerCase().trim();
            muscleDistribution[m] = (muscleDistribution[m] || 0) + (setsCount * 0.5);
          });
        }
      });
    });

    res.json({
      readiness,
      correlations,
      templates,
      recentWorkouts: workouts.slice(0, 5),
      stats: {
        totalWorkouts,
        weeklyWorkouts,
        totalVolume,
        currentStreak,
        muscleDistribution
      }
    });
  } catch (err) {
    console.error('[GymSummary] Error:', err);
    res.status(500).json({ error: 'Failed to fetch gym summary' });
  }
});

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
    const [workouts, user] = await Promise.all([
      Workout.find({ user: req.userId }).sort({ date: -1 }),
      require('../models/User').findById(req.userId).select('weight biologicalProfile').lean()
    ]);
    
    const userWeight = user?.biologicalProfile?.weight || user?.weight || 75;
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Determine distribution date range
    let distStart = weekAgo;
    let distEnd = now;

    if (req.query.startDate && req.query.endDate) {
      const qs = new Date(req.query.startDate);
      const qe = new Date(req.query.endDate);
      if (!Number.isNaN(qs.getTime()) && !Number.isNaN(qe.getTime())) {
        distStart = qs;
        distStart.setHours(0, 0, 0, 0);
        distEnd = qe;
        distEnd.setHours(23, 59, 59, 999);
      }
    } else if (req.query.days) {
      const d = Number(req.query.days);
      if (!Number.isNaN(d) && d > 0) {
        distStart = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
        distEnd = now;
      }
    }

    let totalVolume = 0;
    let weeklyWorkouts = 0;
    let monthlyWorkouts = 0;
    const muscleCount = {};
    const exerciseHistory = {};

    workouts.forEach((w) => {
      const workoutDate = new Date(w.date);
      const isRecent = workoutDate > weekAgo;
      if (isRecent) weeklyWorkouts++;
      if (workoutDate > monthAgo) monthlyWorkouts++;

      const inDistributionRange = workoutDate >= distStart && workoutDate <= distEnd;

      w.exercises?.forEach((ex) => {
        // Use metadata for accurate muscle mapping
        const metadata = ex.metadata || EXERCISE_METADATA[ex.name];
        const muscle = (ex.muscleGroup || metadata?.primary || 'other').toLowerCase().trim();
        
        // Count "Hard Sets" for weekly hypertrophy (recent only or range)
        if (inDistributionRange) {
          const setsCount = ex.sets?.filter(s => (s.reps || 0) > 0).length || 0;
          
          // Primary muscle credit
          muscleCount[muscle] = (muscleCount[muscle] || 0) + setsCount;

          // Secondary muscle credit
          if (metadata?.secondary && Array.isArray(metadata.secondary)) {
            metadata.secondary.forEach(secMuscle => {
              const m = secMuscle.toLowerCase().trim();
              muscleCount[m] = (muscleCount[m] || 0) + (setsCount * 0.5);
            });
          }
        }

        // Track exercise history for PRs
        if (!exerciseHistory[ex.name]) {
          exerciseHistory[ex.name] = [];
        }

        // Calculate volume
        ex.sets?.forEach((set) => {
          const effectiveWeight = (set.weight && set.weight > 0) ? set.weight : userWeight;
          totalVolume += (set.reps || 0) * effectiveWeight;
          exerciseHistory[ex.name].push({
            date: w.date,
            weight: set.weight, 
            effectiveWeight,
            reps: set.reps,
          });
        });
      });
    });

    // Calculate PRs (Personal Records)
    const personalRecords = {};
    Object.entries(exerciseHistory).forEach(([exercise, history]) => {
      const maxWeight = Math.max(...history.map((h) => h.weight || 0));
      const maxVolume = Math.max(...history.map((h) => (h.effectiveWeight || 0) * (h.reps || 0)));
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

// Get unique exercise names for the user
router.get('/exercise-names', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.userId }).select('exercises.name').lean();
    const names = new Set();
    workouts.forEach(w => {
      w.exercises?.forEach(ex => {
        if (ex.name) {
          names.add(ex.name.trim());
        }
      });
    });
    res.json(Array.from(names).sort());
  } catch (err) {
    console.error('Failed to fetch exercise names:', err);
    res.status(500).json({ error: 'Failed to fetch exercise names' });
  }
});

// Get exercise history endpoint
router.get('/exercise-history/:exerciseName', auth, async (req, res) => {
  try {
    const { exerciseName } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const decodedName = decodeURIComponent(exerciseName).toLowerCase().trim();
    
    // Get Metadata (Case-insensitive lookup)
    const exerciseNameRaw = decodeURIComponent(exerciseName);
    const metaKey = Object.keys(EXERCISE_METADATA).find(k => k.toLowerCase() === exerciseNameRaw.toLowerCase());
    const metadata = metaKey ? EXERCISE_METADATA[metaKey] : null;

    const [workouts, user] = await Promise.all([
      Workout.find({ 
        user: req.userId,
        'exercises.name': { $regex: new RegExp('^' + decodedName + '$', 'i') }
      }).sort({ date: -1 }).lean(),
      require('../models/User').findById(req.userId).select('weight biologicalProfile').lean()
    ]);

    const userWeight = user?.biologicalProfile?.weight || user?.weight || 75;
    
    const history = [];
    const allWeights = [];
    const allReps = [];
    const allRPEs = [];
    let totalSets = 0;
    
    workouts.forEach((workout) => {
      workout.exercises?.forEach((ex) => {
        const exName = ex.name?.toLowerCase().trim() || '';
        if (exName === decodedName) {
          if (ex.sets && ex.sets.length > 0) {
            const maxWeight = Math.max(...ex.sets.map(s => s.weight || 0));
            const maxReps = Math.max(...ex.sets.map(s => s.reps || 0));
            
            // Calc session Max 1RM
            const session1RMs = ex.sets.map(s => (s.weight || 0) * (1 + (s.reps || 0) / 30));
            const max1RM = Math.max(...session1RMs);

            const volume = ex.sets.reduce((sum, s) => {
              const effectiveWeight = (s.weight && s.weight > 0) ? s.weight : userWeight;
              return sum + (effectiveWeight * (s.reps || 0));
            }, 0);

            history.push({
              date: workout.date,
              sets: ex.sets,
              maxWeight,
              max1RM: Math.round(max1RM),
              volume
            });
            
            ex.sets.forEach(set => {
              if (set.weight) allWeights.push(set.weight);
              if (set.reps) allReps.push(set.reps);
              totalSets++;
            });
          }
        }
      });
    });
    
    // Sort chronologically for trend
    const fullTrend = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

    const stats = {
      totalSessions: history.length,
      maxWeight: allWeights.length > 0 ? Math.max(...allWeights) : 0,
      estimated1RM: fullTrend.length > 0 ? Math.max(...fullTrend.map(f => f.max1RM)) : 0,
      totalSets,
      startWeight: fullTrend.length > 0 ? fullTrend[0].maxWeight : 0,
      currentWeight: history.length > 0 ? history[0].maxWeight : 0,
    };

    // Paginate history
    const paginatedHistory = history.slice(skip, skip + parseInt(limit));
    
    res.json({ 
      history: paginatedHistory, 
      stats, 
      metadata,
      trend: fullTrend.map(t => ({ d: t.date, w: t.maxWeight, r1: t.max1RM, v: t.volume })),
      hasMore: history.length > (skip + parseInt(limit))
    });
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

// Get AI Training Suggestions
router.post('/ai-suggestion', auth, async (req, res) => {
  try {
    const { type } = req.body;
    const suggestion = await generateAiSuggestion({ userId: req.userId, type });
    res.json({ suggestion });
  } catch (err) {
    console.error('Failed to get AI suggestion:', err);
    res.status(500).json({ error: 'Failed to get AI suggestion' });
  }
});

module.exports = router;

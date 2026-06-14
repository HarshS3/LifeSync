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

// Weekly volume targets per muscle group (sets/week).
// Ranges are evidence-based (Schoenfeld/Israetel). Beginners need fewer sets.
// Format: [minimum effective, maximum adaptive]
const WEEKLY_VOLUME_TARGETS = {
  chest:      { beginner: [6, 10],  intermediate: [10, 20] },
  back:       { beginner: [6, 10],  intermediate: [10, 20] },
  shoulders:  { beginner: [6, 10],  intermediate: [12, 20] },
  quads:      { beginner: [6, 10],  intermediate: [10, 20] },
  hamstrings: { beginner: [4, 8],   intermediate: [10, 16] },
  glutes:     { beginner: [4, 8],   intermediate: [8, 16]  },
  biceps:     { beginner: [4, 8],   intermediate: [10, 16] },
  triceps:    { beginner: [4, 8],   intermediate: [10, 16] },
  core:       { beginner: [4, 8],   intermediate: [8, 16]  },
  calves:     { beginner: [4, 8],   intermediate: [10, 16] },
};

// Get consolidated gym summary
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const [workouts, totalWorkouts, templates, readiness, correlations, volumeResult, allWorkouts, user] = await Promise.all([
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
      Workout.find({ user: userId }).sort({ date: -1 }).select('date exercises.name exercises.muscleGroup exercises.metadata exercises.sets'),
      require('../models/User').findById(userId).select('trainingExperience').lean(),
    ]);

    const totalVolume = volumeResult[0]?.totalVolume || 0;
    const weeklyWorkouts = allWorkouts.filter(w => new Date(w.date) > weekAgo).length;
    const isBeginnerUser = (user?.trainingExperience === 'beginner' || user?.trainingExperience === 'novice');
    const tierKey = isBeginnerUser ? 'beginner' : 'intermediate';

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

    // ── Weekly Hypertrophy Volume (sets per muscle this week) ──────────────────
    const muscleDistribution = {};
    // Track last-trained date per muscle for neglected-muscle detection
    const muscleLastTrained = {};

    allWorkouts.forEach(w => {
      const wDate = new Date(w.date);
      const isThisWeek = wDate > weekAgo;
      w.exercises?.forEach(ex => {
        const metadata = ex.metadata || EXERCISE_METADATA[ex.name];
        const primaryMuscle = (ex.muscleGroup || metadata?.primary || 'other').toLowerCase().trim();
        const setsCount = ex.sets?.filter(s => (s.reps || 0) > 0).length || 0;

        if (isThisWeek) {
          muscleDistribution[primaryMuscle] = (muscleDistribution[primaryMuscle] || 0) + setsCount;
          if (metadata?.secondary && Array.isArray(metadata.secondary)) {
            metadata.secondary.forEach(secMuscle => {
              const m = secMuscle.toLowerCase().trim();
              muscleDistribution[m] = (muscleDistribution[m] || 0) + (setsCount * 0.5);
            });
          }
        }

        // Track most recent date trained per muscle (across all history)
        if (!muscleLastTrained[primaryMuscle] || wDate > muscleLastTrained[primaryMuscle]) {
          muscleLastTrained[primaryMuscle] = wDate;
        }
      });
    });

    // ── Weekly Volume Targets (how close each muscle is to its target) ─────────
    const weeklyVolumeStatus = {};
    Object.entries(WEEKLY_VOLUME_TARGETS).forEach(([muscle, tiers]) => {
      const [min, max] = tiers[tierKey];
      const done = Math.round(muscleDistribution[muscle] || 0);
      weeklyVolumeStatus[muscle] = {
        sets: done,
        min,
        max,
        pct: Math.min(100, Math.round((done / min) * 100)),
        status: done >= max ? 'maxed' : done >= min ? 'sufficient' : done > 0 ? 'building' : 'empty',
      };
    });

    // ── Neglected Muscle Nudges (< min sets this week AND not trained in 5+ days) ─
    const neglectedMuscles = Object.entries(weeklyVolumeStatus)
      .filter(([muscle, v]) => {
        if (v.status === 'maxed' || v.status === 'sufficient') return false;
        const lastTrained = muscleLastTrained[muscle];
        if (!lastTrained) return totalWorkouts >= 3; // no history at all, only nudge if user has data
        return lastTrained < fiveDaysAgo;
      })
      .sort((a, b) => a[1].sets - b[1].sets) // most neglected first
      .slice(0, 3)
      .map(([muscle]) => muscle);

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
        muscleDistribution,
        weeklyVolumeStatus,
        neglectedMuscles,
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

    // Detect PRs by comparing new workout against all prior bests
    const priorWorkouts = await Workout.find({
      user: req.userId,
      _id: { $ne: workout._id },
    }).select('exercises.name exercises.sets.weight exercises.sets.reps').lean();

    const allTimeBest = {}; // exerciseName -> { weight, est1RM }
    for (const w of priorWorkouts) {
      for (const ex of w.exercises || []) {
        if (!ex.name) continue;
        const key = ex.name.toLowerCase().trim();
        if (!allTimeBest[key]) allTimeBest[key] = { weight: 0, est1RM: 0 };
        for (const s of ex.sets || []) {
          const w_ = s.weight || 0;
          const r = s.reps || 0;
          if (w_ > allTimeBest[key].weight) allTimeBest[key].weight = w_;
          const e1 = r > 0 ? w_ * (1 + r / 30) : 0;
          if (e1 > allTimeBest[key].est1RM) allTimeBest[key].est1RM = e1;
        }
      }
    }

    const prsHit = [];
    for (const ex of workout.exercises || []) {
      if (!ex.name) continue;
      const key = ex.name.toLowerCase().trim();
      const prior = allTimeBest[key] || { weight: 0, est1RM: 0 };
      let newBestWeight = 0;
      let newBestEst1RM = 0;
      for (const s of ex.sets || []) {
        const w_ = s.weight || 0;
        const r = s.reps || 0;
        if (w_ > newBestWeight) newBestWeight = w_;
        const e1 = r > 0 ? w_ * (1 + r / 30) : 0;
        if (e1 > newBestEst1RM) newBestEst1RM = e1;
      }
      if (newBestWeight > prior.weight && newBestWeight > 0) {
        prsHit.push({
          exercise: ex.name,
          type: 'weight',
          newBest: Math.round(newBestWeight * 10) / 10,
          previous: Math.round(prior.weight * 10) / 10,
        });
      } else if (newBestEst1RM > prior.est1RM * 1.01 && newBestEst1RM > 0 && prior.est1RM > 0) {
        prsHit.push({
          exercise: ex.name,
          type: 'estimated_1rm',
          newBest: Math.round(newBestEst1RM),
          previous: Math.round(prior.est1RM),
        });
      }
    }

    triggerDailyLifeStateRecompute({ userId: req.userId, date: workout.date, reason: 'gymRoutes create workout' });

    // ── Proactive progression suggestions ─────────────────────────────────────
    // Fires per exercise when: done 3+ sessions, weight held for exactly 2 sessions
    // (not 3+ — stagnation engine handles those), readiness >= 6.
    // This tells the user "you're ready to add weight NEXT session" — not a warning, a nudge.
    const progressionSuggestions = [];

    // Fetch recent workouts for progression + deload analysis (reuse priorWorkouts data)
    const recentWorkoutsForAnalysis = await Workout.find({
      user: req.userId,
      _id: { $ne: workout._id },
    }).sort({ date: -1 }).limit(12).lean();

    // Readiness check once — gate all suggestions on recovery
    const readinessForProg = await calculateReadiness(req.userId).catch(() => null);
    const readinessScore = readinessForProg?.readinessScore ?? 7;

    if (readinessScore >= 6) {
      for (const ex of workout.exercises || []) {
        if (!ex.name) continue;
        const key = ex.name.toLowerCase().trim();

        const exHistory = recentWorkoutsForAnalysis
          .flatMap(w => (w.exercises || [])
            .filter(e => e.name?.toLowerCase().trim() === key)
            .map(e => ({
              maxWeight: Math.max(0, ...(e.sets || []).map(s => s.weight || 0)),
            }))
          )
          .filter(s => s.maxWeight > 0)
          .slice(0, 3);

        if (exHistory.length < 2) continue;

        const [s1, s2] = exHistory;
        // Only suggest when held for exactly 2 sessions — 3+ is stagnation, not progression readiness
        const heldExactlyTwice = s1.maxWeight === s2.maxWeight && (exHistory[2]?.maxWeight !== s1.maxWeight);
        if (!heldExactlyTwice) continue;

        const currentWeight = s1.maxWeight;
        const isCompound = (ex.metadata?.type === 'compound') || currentWeight >= 40;
        const increment = isCompound ? 2.5 : 1.25;

        progressionSuggestions.push({
          exercise: ex.name,
          currentWeight,
          suggestedWeight: currentWeight + increment,
          reason: `You've hit ${currentWeight}kg on ${ex.name} for 2 sessions — your body has adapted. Next session, try ${currentWeight + increment}kg.`,
        });
      }
    }

    // ── Deload auto-detection ─────────────────────────────────────────────────
    // If this workout's volume is < 65% of the user's 4-week average, it looks like
    // a deload session. Auto-stamp lastDeloadDate so the AI coach resets the deload clock.
    let deloadStamped = false;
    if (recentWorkoutsForAnalysis.length >= 4) {
      const calcVol = (w) => (w.exercises || []).reduce((sum, ex) =>
        sum + (ex.sets || []).reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0), 0);

      const thisVolume = calcVol(workout);
      const recentVols = recentWorkoutsForAnalysis.slice(0, 8).map(w => calcVol(w)).filter(v => v > 0);
      const trailingAvg = recentVols.reduce((a, b) => a + b, 0) / Math.max(1, recentVols.length);

      if (thisVolume > 0 && trailingAvg > 0 && thisVolume < trailingAvg * 0.65) {
        await require('../models/User').updateOne(
          { _id: req.userId },
          { $set: { 'biologicalProfile.lastDeloadDate': workout.date } }
        );
        deloadStamped = true;
      }
    }

    res.status(201).json({ workout, prsHit, progressionSuggestions, deloadStamped });
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

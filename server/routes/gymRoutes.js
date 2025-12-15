const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// Workout Schema
const WorkoutSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    date: { type: Date, default: Date.now },
    duration: Number, // in seconds
    exercises: [
      {
        name: String,
        muscleGroup: String,
        sets: [
          {
            weight: Number,
            reps: Number,
            completed: { type: Boolean, default: true },
          },
        ],
      },
    ],
    notes: String,
  },
  { timestamps: true }
);

const Workout = mongoose.model('Workout', WorkoutSchema);

// Get all workouts
router.get('/workouts', async (req, res) => {
  try {
    const workouts = await Workout.find().sort({ date: -1 }).limit(100);
    res.json(workouts);
  } catch (err) {
    console.error('Failed to fetch workouts:', err);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Get workout by ID
router.get('/workouts/:id', async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json(workout);
  } catch (err) {
    console.error('Failed to fetch workout:', err);
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

// Create workout
router.post('/workouts', async (req, res) => {
  try {
    const { name, exercises, duration, date, notes } = req.body;

    const workout = await Workout.create({
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

// Update workout
router.put('/workouts/:id', async (req, res) => {
  try {
    const workout = await Workout.findByIdAndUpdate(
      req.params.id,
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

// Delete workout
router.delete('/workouts/:id', async (req, res) => {
  try {
    const workout = await Workout.findByIdAndDelete(req.params.id);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json({ message: 'Workout deleted' });
  } catch (err) {
    console.error('Failed to delete workout:', err);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// Get workout stats
router.get('/stats', async (req, res) => {
  try {
    const workouts = await Workout.find().sort({ date: -1 });
    
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

// Get workouts by date range (for calendar)
router.get('/workouts/range/:start/:end', async (req, res) => {
  try {
    const { start, end } = req.params;
    const workouts = await Workout.find({
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

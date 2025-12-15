const express = require('express');
const jwt = require('jsonwebtoken');
const { Habit, HabitLog } = require('../models/Habit');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.use(authMiddleware);

// Helper to normalize date to start of day
function normalizeDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get all habits for user
router.get('/', async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.userId, isActive: true }).sort({ createdAt: -1 });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new habit
router.post('/', async (req, res) => {
  try {
    const habit = new Habit({
      user: req.userId,
      ...req.body,
    });
    await habit.save();
    res.status(201).json(habit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a habit
router.put('/:id', async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    res.json(habit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete (archive) a habit
router.delete('/:id', async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isActive: false },
      { new: true }
    );
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get habit logs for a date range
router.get('/logs', async (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = normalizeDate(start || new Date());
    const endDate = end ? normalizeDate(end) : new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const logs = await HabitLog.find({
      user: req.userId,
      date: { $gte: startDate, $lt: endDate },
    }).populate('habit');

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get logs for calendar view (with habit info)
router.get('/logs/range', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates required' });
    }

    const logs = await HabitLog.find({
      user: req.userId,
      date: { $gte: new Date(start), $lte: new Date(end) },
      completed: true,
    }).populate('habit', 'name icon color category');

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle habit completion for a date
router.post('/toggle', async (req, res) => {
  try {
    const { habitId, date, completed, value, notes } = req.body;
    const normalizedDate = normalizeDate(date);

    let log = await HabitLog.findOne({
      user: req.userId,
      habit: habitId,
      date: normalizedDate,
    });

    if (log) {
      if (completed !== undefined) log.completed = completed;
      else log.completed = !log.completed;
      if (value !== undefined) log.value = value;
      if (notes !== undefined) log.notes = notes;
      await log.save();
    } else {
      log = new HabitLog({
        user: req.userId,
        habit: habitId,
        date: normalizedDate,
        completed: completed !== undefined ? completed : true,
        value: value || 1,
        notes: notes || '',
      });
      await log.save();
    }

    // Update streak
    await updateStreak(habitId);

    // Populate habit info before returning
    await log.populate('habit');
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update habit note for a date (creates log if doesn't exist)
router.post('/note', async (req, res) => {
  try {
    const { habitId, date, notes } = req.body;
    const normalizedDate = normalizeDate(date);

    let log = await HabitLog.findOne({
      user: req.userId,
      habit: habitId,
      date: normalizedDate,
    });

    if (log) {
      log.notes = notes;
      await log.save();
    } else {
      log = new HabitLog({
        user: req.userId,
        habit: habitId,
        date: normalizedDate,
        completed: false,
        value: 0,
        notes: notes,
      });
      await log.save();
    }

    await log.populate('habit');
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get week summary (for week-at-a-glance view)
router.get('/week', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    // Get start of week (Monday)
    const startOfWeek = new Date(targetDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get end of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Get all active habits
    const habits = await Habit.find({ user: req.userId, isActive: true });

    // Get all logs for the week
    const logs = await HabitLog.find({
      user: req.userId,
      date: { $gte: startOfWeek, $lt: endOfWeek },
    });

    // Build week data
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(dayDate.getDate() + i);
      
      const dayLogs = logs.filter(l => {
        const logDate = new Date(l.date);
        return logDate.toDateString() === dayDate.toDateString();
      });

      weekDays.push({
        date: dayDate.toISOString(),
        dayName: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: dayDate.getDate(),
        isToday: dayDate.toDateString() === new Date().toDateString(),
        habits: habits.map(h => {
          const log = dayLogs.find(l => l.habit.toString() === h._id.toString());
          return {
            habitId: h._id,
            name: h.name,
            icon: h.icon,
            color: h.color,
            completed: log?.completed || false,
            value: log?.value || 0,
            target: h.targetPerDay,
          };
        }),
        completedCount: dayLogs.filter(l => l.completed).length,
        totalHabits: habits.length,
      });
    }

    // Calculate week stats
    const totalPossible = habits.length * 7;
    const totalCompleted = logs.filter(l => l.completed).length;

    res.json({
      weekStart: startOfWeek.toISOString(),
      weekEnd: endOfWeek.toISOString(),
      days: weekDays,
      stats: {
        totalHabits: habits.length,
        totalCompleted,
        totalPossible,
        completionRate: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to update streak
async function updateStreak(habitId) {
  try {
    const habit = await Habit.findById(habitId);
    if (!habit) return;

    // Get all completed logs sorted by date descending
    const logs = await HabitLog.find({
      habit: habitId,
      completed: true,
    }).sort({ date: -1 });

    if (logs.length === 0) {
      habit.streak = 0;
      await habit.save();
      return;
    }

    // Calculate current streak
    let streak = 0;
    let currentDate = normalizeDate(new Date());
    
    // Check if today or yesterday has a log (to count ongoing streak)
    const todayLog = logs.find(l => normalizeDate(l.date).getTime() === currentDate.getTime());
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayLog = logs.find(l => normalizeDate(l.date).getTime() === yesterday.getTime());

    if (!todayLog && !yesterdayLog) {
      habit.streak = 0;
      await habit.save();
      return;
    }

    // Start counting from most recent completed day
    let checkDate = todayLog ? currentDate : yesterday;
    
    for (const log of logs) {
      const logDate = normalizeDate(log.date);
      if (logDate.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (logDate.getTime() < checkDate.getTime()) {
        break;
      }
    }

    habit.streak = streak;
    if (streak > habit.longestStreak) {
      habit.longestStreak = streak;
    }
    await habit.save();
  } catch (err) {
    console.error('Error updating streak:', err);
  }
}

// Get habit stats
router.get('/stats', async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.userId, isActive: true });
    
    // Get logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const logs = await HabitLog.find({
      user: req.userId,
      date: { $gte: thirtyDaysAgo },
      completed: true,
    });

    const totalStreak = habits.reduce((sum, h) => sum + h.streak, 0);
    const longestStreak = Math.max(...habits.map(h => h.longestStreak), 0);

    res.json({
      totalHabits: habits.length,
      totalCompletionsLast30Days: logs.length,
      averagePerDay: logs.length / 30,
      currentTotalStreak: totalStreak,
      longestStreak,
      habits: habits.map(h => ({
        id: h._id,
        name: h.name,
        streak: h.streak,
        longestStreak: h.longestStreak,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get detailed analytics for charts
router.get('/analytics', async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.userId, isActive: true });
    
    // Get logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const logs = await HabitLog.find({
      user: req.userId,
      date: { $gte: thirtyDaysAgo },
    }).populate('habit', 'name color category');

    // Daily completion data for line chart (last 30 days)
    const dailyData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayLogs = logs.filter(l => {
        const logDate = new Date(l.date);
        return logDate >= date && logDate < nextDate;
      });
      
      const completed = dayLogs.filter(l => l.completed).length;
      const total = habits.length;
      
      dailyData.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
        completed,
        total,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    }

    // Weekly summary for bar chart (last 4 weeks)
    const weeklyData = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (w * 7 + weekStart.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const weekLogs = logs.filter(l => {
        const logDate = new Date(l.date);
        return logDate >= weekStart && logDate < weekEnd && l.completed;
      });
      
      const possibleCompletions = habits.length * 7;
      
      weeklyData.push({
        week: `Week ${4 - w}`,
        weekLabel: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: weekLogs.length,
        possible: possibleCompletions,
        rate: possibleCompletions > 0 ? Math.round((weekLogs.length / possibleCompletions) * 100) : 0,
      });
    }

    // Per-habit completion rates
    const habitStats = habits.map(habit => {
      const habitLogs = logs.filter(l => 
        l.habit && l.habit._id.toString() === habit._id.toString()
      );
      const completed = habitLogs.filter(l => l.completed).length;
      
      return {
        id: habit._id,
        name: habit.name,
        color: habit.color,
        category: habit.category,
        completed,
        total: 30,
        rate: Math.round((completed / 30) * 100),
        streak: habit.streak,
        longestStreak: habit.longestStreak,
      };
    });

    // Category breakdown
    const categoryStats = {};
    habits.forEach(h => {
      if (!categoryStats[h.category]) {
        categoryStats[h.category] = { count: 0, completions: 0 };
      }
      categoryStats[h.category].count++;
    });
    
    logs.filter(l => l.completed && l.habit).forEach(l => {
      const cat = l.habit.category;
      if (categoryStats[cat]) {
        categoryStats[cat].completions++;
      }
    });

    const categoryData = Object.entries(categoryStats).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      habits: data.count,
      completions: data.completions,
      rate: data.count > 0 ? Math.round((data.completions / (data.count * 30)) * 100) : 0,
    }));

    // Heatmap data (last 12 weeks)
    const heatmapData = [];
    for (let i = 83; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayLogs = logs.filter(l => {
        const logDate = new Date(l.date);
        return logDate >= date && logDate < nextDate && l.completed;
      });
      
      heatmapData.push({
        date: date.toISOString().split('T')[0],
        count: dayLogs.length,
        day: date.getDay(),
        week: Math.floor(i / 7),
      });
    }

    // Overall stats
    const totalCompletions = logs.filter(l => l.completed).length;
    const totalPossible = habits.length * 30;
    const overallRate = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;
    const bestDay = dailyData.reduce((best, day) => day.rate > best.rate ? day : best, dailyData[0]);
    const currentStreak = habits.reduce((sum, h) => sum + h.streak, 0);
    const longestStreak = Math.max(...habits.map(h => h.longestStreak), 0);

    res.json({
      dailyData,
      weeklyData,
      habitStats,
      categoryData,
      heatmapData: heatmapData.slice(-30), // Last 30 days for simpler heatmap
      summary: {
        totalHabits: habits.length,
        totalCompletions,
        overallRate,
        bestDay: bestDay?.date,
        bestDayRate: bestDay?.rate || 0,
        currentStreak,
        longestStreak,
        averagePerDay: (totalCompletions / 30).toFixed(1),
      },
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

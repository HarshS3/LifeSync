const express = require('express');
const jwt = require('jsonwebtoken');
const { LongTermGoal, LongTermGoalLog } = require('../models/LongTermGoal');

const router = express.Router();

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const secret = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all long term goals
router.get('/', auth, async (req, res) => {
  try {
    const goals = await LongTermGoal.find({ user: req.userId, isActive: true }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) {
    console.error('Get goals error:', err);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Create new goal
router.post('/', auth, async (req, res) => {
  try {
    const goal = await LongTermGoal.create({
      ...req.body,
      user: req.userId,
    });
    res.status(201).json(goal);
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Update goal
router.put('/:id', auth, async (req, res) => {
  try {
    const goal = await LongTermGoal.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json(goal);
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Delete/archive goal
router.delete('/:id', auth, async (req, res) => {
  try {
    await LongTermGoal.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isActive: false }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Delete goal error:', err);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// Log daily entry
router.post('/log', auth, async (req, res) => {
  try {
    const { goalId, date, status, ...logData } = req.body;
    
    // Find or create log for this date
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);
    
    let log = await LongTermGoalLog.findOneAndUpdate(
      { user: req.userId, goal: goalId, date: logDate },
      { 
        user: req.userId, 
        goal: goalId, 
        date: logDate, 
        status,
        ...logData 
      },
      { upsert: true, new: true }
    );

    // Update goal stats
    const goal = await LongTermGoal.findById(goalId);
    if (goal) {
      if (status === 'relapse') {
        // Reset streak on relapse
        goal.currentStreak = 0;
        goal.totalRelapses += 1;
      } else if (status === 'success' || status === 'partial') {
        // Increment streak
        goal.currentStreak += 1;
        if (goal.currentStreak > goal.longestStreak) {
          goal.longestStreak = goal.currentStreak;
        }
      }
      await goal.save();
      log = log.toObject();
      log.goal = goal;
    }

    res.json(log);
  } catch (err) {
    console.error('Log entry error:', err);
    res.status(500).json({ error: 'Failed to log entry' });
  }
});

// Get logs for a goal (with date range)
router.get('/logs/:goalId', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = { user: req.userId, goal: req.params.goalId };
    
    if (start || end) {
      query.date = {};
      if (start) query.date.$gte = new Date(start);
      if (end) query.date.$lte = new Date(end);
    }
    
    const logs = await LongTermGoalLog.find(query).sort({ date: -1 }).limit(90);
    res.json(logs);
  } catch (err) {
    console.error('Get logs error:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get today's logs for all goals
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const logs = await LongTermGoalLog.find({
      user: req.userId,
      date: { $gte: today, $lt: tomorrow },
    }).populate('goal');
    
    res.json(logs);
  } catch (err) {
    console.error('Get today logs error:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get analytics for a goal
router.get('/analytics/:goalId', auth, async (req, res) => {
  try {
    const goal = await LongTermGoal.findOne({ _id: req.params.goalId, user: req.userId });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const logs = await LongTermGoalLog.find({ 
      user: req.userId, 
      goal: req.params.goalId 
    }).sort({ date: -1 });

    // Calculate stats
    const totalDays = logs.length;
    const successDays = logs.filter(l => l.status === 'success').length;
    const relapseDays = logs.filter(l => l.status === 'relapse').length;
    const partialDays = logs.filter(l => l.status === 'partial').length;
    const totalRelapseCount = logs.reduce((sum, l) => sum + (l.relapseCount || 0), 0);
    const avgUrgeLevel = logs.length > 0 
      ? logs.reduce((sum, l) => sum + (l.urgeLevel || 0), 0) / logs.filter(l => l.urgeLevel).length 
      : 0;

    // Weekly breakdown (last 12 weeks)
    const weeklyData = [];
    for (let i = 0; i < 12; i++) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      
      const weekLogs = logs.filter(l => {
        const d = new Date(l.date);
        return d >= weekStart && d < weekEnd;
      });
      
      weeklyData.push({
        week: i + 1,
        success: weekLogs.filter(l => l.status === 'success').length,
        relapse: weekLogs.filter(l => l.status === 'relapse').length,
        partial: weekLogs.filter(l => l.status === 'partial').length,
      });
    }

    // Common triggers
    const triggers = {};
    logs.filter(l => l.trigger).forEach(l => {
      triggers[l.trigger] = (triggers[l.trigger] || 0) + 1;
    });
    const topTriggers = Object.entries(triggers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([trigger, count]) => ({ trigger, count }));

    res.json({
      goal,
      stats: {
        totalDays,
        successDays,
        relapseDays,
        partialDays,
        successRate: totalDays > 0 ? Math.round((successDays / totalDays) * 100) : 0,
        totalRelapseCount,
        avgUrgeLevel: Math.round(avgUrgeLevel * 10) / 10,
        currentStreak: goal.currentStreak,
        longestStreak: goal.longestStreak,
        daysToTarget: Math.max(0, goal.targetDays - goal.currentStreak),
        progress: Math.min(100, Math.round((goal.currentStreak / goal.targetDays) * 100)),
      },
      weeklyData: weeklyData.reverse(),
      topTriggers,
      recentLogs: logs.slice(0, 14),
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;

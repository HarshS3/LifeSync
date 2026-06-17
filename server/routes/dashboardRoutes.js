const express = require('express');
const { FitnessLog, NutritionLog, MentalLog } = require('../models/Logs');
const Workout = require('../models/Workout');
const DailyLifeState = require('../models/DailyLifeState');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const { selectTopInsights } = require('../services/insightSelector/crossDomainInsightSelector');
const { weekKeyFromDate, scoreContract } = require('../services/insights/weeklyContractService');
const WeeklyContract = require('../models/WeeklyContract');

const router = express.Router();

router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all needed data in parallel
    const currentWeekKey = weekKeyFromDate(today);
    const prevWeekKey = (() => {
      const [y, w] = currentWeekKey.split('-W').map(Number);
      const pw = w - 1 < 1 ? 52 : w - 1;
      const py = w - 1 < 1 ? y - 1 : y;
      return `${py}-W${String(pw).padStart(2, '0')}`;
    })();

    const [fitness, mental, nutrition, gymWorkouts, totalWorkouts, dls, user, topInsights, weeklyContract] = await Promise.all([
      FitnessLog.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: -1 }).lean(),
      MentalLog.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: -1 }).lean(),
      NutritionLog.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: -1 }).lean(),
      Workout.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: -1 }).lean(),
      Workout.countDocuments({ user: userId }),
      DailyLifeState.findOne({ user: userId, dayKey: dayKeyFromDate(today) }).lean(),
      User.findById(userId).select('weight biologicalProfile').lean(),
      selectTopInsights(userId, { limit: 3 }).catch(err => {
        console.warn('[DashboardSummary] selectTopInsights failed:', err.message);
        return [];
      }),
      // Get current week contract, or try to score last week's if it's Monday
      (async () => {
        try {
          // If today is Mon-Thu, show last week's scored contract; Fri-Sun show current
          const dayOfWeek = today.getDay();
          const lookupKey = dayOfWeek >= 1 && dayOfWeek <= 4 ? prevWeekKey : currentWeekKey;
          let contract = await WeeklyContract.findOne({ user: userId, weekKey: lookupKey }).lean();
          // Auto-score last week's contract on Monday if not yet scored
          if (!contract?.score && dayOfWeek === 1) {
            contract = await scoreContract(userId, prevWeekKey).catch(() => null);
          }
          return contract;
        } catch { return null; }
      })(),
    ]);

    // Calculate Weekly Stats (last 7 days)
    const recentMental = mental.filter(m => new Date(m.date) > weekAgo);
    const recentFitness = fitness.filter(f => new Date(f.date) > weekAgo);
    const recentGym = gymWorkouts.filter(w => new Date(w.date) > weekAgo);

    const avgFrom = (arr, key) => {
      const nums = arr.map(m => m[key]).filter(v => typeof v === 'number' && Number.isFinite(v));
      if (!nums.length) return null;
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    };

    const avgEnergy = avgFrom(recentMental, 'energyLevel');
    
    // Mood score calculation (similar to frontend logic)
    const moodScores = recentMental.map(m => {
      if (m.moodScore != null) return m.moodScore;
      if (m.mood) {
        const mStr = String(m.mood).toLowerCase();
        if (mStr === 'very-low') return 2;
        if (mStr === 'low') return 4;
        if (mStr === 'neutral') return 5;
        if (mStr === 'good') return 7;
        if (mStr === 'great') return 9;
      }
      return null;
    }).filter(v => v != null);
    
    const avgMood = moodScores.length ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length : null;
    const avgSleep = avgFrom(recentMental, 'sleepHours');

    // Calculate Streak (30 days)
    let streak = 0;
    const todayCheck = new Date(today);
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(todayCheck);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toDateString();
      const hasLog = mental.some(l => new Date(l.date).toDateString() === dateStr);
      if (hasLog) streak++;
      else if (i > 0) break;
    }

    // Today's check-in status
    const todayStr = today.toDateString();
    const todayLog = mental.find(m => new Date(m.date).toDateString() === todayStr);

    res.json({
      stats: {
        avgEnergy: avgEnergy == null ? '—' : String(Math.round(avgEnergy)),
        avgMood: avgMood == null ? '—' : String(Math.round(avgMood)),
        avgSleep: avgSleep == null ? '—' : avgSleep.toFixed(1),
        workouts: recentGym.length + recentFitness.length, // Weekly count
        totalWorkouts, // Absolute total
        streak,
        weight: user?.biologicalProfile?.weightKg || user?.weight || '—',
      },
      today: todayLog ? {
        energy: todayLog.energyLevel || 5,
        mood: todayLog.moodScore || 5,
        bodyFeel: todayLog.bodyFeel || 5,
        hunger: todayLog.hungerLevel || 5,
        sleep: todayLog.sleepHours || 7,
      } : null,
      hasCheckedIn: !!todayLog,
      dailyLifeState: dls || null,
      stateReflection: dls?.lastReflection || null,
      topInsights: topInsights || [],
      weeklyContract: weeklyContract ? {
        weekKey: weeklyContract.weekKey,
        status: weeklyContract.status,
        score: weeklyContract.score ?? null,
        targets: weeklyContract.targets || [],
      } : null,
      // Include limited logs for cache compatibility if needed
      logs: {
        fitness: fitness.slice(0, 10),
        mental: mental.slice(0, 10),
        nutrition: nutrition.slice(0, 10),
        workouts: gymWorkouts.slice(0, 10)
      }
    });
  } catch (err) {
    console.error('[DashboardSummary] Error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

function dayKeyFromDate(d) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = router;

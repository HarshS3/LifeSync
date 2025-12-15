const express = require('express');
const { FitnessLog, NutritionLog, MentalLog, MemorySummary } = require('../models/Logs');
const { Habit, HabitLog } = require('../models/Habit');
const { WardrobeItem } = require('../models/Wardrobe');
const User = require('../models/User');
const { generateLLMReply } = require('../aiClient');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Helper to extract user from token (optional auth)
const getUserFromToken = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';
    const decoded = jwt.verify(token, secret);
    // Token uses userId, not id
    const user = await User.findById(decoded.userId).select('-password');
    return user;
  } catch (err) {
    console.log('[AI Auth] Token verification failed:', err.message);
    return null;
  }
};

// AI endpoint: memory-aware summary with optional LLM layer
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Get user profile if authenticated
    const user = await getUserFromToken(req);
    const userId = user?._id;
    console.log('[AI Chat] User found:', user ? `${user.name} (${user.email}), diet: ${user.dietType}` : 'NO USER - token missing or invalid');

    // Fetch recent logs - filter by user if authenticated
    const userFilter = userId ? { user: userId } : {};
    
    // Get date range for habits (last 7 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [fitness, nutrition, mental, habits, habitLogs, wardrobeItems] = await Promise.all([
      FitnessLog.find(userFilter).sort({ date: -1 }).limit(10),
      NutritionLog.find(userFilter).sort({ date: -1 }).limit(10),
      MentalLog.find(userFilter).sort({ date: -1 }).limit(10),
      userId ? Habit.find({ user: userId, isActive: true }) : [],
      userId ? HabitLog.find({ 
        user: userId, 
        date: { $gte: weekAgo, $lte: today }
      }).populate('habit', 'name category') : [],
      userId ? WardrobeItem.find({ user: userId }).limit(50) : [],
    ]);

    const latestMental = mental[0];
    const latestFitness = fitness[0];
    const latestNutrition = nutrition[0];

    // Build habit context
    const habitContext = habits.length > 0 ? (() => {
      // Calculate completion stats for this week
      const completedLogs = habitLogs.filter(l => l.completed);
      const totalPossible = habits.length * 7;
      const completionRate = totalPossible > 0 ? Math.round((completedLogs.length / totalPossible) * 100) : 0;
      
      // Get habits with best and worst streaks
      const sortedByStreak = [...habits].sort((a, b) => b.streak - a.streak);
      const topStreaks = sortedByStreak.slice(0, 3).filter(h => h.streak > 0);
      const needsWork = sortedByStreak.slice(-3).filter(h => h.streak === 0);
      
      // Get today's habit status
      const todayStr = today.toISOString().split('T')[0];
      const todayLogs = habitLogs.filter(l => 
        new Date(l.date).toISOString().split('T')[0] === todayStr
      );
      const completedToday = todayLogs.filter(l => l.completed).length;
      
      // Get recent habit notes
      const recentNotes = habitLogs
        .filter(l => l.notes && l.notes.trim())
        .slice(0, 3)
        .map(l => `${l.habit?.name || 'Habit'}: "${l.notes}"`);

      return [
        `Active habits: ${habits.map(h => h.name).join(', ')}.`,
        `Weekly habit completion: ${completionRate}% (${completedLogs.length}/${totalPossible}).`,
        `Today: ${completedToday}/${habits.length} habits done.`,
        topStreaks.length ? `Best streaks: ${topStreaks.map(h => `${h.name} (${h.streak} days)`).join(', ')}.` : null,
        needsWork.length ? `Needs attention (no streak): ${needsWork.map(h => h.name).join(', ')}.` : null,
        recentNotes.length ? `Recent habit notes: ${recentNotes.join('; ')}.` : null,
      ].filter(Boolean).join(' ');
    })() : '';

    // Build nutrition context
    const nutritionContext = latestNutrition ? (() => {
      const totals = latestNutrition.dailyTotals || {};
      return `Today's nutrition: ${totals.calories || 0} cal, ${totals.protein || 0}g protein, ${totals.carbs || 0}g carbs, ${totals.fat || 0}g fat. Water: ${latestNutrition.waterIntake || 0}ml.`;
    })() : '';

    // Build user profile context
    const profileContext = user ? [
      `User: ${user.name}, Age: ${user.age || 'not set'}, Gender: ${user.gender || 'not set'}.`,
      user.dietType ? `Diet type: ${user.dietType.toUpperCase()} (STRICT - must follow this diet).` : null,
      user.avoidFoods?.length ? `Foods to AVOID: ${user.avoidFoods.join(', ')}.` : null,
      user.allergies?.length ? `Allergies: ${user.allergies.join(', ')}.` : null,
      user.conditions?.length ? `Health conditions: ${user.conditions.join(', ')}.` : null,
      user.medications?.length ? `Medications: ${user.medications.map(m => m.name).join(', ')}.` : null,
      user.trainingGoals?.length ? `Training goals: ${user.trainingGoals.join(', ')}.` : null,
      user.preferredWorkouts?.length ? `Preferred workouts: ${user.preferredWorkouts.join(', ')}.` : null,
      user.chronotype ? `Chronotype: ${user.chronotype}, Energy peaks in ${user.energyPeakTime || 'morning'}.` : null,
    ].filter(Boolean).join(' ') : '';

    // Build wellness context from mental log
    const wellnessContext = latestMental ? [
      `Wellness check-in: mood ${latestMental.mood}, stress ${latestMental.stressLevel}/10, energy ${latestMental.energyLevel}/10.`,
      latestMental.sleepHours ? `Sleep: ${latestMental.sleepHours} hours.` : null,
      latestMental.bodyFeel ? `Body feel: ${latestMental.bodyFeel}/10.` : null,
      latestMental.medsTaken?.length ? `Medications taken: ${latestMental.medsTaken.join(', ')}.` : null,
      latestMental.journalSnippet ? `Journal: "${latestMental.journalSnippet.slice(0, 100)}..."` : null,
      latestMental.notes ? `Wellness notes: "${latestMental.notes.slice(0, 150)}"` : null,
    ].filter(Boolean).join(' ') : '';

    // Build fitness context
    const fitnessContext = latestFitness 
      ? `Last workout: ${latestFitness.focus || latestFitness.type}, intensity ${latestFitness.intensity}/10, fatigue ${latestFitness.fatigue}/10.${latestFitness.notes ? ` Notes: ${latestFitness.notes}` : ''}`
      : '';

    // Build wardrobe context (for style questions)
    const wardrobeContext = wardrobeItems.length > 0 ? (() => {
      const categories = {};
      wardrobeItems.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
      });
      const favorites = wardrobeItems.filter(i => i.favorite).map(i => i.name).slice(0, 5);
      return [
        `Wardrobe: ${wardrobeItems.length} items.`,
        `Categories: ${Object.entries(categories).map(([k, v]) => `${v} ${k}`).join(', ')}.`,
        favorites.length ? `Favorites: ${favorites.join(', ')}.` : null,
      ].filter(Boolean).join(' ');
    })() : '';

    const memoryContext = [
      // Profile first - most important for personalization
      profileContext,
      // Current state
      wellnessContext,
      nutritionContext,
      fitnessContext,
      habitContext,
      wardrobeContext,
      // Summary counts
      `Data available: ${fitness.length} workouts, ${nutrition.length} nutrition logs, ${mental.length} wellness logs, ${habits.length} active habits, ${wardrobeItems.length} wardrobe items.`,
    ]
      .filter(Boolean)
      .join(' ');

    let llmReply = await generateLLMReply({ message, memoryContext });

    if (!llmReply) {
      llmReply =
        'This is a memory-aware LifeSync response based on your recent patterns. ' +
        (latestMental
          ? `Your last recorded mood was ${latestMental.mood} with stress level ${latestMental.stressLevel}. `
          : '') +
        (latestFitness
          ? `Your recent workout focus was ${latestFitness.focus || latestFitness.type} with perceived fatigue ${latestFitness.fatigue}. `
          : '') +
        'As we evolve the AI layer, this response will become more personalized and explanatory.';
    }

    const response = {
      message,
      reply: llmReply,
      memorySnapshot: {
        fitnessCount: fitness.length,
        nutritionCount: nutrition.length,
        mentalCount: mental.length,
        habitCount: habits.length,
        habitLogsCount: habitLogs.length,
      },
    };

    // Store a lightweight memory summary stub (non-blocking) - skipped for MVP without auth
    // TODO: Re-enable with proper user context
    // try {
    //   await MemorySummary.create({
    //     user: userId,
    //     periodLabel: 'recent-interaction',
    //     summary: `User asked: "${message.slice(0, 120)}"...`,
    //     tags: ['interaction', 'mvp'],
    //   });
    // } catch (e) {
    //   console.error('Failed to store memory summary', e);
    // }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI chat failed' });
  }
});

module.exports = router;

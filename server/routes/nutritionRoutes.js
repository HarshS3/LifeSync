const express = require('express');
const jwt = require('jsonwebtoken');
const { NutritionLog } = require('../models/Logs');
const User = require('../models/User');
const { searchFoods } = require('../services/nutritionProvider');

const router = express.Router();
const JWT_SECRET = 'lifesync-secret-key-change-in-production';

// Auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all nutrition logs for user
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await NutritionLog.find({ user: req.userId })
      .sort({ date: -1 })
      .limit(60);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition logs' });
  }
});

// Get nutrition log for specific date
router.get('/logs/date/:date', authMiddleware, async (req, res) => {
  try {
    const startDate = new Date(req.params.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    let log = await NutritionLog.findOne({
      user: req.userId,
      date: { $gte: startDate, $lt: endDate },
    });

    if (!log) {
      // Return empty structure for the day
      log = {
        date: startDate,
        meals: [],
        waterIntake: 0,
        dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
      };
    }

    res.json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition log' });
  }
});

// Create or update nutrition log for a date
router.post('/logs', authMiddleware, async (req, res) => {
  try {
    const { date, meals, waterIntake, notes } = req.body;

    console.log('[NutritionRoutes] POST /api/nutrition/logs user', req.userId, 'date', date, 'meals', Array.isArray(meals) ? meals.length : 0)

    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);
    const endDate = new Date(logDate);
    endDate.setDate(endDate.getDate() + 1);

    // Calculate daily totals from meals
    const dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
    
    meals?.forEach(meal => {
      meal.totalCalories = 0;
      meal.totalProtein = 0;
      meal.totalCarbs = 0;
      meal.totalFat = 0;
      
      meal.foods?.forEach(food => {
        meal.totalCalories += food.calories || 0;
        meal.totalProtein += food.protein || 0;
        meal.totalCarbs += food.carbs || 0;
        meal.totalFat += food.fat || 0;
        
        dailyTotals.calories += food.calories || 0;
        dailyTotals.protein += food.protein || 0;
        dailyTotals.carbs += food.carbs || 0;
        dailyTotals.fat += food.fat || 0;
        dailyTotals.fiber += food.fiber || 0;
        dailyTotals.sugar += food.sugar || 0;
        dailyTotals.sodium += food.sodium || 0;
      });
    });

    // Find existing log or create new
    let log = await NutritionLog.findOne({
      user: req.userId,
      date: { $gte: logDate, $lt: endDate },
    });

    if (log) {
      log.meals = meals;
      log.waterIntake = waterIntake || log.waterIntake;
      log.dailyTotals = dailyTotals;
      log.notes = notes || log.notes;
      await log.save();
    } else {
      log = await NutritionLog.create({
        user: req.userId,
        date: logDate,
        meals,
        waterIntake: waterIntake || 0,
        dailyTotals,
        notes,
      });
    }

    console.log('[NutritionRoutes] Saved nutrition log for user', req.userId, 'on', logDate.toISOString(), 'totals', dailyTotals);
    res.status(201).json(log);
  } catch (err) {
    console.error('[NutritionRoutes] Error in POST /api/nutrition/logs:', err);
    res.status(500).json({ error: 'Failed to save nutrition log' });
  }
});

// Add a meal to today's log
router.post('/meals', authMiddleware, async (req, res) => {
  try {
    const { meal, date } = req.body;
    
    const logDate = new Date(date || new Date());
    logDate.setHours(0, 0, 0, 0);
    const endDate = new Date(logDate);
    endDate.setDate(endDate.getDate() + 1);

    // Calculate meal totals
    meal.totalCalories = meal.foods?.reduce((s, f) => s + (f.calories || 0), 0) || 0;
    meal.totalProtein = meal.foods?.reduce((s, f) => s + (f.protein || 0), 0) || 0;
    meal.totalCarbs = meal.foods?.reduce((s, f) => s + (f.carbs || 0), 0) || 0;
    meal.totalFat = meal.foods?.reduce((s, f) => s + (f.fat || 0), 0) || 0;

    let log = await NutritionLog.findOne({
      user: req.userId,
      date: { $gte: logDate, $lt: endDate },
    });

    if (log) {
      log.meals.push(meal);
    } else {
      log = new NutritionLog({
        user: req.userId,
        date: logDate,
        meals: [meal],
        waterIntake: 0,
        dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
      });
    }

    // Recalculate daily totals
    const dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
    log.meals.forEach(m => {
      m.foods?.forEach(food => {
        dailyTotals.calories += food.calories || 0;
        dailyTotals.protein += food.protein || 0;
        dailyTotals.carbs += food.carbs || 0;
        dailyTotals.fat += food.fat || 0;
        dailyTotals.fiber += food.fiber || 0;
        dailyTotals.sugar += food.sugar || 0;
        dailyTotals.sodium += food.sodium || 0;
      });
    });
    log.dailyTotals = dailyTotals;

    await log.save();
    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add meal' });
  }
});

// Update water intake
router.patch('/water', authMiddleware, async (req, res) => {
  try {
    const { amount, date } = req.body;
    
    const logDate = new Date(date || new Date());
    logDate.setHours(0, 0, 0, 0);
    const endDate = new Date(logDate);
    endDate.setDate(endDate.getDate() + 1);

    let log = await NutritionLog.findOne({
      user: req.userId,
      date: { $gte: logDate, $lt: endDate },
    });

    if (log) {
      log.waterIntake = (log.waterIntake || 0) + amount;
      await log.save();
    } else {
      log = await NutritionLog.create({
        user: req.userId,
        date: logDate,
        meals: [],
        waterIntake: amount,
        dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
      });
    }

    res.json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update water intake' });
  }
});

// Delete a meal
router.delete('/meals/:logId/:mealIndex', authMiddleware, async (req, res) => {
  try {
    const { logId, mealIndex } = req.params;
    
    const log = await NutritionLog.findOne({ _id: logId, user: req.userId });
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    log.meals.splice(parseInt(mealIndex), 1);

    // Recalculate daily totals
    const dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
    log.meals.forEach(m => {
      m.foods?.forEach(food => {
        dailyTotals.calories += food.calories || 0;
        dailyTotals.protein += food.protein || 0;
        dailyTotals.carbs += food.carbs || 0;
        dailyTotals.fat += food.fat || 0;
        dailyTotals.fiber += food.fiber || 0;
        dailyTotals.sugar += food.sugar || 0;
        dailyTotals.sodium += food.sodium || 0;
      });
    });
    log.dailyTotals = dailyTotals;

    await log.save();
    res.json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// Get nutrition stats (weekly/monthly averages)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const weekLogs = await NutritionLog.find({
      user: req.userId,
      date: { $gte: weekAgo },
    });

    const monthLogs = await NutritionLog.find({
      user: req.userId,
      date: { $gte: monthAgo },
    });

    // Calculate weekly averages
    const weeklyAvg = {
      calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, daysLogged: weekLogs.length,
    };
    weekLogs.forEach(log => {
      weeklyAvg.calories += log.dailyTotals?.calories || 0;
      weeklyAvg.protein += log.dailyTotals?.protein || 0;
      weeklyAvg.carbs += log.dailyTotals?.carbs || 0;
      weeklyAvg.fat += log.dailyTotals?.fat || 0;
      weeklyAvg.water += log.waterIntake || 0;
    });
    if (weekLogs.length > 0) {
      weeklyAvg.calories = Math.round(weeklyAvg.calories / weekLogs.length);
      weeklyAvg.protein = Math.round(weeklyAvg.protein / weekLogs.length);
      weeklyAvg.carbs = Math.round(weeklyAvg.carbs / weekLogs.length);
      weeklyAvg.fat = Math.round(weeklyAvg.fat / weekLogs.length);
      weeklyAvg.water = Math.round(weeklyAvg.water / weekLogs.length);
    }

    // Calculate monthly averages
    const monthlyAvg = {
      calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, daysLogged: monthLogs.length,
    };
    monthLogs.forEach(log => {
      monthlyAvg.calories += log.dailyTotals?.calories || 0;
      monthlyAvg.protein += log.dailyTotals?.protein || 0;
      monthlyAvg.carbs += log.dailyTotals?.carbs || 0;
      monthlyAvg.fat += log.dailyTotals?.fat || 0;
      monthlyAvg.water += log.waterIntake || 0;
    });
    if (monthLogs.length > 0) {
      monthlyAvg.calories = Math.round(monthlyAvg.calories / monthLogs.length);
      monthlyAvg.protein = Math.round(monthlyAvg.protein / monthLogs.length);
      monthlyAvg.carbs = Math.round(monthlyAvg.carbs / monthLogs.length);
      monthlyAvg.fat = Math.round(monthlyAvg.fat / monthLogs.length);
      monthlyAvg.water = Math.round(monthlyAvg.water / monthLogs.length);
    }

    // Meal type distribution
    const mealTypeCount = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, 'pre-workout': 0, 'post-workout': 0 };
    monthLogs.forEach(log => {
      log.meals?.forEach(meal => {
        if (meal.mealType && mealTypeCount[meal.mealType] !== undefined) {
          mealTypeCount[meal.mealType]++;
        }
      });
    });

    // Get user's calorie goal if available
    const user = await User.findById(req.userId);
    const calorieGoal = user?.calorieGoal || 2000;
    const proteinGoal = user?.proteinGoal || 150;

    res.json({
      weeklyAvg,
      monthlyAvg,
      mealTypeCount,
      goals: { calories: calorieGoal, protein: proteinGoal },
      totalMealsThisMonth: monthLogs.reduce((s, l) => s + (l.meals?.length || 0), 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition stats' });
  }
});

// Get logs for date range (for calendar)
router.get('/logs/range/:start/:end', authMiddleware, async (req, res) => {
  try {
    const start = new Date(req.params.start);
    const end = new Date(req.params.end);
    
    const logs = await NutritionLog.find({
      user: req.userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nutrition logs' });
  }
});

// Search foods using public nutrition API
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    console.log('[NutritionRoutes] /api/nutrition/search called by user', req.userId, 'with query:', q);
    const results = await searchFoods(q || '');
    console.log('[NutritionRoutes] returning', Array.isArray(results) ? results.length : 0, 'results');
    res.json(results);
  } catch (err) {
    console.error('[NutritionRoutes] search error:', err);
    res.status(500).json({ error: 'Failed to search foods' });
  }
});

module.exports = router;

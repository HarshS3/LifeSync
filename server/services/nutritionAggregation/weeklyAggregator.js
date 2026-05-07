const { NutritionLog } = require('../../models/Logs');
const User = require('../../models/User');
const { calculateDailyTargets } = require('../nutritionEngine');

/**
 * Convert Date to IST string "YYYY-MM-DD"
 */
function toISTDateString(date) {
  return new Date(date).toLocaleString('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).substring(0, 10).replace(/\//g, '-');
}

/**
 * Get US Calendar week number from date (Sunday-Saturday) in IST
 */
function getISOWeek(dateObj) {
  const istDateStr = toISTDateString(dateObj);
  const [y, m, dDay] = istDateStr.split('-').map(Number);
  const dUTC = new Date(Date.UTC(y, m - 1, dDay, 0, 0, 0));
  
  const dayNum = dUTC.getUTCDay(); // 0 is Sunday
  dUTC.setUTCDate(dUTC.getUTCDate() - dayNum); // Go to Sunday of this week

  const yearStart = new Date(Date.UTC(dUTC.getUTCFullYear(), 0, 1));
  const yearStartDay = yearStart.getUTCDay(); // 0 is Sunday
  yearStart.setUTCDate(yearStart.getUTCDate() - yearStartDay); // Go to Sunday of week 1

  const weekNum = Math.floor(((dUTC - yearStart) / 86400000) / 7) + 1;
  return { year: dUTC.getUTCFullYear(), week: weekNum };
}

/**
 * Get date range for that week exactly in IST boundaries (-5:30 offset against UTC)
 */
function getWeekDateRange(weekKey) {
  const [year, week] = weekKey.split('-W').map(Number);

  // Use pure UTC to avoid server timezone creeps
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearStartDay = yearStart.getUTCDay();

  // Find Sunday of week 1 (UTC)
  const week1Start = new Date(yearStart);
  week1Start.setUTCDate(yearStart.getUTCDate() - yearStartDay);

  // Target Week start (UTC)
  const weekStartUTC = new Date(week1Start);
  weekStartUTC.setUTCDate(week1Start.getUTCDate() + (week - 1) * 7);

  // Target Week end (UTC)
  const weekEndUTC = new Date(weekStartUTC);
  weekEndUTC.setUTCDate(weekStartUTC.getUTCDate() + 6);

  // Convert these UTC MIDNIGHT dates into exact IST Midnight dates in UTC timeline
  // IST 00:00:00 = UTC - 05:30 (Previous day 18:30:00 UTC)
  const weekStart = new Date(weekStartUTC);
  weekStart.setUTCHours(-5, -30, 0, 0);

  // IST 23:59:59.999 = UTC - 05:30 (Same day 18:29:59.999 UTC)
  const weekEnd = new Date(weekEndUTC);
  weekEnd.setUTCHours(23 - 5, 59 - 30, 59, 999);

  return { weekStart, weekEnd };
}

async function getWeekLogs(userId, weekKey) {
  const { weekStart, weekEnd } = getWeekDateRange(weekKey);

  const logs = await NutritionLog.find({
    user: userId,
    date: { $gte: weekStart, $lte: weekEnd },
  }).sort({ date: 1 });

  // Create day-indexed structure mapped tightly to IST dates
  const dailyMeals = {};
  logs.forEach(log => {
    const dayKey = toISTDateString(log.date);
    if (!dailyMeals[dayKey]) {
      dailyMeals[dayKey] = [];
    }
    dailyMeals[dayKey].push(...(log.meals || []));
  });

  return Object.entries(dailyMeals)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, meals]) => ({ date, meals }));
}

function calculateMealTotals(meals) {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    potassium: 0,
    iron: 0,
    calcium: 0,
    magnesium: 0,
    zinc: 0,
    vitaminA: 0,
    vitaminB: 0,
    vitaminB12: 0,
    vitaminC: 0,
    vitaminD: 0,
    vitaminE: 0,
    folate: 0,
    vitaminB1: 0,
    vitaminB2: 0,
    vitaminB3: 0,
    vitaminB5: 0,
    vitaminB6: 0,
    vitaminB7: 0,
    vitaminB9: 0,
    vitaminD2: 0,
    vitaminD3: 0,
    saturatedFat: 0,
    monounsaturatedFat: 0,
    polyunsaturatedFat: 0,
    cholesterol: 0,
    phosphorus: 0,
    copper: 0,
    selenium: 0,
    manganese: 0,
    omega3: 0,
  };

  meals.forEach(meal => {
    meal.foods?.forEach(food => {
      Object.keys(totals).forEach(nutrient => {
        totals[nutrient] += Number(food[nutrient] || 0);
      });
    });
  });

  return totals;
}

async function computeWeeklyMacroAggregation(userId, weekKey) {
  const user = await User.findById(userId);
  if (!user) {
    return { error: 'User not found' };
  }

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const profile = user.biologicalProfile || {};
  const effectiveProfile = {
    ...profile,
    biologicalSex: profile.biologicalSex || ((user.gender === 'male' || user.gender === 'female') ? user.gender : undefined),
    heightCm: toNum(profile.heightCm) ?? toNum(user.height),
    weightKg: toNum(profile.weightKg) ?? toNum(user.weight),
    bodyFatPercentage: toNum(profile.bodyFatPercentage) ?? toNum(user.bodyFat),
    dob: profile.dob || user.dob,
  };

  const calculated = calculateDailyTargets(effectiveProfile);
  
  const targets = {
    protein: calculated?.targets?.protein || user.dailyProteinTarget || user.preferences?.nutritionGoal?.proteinTarget || 150,
    carbs: calculated?.targets?.carbs || user.preferences?.nutritionGoal?.carbsTarget || 250,
    fat: calculated?.targets?.fat || user.preferences?.nutritionGoal?.fatTarget || 70,
    calories: calculated?.targets?.calories || user.dailyCalorieTarget || user.preferences?.nutritionGoal?.calorieTarget || 2100,
  };

  const dayLogs = await getWeekLogs(userId, weekKey);

  if (dayLogs.length === 0) {
    return {
      weekKey,
      dayCount: 0,
      error: 'No nutrition logs found for this week',
      targets,
      dailyData: {},
    };
  }

  const dailyData = {};
  let weekTotalProtein = 0,
    weekTotalCarbs = 0,
    weekTotalFat = 0,
    weekTotalCalories = 0;

  dayLogs.forEach(({ date, meals }) => {
    const totals = calculateMealTotals(meals);
    dailyData[date] = {
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      calories: Math.round(totals.calories),
      proteinPercent: Math.round((totals.protein / targets.protein) * 100),
      carbsPercent: Math.round((totals.carbs / targets.carbs) * 100),
      fatPercent: Math.round((totals.fat / targets.fat) * 100),
      caloriesPercent: Math.round((totals.calories / targets.calories) * 100),
      saturatedFat: Math.round(totals.saturatedFat || 0),
    };

    weekTotalProtein += totals.protein;
    weekTotalCarbs += totals.carbs;
    weekTotalFat += totals.fat;
    weekTotalCalories += totals.calories;
  });

  const weekAvg = {
    protein: Math.round(weekTotalProtein / dayLogs.length),
    carbs: Math.round(weekTotalCarbs / dayLogs.length),
    fat: Math.round(weekTotalFat / dayLogs.length),
    calories: Math.round(weekTotalCalories / dayLogs.length),
  };

  // Count days meeting target (95-105%)
  const daysHitTarget = {
    protein: Object.values(dailyData).filter(d => d.proteinPercent >= 95 && d.proteinPercent <= 105).length,
    carbs: Object.values(dailyData).filter(d => d.carbsPercent >= 95 && d.carbsPercent <= 105).length,
    fat: Object.values(dailyData).filter(d => d.fatPercent >= 95 && d.fatPercent <= 105).length,
  };

  // Calculate carb excess conversion to fat (4 cal/g carb, 9 cal/g fat)
  const weekCarbTarget = targets.carbs * dayLogs.length;
  const carbExcess = Math.max(0, weekTotalCarbs - weekCarbTarget);
  const fatStoredFromCarbs = Math.round((carbExcess * 4) / 9);

  // Calculate fat quality (saturated fat %)
  const weekTotalSatFat = Object.values(dailyData).reduce((sum, d) => sum + (d.saturatedFat || 0), 0);
  const satFatPercent = weekTotalFat > 0 ? Math.round((weekTotalSatFat / weekTotalFat) * 100) : 0;

  const weeklyCalorieSurplus = weekTotalCalories - targets.calories * dayLogs.length;
  const weeklyWeightPrediction = weeklyCalorieSurplus / 7700; // lbs per day avg

  return {
    weekKey,
    dayCount: dayLogs.length,
    targets,
    dailyData,
    weeklyTotals: {
      protein: weekTotalProtein,
      carbs: weekTotalCarbs,
      fat: weekTotalFat,
      calories: weekTotalCalories,
    },
    weeklyAverages: weekAvg,
    weeklyAveragePercent: {
      protein: Math.round((weekAvg.protein / targets.protein) * 100),
      carbs: Math.round((weekAvg.carbs / targets.carbs) * 100),
      fat: Math.round((weekAvg.fat / targets.fat) * 100),
      calories: Math.round((weekAvg.calories / targets.calories) * 100),
    },
    daysHitTarget,
    carbs: {
      daysBelow: Object.values(dailyData).filter(d => d.carbsPercent < 95).length,
      daysAbove: Object.values(dailyData).filter(d => d.carbsPercent > 105).length,
      excessGrams: carbExcess,
      estimatedFatStored: fatStoredFromCarbs,
    },
    fat: {
      saturatedFatPercent: satFatPercent,
      status: satFatPercent <= 35 ? 'excellent' : satFatPercent <= 40 ? 'good' : 'caution',
    },
    estimatedWeeklyWeightChange: Math.round(weeklyWeightPrediction * 10) / 10,
    insights: generateMacroInsights(dailyData, daysHitTarget, carbExcess, targets, dayLogs.length, weeklyWeightPrediction),
  };
}

function generateMacroInsights(dailyData, daysHitTarget, carbExcess, targets, dayCount, weeklyWeightPrediction) {
  const insights = [];

  const proteinHitRate = (daysHitTarget.protein / dayCount) * 100;
  if (proteinHitRate >= 85) {
    insights.push({
      type: 'positive',
      nutrient: 'protein',
      message: `Excellent protein consistency! ${daysHitTarget.protein}/${dayCount} days on target.`,
    });
  } else if (proteinHitRate < 50) {
    insights.push({
      type: 'alert',
      nutrient: 'protein',
      message: `Low protein consistency. Try adding +20g on low days this week.`,
    });
  }

  if (carbExcess > 100) {
    insights.push({
      type: 'alert',
      nutrient: 'carbs',
      message: `Watch carb excess! +${Math.round(carbExcess)}g over target (≈${Math.round(carbExcess * 0.035)} lbs potential fat storage).`,
    });
  }

  const annualWeightChange = Math.round(weeklyWeightPrediction * 52 * 10) / 10;
  insights.push({
    type: 'info',
    nutrient: 'calories',
    message: `At current intake, weight forecast: ${annualWeightChange > 0 ? '+' : ''}${annualWeightChange} lbs/year.`,
  });

  return insights;
}

async function computeWeeklyMicroAggregation(userId, weekKey) {
  const user = await User.findById(userId);
  if (!user) {
    return { error: 'User not found' };
  }

  const dayLogs = await getWeekLogs(userId, weekKey);

  if (dayLogs.length === 0) {
    return {
      weekKey,
      dayCount: 0,
      error: 'No nutrition logs found for this week',
      byGroup: {},
    };
  }

  // Define micronutrient groups and targets
  const TARGETS = {
    vitaminB12: { daily: 2.4, group: 'water_soluble', unit: 'ug' },
    vitaminB: { daily: 1.3, group: 'water_soluble', unit: 'mg' },
    vitaminC: { daily: 90, group: 'water_soluble', unit: 'mg' },
    folate: { daily: 400, group: 'water_soluble', unit: 'ug' },
    vitaminD: { daily: 15, group: 'fat_soluble', unit: 'ug' },
    vitaminA: { daily: 900, group: 'fat_soluble', unit: 'ug' },
    vitaminE: { daily: 15, group: 'fat_soluble', unit: 'mg' },
    vitaminK: { daily: 120, group: 'fat_soluble', unit: 'ug' },
    sodium: { daily: 2300, group: 'electrolytes', unit: 'mg' },
    potassium: { daily: 3400, group: 'electrolytes', unit: 'mg' },
    magnesium: { daily: 420, group: 'electrolytes', unit: 'mg' },
    iron: { daily: 18, group: 'storage_minerals', unit: 'mg' },
    calcium: { daily: 1200, group: 'storage_minerals', unit: 'mg' },
    zinc: { daily: 11, group: 'storage_minerals', unit: 'mg' },
    copper: { daily: 0.9, group: 'trace', unit: 'mg' },
    selenium: { daily: 55, group: 'trace', unit: 'ug' },
    manganese: { daily: 2.3, group: 'trace', unit: 'mg' },
  };

  const dailyMicroData = {};
  const microTotals = {};

  Object.keys(TARGETS).forEach(nutrient => {
    microTotals[nutrient] = 0;
  });

  dayLogs.forEach(({ date, meals }) => {
    const totals = calculateMealTotals(meals);
    dailyMicroData[date] = {};

    Object.entries(TARGETS).forEach(([nutrient, { daily }]) => {
      const value = totals[nutrient] || 0;
      dailyMicroData[date][nutrient] = {
        value: Math.round(value * 100) / 100,
        targetDaily: daily,
        percentOfTarget: Math.round((value / daily) * 100),
      };
      microTotals[nutrient] += value;
    });
  });

  // Compute summaries by group
  const grouped = {};

  Object.entries(TARGETS).forEach(([nutrient, { group, daily }]) => {
    if (!grouped[group]) grouped[group] = {};

    const weeklyTotal = microTotals[nutrient];
    const weeklyTarget = daily * dayLogs.length;

    let daysHitTarget = 0,
      daysBelow = 0;

    Object.values(dailyMicroData).forEach(dailyData => {
      if (dailyData[nutrient].percentOfTarget >= 95) daysHitTarget++;
      if (dailyData[nutrient].percentOfTarget < 95) daysBelow++;
    });

    grouped[group][nutrient] = {
      daily: Object.values(dailyMicroData).map(d => d[nutrient].value),
      target: daily,
      weeklyTotal,
      weeklyTarget,
      weeklyAvg: Math.round((weeklyTotal / dayLogs.length) * 100) / 100,
      daysHitTarget,
      daysBelow,
      status: daysHitTarget >= 5 ? 'excellent' : daysHitTarget >= 3 ? 'good' : 'needs_improvement',
    };
  });

  // Fat-soluble: compute storage surplus
  const fatSolublestorage = {};
  ['vitaminD', 'vitaminA', 'vitaminE', 'vitaminK'].forEach(nutrient => {
    const weeklyTotal = microTotals[nutrient];
    const targetDaily = TARGETS[nutrient]?.daily || 0;
    const weeklyTarget = targetDaily * dayLogs.length;
    const weeklyStorage = Math.max(0, weeklyTotal - weeklyTarget);
    
    // storageMonths = (Weekly Excess / Daily Target) / 4.33 weeks per month
    const storageMonths = targetDaily > 0 
      ? Math.round((weeklyStorage / targetDaily / 4.33) * 10) / 10 
      : 0;

    fatSolublestorage[nutrient] = {
      ...grouped['fat_soluble']?.[nutrient],
      weeklyStorage,
      storageMonths,
    };
  });

  return {
    weekKey,
    dayCount: dayLogs.length,
    dailyMicroData,
    byGroup: {
      water_soluble: grouped['water_soluble'],
      fat_soluble: fatSolublestorage,
      electrolytes: grouped['electrolytes'],
      storage_minerals: grouped['storage_minerals'],
      trace: grouped['trace'],
    },
    insights: generateMicroInsights(grouped, dayLogs.length),
  };
}

function generateMicroInsights(grouped, dayCount) {
  const insights = [];

  // Water-soluble vitamin consistency
  const b12HitRate = (grouped.water_soluble.vitaminB12.daysHitTarget / dayCount) * 100;
  if (b12HitRate < 70) {
    insights.push({
      type: 'alert',
      nutrient: 'B12',
      message: 'B12 consistency low. Neurological health needs daily hits. Add fish/meat daily.',
    });
  }

  // Fat-soluble storage status
  Object.entries(grouped.fat_soluble).forEach(([nutrient, data]) => {
    if (data.storageMonths > 3) {
      insights.push({
        type: 'positive',
        nutrient,
        message: `Excellent ${nutrient} reserve! ${Math.round(data.storageMonths)}-month storage built up.`,
      });
    } else if (data.storageMonths < 1) {
      insights.push({
        type: 'alert',
        nutrient,
        message: `${nutrient} storage depleting. Increase intake this week.`,
      });
    }
  });

  // Electrolyte balance
  const sodiumHitRate = (grouped.electrolytes.sodium.daysHitTarget / dayCount) * 100;
  if (sodiumHitRate < 50) {
    insights.push({
      type: 'warning',
      nutrient: 'sodium',
      message: 'Low sodium on many days. Risk of dehydration/cramps, especially on training days.',
    });
  }

  return insights;
}

module.exports = {
  computeWeeklyMacroAggregation,
  computeWeeklyMicroAggregation,
  getISOWeek,
};

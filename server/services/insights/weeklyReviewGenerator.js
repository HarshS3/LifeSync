const { NutritionLog, WeightLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');
const User = require('../../models/User');
const { computeWeeklyMacroAggregation } = require('../nutritionAggregation/weeklyAggregator');
const { calculateDailyTargets } = require('../nutritionEngine');

/**
 * Generates a holistic weekly review for the user.
 */
async function generateWeeklyReview(userId, weekKey) {
  // 1. Get Nutrition Aggregation
  const nutrition = await computeWeeklyMacroAggregation(userId, weekKey);
  
  // 2. Get Weight Trend
  const { weekStart, weekEnd } = getWeekDateRange(weekKey);
  const weights = await WeightLog.find({
    user: userId,
    date: { $gte: weekStart, $lte: weekEnd }
  }).sort({ date: 1 });

  // 3. Get Strongest Lift
  const workouts = await Workout.find({
    user: userId,
    date: { $gte: weekStart, $lte: weekEnd }
  });

  let strongestLift = null;
  workouts.forEach(w => {
    w.exercises?.forEach(ex => {
      ex.sets?.forEach(set => {
        if (!strongestLift || set.weight > strongestLift.weight) {
          strongestLift = {
            exercise: ex.name,
            weight: set.weight,
            reps: set.reps,
            date: w.date
          };
        }
      });
    });
  });

  // 4. Identify Best/Worst Nutrition Days
  let bestDay = null;
  let worstDay = null;
  
  if (nutrition.dailyData && Object.keys(nutrition.dailyData).length > 0) {
    const days = Object.entries(nutrition.dailyData).map(([date, data]) => ({ date, ...data }));
    
    // Sort by a composite score (protein consistency is high weight)
    days.sort((a, b) => {
      const scoreA = (a.proteinPercent * 0.7) + (a.caloriesPercent * 0.3);
      const scoreB = (b.proteinPercent * 0.7) + (b.caloriesPercent * 0.3);
      return scoreB - scoreA;
    });

    bestDay = days[0];
    worstDay = days[days.length - 1];

    if (worstDay) {
      if (worstDay.proteinPercent < 70) {
        worstDay.explanation = "A significant protein deficit was observed, which can impact muscle recovery and metabolic rate.";
      } else if (worstDay.caloriesPercent > 120) {
        worstDay.explanation = "Caloric intake exceeded targets by over 20%, potentially shifting the body into fat storage mode.";
      } else {
        worstDay.explanation = "Nutrient targets were inconsistent, leading to a sub-optimal recovery window.";
      }
    }
  }

  // 5. Generate AI Insights
  const insights = generateReviewInsights(nutrition, strongestLift, weights);

  return {
    weekKey,
    nutrition,
    weightTrend: weights.map(w => ({ date: w.date, weight: w.weightKg })),
    strongestLift,
    bestDay,
    worstDay,
    insights,
    nextWeekGoal: nutrition.daysHitTarget.protein < 5 
      ? "Focus on hitting your protein target for at least 5 days next week."
      : "Maintain your consistency and try to increase your daily activity (NEAT) by 10%.",
  };
}

function generateReviewInsights(nutrition, strongestLift, weights) {
  const messages = [];
  
  if (strongestLift) {
    messages.push(`Your strongest performance was the ${strongestLift.weight}kg ${strongestLift.exercise}. This indicates your central nervous system is adapting well to the current volume.`);
  } else {
    messages.push("No major lifts were recorded this week. Focus on consistent resistance training next week to drive metabolic adaptation.");
  }
  
  if (weights.length >= 2) {
    const diff = weights[weights.length - 1].weightKg - weights[0].weightKg;
    if (diff < -0.5) {
      messages.push(`The ${Math.abs(diff).toFixed(1)}kg drop in weight suggests a successful caloric deficit.`);
    } else if (diff > 0.5) {
      messages.push(`The ${diff.toFixed(1)}kg increase suggests you are in a growth phase; ensure protein remains high to favor muscle over fat.`);
    }
  }

  if (nutrition.daysHitTarget.protein >= 6) {
    messages.push("Your protein consistency is elite (6+/7 days). This is the single biggest factor in your body composition success this week.");
  }

  return messages;
}

function getWeekDateRange(weekKey) {
  const [year, week] = weekKey.split('-W').map(Number);
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearStartDay = yearStart.getUTCDay();
  const week1Start = new Date(yearStart);
  week1Start.setUTCDate(yearStart.getUTCDate() - yearStartDay);
  const weekStart = new Date(week1Start);
  weekStart.setUTCDate(week1Start.getUTCDate() + (week - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

module.exports = { generateWeeklyReview };

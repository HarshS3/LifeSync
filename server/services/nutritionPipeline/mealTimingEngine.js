const { NutritionLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');
const User = require('../../models/User');

/**
 * Analyzes meal timing relative to workouts and sleep.
 * @param {ObjectId} userId 
 * @param {Date} date 
 */
async function analyzeMealTiming(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Fetch Nutrition Log for the day
  const nutriLog = await NutritionLog.findOne({
    user: userId,
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  // 2. Fetch Workouts + User for the day
  const [workouts, user] = await Promise.all([
    Workout.find({
      user: userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }),
    User.findById(userId).select('biologicalProfile weight remiders.reminderTimes eatingPattern')
  ]);

  if (!nutriLog || !nutriLog.meals || nutriLog.meals.length === 0) {
    return { status: 'no_data', alerts: [] };
  }

  const alerts = [];
  const meals = nutriLog.meals;
  const eatingPattern = user?.eatingPattern || user?.biologicalProfile?.eatingPattern || '';
  const isIntermittentFasting = ['if_16_8', 'if_20_4', 'omad', 'custom'].includes(eatingPattern);
  const isOmad = eatingPattern === 'omad';

  // Readiness gate: pull today's readiness score to determine whether pre/post-workout
  // fuel alerts are appropriate. If readiness is very low, recommend rest over fueling.
  let readinessScore = null;
  try {
    const { calculateReadiness } = require('../insights/readinessEngine');
    const r = await calculateReadiness(userId);
    readinessScore = r?.readinessScore ?? null;
  } catch (_) {}
  const lowReadiness = readinessScore != null && readinessScore <= 4;

  // Helper to parse "HH:mm" to minutes from start of day
  const toMin = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // 3. Workout-related timing
  workouts.forEach(workout => {
    const workoutTime = new Date(workout.date);
    const workoutMin = workoutTime.getHours() * 60 + workoutTime.getMinutes();

    // Check Pre-workout (60-120 min before) — lower bound raised to 60 min (Task 7)
    const preWorkoutMeal = meals.find(m => {
      const mealMin = toMin(m.time);
      if (!mealMin) return false;
      const diff = workoutMin - mealMin;
      return diff >= 60 && diff <= 120; // 60-120 min window
    });

    if (!isIntermittentFasting) {
      if (lowReadiness) {
        // Readiness too low for hard training — redirect toward recovery, not performance fueling
        alerts.push({
          type: 'timing_caution',
          title: 'Low readiness — consider rest or light training',
          text: `Today's readiness score is ${readinessScore}/10. Pre-workout fuel won't fix a recovery deficit — a rest day or light session will serve you better than pushing through.`
        });
      } else if (preWorkoutMeal) {
        const p = preWorkoutMeal.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
        const c = preWorkoutMeal.foods.reduce((sum, f) => sum + (f.carbs || 0), 0);
        if (p < 15 || c < 20) {
          alerts.push({
            type: 'timing_info',
            title: 'Optimize Pre-Workout',
            text: `You had a meal before your "${workout.name}" workout, but it was low in macros. Aim for ~20g Protein and ~30g Carbs 90 min before training for peak performance.`
          });
        }
      } else {
        alerts.push({
          type: 'timing_warning',
          title: 'Missing Pre-Workout Fuel',
          text: `No meal detected 60-90 min before your "${workout.name}" workout. Training fasted or without recent fuel can increase cortisol and reduce intensity.`
        });
      }
    }

    // Check Post-workout (within 180 min) — Task 6
    // Skip for OMAD users entirely
    if (!isOmad) {
      // Check if a pre-workout meal with >=20g protein was eaten within 2h before workout
      const preMealHighProtein = meals.find(m => {
        const mealMin = toMin(m.time);
        if (!mealMin) return false;
        const diff = workoutMin - mealMin;
        if (diff < 0 || diff > 120) return false;
        const p = m.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
        return p >= 20;
      });

      // If high-protein pre-workout meal present, skip post-workout alert
      if (!preMealHighProtein && !isIntermittentFasting) {
        const postWorkoutMeal = meals.find(m => {
          const mealMin = toMin(m.time);
          if (!mealMin) return false;
          const diff = mealMin - workoutMin;
          return diff >= 0 && diff <= 180; // expanded to 180 min (Task 6)
        });

        if (postWorkoutMeal) {
          const p = postWorkoutMeal.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
          if (p < 25) {
            alerts.push({
              type: 'timing_info',
              title: 'Increase Post-Workout Protein',
              text: `Your post-workout meal was light on protein (${Math.round(p)}g). Aim for 25-40g within 3 hours of "${workout.name}" to maximize muscle protein synthesis.`
            });
          }
        } else {
          alerts.push({
            type: 'timing_warning',
            title: 'Anabolic Window Passing',
            text: `No significant protein intake detected within 3 hours after your "${workout.name}" workout. Get 25g+ protein now to kickstart recovery.`
          });
        }
      }
    }
  });

  // 4. Muscle Protein Synthesis (MPS) & Protein Distribution
  const weight = user?.biologicalProfile?.weightKg || user?.weight || 75;
  const optimalMealProtein = weight * 0.4; // ~0.4g/kg maximizes MPS

  let totalDailyProtein = 0;
  let maxProteinMeal = null;
  let maxProteinAmount = 0;

  meals.forEach(m => {
    const mealProtein = m.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
    totalDailyProtein += mealProtein;
    if (mealProtein > maxProteinAmount) {
      maxProteinAmount = mealProtein;
      maxProteinMeal = m.name || m.mealType || 'one meal';
    }
  });

  // Protein distribution alerts — skip for IF/OMAD users (Task 8)
  if (!isIntermittentFasting) {
    if (totalDailyProtein > 40 && maxProteinAmount > (totalDailyProtein * 0.55)) {
      // If more than 55% of daily protein is in a single meal
      alerts.push({
        type: 'timing_warning',
        title: 'Suboptimal Protein Distribution (MPS)',
        text: `You got ${Math.round(totalDailyProtein)}g protein today but ${Math.round(maxProteinAmount)}g was in ${maxProteinMeal}. Muscle Protein Synthesis (MPS) maxes out around ${Math.round(optimalMealProtein)}g per meal and returns to baseline after 3-5 hours. Spreading your protein across 3-4 meals would significantly improve muscle retention and growth.`
      });
    } else if (totalDailyProtein > optimalMealProtein * 3) {
      // Check if they are hitting the optimal per-meal threshold at least 3 times
      const optimalMealsCount = meals.filter(m => {
        const p = m.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
        return p >= optimalMealProtein * 0.8; // Allow a 20% buffer
      }).length;

      if (optimalMealsCount < 3 && meals.length >= 3) {
        alerts.push({
          type: 'timing_info',
          title: 'Optimize Muscle Protein Synthesis',
          text: `You have great total protein (${Math.round(totalDailyProtein)}g), but only hit the MPS threshold (~${Math.round(optimalMealProtein)}g) in ${optimalMealsCount} meal(s). Aim for ${Math.round(optimalMealProtein)}g across at least 3 meals to keep muscle building elevated all day.`
        });
      }
    }
  }

  // 5. Sleep-related timing
  const userSleepTime = user?.biologicalProfile?.defaultSleepTime || '22:30';
  const estimatedBedTimeMin = toMin(userSleepTime);
  // Task 9: handle null timestamps safely
  const lastMeal = (meals || []).reduce((best, m) => {
    const mMin = toMin(m.time);
    if (mMin === null) return best;
    const bMin = toMin(best ? best.time : null);
    if (bMin === null) return m;
    return mMin > bMin ? m : best;
  }, null);

  const lastMealMin = lastMeal ? toMin(lastMeal.time) : null;
  if (lastMealMin && (estimatedBedTimeMin - lastMealMin < 120)) {
    alerts.push({
      type: 'timing_caution',
      title: 'Late Night Digestion',
      text: `Your last meal was too close to bedtime. Eating within 2-3 hours of sleep inhibits Growth Hormone release and can disrupt deep sleep cycles.`
    });
  }

  // 6. Hydration Intelligence
  // weight is already declared above
  // workout.duration is stored in MINUTES — convert to hours for the 500ml/h formula
  const totalWorkoutHours = workouts.reduce((sum, w) => sum + (w.duration || 0) / 60, 0);
  const hydrationGoalMl = (weight * 35) + (totalWorkoutHours * 500);
  const waterIntake = nutriLog.waterIntake || 0;
  const sodiumMg = nutriLog.dailyTotals?.sodium || 0;

  if (waterIntake < hydrationGoalMl * 0.7) {
    const isDehydrated = waterIntake < hydrationGoalMl * 0.5;
    const severity = isDehydrated || sodiumMg > 3000 ? 'timing_warning' : 'timing_caution';
    
    let message = `Your hydration is low (${waterIntake}ml logged vs ${Math.round(hydrationGoalMl)}ml required). `;
    if (sodiumMg > 3000) {
      message += "High sodium intake detected — this significantly increases your fluid requirements to prevent water retention and brain fog.";
    }
    if (isDehydrated) {
      message += " Dehydration of just 2% can reduce your strength output by 10% and noticeably impair cognitive focus.";
    }

    alerts.push({
      type: severity,
      title: 'Hydration Strategy',
      text: message
    });
  }

  return { status: 'success', alerts, hydrationGoalMl: Math.round(hydrationGoalMl) };
}

module.exports = { analyzeMealTiming };

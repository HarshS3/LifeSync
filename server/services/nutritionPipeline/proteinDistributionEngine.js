/**
 * Protein Distribution & MPS (Muscle Protein Synthesis) Engine
 * ─────────────────────────────────────────────────────────────────
 * Analyzes how protein intake is distributed across meals to optimize
 * muscle building and retention.
 *
 * Scientific Basis:
 *  - Moore et al. (2009) Am J Clin Nutr: MPS is maximally stimulated by 
 *    ~0.25-0.4g/kg protein per meal.
 *  - Areta et al. (2013) J Physiol: Spreading protein into 4 doses (20g) 
 *    is superior to 2 large doses (40g) or 8 small doses (10g).
 *  - Mamerow et al. (2014) J Nutr: Even distribution of protein at 
 *    breakfast, lunch, and dinner stimulates 24-h MPS more effectively 
 *    than lopsided intake.
 */

const User = require('../../models/User');
const Workout = require('../../models/Workout');

/**
 * Evaluates protein distribution for a single day.
 * @param {ObjectId} userId
 * @param {Array} meals - Array of meal objects from NutritionLog
 * @param {Date} [date] - The date to evaluate (defaults to today)
 * @returns {Object} { score: 1-10, insights: [], stats: {} }
 */
async function evaluateProteinDistribution(userId, meals, date) {
  if (!meals || meals.length === 0) return null;

  const evalDate = date ? new Date(date) : new Date();
  const dayStart = new Date(evalDate); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(evalDate); dayEnd.setHours(23, 59, 59, 999);

  const [user, dayWorkouts] = await Promise.all([
    User.findById(userId).select('weight biologicalProfile eatingPattern').lean(),
    Workout.find({ user: userId, date: { $gte: dayStart, $lte: dayEnd } }).select('date').lean(),
  ]);
  const sessionCount = dayWorkouts.length; // how many sessions today
  const weightKg = user?.biologicalProfile?.weightKg || user?.weight || 75;
  const eatingPattern = user?.eatingPattern || user?.biologicalProfile?.eatingPattern || '';
  const isOmad = eatingPattern === 'omad';
  const isIF = ['if_16_8', 'if_20_4'].includes(eatingPattern);
  const isIFOrOmad = ['if_16_8', 'if_20_4', 'omad', 'custom'].includes(eatingPattern);

  // 1. Calculate Per-Meal Protein
  const mealData = meals.map(m => {
    const protein = m.foods?.reduce((sum, f) => sum + (Number(f.protein) || 0), 0) || 0;
    return {
      name: m.name || m.mealType,
      protein: parseFloat(protein.toFixed(1))
    };
  }).filter(m => m.protein > 2); // Only count meals with >2g protein

  if (mealData.length === 0) return null;

  const totalProtein = mealData.reduce((sum, m) => sum + m.protein, 0);

  // 2. Define "Optimal" Bolus — based on body weight
  const optimalMin = Math.round(weightKg * 0.25); // ~20g for 80kg
  const optimalMax = Math.round(weightKg * 0.5);  // ~40g for 80kg

  // 3. Count "Effective" MPS Stimulations (Boluses)
  const boluses = mealData.filter(m => m.protein >= optimalMin);
  // Lopsided threshold: for users with 2+ sessions/day (e.g. AM + PM training),
  // front-loading protein around sessions is intentional — don't flag as lopsided.
  const lopsidedThreshold = sessionCount >= 2 ? 0.80 : 0.65;
  const lopsidedMeal = mealData.find(m => m.protein > totalProtein * lopsidedThreshold && totalProtein > 60);

  const insights = [];
  let score = 5;

  if (isOmad) {
    // OMAD: target 1 bolus; score good if single meal protein >= 0.4g/kg
    const singleMealProtein = mealData[0]?.protein || 0;
    if (singleMealProtein >= weightKg * 0.4) {
      score = 8;
      insights.push('Good protein intake for OMAD. One high-protein meal can meet daily needs when total is sufficient.');
    } else {
      score = 5;
      insights.push(`OMAD target: aim for at least ${Math.round(weightKg * 0.4)}g protein in your single meal to meet MPS requirements.`);
    }
  } else if (isIF) {
    // IF 16:8 / 20:4: target 2-3 boluses
    if (boluses.length >= 2) {
      score = 8;
      insights.push('Good distribution for intermittent fasting. Hitting the protein threshold across your eating window supports muscle synthesis.');
    } else {
      score = 5;
      insights.push(`Try to hit at least ${optimalMin}g protein in 2 meals within your eating window to support muscle repair.`);
    }
  } else {
    // Standard eating pattern
    if (boluses.length >= 4) {
      score = 10;
      insights.push('Excellent distribution! You hit the protein threshold for muscle synthesis 4+ times today.');
    } else if (boluses.length >= 3) {
      score = 8;
      insights.push('Good distribution. Spreading protein across 3 meals keeps your muscle synthesis elevated.');
    } else if (boluses.length === 1 && totalProtein > weightKg && sessionCount < 2) {
      score = 3;
      insights.push(`Lopsided Protein: You hit your total goal, but ${Math.round((boluses[0].protein / totalProtein) * 100)}% was in one meal. Spreading this into 3+ meals would better support muscle retention.`);
    } else if (boluses.length < 3) {
      score = 4;
      insights.push(`Tip: Try to get at least ${optimalMin}-${optimalMax}g of protein per meal to maximize muscle repair throughout the day.`);
    }
  }

  // 4. Check for "Empty" morning — skip for IF/OMAD users (Task 10)
  if (!isIFOrOmad) {
    const morningMeal = meals.find(m => ['breakfast', 'brunch'].includes(m.mealType?.toLowerCase()) || m.name?.toLowerCase()?.includes('breakfast'));
    const morningProtein = morningMeal?.foods?.reduce((sum, f) => sum + (f.protein || 0), 0) || 0;
    if (morningProtein < 10 && boluses.length < 4) {
      insights.push(`Your breakfast was low in protein. Adding eggs, paneer, or a shake could help prevent muscle breakdown during the day.`);
    }
  }

  return {
    score,
    boluses: boluses.length,
    optimalThreshold: `${optimalMin}-${optimalMax}g`,
    lopsided: !!lopsidedMeal,
    insights,
    mealData
  };
}

module.exports = { evaluateProteinDistribution };

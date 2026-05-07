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

/**
 * Evaluates protein distribution for a single day.
 * @param {ObjectId} userId
 * @param {Array} meals - Array of meal objects from NutritionLog
 * @returns {Object} { score: 1-10, insights: [], stats: {} }
 */
async function evaluateProteinDistribution(userId, meals) {
  if (!meals || meals.length === 0) return null;

  const user = await User.findById(userId).select('weight biologicalProfile').lean();
  const weightKg = user?.biologicalProfile?.weightKg || user?.weight || 75;

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
  
  // 2. Define "Optimal" Bolus
  // 0.4g per kg is the standard "ceiling" for MPS stimulation per meal
  const optimalMin = Math.round(weightKg * 0.25); // ~20g for 80kg
  const optimalMax = Math.round(weightKg * 0.5);  // ~40g for 80kg

  // 3. Count "Effective" MPS Stimulations (Boluses)
  const boluses = mealData.filter(m => m.protein >= optimalMin);
  const lopsidedMeal = mealData.find(m => m.protein > totalProtein * 0.65 && totalProtein > 60);

  const insights = [];
  let score = 5;

  if (boluses.length >= 4) {
    score = 10;
    insights.push('🌟 Excellent distribution! You hit the protein threshold for muscle synthesis 4+ times today.');
  } else if (boluses.length >= 3) {
    score = 8;
    insights.push('✅ Good distribution. Spreading protein across 3 meals keeps your muscle synthesis elevated.');
  } else if (boluses.length === 1 && totalProtein > weightKg) {
    score = 3;
    insights.push(`⚠️ Lopsided Protein: You hit your total goal, but ${Math.round((boluses[0].protein / totalProtein) * 100)}% was in one meal. Spreading this into 3+ meals would better support muscle retention.`);
  } else if (boluses.length < 3) {
    score = 4;
    insights.push('💡 Tip: Try to get at least 25-30g of protein in your breakfast or lunch to maximize muscle repair throughout the day.');
  }

  // 4. Check for "Empty" morning
  const morningMeal = meals.find(m => ['breakfast', 'brunch'].includes(m.mealType?.toLowerCase()) || m.name?.toLowerCase()?.includes('breakfast'));
  const morningProtein = morningMeal?.foods?.reduce((sum, f) => sum + (f.protein || 0), 0) || 0;
  if (morningProtein < 10 && boluses.length < 4) {
    insights.push('🍳 Your breakfast was low in protein. Adding eggs, paneer, or a shake here could help prevent muscle breakdown during the day.');
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

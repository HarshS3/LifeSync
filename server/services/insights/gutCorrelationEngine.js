const SymptomLog = require('../../models/SymptomLog');
const { NutritionLog } = require('../../models/Logs');

/**
 * Gut Correlation Engine identifies food-symptom triggers.
 */
async function analyzeGutTriggers(userId, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 1. Fetch Symptoms
  const symptoms = await SymptomLog.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate },
    symptomName: { $in: ['Bloating', 'Digestive Discomfort', 'Gas', 'Fatigue after Meal'] }
  }).sort({ date: 1 });

  if (symptoms.length < 3) return [];

  // 2. Fetch Nutrition Logs (Meals)
  const nutritionLogs = await NutritionLog.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  const triggers = [];
  const foodFrequencyBeforeSymptom = {}; // FoodName -> count

  symptoms.forEach(symptom => {
    if (symptom.severity < 3) return; // Only analyze notable symptoms

    const symptomTime = new Date(symptom.date);
    const windowStart = new Date(symptomTime.getTime() - (8 * 60 * 60 * 1000)); // 8 hours window

    // Find meals in this window
    nutritionLogs.forEach(log => {
      log.meals?.forEach(meal => {
        const mealTime = new Date(meal.timestamp || log.date); // Fallback to log date if timestamp missing
        if (mealTime >= windowStart && mealTime <= symptomTime) {
          meal.items?.forEach(item => {
            const name = item.name?.toLowerCase().trim();
            if (!name) return;
            if (!foodFrequencyBeforeSymptom[name]) foodFrequencyBeforeSymptom[name] = 0;
            foodFrequencyBeforeSymptom[name]++;
          });
        }
      });
    });
  });

  // 3. Filter for "Offenders"
  // Logic: If food appears in > 50% of the symptom windows, flag it.
  const threshold = symptoms.filter(s => s.severity >= 3).length * 0.5;
  
  Object.entries(foodFrequencyBeforeSymptom).forEach(([food, count]) => {
    if (count >= Math.max(3, threshold)) {
      triggers.push({
        food,
        occurrenceCount: count,
        totalSymptomEvents: symptoms.length,
        correlation: Math.round((count / symptoms.length) * 100)
      });
    }
  });

  // 4. Generate Insights
  const insights = triggers.map(t => ({
    type: 'gut',
    title: `Potential Trigger: ${t.food}`,
    detail: `You've reported gut discomfort ${t.occurrenceCount} times shortly after consuming "${t.food}". This shows a ${t.correlation}% correlation in your history.`,
    impact: t.correlation > 70 ? 'high' : 'medium',
    action: `Try eliminating "${t.food}" for 3 days to see if your symptoms improve.`
  }));

  return insights;
}

module.exports = { analyzeGutTriggers };

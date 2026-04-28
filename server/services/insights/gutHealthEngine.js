const { NutritionLog, MentalLog } = require('../../models/Logs');

// Categorized list of common plant-based foods to detect diversity
const PLANT_CATEGORIES = {
  vegetables: ['broccoli', 'spinach', 'kale', 'carrot', 'tomato', 'cucumber', 'pepper', 'onion', 'garlic', 'cabbage', 'cauliflower', 'zucchini', 'eggplant', 'asparagus', 'celery', 'beetroot', 'radish', 'mushroom'],
  fruits: ['apple', 'banana', 'orange', 'strawberry', 'blueberry', 'raspberry', 'grape', 'mango', 'pineapple', 'kiwi', 'pear', 'peach', 'plum', 'cherry', 'pomegranate', 'avocado'],
  grains: ['oats', 'quinoa', 'rice', 'barley', 'buckwheat', 'millet', 'rye', 'wheat', 'corn', 'amaranth'],
  legumes: ['lentils', 'chickpeas', 'beans', 'peas', 'soybeans', 'edamame', 'tofu', 'tempeh'],
  nuts_seeds: ['almonds', 'walnuts', 'chia', 'flax', 'pumpkin seeds', 'sunflower seeds', 'cashews', 'pistachios', 'pecans', 'hemp seeds', 'sesame'],
  fermented: ['yogurt', 'kefir', 'kimchi', 'sauerkraut', 'miso', 'tempeh', 'kombucha']
};

/**
 * Analyzes Gut Health based on Microbiome Diversity (Plant Points) and 
 * Fiber-to-Carb ratios.
 */
async function analyzeGutHealth(userId) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [logs, mentalLogs] = await Promise.all([
    NutritionLog.find({ user: userId, date: { $gte: sevenDaysAgo } }),
    MentalLog.find({ user: userId, date: { $gte: sevenDaysAgo } })
  ]);

  if (logs.length === 0) {
    return { status: 'insufficient_data', message: 'Log your meals to calculate your Microbiome Diversity score.' };
  }

  const uniquePlants = new Set();
  let totalFiber = 0;
  let totalCarbs = 0;
  let fermentedCount = 0;

  logs.forEach(log => {
    totalFiber += log.dailyTotals?.fiber || 0;
    totalCarbs += log.dailyTotals?.carbs || 0;

    log.meals?.forEach(meal => {
      meal.foods?.forEach(food => {
        const name = (food.name || '').toLowerCase();
        
        // Detect plants and fermented foods
        Object.entries(PLANT_CATEGORIES).forEach(([category, list]) => {
          list.forEach(plant => {
            if (name.includes(plant)) {
              if (category === 'fermented') fermentedCount++;
              else uniquePlants.add(plant);
            }
          });
        });
      });
    });
  });

  const plantPoints = uniquePlants.size;
  const fiberRatio = totalCarbs > 0 ? (totalCarbs / totalFiber) : 0;
  
  // Correlate with energy/mood from mental logs
  const avgEnergy = mentalLogs.length 
    ? mentalLogs.reduce((sum, m) => sum + (m.energyLevel || 0), 0) / mentalLogs.length 
    : null;

  const insights = [];
  
  // Diversity Insight
  if (plantPoints < 15) {
    insights.push(`Your microbiome diversity score is ${plantPoints}/30. Research shows eating 30+ unique plants per week is the best predictor of gut health.`);
  } else if (plantPoints >= 30) {
    insights.push(`Elite Diversity! You've hit the gold standard of 30+ unique plants this week.`);
  } else {
    insights.push(`Great progress! You've hit ${plantPoints} unique plants this week. Aim for 30 to maximize gut microbiome diversity.`);
  }

  // Fiber/Carb Ratio Insight (The 10:1 Rule)
  if (fiberRatio > 10) {
    insights.push(`Your Carb-to-Fiber ratio is ${fiberRatio.toFixed(1)}:1. Aim for less than 10:1 to ensure your gut bacteria have enough "prebiotic" fuel to manage blood sugar.`);
  }

  // Fermentation Insight
  if (fermentedCount < 3) {
    insights.push(`Consider adding more fermented foods (yogurt, kimchi, etc.) to seed your gut with beneficial probiotics.`);
  }

  return {
    status: 'success',
    plantPoints,
    uniquePlants: Array.from(uniquePlants),
    fiberToCarbRatio: fiberRatio,
    fermentedCount,
    insights,
    summary: `Gut health analyzed via ${plantPoints} unique plant species.`
  };
}

module.exports = { analyzeGutHealth };

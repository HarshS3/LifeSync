const { NutritionLog } = require('../../models/Logs');
const FoodSourceCache = require('../../models/FoodSourceCache');
const { analyzeWithGemini } = require('../../aiClient');

/**
 * Ensures all given unique food names are classified in FoodSourceCache.
 * Unclassified foods are batched and sent to Gemini.
 */
async function ensureFoodsClassified(foodNames) {
  const uniqueNames = [...new Set(foodNames)].filter(Boolean);
  if (uniqueNames.length === 0) return {};

  const existingDocs = await FoodSourceCache.find({ foodName: { $in: uniqueNames } }).lean();
  const existingNames = new Set(existingDocs.map(d => d.foodName));
  const missingNames = uniqueNames.filter(name => !existingNames.has(name));

  if (missingNames.length > 0) {
    // Send to LLM in batches of up to 50
    for (let i = 0; i < missingNames.length; i += 50) {
      const batch = missingNames.slice(i, i + 50);
      
      const prompt = `
You are a clinical nutritionist. I have a list of food names logged by a user.
For each food, identify its primary source category for Protein, Carbs, and Fats.
Also flag if it is generally considered "anti_inflammatory" (e.g. berries, olive oil, fatty fish, turmeric, ginger) or "pro_inflammatory" (e.g. refined seed oils, deep fried, processed meat, refined sugar, alcohol, trans fats).

Source Categories to use:
Protein: "Dairy", "Poultry", "Legumes", "Nuts/Seeds", "Seafood", "Red Meat", "Plant-based", "Supplement", "None"
Carbs: "Whole Grains", "Refined Grains", "Fruits", "Vegetables", "Legumes", "Sugar/Sweets", "None"
Fats: "Dairy Fat", "Plant Oils", "Nuts/Seeds", "Animal Fat", "Seafood", "None"

If a food provides zero or negligible amounts of a macro, use "None".

Input Foods:
${JSON.stringify(batch)}

Respond ONLY with a JSON array of objects. Exactly one object per food name in the same order.
Format:
[
  {
    "foodName": "Chicken Breast",
    "proteinSource": "Poultry",
    "carbSource": "None",
    "fatSource": "Animal Fat",
    "isAntiInflammatory": false,
    "isProInflammatory": false
  }
]
`;
      try {
        const responseText = await analyzeWithGemini(prompt, 'gemini-3.1-pro');
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const results = JSON.parse(cleaned);

        if (Array.isArray(results)) {
          const bulkOps = results.map(r => ({
            updateOne: {
              filter: { foodName: r.foodName },
              update: { $set: r },
              upsert: true
            }
          }));
          await FoodSourceCache.bulkWrite(bulkOps);
          existingDocs.push(...results);
        }
      } catch (err) {
        console.error('[DiversityEngine] Error classifying batch with LLM:', err);
      }
    }
  }

  // Create lookup map
  const lookup = {};
  existingDocs.forEach(d => {
    lookup[d.foodName] = d;
  });
  return lookup;
}

/**
 * Computes weekly dietary diversity (macro sources) and inflammation index.
 */
async function computeWeeklyDiversity(userId) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const logs = await NutritionLog.find({
    user: userId,
    date: { $gte: start, $lte: end }
  }).lean();

  const allFoodNames = [];
  const processedItems = []; // Array of { name, protein: g, carbs: g, fat: g }

  logs.forEach(log => {
    (log.meals || []).forEach(meal => {
      (meal.foods || []).forEach(food => {
        if (!food.name) return;
        allFoodNames.push(food.name);
        processedItems.push({
          name: food.name,
          protein: Number(food.protein) || 0,
          carbs: Number(food.carbs) || 0,
          fat: Number(food.fat) || 0,
          calories: Number(food.calories) || 0
        });
      });
    });
  });

  const cacheLookup = await ensureFoodsClassified(allFoodNames);

  const sources = {
    protein: {}, // { 'Dairy': 150, 'Legumes': 80 ... }
    carbs: {},
    fat: {}
  };

  let antiInflammatoryKcal = 0;
  let proInflammatoryKcal = 0;
  let totalKcal = 0;

  processedItems.forEach(item => {
    const classification = cacheLookup[item.name];
    if (!classification) return;

    totalKcal += item.calories;

    if (item.protein > 2 && classification.proteinSource && classification.proteinSource !== 'None') {
      sources.protein[classification.proteinSource] = (sources.protein[classification.proteinSource] || 0) + item.protein;
    }
    if (item.carbs > 5 && classification.carbSource && classification.carbSource !== 'None') {
      sources.carbs[classification.carbSource] = (sources.carbs[classification.carbSource] || 0) + item.carbs;
    }
    if (item.fat > 2 && classification.fatSource && classification.fatSource !== 'None') {
      sources.fat[classification.fatSource] = (sources.fat[classification.fatSource] || 0) + item.fat;
    }

    if (classification.isAntiInflammatory) antiInflammatoryKcal += item.calories;
    if (classification.isProInflammatory) proInflammatoryKcal += item.calories;
  });

  // Calculate stats per macro
  const summarizeMacro = (sourceMap) => {
    const totalGrams = Object.values(sourceMap).reduce((a, b) => a + b, 0);
    if (totalGrams === 0) return { total: 0, distinctSources: 0, dominant: null, dominantPercent: 0, breakdown: [] };

    const breakdown = Object.entries(sourceMap)
      .map(([source, grams]) => ({ source, grams: Math.round(grams), percent: Math.round((grams / totalGrams) * 100) }))
      .sort((a, b) => b.grams - a.grams);

    const dominant = breakdown[0];
    const distinctSources = breakdown.filter(b => b.percent > 5).length; // Meaningful contributions only (>5%)

    return {
      total: Math.round(totalGrams),
      distinctSources,
      dominant: dominant ? dominant.source : null,
      dominantPercent: dominant ? dominant.percent : 0,
      breakdown
    };
  };

  const proteinSummary = summarizeMacro(sources.protein);
  const carbSummary = summarizeMacro(sources.carbs);
  const fatSummary = summarizeMacro(sources.fat);

  // Analyze monoculture risks
  const monocultureWarnings = [];
  if (proteinSummary.dominantPercent > 70) {
    monocultureWarnings.push(`You get ${proteinSummary.dominantPercent}% of your protein from ${proteinSummary.dominant}. Mix in other sources to complete your amino acid profile.`);
  }
  if (fatSummary.dominantPercent > 75 && fatSummary.dominant === 'Plant Oils') {
    monocultureWarnings.push(`Heavy reliance on Plant Oils (${fatSummary.dominantPercent}% of fat). Try incorporating nuts, seeds, or fatty fish to improve your Omega-3:6 ratio.`);
  }
  if (carbSummary.dominantPercent > 60 && carbSummary.dominant === 'Refined Grains') {
    monocultureWarnings.push(`Most of your carbs (${carbSummary.dominantPercent}%) are Refined Grains. Swap some for Whole Grains or Legumes for better glycemic control.`);
  }

  // Calculate Inflammation Index (-10 to +10)
  // Base it on the % of total calories coming from pro vs anti inflammatory foods
  const antiPercent = totalKcal > 0 ? (antiInflammatoryKcal / totalKcal) * 100 : 0;
  const proPercent = totalKcal > 0 ? (proInflammatoryKcal / totalKcal) * 100 : 0;
  
  // A rough index: Each 5% of anti adds +1, each 5% of pro subtracts -1
  let inflammationIndex = (antiPercent / 5) - (proPercent / 5);
  inflammationIndex = Math.round(Math.max(-10, Math.min(10, inflammationIndex)) * 10) / 10;

  let inflammationStatus = 'Neutral';
  if (inflammationIndex >= 4) inflammationStatus = 'Highly Anti-Inflammatory';
  else if (inflammationIndex >= 1) inflammationStatus = 'Slightly Anti-Inflammatory';
  else if (inflammationIndex <= -4) inflammationStatus = 'Highly Pro-Inflammatory';
  else if (inflammationIndex <= -1) inflammationStatus = 'Slightly Pro-Inflammatory';

  return {
    protein: proteinSummary,
    carbs: carbSummary,
    fat: fatSummary,
    monocultureWarnings,
    inflammation: {
      index: inflammationIndex,
      status: inflammationStatus,
      antiKcal: Math.round(antiInflammatoryKcal),
      proKcal: Math.round(proInflammatoryKcal),
      totalKcal: Math.round(totalKcal)
    }
  };
}

module.exports = { computeWeeklyDiversity };

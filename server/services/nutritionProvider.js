const {
  ensureIndbDataLoaded,
  searchIndbFoods,
} = require('./nutritionSources/indbMongo');
const { searchOpenFoodFactsFoods } = require('./nutritionSources/openFoodFacts');

async function searchFoods(query) {
  const q = String(query || '').trim();
  if (!q) return [];

  try {
    await ensureIndbDataLoaded();
  } catch (err) {
    console.warn('[NutritionProvider] INDB load failed:', err?.message || err);
  }

  let indbResults = [];
  try {
    indbResults = await searchIndbFoods({ query: q, limit: 10 });
  } catch (err) {
    console.warn('[NutritionProvider] INDB search failed:', err?.message || err);
  }

  if (indbResults.length > 0) {
    return indbResults.slice(0, 10);
  }

  try {
    const fallback = await searchOpenFoodFactsFoods({ query: q, pageSize: 10 });
    return Array.isArray(fallback) ? fallback.slice(0, 10) : [];
  } catch (err) {
    console.warn('[NutritionProvider] OpenFoodFacts fallback failed:', err?.message || err);
    return [];
  }
}

module.exports = { searchFoods };

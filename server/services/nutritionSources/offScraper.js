const axios = require('axios');

/**
 * Searches OpenFoodFacts for food items.
 * returns top 5 results.
 */
async function searchOff(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'LifeSync - Node.js - Nutrition Tracker'
      }
    });

    if (!data.products) return [];

    return data.products.map(p => ({
      id: p.code,
      displayName: p.product_name || 'Unknown Product',
      brand: p.brands,
      calories: p.nutriments?.['energy-kcal_100g'] || 0,
      protein: p.nutriments?.protein_100g || 0,
      carbs: p.nutriments?.carbohydrates_100g || 0,
      fat: p.nutriments?.fat_100g || 0,
      fiber: p.nutriments?.fiber_100g || 0,
      servingQty: '100',
      servingUnit: 'g',
      // Store full nutriments for ingestion mapping
      nutrients: p.nutriments,
      imageUrl: p.image_url,
      source: 'OpenFoodFacts'
    }));
  } catch (err) {
    console.error('[OffScraper] Search failed:', err.message);
    throw err;
  }
}

module.exports = { searchOff };

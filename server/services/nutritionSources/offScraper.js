const axios = require('axios');

/**
 * Maps OFF nutriments to INDB keys and normalizes units.
 * OFF values are usually per 100g.
 * INDB units: kcal, g (macros), mg (minerals/fats), ug (vitamins/selenium).
 */
function mapOffToIndb(n) {
  if (!n) return {};
  
  const safe = (v) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };

  // Conversion helpers
  const gToMg = (v) => Math.round(safe(v) * 1000);
  const mgToUg = (v) => Math.round(safe(v) * 1000);
  const gToUg = (v) => Math.round(safe(v) * 1000000);

  return {
    energy_kcal: safe(n['energy-kcal_100g'] || n['energy-kcal']),
    protein_g: safe(n.proteins_100g || n.proteins),
    carb_g: safe(n.carbohydrates_100g || n.carbohydrates),
    fat_g: safe(n.fat_100g || n.fat),
    fibre_g: safe(n.fiber_100g || n.fiber),
    freesugar_g: safe(n.sugars_100g || n.sugars),
    
    sfa_mg: gToMg(n['saturated-fat_100g'] || n['saturated-fat']),
    mufa_mg: gToMg(n['monounsaturated-fat_100g'] || n['monounsaturated-fat']),
    pufa_mg: gToMg(n['polyunsaturated-fat_100g'] || n['polyunsaturated-fat']),
    cholesterol_mg: safe(n.cholesterol_100g || n.cholesterol), // OFF cholesterol is often in mg already, but check
    
    calcium_mg: safe(n.calcium_100g || n.calcium), // OFF minerals are often mg/100g
    phosphorus_mg: safe(n.phosphorus_100g || n.phosphorus),
    magnesium_mg: safe(n.magnesium_100g || n.magnesium),
    sodium_mg: safe(n.sodium_100g || n.sodium),
    potassium_mg: safe(n.potassium_100g || n.potassium),
    iron_mg: safe(n.iron_100g || n.iron),
    copper_mg: safe(n.copper_100g || n.copper),
    zinc_mg: safe(n.zinc_100g || n.zinc),
    manganese_mg: safe(n.manganese_100g || n.manganese),
    
    selenium_ug: safe(n.selenium_100g || n.selenium),
    
    vita_ug: safe(n['vitamin-a_100g'] || n['vitamin-a']),
    vitc_mg: safe(n['vitamin-c_100g'] || n['vitamin-c']),
    vite_mg: safe(n['vitamin-e_100g'] || n['vitamin-e']),
    vitd_ug: safe(n['vitamin-d_100g'] || n['vitamin-d']),
    vitk_ug: safe(n['vitamin-k_100g'] || n['vitamin-k']),
    
    vitb1_mg: safe(n['vitamin-b1_100g'] || n['vitamin-b1']),
    vitb2_mg: safe(n['vitamin-b2_100g'] || n['vitamin-b2']),
    vitb3_mg: safe(n['vitamin-pp_100g'] || n['vitamin-pp'] || n['vitamin-b3_100g']),
    vitb5_mg: safe(n['pantothenic-acid_100g'] || n['pantothenic-acid']),
    vitb6_mg: safe(n['vitamin-b6_100g'] || n['vitamin-b6']),
    vitb9_ug: safe(n['folates_100g'] || n['folates'] || n['folate_100g']),
    vitb12_ug: safe(n['vitamin-b12_100g'] || n['vitamin-b12']),
  };
}

/**
 * Searches OpenFoodFacts for food items.
 * returns top 5 results.
 */
async function searchOff(query) {
  // Try regional domain for better luck with specific foods (e.g. Indian foods)
  const domains = ['world', 'in', 'us'];
  let lastError = null;

  for (const domain of domains) {
    const url = `https://${domain}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`;
    
    try {
      console.log(`[OffScraper] Searching OFF (${domain}):`, url);
      const { data } = await axios.get(url, {
        headers: {
          // Sometimes browser-like UA works better when 503s occur
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      if (data && data.products && Array.isArray(data.products)) {
        console.log(`[OffScraper] Found ${data.products.length} products on ${domain}`);
        return data.products.map(p => {
          const mappedNutrients = mapOffToIndb(p.nutriments || {});
          return {
            id: p.code || `off-${Math.random()}`,
            displayName: p.product_name || p.product_name_en || 'Unknown Product',
            brand: p.brands || 'Generic',
            calories: mappedNutrients.energy_kcal || 0,
            protein: mappedNutrients.protein_g || 0,
            carbs: mappedNutrients.carb_g || 0,
            fat: mappedNutrients.fat_g || 0,
            fiber: mappedNutrients.fibre_g || 0,
            servingQty: '100',
            servingUnit: 'g',
            nutrients: mappedNutrients,
            imageUrl: p.image_url || p.image_front_url || p.image_small_url,
            source: 'OpenFoodFacts'
          };
        });
      }
    } catch (err) {
      console.warn(`[OffScraper] Search on ${domain} failed:`, err.message);
      lastError = err;
      // Continue to next domain
    }
  }

  console.error('[OffScraper] All OFF domains failed.');
  throw lastError || new Error('OFF Search failed');
}

module.exports = { searchOff };

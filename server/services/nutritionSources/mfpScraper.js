const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes MyFitnessPal for food search results.
 * Returns a list of candidate items.
 */
async function scrapeMfpSearch(query) {
  const url = `https://www.myfitnesspal.com/food/calorie-chart-nutrition-facts/${encodeURIComponent(query)}`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      }
    });

    const $ = cheerio.load(data);
    console.log('[MfpScraper] Page title:', $('title').text());
    console.log('[MfpScraper] Body snippet:', $('body').text().slice(0, 500).replace(/\s+/g, ' '));
    
    // MFP search results are often in a JSON blob inside a script tag starting with window.__INITIAL_STATE__
    const scripts = $('script');
    console.log(`[MfpScraper] Found ${scripts.length} script tags`);
    let state = null;
    
    scripts.each((i, el) => {
      const content = $(el).html();
      if (content && content.includes('__NEXT_DATA__')) {
        try {
          const json = JSON.parse(content);
          console.log('[MfpScraper] Found __NEXT_DATA__');
          state = json;
        } catch (e) {
          console.error('[MfpScraper] Failed to parse JSON:', e.message);
        }
      }
    });

    if (state && state.props && state.props.pageProps) {
      console.log('[MfpScraper] pageProps keys:', Object.keys(state.props.pageProps));
      const items = state.props.pageProps.items || state.props.pageProps.searchResult?.items || [];
      if (items.length > 0) {
        console.log(`[MfpScraper] Found ${items.length} items in pageProps`);
        return items.map(item => ({
          id: item.id || item.item_id,
          displayName: item.item_name || item.food_name,
          brand: item.brand_name,
          calories: item.nf_calories || item.calories,
          protein: item.nf_protein || item.protein,
          carbs: item.nf_total_carbohydrate || item.carbohydrates,
          fat: item.nf_total_fat || item.fat,
          servingQty: item.nf_serving_size_qty || item.serving_qty,
          servingUnit: item.nf_serving_size_unit || item.serving_unit,
          servingWeightG: item.nf_serving_weight_grams || item.serving_weight_grams,
          nutrients: item
        }));
      }
    }

    // Fallback: If NEXT_DATA is empty or missing, parse raw links from the HTML
    console.log('[MfpScraper] Falling back to raw HTML link parsing...');
    const results = [];
    const seenLinks = new Set();
    
    // Look for links like /food/calories/peanuts-12345
    $('a[href*="/food/calories/"]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      if (href && !seenLinks.has(href) && results.length < 5) {
        seenLinks.add(href);
        // Try to extract name and basic info from text
        // Usually looks like "Peanut Butter, 1 tbsp (16g) - 95 cal"
        results.push({
          id: href.split('/').pop(),
          displayName: text || 'Unknown MFP Item',
          href: `https://www.myfitnesspal.com${href}`,
          isLinkOnly: true // Flag that we need to fetch details
        });
      }
    });

    return results;

    console.log('[MfpScraper] No items found in state structure');
    return [];
    $('.jss1').each((i, el) => { // This class might change, but it's a fallback
       // ... implement fallback if needed
    });

    return results;
  } catch (err) {
    console.error('[MfpScraper] Search failed:', err.message);
    throw err;
  }
}

/**
 * Fetches detailed nutrition for a specific MFP item using axios.
 * Mimics the data-testid extraction from 1.py.
 */
async function getMfpFoodDetails(foodUrl) {
  try {
    const { data } = await axios.get(foodUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://www.myfitnesspal.com/food/search'
      }
    });

    const $ = cheerio.load(data);
    const nutrition = {};

    // Helper to extract by test-id suffix
    const getVal = (id) => $(`[data-testid="${id}-value"]`).text().trim() || '0';

    nutrition.displayName = $('h1').text().trim() || $('[data-testid="qa-regression-food-description"]').text().trim();
    nutrition.calories = parseFloat(getVal('qa-regression-energy')) || 0;
    nutrition.protein = parseFloat(getVal('qa-regression-protein')) || 0;
    nutrition.carbs = parseFloat(getVal('qa-regression-total-carbs')) || 0;
    nutrition.fat = parseFloat(getVal('qa-regression-total-fat')) || 0;
    nutrition.fiber = parseFloat(getVal('qa-regression-dietary-fiber')) || 0;
    nutrition.sugar = parseFloat(getVal('qa-regression-sugars')) || 0;
    nutrition.sodium = parseFloat(getVal('qa-regression-sodium')) || 0;
    nutrition.potassium = parseFloat(getVal('qa-regression-potassium')) || 0;

    // Serving info
    nutrition.servingQty = $('input[data-testid="qa-regression-servings-input-field"]').val() || '1';
    nutrition.servingUnit = $('div[role="combobox"]').first().text().trim() || 'serving';

    return nutrition;
  } catch (err) {
    console.error('[MfpScraper] Detail fetch failed:', err.message);
    throw err;
  }
}

module.exports = { scrapeMfpSearch, getMfpFoodDetails };

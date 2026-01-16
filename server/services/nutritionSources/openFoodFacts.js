// Minimal Open Food Facts nutrient lookup for enrichment.
// This is used for deterministic import/backfill of micronutrients when available.

const BASE = 'https://world.openfoodfacts.org';

function toNumber(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function unitToFactorToMg(unit) {
  const u = String(unit || '').trim().toLowerCase();
  if (!u) return null;
  if (u === 'mg') return 1;
  if (u === 'g') return 1000;
  if (u === 'µg' || u === 'ug') return 0.001;
  return null;
}

function normalizeToMg(value, unit) {
  const n = toNumber(value);
  if (n == null) return null;
  const f = unitToFactorToMg(unit);
  if (f == null) return null;
  return n * f;
}

function normalizeToG(value, unit) {
  const n = toNumber(value);
  if (n == null) return null;
  const u = String(unit || '').trim().toLowerCase();
  if (!u) return null;
  if (u === 'g') return n;
  if (u === 'mg') return n / 1000;
  if (u === 'µg' || u === 'ug') return n / 1_000_000;
  return null;
}

function pickNutriment(nutriments, key) {
  if (!nutriments || typeof nutriments !== 'object') return { value: null, unit: null };
  const value = nutriments[`${key}_100g`] ?? nutriments[key];
  const unit = nutriments[`${key}_unit`] ?? nutriments[`${key}_100g_unit`];
  return { value, unit };
}

async function searchOpenFoodFactsFirstProduct({ query, pageSize = 5 }) {
  const q = String(query || '').trim();
  if (!q) return null;

  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=${pageSize}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'LifeSync/1.0 (micros-enrichment)' } });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const products = Array.isArray(data?.products) ? data.products : [];
  return products.find((p) => p && p.nutriments) || null;
}

function extractMicrosPer100g(product) {
  const nutriments = product?.nutriments;
  if (!nutriments || typeof nutriments !== 'object') return null;

  // Minerals (store as mg per 100g)
  const sodium = (() => {
    const { value, unit } = pickNutriment(nutriments, 'sodium');
    // OFF sodium is often in g/100g.
    const mg = normalizeToMg(value, unit || 'g');
    return mg;
  })();

  const potassium = (() => {
    const { value, unit } = pickNutriment(nutriments, 'potassium');
    return normalizeToMg(value, unit || 'mg');
  })();

  const calcium = (() => {
    const { value, unit } = pickNutriment(nutriments, 'calcium');
    return normalizeToMg(value, unit || 'mg');
  })();

  const iron = (() => {
    const { value, unit } = pickNutriment(nutriments, 'iron');
    return normalizeToMg(value, unit || 'mg');
  })();

  const magnesium = (() => {
    const { value, unit } = pickNutriment(nutriments, 'magnesium');
    return normalizeToMg(value, unit || 'mg');
  })();

  const zinc = (() => {
    const { value, unit } = pickNutriment(nutriments, 'zinc');
    return normalizeToMg(value, unit || 'mg');
  })();

  // Vitamins (store as mg per 100g)
  const vitaminC = (() => {
    const { value, unit } = pickNutriment(nutriments, 'vitamin-c');
    return normalizeToMg(value, unit || 'mg');
  })();

  // Vitamin B is not a single nutrient; use B6 as a pragmatic proxy if present.
  const vitaminB = (() => {
    const { value, unit } = pickNutriment(nutriments, 'vitamin-b6');
    return normalizeToMg(value, unit || 'mg');
  })();

  // Omega-3 (store as g per 100g)
  const omega3 = (() => {
    const { value, unit } = pickNutriment(nutriments, 'omega-3-fat');
    return normalizeToG(value, unit || 'g');
  })();

  const out = {
    sodium,
    potassium,
    iron,
    calcium,
    vitaminB,
    magnesium,
    zinc,
    vitaminC,
    omega3,
  };

  // If everything is null, treat as no micros.
  if (Object.values(out).every((v) => v == null)) return null;
  return out;
}

async function lookupMicrosPer100g({ query }) {
  const product = await searchOpenFoodFactsFirstProduct({ query });
  if (!product) return { micros: null, source: null };

  const micros = extractMicrosPer100g(product);
  if (!micros) return { micros: null, source: null };

  return {
    micros,
    source: {
      kind: 'open_food_facts',
      url: product?.url || null,
      code: product?.code || null,
      product_name: product?.product_name || null,
      brands: product?.brands || null,
    },
  };
}

module.exports = {
  lookupMicrosPer100g,
};

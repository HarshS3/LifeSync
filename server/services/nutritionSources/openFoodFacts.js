// Minimal Open Food Facts nutrient lookup for enrichment.
// This is used for deterministic import/backfill of micronutrients when available.

const BASE = 'https://world.openfoodfacts.org';

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

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

function extractSearchResultFood(product) {
  const n = product?.nutriments || {};
  const servingQty = safeNumber(product?.serving_quantity) || 100;
  const servingUnit = product?.serving_quantity_unit || 'g';
  const servingLabel = [product?.serving_size, `${servingQty} ${servingUnit}`]
    .map((value) => String(value || '').trim())
    .find(Boolean) || `${servingQty} ${servingUnit}`;

  return {
    id: String(product?.code || product?._id || product?.id || ''),
    name: product?.product_name || product?.generic_name || product?.brands || 'Unknown food',
    brand: product?.brands || null,
    servingQty,
    servingUnit,
    servingLabel,
    calories: safeNumber(n['energy-kcal_100g'] ?? n.energy_kcal_100g ?? n['energy-kcal']),
    protein: safeNumber(n.proteins_100g ?? n.proteins),
    carbs: safeNumber(n.carbohydrates_100g ?? n.carbohydrates),
    fat: safeNumber(n.fat_100g ?? n.fat),
    fiber: safeNumber(n.fiber_100g ?? n.fiber),
    sugar: safeNumber(n.sugars_100g ?? n.sugars),
    saturatedFat: safeNumber(n['saturated-fat_100g'] ?? n.saturated_fat_100g ?? n['saturated-fat']),
    monounsaturatedFat: safeNumber(n['monounsaturated-fat_100g'] ?? n.monounsaturated_fat_100g ?? n['monounsaturated-fat']),
    polyunsaturatedFat: safeNumber(n['polyunsaturated-fat_100g'] ?? n.polyunsaturated_fat_100g ?? n['polyunsaturated-fat']),
    sodium: safeNumber(n.sodium_100g ?? n.sodium) * 1000,
    potassium: safeNumber(n.potassium_100g ?? n.potassium),
    iron: safeNumber(n.iron_100g ?? n.iron),
    calcium: safeNumber(n.calcium_100g ?? n.calcium),
    vitaminB: safeNumber(n['vitamin-b6_100g'] ?? n['vitamin-b6'] ?? n.vitamin_b6_100g),
    magnesium: safeNumber(n.magnesium_100g ?? n.magnesium),
    zinc: safeNumber(n.zinc_100g ?? n.zinc),
    vitaminC: safeNumber(n['vitamin-c_100g'] ?? n['vitamin-c'] ?? n.vitamin_c_100g),
    omega3: safeNumber(n['omega-3-fat_100g'] ?? n['omega-3-fat'] ?? n.omega_3_fat_100g),
    _local: {
      kind: 'open_food_facts_fallback',
      url: product?.url || null,
      code: product?.code || null,
    },
  };
}

async function searchOpenFoodFactsFoods({ query, pageSize = 10 }) {
  const q = String(query || '').trim();
  if (!q) return [];

  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=${Math.max(1, Math.min(pageSize, 25))}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'LifeSync/1.0 (food-search-fallback)' } });
  if (!res.ok) return [];

  const data = await res.json().catch(() => null);
  const products = Array.isArray(data?.products) ? data.products : [];
  return products.map(extractSearchResultFood).filter((p) => p && p.name);
}

function normalizeBarcodeResult(product) {
  const n = product?.nutriments || {};
  return {
    barcode: String(product?.code || ''),
    name: product?.product_name || product?.generic_name || 'Unknown product',
    brand: product?.brands || null,
    quantityLabel: product?.quantity || null,
    servingSize: product?.serving_size || null,
    imageUrl: product?.image_front_url || product?.image_url || null,
    nutrimentsPer100g: {
      caloriesKcal: safeNumber(n['energy-kcal_100g'] ?? n.energy_kcal_100g ?? n['energy-kcal']),
      proteinG: safeNumber(n.proteins_100g ?? n.proteins),
      carbsG: safeNumber(n.carbohydrates_100g ?? n.carbohydrates),
      fatG: safeNumber(n.fat_100g ?? n.fat),
      fiberG: safeNumber(n.fiber_100g ?? n.fiber),
      saturatedFatG: safeNumber(n['saturated-fat_100g'] ?? n.saturated_fat_100g ?? n['saturated-fat']),
      monounsaturatedFatG: safeNumber(n['monounsaturated-fat_100g'] ?? n.monounsaturated_fat_100g ?? n['monounsaturated-fat']),
      polyunsaturatedFatG: safeNumber(n['polyunsaturated-fat_100g'] ?? n.polyunsaturated_fat_100g ?? n['polyunsaturated-fat']),
      sodiumMg: safeNumber(n.sodium_100g ?? n.sodium) * 1000,
      potassiumMg: safeNumber(n.potassium_100g ?? n.potassium),
      calciumMg: safeNumber(n.calcium_100g ?? n.calcium),
      ironMg: safeNumber(n.iron_100g ?? n.iron),
      magnesiumMg: safeNumber(n.magnesium_100g ?? n.magnesium),
      zincMg: safeNumber(n.zinc_100g ?? n.zinc),
      vitaminCMg: safeNumber(n['vitamin-c_100g'] ?? n['vitamin-c'] ?? n.vitamin_c_100g),
      vitaminB12Ug: safeNumber(n['vitamin-b12_100g'] ?? n['vitamin-b12'] ?? n.vitamin_b12_100g),
      vitaminDUg: safeNumber(n['vitamin-d_100g'] ?? n['vitamin-d'] ?? n.vitamin_d_100g),
      omega3G: safeNumber(n['omega-3-fat_100g'] ?? n['omega-3-fat'] ?? n.omega_3_fat_100g),
    },
    source: {
      kind: 'open_food_facts_barcode',
      url: product?.url || null,
    },
  };
}

async function lookupOpenFoodFactsByBarcode({ barcode }) {
  const code = String(barcode || '').trim();
  if (!/^\d{8,14}$/.test(code)) {
    return { ok: false, error: 'Invalid barcode format' };
  }

  const url = `${BASE}/api/v2/product/${encodeURIComponent(code)}.json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'LifeSync/1.0 (barcode-lookup)' } });
  if (!res.ok) {
    return { ok: false, error: `Lookup failed (${res.status})` };
  }

  const data = await res.json().catch(() => null);
  const product = data?.product;
  if (!product) {
    return { ok: false, error: 'Product not found' };
  }

  return {
    ok: true,
    product: normalizeBarcodeResult(product),
  };
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
  searchOpenFoodFactsFoods,
  lookupOpenFoodFactsByBarcode,
};

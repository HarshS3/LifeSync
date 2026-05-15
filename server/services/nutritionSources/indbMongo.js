const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const IndbFood = require('../../models/IndbFood');

const DEFAULT_SOURCE_FILE_NAME = process.env.INDB_SOURCE_FILE || 'INDB.xlsx';
const DEFAULT_SOURCE_FILE_PATH = path.resolve(__dirname, '../../../', DEFAULT_SOURCE_FILE_NAME);

function toSafeString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeText(value) {
  return toSafeString(value).toLowerCase();
}

function parseLooseNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const cleaned = String(value)
    .replace(/,/g, '')
    .replace(/[^0-9.+-]/g, '')
    .trim();

  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function columnArrayToMap(columns) {
  const map = new Map();
  for (const c of columns || []) {
    if (!c || !c.key) continue;
    map.set(normalizeText(c.key), c.value);
  }
  return map;
}

function firstNonEmpty(map, candidateKeys) {
  for (const key of candidateKeys) {
    const v = map.get(normalizeText(key));
    if (v == null) continue;
    const s = toSafeString(v);
    if (s) return v;
  }
  return null;
}

function firstNumeric(map, candidateKeys) {
  for (const key of candidateKeys) {
    const v = map.get(normalizeText(key));
    const n = parseLooseNumber(v);
    if (n != null) return n;
  }
  return 0;
}

function firstAvailableNumeric(map, candidateKeys) {
  for (const key of candidateKeys) {
    const value = map.get(normalizeText(key));
    const parsed = parseLooseNumber(value);
    if (parsed != null) return parsed;
  }
  return null;
}

function isPlausibleUnitServing({ baseCalories, unitCalories, baseFat, unitFat, baseCarbs, unitCarbs, baseProtein, unitProtein }) {
  if (unitCalories == null) return false;
  if (unitCalories <= 0) return false;

  if (unitCalories > 1500) return false;
  if (unitFat != null && unitFat > 150) return false;
  if (unitCarbs != null && unitCarbs > 300) return false;
  if (unitProtein != null && unitProtein > 120) return false;

  const scaleCandidates = [
    baseCalories > 0 ? unitCalories / baseCalories : null,
    baseFat > 0 ? unitFat / baseFat : null,
    baseCarbs > 0 ? unitCarbs / baseCarbs : null,
    baseProtein > 0 ? unitProtein / baseProtein : null,
  ].filter((value) => Number.isFinite(value) && value > 0);

  if (scaleCandidates.length === 0) return true;

  const maxScale = Math.max(...scaleCandidates);
  return maxScale <= 5;
}

function median(values) {
  const nums = (values || []).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function inferServingWeightG({ baseCalories, unitCalories, baseProtein, unitProtein, baseCarbs, unitCarbs, baseFat, unitFat, baseFiber, unitFiber }) {
  const ratios = [
    baseCalories > 0 && unitCalories > 0 ? unitCalories / baseCalories : null,
    baseProtein > 0 && unitProtein > 0 ? unitProtein / baseProtein : null,
    baseCarbs > 0 && unitCarbs > 0 ? unitCarbs / baseCarbs : null,
    baseFat > 0 && unitFat > 0 ? unitFat / baseFat : null,
    baseFiber > 0 && unitFiber > 0 ? unitFiber / baseFiber : null,
  ].filter((value) => Number.isFinite(value) && value > 0);

  if (!ratios.length) return null;

  const medRatio = median(ratios);
  if (!Number.isFinite(medRatio) || medRatio <= 0) return null;

  const maxDeviation = Math.max(...ratios.map((value) => Math.abs(value - medRatio) / medRatio));
  if (maxDeviation > 0.25) return null;

  const inferredWeightG = Math.round(medRatio * 100);
  if (inferredWeightG <= 0 || inferredWeightG > 2000) return null;
  return inferredWeightG;
}

function getDisplayNameFromRow(row) {
  const priority = [
    'food_name',
    'food name',
    'item_name',
    'item name',
    'name',
    'description',
    'food',
    'item',
  ];

  for (const key of priority) {
    if (!(key in row)) continue;
    const v = toSafeString(row[key]);
    if (v) return v;
  }

  for (const [k, v] of Object.entries(row || {})) {
    if (!k) continue;
    const kn = normalizeText(k);
    if (kn.includes('name') || kn.includes('food') || kn.includes('item')) {
      const text = toSafeString(v);
      if (text) return text;
    }
  }

  return '';
}

function rowToColumns(row) {
  return Object.entries(row || {}).map(([key, value]) => ({ key: String(key), value: value ?? null }));
}

function buildSearchText(row) {
  return Object.values(row || {})
    .map((v) => toSafeString(v).toLowerCase())
    .filter(Boolean)
    .join(' | ');
}

function buildFingerprints(row) {
  const set = new Set();
  for (const value of Object.values(row || {})) {
    const text = normalizeText(value);
    if (!text) continue;
    set.add(text);
    for (const part of text.split(/\s+/g)) {
      if (part.length >= 3) set.add(part);
    }
  }
  return Array.from(set).slice(0, 80);
}

function toSearchResult(doc) {
  const map = columnArrayToMap(doc.columns);
  const displayName = doc.displayName || toSafeString(firstNonEmpty(map, ['name', 'food_name', 'item_name'])) || 'Unknown food';
  const unitServingUnit = toSafeString(firstNonEmpty(map, ['servings_unit', 'serving_unit', 'serving unit']));
  const baseCalories = firstNumeric(map, ['calories', 'energy_kcal', 'energy (kcal)', 'kcal', 'energy']);
  const baseProtein = firstNumeric(map, ['protein', 'protein_g', 'protein (g)']);
  const baseCarbs = firstNumeric(map, ['carbs', 'carbohydrate', 'carbohydrates', 'carbohydrate_g', 'carb', 'carb_g']);
  const baseFat = firstNumeric(map, ['fat', 'total_fat', 'fat_g']);
  const unitCalories = firstAvailableNumeric(map, ['unit_serving_energy_kcal', 'unit_serving_kcal']);
  const unitProtein = firstAvailableNumeric(map, ['unit_serving_protein_g']);
  const unitCarbs = firstAvailableNumeric(map, ['unit_serving_carb_g', 'unit_serving_carb']);
  const unitFat = firstAvailableNumeric(map, ['unit_serving_fat_g']);
  const baseFiber = firstNumeric(map, ['fiber', 'dietary_fiber', 'fibre', 'fibre_g', 'fiber_g']);
  const unitFiber = firstAvailableNumeric(map, ['unit_serving_fibre_g', 'unit_serving_fiber_g']);
  const hasUnitServing =
    !!unitServingUnit &&
    isPlausibleUnitServing({
      baseCalories,
      unitCalories,
      baseFat,
      unitFat,
      baseCarbs,
      unitCarbs,
      baseProtein,
      unitProtein,
    });
  const servingQty = hasUnitServing
    ? 1
    : firstNumeric(map, ['serving_qty', 'serving quantity', 'serving_size', 'serving size', 'quantity', 'qty']) || 100;
  const servingUnit = hasUnitServing
    ? unitServingUnit
    : toSafeString(firstNonEmpty(map, ['serving_unit', 'serving unit', 'unit', 'uom', 'measure'])) || 'g';

  // 1. First, try to extract weight from unit/label if it's explicitly mentioned (e.g. "130 gram" or "41 grams")
  // This is the most accurate source of truth.
  let finalServingWeightG = null;
  const weightMatch = servingUnit.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|gm|ml)s?/i);
  if (weightMatch) {
    finalServingWeightG = parseFloat(weightMatch[1]);
  } else if (servingQty > 1) {
    const unitLower = servingUnit.toLowerCase().trim();
    if (['g', 'gram', 'grams', 'gm', 'gms', 'ml', 'mls'].includes(unitLower)) {
      // e.g. Qty: 41, Unit: grams
      finalServingWeightG = servingQty;
    }
  }

  // 2. If no explicit weight, try to infer it from nutrition ratios (standardized to 100g)
  let wasInferred = false;
  if (finalServingWeightG == null && hasUnitServing) {
    finalServingWeightG = inferServingWeightG({
      baseCalories,
      unitCalories,
      baseProtein,
      unitProtein,
      baseCarbs,
      unitCarbs,
      baseFat,
      unitFat,
      baseFiber,
      unitFiber,
    });
    if (finalServingWeightG != null) wasInferred = true;
  }

  const pickValue = (unitServingKeys, baseKeys) => {
    const val = hasUnitServing ? firstNumeric(map, [...unitServingKeys, ...baseKeys]) : firstNumeric(map, [...baseKeys, ...unitServingKeys]);
    return (Number.isFinite(val)) ? val : 0;
  };

  const calories = pickValue(['unit_serving_energy_kcal', 'unit_serving_kcal'], ['calories', 'energy_kcal', 'energy (kcal)', 'kcal', 'energy']);
  const protein = pickValue(['unit_serving_protein_g'], ['protein', 'protein_g', 'protein (g)']);
  const carbs = pickValue(['unit_serving_carb_g', 'unit_serving_carb'], ['carbs', 'carbohydrate', 'carbohydrates', 'carbohydrate_g', 'carb', 'carb_g']);
  const fat = pickValue(['unit_serving_fat_g'], ['fat', 'total_fat', 'fat_g']);
  const fiber = pickValue(['unit_serving_fibre_g', 'unit_serving_fiber_g'], ['fiber', 'dietary_fiber', 'fibre', 'fibre_g', 'fiber_g']);
  const sugar = pickValue(['unit_serving_freesugar_g', 'unit_serving_sugar_g'], ['sugar', 'sugars', 'total_sugar', 'freesugar_g', 'sugar_g']);
  const sodium = pickValue(['unit_serving_sodium_mg'], ['sodium', 'sodium_mg']);
  const potassium = pickValue(['unit_serving_potassium_mg'], ['potassium', 'potassium_mg']);
  const iron = pickValue(['unit_serving_iron_mg'], ['iron', 'iron_mg']);
  const calcium = pickValue(['unit_serving_calcium_mg'], ['calcium', 'calcium_mg']);
  const magnesium = pickValue(['unit_serving_magnesium_mg'], ['magnesium', 'magnesium_mg']);
  const zinc = pickValue(['unit_serving_zinc_mg'], ['zinc', 'zinc_mg']);
  // Keep vitaminB strict to explicit aggregate vitamin-B columns, not proxies from individual B vitamins.
  const vitaminB = pickValue(
    ['unit_serving_vitamin_b_mg', 'unit_serving_vitb_mg'],
    ['vitamin_b', 'vitamin b', 'vitb_mg']
  );
  const vitaminC = pickValue(['unit_serving_vitc_mg', 'unit_serving_vitamin_c_mg'], ['vitamin_c', 'vitamin c', 'vitamin_c_mg', 'vitc_mg']);
  // Keep omega3 in API shape, but only from explicit omega-3 source columns.
  const omega3 = pickValue(['unit_serving_omega3_g', 'unit_serving_omega_3_g'], ['omega3', 'omega_3', 'omega-3']);
    // INDB returns fats in mg natively. Core app standardizes all fat macros in grams.
    const saturatedFat = (pickValue(['unit_serving_sfa_mg'], ['sfa_mg', 'saturated_fat_mg']) || 0) / 1000;
    const monounsaturatedFat = (pickValue(['unit_serving_mufa_mg'], ['mufa_mg']) || 0) / 1000;
    const polyunsaturatedFat = (pickValue(['unit_serving_pufa_mg'], ['pufa_mg']) || 0) / 1000;
  const cholesterol = pickValue(['unit_serving_cholesterol_mg'], ['cholesterol_mg']);
  const phosphorus = pickValue(['unit_serving_phosphorus_mg'], ['phosphorus_mg']);
  const copper = pickValue(['unit_serving_copper_mg'], ['copper_mg']);
  const selenium = pickValue(['unit_serving_selenium_ug'], ['selenium_ug']);
  const manganese = pickValue(['unit_serving_manganese_mg'], ['manganese_mg']);
  const vitaminA = pickValue(['unit_serving_vita_ug'], ['vita_ug']);
  const vitaminE = pickValue(['unit_serving_vite_mg'], ['vite_mg']);
  const vitaminD2 = pickValue(['unit_serving_vitd2_ug'], ['vitd2_ug']);
  const vitaminD3 = pickValue(['unit_serving_vitd3_ug'], ['vitd3_ug']);
  const vitaminDRaw = pickValue(['unit_serving_vitd_ug'], ['vitd_ug', 'vitamin_d_ug']);
  const vitaminD = (Number.isFinite(vitaminD2 + vitaminD3) && (vitaminD2 + vitaminD3) > 0) ? (vitaminD2 + vitaminD3) : vitaminDRaw;
  const vitaminB1 = pickValue(['unit_serving_vitb1_mg'], ['vitb1_mg', 'thiamin_mg']);
  const vitaminB2 = pickValue(['unit_serving_vitb2_mg'], ['vitb2_mg', 'riboflavin_mg']);
  const vitaminB3 = pickValue(['unit_serving_vitb3_mg'], ['vitb3_mg', 'niacin_mg']);
  const vitaminB5 = pickValue(['unit_serving_vitb5_mg'], ['vitb5_mg', 'pantothenic_acid_mg']);
  const vitaminB6 = pickValue(['unit_serving_vitb6_mg'], ['vitb6_mg']);
  const vitaminB7 = pickValue(['unit_serving_vitb7_ug'], ['vitb7_ug', 'biotin_ug']);
  const vitaminB9 = pickValue(['unit_serving_vitb9_ug', 'unit_serving_folate_ug'], ['vitb9_ug', 'folate_ug']);
  const vitaminB12 = pickValue(['unit_serving_vitb12_ug'], ['vitb12_ug']);
  const folate = pickValue(['unit_serving_folate_ug', 'unit_serving_vitb9_ug'], ['folate_ug', 'vitb9_ug']);

  return {
    id: `indb:${doc.sheetName}:${doc.rowNumber}`,
    name: displayName,
    brand: toSafeString(firstNonEmpty(map, ['brand', 'brand_name', 'company'])) || null,
    servingQty,
    servingUnit,
    servingLabel: formatServingLabel(servingQty, servingUnit),
    servingWeightG: finalServingWeightG,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    potassium,
    iron,
    calcium,
    vitaminB,
    magnesium,
    zinc,
    vitaminC,
    omega3,
    saturatedFat,
    monounsaturatedFat,
    polyunsaturatedFat,
    cholesterol,
    phosphorus,
    copper,
    selenium,
    manganese,
    vitaminA,
    vitaminE,
    vitaminD2,
    vitaminD3,
    vitaminD,
    vitaminB1,
    vitaminB2,
    vitaminB3,
    vitaminB5,
    vitaminB6,
    vitaminB7,
    vitaminB9,
    vitaminB12,
    folate,
    _local: {
      kind: 'indb',
      sheetName: doc.sheetName,
      rowNumber: doc.rowNumber,
      sourceFile: doc.sourceFile,
      servingWeightSource: wasInferred ? 'inferred_from_unit_serving_ratio' : (finalServingWeightG != null ? 'explicit_label' : null),
      columns: doc.columns,
    },
  };
}

function formatServingLabel(qty, unit) {
  const n = Number(qty);
  const safeUnit = toSafeString(unit);
  if (Number.isFinite(n) && safeUnit) return `${n} ${safeUnit}`;
  if (Number.isFinite(n)) return String(n);
  return safeUnit;
}

async function importIndbXlsxToMongo({
  filePath = DEFAULT_SOURCE_FILE_PATH,
  sourceFileName = path.basename(filePath),
  forceReimport = false,
} = {}) {
  if (!fs.existsSync(filePath)) {
    return {
      ok: false,
      importedRows: 0,
      skippedRows: 0,
      message: `INDB source file not found at ${filePath}`,
    };
  }

  if (forceReimport) {
    await IndbFood.deleteMany({ sourceFile: sourceFileName });
  }

  const workbook = XLSX.readFile(filePath, { cellDates: false });
  let importedRows = 0;
  let skippedRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      raw: false,
      blankrows: false,
    });

    for (let idx = 0; idx < rows.length; idx += 1) {
      const row = rows[idx] || {};
      const columns = rowToColumns(row);

      if (!columns.length) {
        skippedRows += 1;
        continue;
      }

      const rowNumber = idx + 2;
      const displayName = getDisplayNameFromRow(row);
      const searchText = buildSearchText(row);
      const fingerprints = buildFingerprints(row);

      await IndbFood.updateOne(
        { sourceFile: sourceFileName, sheetName, rowNumber },
        {
          $set: {
            sourceFile: sourceFileName,
            sheetName,
            rowNumber,
            columns,
            displayName,
            searchText,
            fingerprints,
          },
        },
        { upsert: true }
      );

      importedRows += 1;
    }
  }

  return {
    ok: true,
    importedRows,
    skippedRows,
    filePath,
    sourceFileName,
  };
}

async function ensureIndbDataLoaded({ filePath = DEFAULT_SOURCE_FILE_PATH } = {}) {
  const count = await IndbFood.estimatedDocumentCount();
  if (count > 0) return { loaded: true, imported: false, count };

  const out = await importIndbXlsxToMongo({ filePath, forceReimport: false });
  const newCount = await IndbFood.estimatedDocumentCount();
  return {
    loaded: out.ok,
    imported: true,
    count: newCount,
    details: out,
  };
}

async function searchIndbFoods({ query, limit = 10 } = {}) {
  const q = normalizeText(query);
  if (!q) return [];

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  const docs = await IndbFood.find({
    $or: [{ displayName: regex }, { searchText: regex }, { fingerprints: q }],
  })
    .sort({ updatedAt: -1 })
    .limit(Math.max(1, Math.min(limit, 30)));

  return docs.map(toSearchResult);
}

module.exports = {
  DEFAULT_SOURCE_FILE_PATH,
  importIndbXlsxToMongo,
  ensureIndbDataLoaded,
  searchIndbFoods,
  toSearchResult,
};

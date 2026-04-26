require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csvParse = require('csv-parse/sync');
const TarlaFood = require('../models/TarlaFood');

const indbKeys = [
  'food_code', 'food_name', 'primarysource', 'energy_kj', 'energy_kcal', 'carb_g', 'protein_g', 'fat_g',
  'freesugar_g', 'fibre_g', 'sfa_mg', 'mufa_mg', 'pufa_mg', 'cholesterol_mg', 'calcium_mg', 'phosphorus_mg',
  'magnesium_mg', 'sodium_mg', 'potassium_mg', 'iron_mg', 'copper_mg', 'selenium_ug', 'chromium_mg',
  'manganese_mg', 'molybdenum_mg', 'zinc_mg', 'vita_ug', 'vite_mg', 'vitd2_ug', 'vitd3_ug', 'vitk1_ug',
  'vitk2_ug', 'folate_ug', 'vitb1_mg', 'vitb2_mg', 'vitb3_mg', 'vitb5_mg', 'vitb6_mg', 'vitb7_ug',
  'vitb9_ug', 'vitc_mg', 'carotenoids_ug'
];

const tarlaToIndbMap = {
  energy_value: 'energy_kcal',
  carbohydrates_value: 'carb_g',
  protein_value: 'protein_g',
  fat_value: 'fat_g',
  fiber_value: 'fibre_g',
  cholesterol_value: 'cholesterol_mg',
  calcium_value: 'calcium_mg',
  phosphorus_value: 'phosphorus_mg',
  magnesium_value: 'magnesium_mg',
  sodium_value: 'sodium_mg',
  potassium_value: 'potassium_mg',
  iron_value: 'iron_mg',
  zinc_value: 'zinc_mg',
  vitamin_a_value: 'vita_ug',
  vitamin_e_value: 'vite_mg',
  vitamin_b1_thiamine_value: 'vitb1_mg',
  vitamin_b2_riboflavin_value: 'vitb2_mg',
  vitamin_b3_niacin_value: 'vitb3_mg',
  folic_acid_vitamin_b9_value: 'folate_ug',
  vitamin_c_value: 'vitc_mg',
};

function safeString(value) {
  return value == null ? '' : String(value).trim();
}

function parseServingQtyParts(rawQty, rawType) {
  const qtyText = safeString(rawQty);
  const typeText = safeString(rawType);

  const numericMatch = qtyText.match(/^\s*(\d+(?:\.\d+)?)\s*(.*)$/);
  if (numericMatch) {
    return {
      servingQty: numericMatch[1],
      servingSize: numericMatch[2].trim() || typeText || 'serving',
    };
  }

  return {
    servingQty: qtyText || '1',
    servingSize: typeText || 'serving',
  };
}

function buildColumnsArray(row) {
  const columnsArray = [];

  for (const key of indbKeys) {
    let value = '-';
    if (key === 'food_name') value = safeString(row.food_name) || '-';
    if (key === 'primarysource') value = 'Tarla Dalal CSV';

    const tarlaCol = Object.keys(tarlaToIndbMap).find((sourceKey) => tarlaToIndbMap[sourceKey] === key);
    if (tarlaCol) {
      const csvVal = safeString(row[tarlaCol]);
      if (csvVal) value = csvVal;
    }

    if (key === 'vitb9_ug') {
      const csvVal = safeString(row.folic_acid_vitamin_b9_value);
      if (csvVal) value = csvVal;
    }

    columnsArray.push({ key, value });
  }

  const extras = {
    serving_weight_g: safeString(row.serving_weight_grams_numeric) || '-',
    serving_type: safeString(row.serving_type) || '-',
    serving_phrase: safeString(row.serving_phrase) || '-',
    table_value_header: safeString(row.table_value_header) || '-',
    table_daily_value_header: safeString(row.table_daily_value_header) || '-',
    nutrient_count: safeString(row.nutrient_count) || '-',
    energy_daily_value_pct: safeString(row.energy_daily_value_pct) || '-',
    carbohydrates_daily_value_pct: safeString(row.carbohydrates_daily_value_pct) || '-',
    protein_daily_value_pct: safeString(row.protein_daily_value_pct) || '-',
    fat_daily_value_pct: safeString(row.fat_daily_value_pct) || '-',
    fiber_daily_value_pct: safeString(row.fiber_daily_value_pct) || '-',
    cholesterol_daily_value_pct: safeString(row.cholesterol_daily_value_pct) || '-',
    calcium_daily_value_pct: safeString(row.calcium_daily_value_pct) || '-',
    phosphorus_daily_value_pct: safeString(row.phosphorus_daily_value_pct) || '-',
    magnesium_daily_value_pct: safeString(row.magnesium_daily_value_pct) || '-',
    sodium_daily_value_pct: safeString(row.sodium_daily_value_pct) || '-',
    potassium_daily_value_pct: safeString(row.potassium_daily_value_pct) || '-',
    iron_daily_value_pct: safeString(row.iron_daily_value_pct) || '-',
    zinc_daily_value_pct: safeString(row.zinc_daily_value_pct) || '-',
    vitamin_a_daily_value_pct: safeString(row.vitamin_a_daily_value_pct) || '-',
    vitamin_e_daily_value_pct: safeString(row.vitamin_e_daily_value_pct) || '-',
    vitamin_b1_daily_value_pct: safeString(row.vitamin_b1_thiamine_daily_value_pct) || '-',
    vitamin_b2_daily_value_pct: safeString(row.vitamin_b2_riboflavin_daily_value_pct) || '-',
    vitamin_b3_daily_value_pct: safeString(row.vitamin_b3_niacin_daily_value_pct) || '-',
    folate_daily_value_pct: safeString(row.folic_acid_vitamin_b9_daily_value_pct) || '-',
    vitamin_c_daily_value_pct: safeString(row.vitamin_c_daily_value_pct) || '-',
  };

  Object.entries(extras).forEach(([key, value]) => {
    columnsArray.push({ key, value });
  });

  return columnsArray;
}

async function seedTarlaFoods() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await TarlaFood.deleteMany({});
    console.log('Cleared existing TarlaFood collection');

    const csvPath = path.join(
      __dirname,
      '../../scraping/output/tarladalal_full/tarladalal_calories_wide.csv'
    );
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const records = csvParse.parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    const tarlaDocs = records.map((row) => {
      const displayName = safeString(row.food_name) || 'Unknown Food';
      const { servingQty, servingSize } = parseServingQtyParts(row.serving_qty, row.serving_type);
      const servingWeightG = Number.parseFloat(safeString(row.serving_weight_grams_numeric));

      return {
        sourceFile: 'tarladalal_calories_wide.csv',
        displayName,
        searchText: displayName,
        servingQty,
        servingSize,
        servingWeightG: Number.isFinite(servingWeightG) ? servingWeightG : null,
        kind: 'tarla',
        columns: buildColumnsArray(row),
      };
    });

    await TarlaFood.insertMany(tarlaDocs);
    console.log(`Successfully seeded ${tarlaDocs.length} Tarla foods into TarlaFood collection.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
}

seedTarlaFoods();

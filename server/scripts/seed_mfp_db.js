require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csvParse = require('csv-parse/sync');
const MfpFood = require('../models/MfpFood');

// Array of primary columns from INDB
const indbKeys = [
  "food_code","food_name","primarysource","energy_kj","energy_kcal","carb_g","protein_g","fat_g",
  "freesugar_g","fibre_g","sfa_mg","mufa_mg","pufa_mg","cholesterol_mg","calcium_mg","phosphorus_mg",
  "magnesium_mg","sodium_mg","potassium_mg","iron_mg","copper_mg","selenium_ug","chromium_mg",
  "manganese_mg","molybdenum_mg","zinc_mg","vita_ug","vite_mg","vitd2_ug","vitd3_ug","vitk1_ug",
  "vitk2_ug","folate_ug","vitb1_mg","vitb2_mg","vitb3_mg","vitb5_mg","vitb6_mg","vitb7_ug",
  "vitb9_ug","vitc_mg","carotenoids_ug"
];

// Map MFP CSV columns to INDB keys
const mfpToIndbMap = {
  'Calories': 'energy_kcal',
  'Total Carbs': 'carb_g',
  'Protein': 'protein_g',
  'Total Fat': 'fat_g',
  'Dietary Fiber': 'fibre_g',
  'Sugars': 'freesugar_g',
  'Saturated': 'sfa_mg', // MFP usually 'g', but mapped to same column conceptual
  'Monounsaturated': 'mufa_mg',
  'Polyunsaturated': 'pufa_mg',
  'Cholesterol': 'cholesterol_mg',
  'Sodium': 'sodium_mg',
  'Potassium': 'potassium_mg',
  'Calcium': 'calcium_mg',
  'Iron': 'iron_mg',
  'Vitamin A': 'vita_ug',
  'Vitamin C': 'vitc_mg',
};

async function seedMfpFoods() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Wipe existing
    await MfpFood.deleteMany({});
    console.log('Cleared existing MfpFood collection');

    const csvContent = fs.readFileSync(path.join(__dirname, '../../scraping/myfitnesspal_nutrition_data.csv'), 'utf8');
    const records = csvParse.parse(csvContent, { 
      columns: true, 
      skip_empty_lines: true, 
      relax_column_count: true 
    });

    const mfpDocs = records.map(r => {
      let displayName = (r['Matched Food Name'] || '').trim();
      let searchText = (r['Search Term'] || '').trim();
      let servingQty = (r['Serving Qty'] || '').trim();
      let servingSize = (r['Serving Size'] || '').trim();

      // Construct columns array
      const columnsArray = [];

      // Loop through every standard INDB Key
      for (const key of indbKeys) {
        let value = '-'; // Default is '-' as requested
        
        // Exception: Handle basic text identifiers
        if (key === 'food_name') value = displayName;
        if (key === 'primarysource') value = 'MyFitnessPal CSV';

        // Check if there's a mapped MFP column
        const mfpColName = Object.keys(mfpToIndbMap).find(m => mfpToIndbMap[m] === key);
        
        if (mfpColName && r[mfpColName]) {
          let csvVal = r[mfpColName].trim();
          if (csvVal && csvVal !== '--' && csvVal !== 'NaN') {
            value = csvVal; 
            // Normalize fat breakdown to mg if they are in 'g' in CSV
            if (['sfa_mg', 'mufa_mg', 'pufa_mg'].includes(key)) {
               const numeric = parseFloat(csvVal);
               if (!isNaN(numeric)) {
                 value = String(Math.round(numeric * 1000));
               }
            }
          }
        }
        
        columnsArray.push({ key, value });
      }

      // Add "Trans" fat manually even though not in strict INDB core keys, if present
      if (r['Trans'] && r['Trans'] !== '--' && r['Trans'] !== 'NaN') {
         columnsArray.push({ key: 'trans_fat_g', value: r['Trans'].trim() });
      }

      return {
        sourceFile: 'myfitnesspal_nutrition_data.csv',
        displayName: displayName || searchText || 'Unknown Food',
        searchText,
        servingQty,
        servingSize,
        columns: columnsArray
      };
    });

    // Insert to MongoDB
    await MfpFood.insertMany(mfpDocs);
    console.log(`Successfully seeded ${mfpDocs.length} MFP foods into new MfpFood collection.`);

    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
}

seedMfpFoods();
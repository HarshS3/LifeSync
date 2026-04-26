const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TarlaFood = require('../models/TarlaFood');

// We'll use the RECIPE CSV to find what we decided to delete
const RECIPE_CSV = path.join(__dirname, '..', '..', 'scraping', 'output', 'tarladalal_recipe_full', 'tarladalal_recipe_wide.csv');

async function cleanTarlaFood() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    if (!fs.existsSync(RECIPE_CSV)) {
      console.error('Recipe CSV not found.');
      process.exit(1);
    }

    const raw = fs.readFileSync(RECIPE_CSV, 'utf-8');
    const records = parse(raw, { columns: true });
    
    // We want to find what's MISSING from the cleaned Recipe CSV 
    // that should have been there (based on the original 6810 target list)
    // But even simpler: I'll just re-run the macro logic in JS.

    const getNum = (s) => {
      if (!s) return 0;
      const m = s.match(/(\d+(\.\d+)?)/);
      return m ? parseFloat(m[1]) : 0;
    };

    const foodsToDelete = [];
    
    for (const rec of records) {
      const kcal = getNum(rec.energy_value);
      const protein = getNum(rec.protein_value);
      const carbs = getNum(rec.carbohydrates_value);
      const fat = getNum(rec.fat_value);
      
      const calcKcal = (protein * 4) + (carbs * 4) + (fat * 9);
      const pctDiff = (Math.abs(calcKcal - kcal) / (kcal || 1)) * 100;
      
      // If we previously decided to delete items with > 60% mismatch or huge gap
      if (pctDiff > 60 || Math.abs(calcKcal - kcal) > 200 || calcKcal < 5) {
        foodsToDelete.push(rec.food_name);
      }
    }

    // Add manual ones
    foodsToDelete.push('Thai Mango Ice-Cream ( Thai Cooking )');
    foodsToDelete.push('Cassata');
    foodsToDelete.push('Plum Sauce');
    foodsToDelete.push('Sweet Punjabi Lassi');

    const finalDeleteList = [...new Set(foodsToDelete)];
    
    console.log(`Cleaning TarlaFood collection: Deleting items with extreme mismatches...`);
    
    const result = await TarlaFood.deleteMany({
      displayName: { $in: finalDeleteList }
    });

    console.log(`Successfully deleted ${result.deletedCount} items from TarlaFood.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanTarlaFood();

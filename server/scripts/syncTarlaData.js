const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TarlaFood = require('../models/TarlaFood');
const TarlaRecipe = require('../models/TarlaRecipe');

const RECIPE_CSV = path.join(__dirname, '..', '..', 'scraping', 'output', 'tarladalal_recipe_full', 'tarladalal_recipe_wide.csv');
const INGREDIENTS_CSV = path.join(__dirname, '..', '..', 'scraping', 'output', 'tarladalal_recipe_full', 'tarladalal_recipe_ingredients_long.csv');
const BAD_URLS_JSON = path.join(__dirname, '..', '..', 'scraping', 'output', 'deleted_urls.json');

async function sync() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Sync TarlaFood (Delete bad items)
    console.log('--- Cleaning TarlaFood ---');
    // We'll also manually add some of the top errors we found to be safe
    const manualBadNames = [
      'Thai Mango Ice-Cream ( Thai Cooking )',
      'Cassata',
      'Plum Sauce',
      'Sweet Punjabi Lassi'
    ];

    const deleteResult = await TarlaFood.deleteMany({
      displayName: { $in: manualBadNames }
    });
    console.log(`Deleted ${deleteResult.deletedCount} items from TarlaFood by name.`);

    // 2. Load Ingredients
    console.log('--- Loading Ingredients ---');
    const ingredientsRaw = fs.readFileSync(INGREDIENTS_CSV, 'utf-8');
    const ingredientsRecords = parse(ingredientsRaw, { columns: true, skip_empty_lines: true });
    
    // Group ingredients by recipe_url
    const ingredientsMap = {};
    for (const rec of ingredientsRecords) {
      const url = rec.recipe_url;
      if (!ingredientsMap[url]) ingredientsMap[url] = [];
      
      // Find or create section
      let section = ingredientsMap[url].find(s => s.section === (rec.section || 'Main'));
      if (!section) {
        section = { section: rec.section || 'Main', items: [] };
        ingredientsMap[url].push(section);
      }
      
      section.items.push({
        text: rec.ingredient_text,
        name: rec.ingredient_name,
        amount: rec.amount_text
      });
    }
    console.log(`Processed ingredients for ${Object.keys(ingredientsMap).length} recipes.`);

    // 3. Load and Upload Recipes
    console.log('--- Uploading TarlaRecipes ---');
    const recipeRaw = fs.readFileSync(RECIPE_CSV, 'utf-8');
    const recipeRecords = parse(recipeRaw, { columns: true, skip_empty_lines: true });

    // Clear existing recipes to avoid duplicates and ensure fresh state
    await TarlaRecipe.deleteMany({});
    console.log('Cleared existing TarlaRecipe collection.');

    const toInsert = recipeRecords.map(rec => {
      const getNum = (s) => {
        if (!s) return 0;
        const m = s.match(/(\d+(\.\d+)?)/);
        return m ? parseFloat(m[1]) : 0;
      };

      return {
        foodName: rec.food_name,
        recipeTitle: rec.recipe_title,
        recipeUrl: rec.recipe_url,
        caloriesUrl: rec.calories_url,
        servingLabel: rec.serving_label,
        ingredientCount: parseInt(rec.ingredient_count) || 0,
        ingredients: ingredientsMap[rec.recipe_url] || [],
        nutrients: {
          energy: getNum(rec.energy_value),
          protein: getNum(rec.protein_value),
          carbs: getNum(rec.carbohydrates_value),
          fat: getNum(rec.fat_value),
          fiber: getNum(rec.fiber_value),
          sodium: getNum(rec.sodium_value),
          cholesterol: getNum(rec.cholesterol_value)
        },
        nutritionDisplay: {
          energy: rec.energy_value,
          protein: rec.protein_value,
          carbs: rec.carbohydrates_value,
          fat: rec.fat_value,
          fiber: rec.fiber_value,
          sodium: rec.sodium_value,
          cholesterol: rec.cholesterol_value
        }
      };
    });

    // Bulk insert
    const insertResult = await TarlaRecipe.insertMany(toInsert);
    console.log(`Successfully uploaded ${insertResult.length} recipes to TarlaRecipe collection.`);

    console.log('--- Sync Complete ---');
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

sync();

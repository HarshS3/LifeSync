const TarlaRecipe = require('../models/TarlaRecipe');

/**
 * Maps a MongoDB TarlaRecipe object to the structure expected by the frontend
 * (which was originally based on the CSV headers).
 */
const mapToFrontend = (recipe) => {
  if (!recipe) return null;
  return {
    food_name: recipe.foodName,
    recipe_title: recipe.recipeTitle,
    recipe_url: recipe.recipeUrl,
    calories_url: recipe.caloriesUrl,
    serving_label: recipe.servingLabel,
    ingredient_count: recipe.ingredientCount,
    ingredients: (recipe.ingredients || []).flatMap(section => 
      section.items.map(item => ({
        section: section.section,
        ingredient_text: item.text,
        ingredient_name: item.name,
        amount_text: item.amount
      }))
    ),
    energy_value: recipe.nutritionDisplay?.energy,
    protein_value: recipe.nutritionDisplay?.protein,
    carbohydrates_value: recipe.nutritionDisplay?.carbs,
    fat_value: recipe.nutritionDisplay?.fat,
    fiber_value: recipe.nutritionDisplay?.fiber,
    sodium_value: recipe.nutritionDisplay?.sodium,
    cholesterol_value: recipe.nutritionDisplay?.cholesterol
  };
};

const searchRecipes = async (query, limit = 10) => {
  if (!query) return [];
  
  try {
    const results = await TarlaRecipe.find({
      $or: [
        { foodName: { $regex: query, $options: 'i' } },
        { recipeTitle: { $regex: query, $options: 'i' } }
      ]
    })
    .limit(limit)
    .lean();

    return results.map(mapToFrontend);
  } catch (error) {
    console.error('[RecipeService] Search failed:', error);
    return [];
  }
};

const getRecipeByUrl = async (url) => {
  try {
    const recipe = await TarlaRecipe.findOne({ recipeUrl: url }).lean();
    return mapToFrontend(recipe);
  } catch (error) {
    console.error('[RecipeService] Fetch details failed:', error);
    return null;
  }
};

module.exports = {
  searchRecipes,
  getRecipeByUrl,
  loadData: () => {} // No-op now as we use MongoDB
};

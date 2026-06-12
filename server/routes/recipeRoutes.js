const express = require('express');
const router = express.Router();
const recipeService = require('../services/recipeService');
const { searchLocalFoods } = require('../services/mealPipeline/aggregator');

// Search recipes for suggestions
router.get('/search', async (req, res) => {
  const { q, limit } = req.query;
  const results = await recipeService.searchRecipes(q, limit ? parseInt(limit) : 10);
  res.json(results);
});

// Get full recipe details by URL (encoded as query param)
router.get('/details', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const recipe = await recipeService.getRecipeByUrl(url);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

  res.json(recipe);
});

// ── Ingredient-level meal builder ────────────────────────────────────────────
// GET /api/recipes/resolve-ingredients?url=...
// Returns the recipe plus, for each ingredient, the best-match local food (with
// per-100g nutrition). Client uses this to render an editable ingredient list:
// user adjusts grams, swaps foods, recomputes totals on the fly.
router.get('/resolve-ingredients', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const recipe = await recipeService.getRecipeByUrl(url);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

    // Resolve each ingredient's name in parallel; cap to first 30 to avoid runaway lookups.
    const resolved = await Promise.all(
      ingredients.slice(0, 30).map(async (ing) => {
        const name = String(ing.ingredient_name || ing.ingredient_text || '').trim();
        if (!name) return { ...ing, candidates: [], bestMatch: null };
        try {
          const matches = await searchLocalFoods({ q: name, limit: 5 });
          const candidates = Array.isArray(matches) ? matches.slice(0, 5) : [];
          return { ...ing, candidates, bestMatch: candidates[0] || null };
        } catch (err) {
          console.warn('[recipeRoutes] resolve failed for', name, err.message);
          return { ...ing, candidates: [], bestMatch: null };
        }
      })
    );

    res.json({
      recipe: {
        food_name: recipe.food_name,
        recipe_title: recipe.recipe_title,
        recipe_url: recipe.recipe_url,
        serving_label: recipe.serving_label,
        ingredient_count: recipe.ingredient_count,
        nutrition: {
          calories: recipe.energy_value,
          protein: recipe.protein_value,
          carbs: recipe.carbohydrates_value,
          fat: recipe.fat_value,
          fiber: recipe.fiber_value,
        },
      },
      ingredients: resolved,
    });
  } catch (err) {
    console.error('[recipeRoutes] /resolve-ingredients error:', err);
    res.status(500).json({ error: 'Failed to resolve recipe ingredients' });
  }
});

module.exports = router;

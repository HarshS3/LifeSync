const express = require('express');
const router = express.Router();
const recipeService = require('../services/recipeService');

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

module.exports = router;

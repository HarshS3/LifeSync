/**
 * Global food knowledge base supporting Indian + international cuisines
 * Used by: bioavailabilityEngine, gutHealthEngine, food detection
 */

module.exports = {
  FOOD_CATEGORIES: {
    indian: {
      grains: ['roti', 'chapati', 'rice', 'basmati', 'paratha', 'naan', 'dosa', 'idli', 'upma', 'puri', 'bhakri', 'jowar'],
      legumes: ['dal', 'daal', 'lentils', 'chickpea', 'chana', 'moong', 'rajma', 'kidney beans', 'masoor', 'arhar', 'urad'],
      vegetables: ['sabzi', 'spinach', 'carrot', 'potato', 'tomato', 'onion', 'okra', 'eggplant', 'brinjal', 'bitter gourd', 'bottle gourd'],
      dairy: ['paneer', 'curd', 'yogurt', 'dahi', 'ghee', 'butter', 'milk', 'kheer'],
      proteins: ['chicken', 'mutton', 'fish', 'shrimp', 'egg', 'tofu'],
      dishes: ['biryani', 'samosa', 'chai', 'coffee', 'juice', 'lassi', 'buttermilk'],
      spices: ['cumin', 'coriander', 'turmeric', 'cardamom', 'cinnamon', 'clove', 'ginger', 'garlic'],
    },

    western: {
      grains: ['bread', 'pasta', 'white bread', 'wheat bread', 'cereal', 'oats', 'barley', 'rye'],
      proteins: ['beef', 'pork', 'steak', 'chicken breast', 'ham', 'bacon', 'turkey'],
      dairy: ['cheese', 'milk', 'cream', 'butter', 'yogurt', 'cottage cheese'],
      vegetables: ['broccoli', 'carrot', 'celery', 'lettuce', 'kale', 'spinach', 'arugula', 'cucumber'],
      fruits: ['apple', 'banana', 'orange', 'berries', 'strawberry', 'blueberry', 'grape'],
      dishes: ['sandwich', 'salad', 'pizza', 'burger', 'pasta', 'steak', 'roast'],
    },

    middle_eastern: {
      grains: ['pita', 'hummus', 'falafel', 'couscous', 'tahini'],
      proteins: ['lamb', 'kebab', 'shawarma', 'falafel', 'chickpea'],
      vegetables: ['eggplant', 'tomato', 'cucumber', 'olive'],
      dairy: ['labneh', 'feta cheese'],
      oils: ['olive oil', 'sesame oil'],
      dishes: ['hummus', 'baba ganoush', 'tabbouleh', 'falafel wrap', 'shawarma'],
    },

    asian: {
      grains: ['noodles', 'rice noodles', 'sushi rice', 'jasmine rice'],
      proteins: ['tofu', 'tempeh', 'fish', 'shrimp', 'duck', 'chicken'],
      vegetables: ['bok choy', 'broccoli', 'snow pea', 'bell pepper', 'mushroom'],
      sauces: ['soy sauce', 'oyster sauce', 'fish sauce', 'miso'],
      dishes: ['sushi', 'pad thai', 'ramen', 'dumplings', 'spring rolls', 'stir fry', 'pho', 'bibimbap'],
    },

    mexican: {
      grains: ['tortilla', 'corn tortilla', 'flour tortilla', 'taco', 'enchilada'],
      proteins: ['chicken', 'beef', 'beans', 'black beans', 'refried beans'],
      vegetables: ['tomato', 'cilantro', 'jalapeno', 'bell pepper', 'corn'],
      dairy: ['cheese', 'sour cream', 'queso'],
      sauces: ['salsa', 'guacamole'],
      dishes: ['tacos', 'burrito', 'enchilada', 'quesadilla', 'nachos', 'chile relleno'],
    },

    african: {
      grains: ['couscous', 'injera', 'cassava', 'millet', 'sorghum', 'jollof rice'],
      legumes: ['lentil', 'chickpea', 'bean', 'peanut', 'groundnut'],
      vegetables: ['okra', 'tomato', 'eggplant', 'spinach'],
      proteins: ['chicken', 'goat', 'fish'],
      dishes: ['tagine', 'jollof rice', 'fufu', 'egusi soup', 'gumbo'],
    },

    european: {
      grains: ['polenta', 'risotto', 'pasta', 'bread', 'croissant'],
      proteins: ['salmon', 'trout', 'pork', 'duck', 'beef'],
      dairy: ['cheese', 'butter', 'cream', 'parmesan'],
      vegetables: ['asparagus', 'artichoke', 'mushroom', 'tomato'],
      dishes: ['schnitzel', 'paella', 'cassoulet', 'ratatouille', 'bouillabaisse'],
    },

    general: {
      proteins: ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'tofu', 'tempeh', 'nuts', 'seeds', 'egg', 'protein powder'],
      vegetables: ['spinach', 'broccoli', 'carrot', 'tomato', 'cucumber', 'bell pepper', 'green beans', 'cabbage', 'kale'],
      grains: ['rice', 'wheat', 'oats', 'quinoa', 'barley', 'millet', 'amaranth'],
      fruits: ['apple', 'banana', 'orange', 'mango', 'berries', 'watermelon', 'papaya'],
      dairy: ['milk', 'yogurt', 'cheese', 'butter', 'paneer', 'cottage cheese'],
      oils: ['olive oil', 'coconut oil', 'ghee', 'butter', 'sesame oil'],
      nuts_seeds: ['almond', 'walnut', 'peanut', 'sesame', 'sunflower', 'flax', 'chia'],
    }
  },

  FOOD_ALIASES: {
    // Normalize regional food names to canonical form
    'chapati': ['roti', 'fulka', 'puri', 'flatbread'],
    'dal': ['daal', 'lentils', 'pulse', 'legume'],
    'curd': ['yogurt', 'dahi', 'sour cream'],
    'couscous': ['cous cous', 'semolina grain', 'moroccan grain'],
    'falafel': ['chickpea fritter', 'falafel ball'],
    'tacos': ['taco'],
    'steak': ['beef steak', 'meat cut'],
    'chicken': ['chook', 'poultry'],
    'fish': ['machli', 'seafood'],
    'rice': ['chawal', 'grain'],
    'bread': ['roti', 'pav', 'bun'],
    'milk': ['doodh', 'dairy liquid'],
    'paneer': ['cottage cheese', 'Indian cheese'],
  },

  // Nutrients that reduce iron absorption
  PHYTATE_SOURCES: {
    high: ['wheat', 'rice', 'rye', 'oats', 'millet', 'barley', 'chickpea', 'chana', 'dal', 'lentil', 'bean', 'pea', 'peanut', 'sesame', 'sunflower seed'],
    medium: ['spinach', 'kale', 'nut', 'seed'],
  },

  // Heme iron (highly bioavailable, from animal sources)
  HEME_IRON_SOURCES: [
    'chicken', 'beef', 'mutton', 'lamb', 'pork', 'fish', 'shrimp', 'oyster', 'clam',
    'keema', 'minced meat', 'liver', 'kidney'
  ],

  // Non-heme iron (plant-based, needs vitamin C for absorption)
  NON_HEME_IRON_SOURCES: [
    'spinach', 'kale', 'chickpea', 'lentil', 'bean', 'pea', 'fortified cereal',
    'pumpkin seed', 'sunflower seed', 'sesame', 'dried fruit', 'tofu', 'tempeh'
  ],

  // Vitamin C enhances iron absorption
  VITAMIN_C_SOURCES: [
    'orange', 'lemon', 'lime', 'kiwi', 'strawberry', 'papaya', 'mango',
    'tomato', 'bell pepper', 'broccoli', 'kale', 'spinach', 'guava', 'pineapple',
    'amla', 'lemon juice', 'lime juice'
  ],

  // Calcium reduces iron absorption
  CALCIUM_SOURCES: [
    'milk', 'yogurt', 'curd', 'cheese', 'paneer', 'ice cream',
    'spinach', 'kale', 'broccoli', 'sesame', 'almonds', 'sardine'
  ],

  // Plant diversity tracking (for gut health)
  PLANT_TYPES: {
    grains: ['rice', 'wheat', 'oats', 'millet', 'barley', 'rye', 'quinoa', 'amaranth', 'buckwheat'],
    legumes: ['lentil', 'chickpea', 'bean', 'pea', 'peanut', 'soybean'],
    vegetables: ['leaf', 'root', 'stem', 'flower', 'fruit vegetable'],  // Categories
    fruits: ['berry', 'stone fruit', 'citrus', 'tropical', 'melon'],
    nuts_seeds: ['nut', 'seed'],
    whole_grains: ['brown rice', 'whole wheat', 'oats', 'rye', 'barley', 'millet'],
  },

  // Cross-cutting nutritional profiles (for insights)
  NUTRITIONAL_PROFILES: {
    // Food → primary nutrients it's known for
    'spinach': {
      primary: ['iron', 'magnesium', 'vitamin K', 'folate'],
      phytates: true,
      oxalates: true,  // Reduces calcium absorption
      note: 'Cook or pair with vitamin C for better iron absorption'
    },
    'chicken': {
      primary: ['protein', 'vitamin B12', 'niacin', 'selenium'],
      heme_iron: true,
      note: 'Complete protein, high bioavailable iron'
    },
    'dal': {
      primary: ['protein', 'fiber', 'iron', 'folate'],
      phytates: true,
      note: 'Pair with rice or vitamin C source'
    },
    'milk': {
      primary: ['calcium', 'vitamin D', 'protein', 'vitamin B12'],
      note: 'Blocks iron absorption if consumed with iron-rich meals'
    },
    'orange': {
      primary: ['vitamin C', 'folate', 'fiber'],
      enhances_iron: true,
      note: 'Drink with iron-rich meals for better absorption'
    },
  },

  // Common antagonistic nutrient pairs
  ANTAGONISTIC_PAIRS: [
    { nutrient1: 'iron', nutrient2: 'calcium', effect_reduction: 0.2, context: 'High calcium inhibits iron absorption ~20%' },
    { nutrient1: 'iron', nutrient2: 'phytate', effect_reduction: 0.3, context: 'Phytates reduce iron absorption ~30%' },
    { nutrient1: 'calcium', nutrient2: 'oxalate', effect_reduction: 0.5, context: 'Oxalates bind calcium, reduce absorption ~50%' },
    { nutrient1: 'zinc', nutrient2: 'phytate', effect_reduction: 0.2, context: 'Phytates reduce zinc absorption ~20%' },
  ],

  // Synergistic nutrient pairs (enhance absorption)
  SYNERGISTIC_PAIRS: [
    { nutrient1: 'iron', nutrient2: 'vitamin_c', effect_boost: 3, context: 'Vitamin C enhances iron absorption 3x' },
    { nutrient1: 'vitamin_d', nutrient2: 'calcium', effect_boost: 1.5, context: 'Vitamin D enhances calcium absorption 1.5x' },
    { nutrient1: 'fat', nutrient2: 'vitamin_a', effect_boost: 2, context: 'Dietary fat enhances vitamin A absorption 2x' },
  ],

  // Meal composition recommendations
  MEAL_COMBINATIONS: {
    iron_rich_with_enhancer: {
      example: 'spinach + orange juice',
      reasoning: 'Vitamin C enhances non-heme iron absorption',
      bioavailability_boost: '3x'
    },
    avoid_iron_with_blocker: {
      example: 'spinach + milk',
      reasoning: 'Calcium inhibits iron absorption',
      bioavailability_loss: '20%'
    },
    protein_timing: {
      example: 'lean meat with carbs',
      reasoning: 'Protein + carbs optimize MPS (muscle protein synthesis)',
      context: 'Post-workout'
    },
  },
};

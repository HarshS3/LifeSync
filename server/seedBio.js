require('dotenv').config();
const mongoose = require('mongoose');
const { NutritionLog } = require('./models/Logs');
const User = require('./models/User');
const { calculateEffectiveNutrients } = require('./services/nutritionPipeline/bioavailabilityEngine');
const { evaluateMealInteractions } = require('./services/nutritionPipeline/nutrientInteractions');

const DAILY_TOTAL_FIELDS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'potassium', 'iron', 'calcium', 'magnesium', 'zinc', 'vitaminC', 'vitaminA', 'vitaminE', 'vitaminD', 'vitaminB', 'folate', 'vitaminB12'];

function _aggregateEffectiveTotals(meals) {
  const totals = {};
  (meals || []).forEach(meal => {
    const bio = meal.bioavailability;
    if (!bio || !bio.results) return;
    Object.entries(bio.results).forEach(([nutrient, data]) => {
      if (!totals[nutrient]) {
        totals[nutrient] = { consumed: 0, effective: 0, unit: data.unit, confidence: data.confidence };
      }
      totals[nutrient].consumed += data.consumed_amount || 0;
      totals[nutrient].effective += data.effective_amount || 0;
    });
  });
  Object.values(totals).forEach(t => {
    t.consumed = parseFloat(t.consumed.toFixed(3));
    t.effective = parseFloat(t.effective.toFixed(3));
    t.multiplier = t.consumed > 0 ? parseFloat((t.effective / t.consumed).toFixed(3)) : 1;
  });
  return totals;
}

// Few meal templates
const MEAL_TEMPLATES = [
  {
    name: 'Breakfast',
    mealType: 'breakfast',
    time: '08:00',
    foods: [
      { name: 'Oatmeal', quantity: 1, unit: 'bowl', calories: 150, carbs: 27, protein: 5, fat: 3, fiber: 4, iron: 1.5, zinc: 1.2 },
      { name: 'Chai', quantity: 1, unit: 'cup', calories: 50, carbs: 5, calcium: 40 },
    ]
  },
  {
    name: 'Lunch',
    mealType: 'lunch',
    time: '13:00',
    foods: [
      { name: 'Rajma Chawal (Kidney Beans & Rice)', quantity: 1, unit: 'plate', calories: 350, carbs: 60, protein: 12, fat: 5, iron: 4, fiber: 10, zinc: 2 },
      { name: 'Lemon squeeze', quantity: 0.5, unit: 'piece', vitaminC: 25 },
      { name: 'Carrot Salad', quantity: 1, unit: 'bowl', vitaminA: 400, fiber: 2, fat: 0 } 
    ]
  },
  {
    name: 'Dinner',
    mealType: 'dinner',
    time: '20:00',
    foods: [
      { name: 'Paneer Tikka', quantity: 6, unit: 'pieces', calories: 300, protein: 20, fat: 15, calcium: 300 },
      { name: 'Roti', quantity: 2, unit: 'pieces', calories: 200, carbs: 30, iron: 1.5, fiber: 4 },
    ]
  },
  {
    name: 'Snack',
    mealType: 'snack',
    time: '16:00',
    foods: [
      { name: 'Almonds', quantity: 1, unit: 'handful', calories: 160, protein: 6, fat: 14, fiber: 3, vitaminE: 7.3, magnesium: 76 }
    ]
  },
  {
    name: 'Healthy Lunch',
    mealType: 'lunch',
    time: '13:30',
    foods: [
      { name: 'Grilled Chicken Breast', quantity: 200, unit: 'g', calories: 330, protein: 62, fat: 7, iron: 2.1, zinc: 2.0 }, // Heme iron
      { name: 'Spinach Salad with Olive Oil', quantity: 1, unit: 'bowl', calories: 120, fat: 10, vitaminA: 600, iron: 2.7, vitaminC: 15 } // Vit A + Fat synergy
    ]
  }
];

function getRandomMeals() {
  // Return early templates + randomly 1-2 others
  const meals = [ MEAL_TEMPLATES[0], MEAL_TEMPLATES[1] ];
  if (Math.random() > 0.5) {
    meals[1] = MEAL_TEMPLATES[4]; // swap lunch
  }
  meals.push(MEAL_TEMPLATES[2]); // always dinner
  if (Math.random() > 0.7) {
    meals.push(MEAL_TEMPLATES[3]); // sometimes snack
  }
  return JSON.parse(JSON.stringify(meals)); // deep copy
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: 'demo@lifesync.local' });
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  // Generate for past 60 days
  for (let i = 0; i <= 60; i++) {
    const d = new Date();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - i);
    
    const meals = getRandomMeals();
    
    // Add some random variation to quantities to make graphs look natural
    meals.forEach(m => {
       m.foods.forEach(f => {
          const factor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
          ['calories', 'protein', 'carbs', 'fat', 'iron', 'vitaminC', 'calcium', 'vitaminA', 'vitaminE', 'zinc'].forEach(n => {
            if (f[n]) f[n] = parseFloat((f[n] * factor).toFixed(2));
          });
       });
    });

    const dailyTotals = {};
    DAILY_TOTAL_FIELDS.forEach(f => dailyTotals[f] = 0);

    meals.forEach(meal => {
      meal.totalCalories = 0;
      meal.totalProtein = 0;
      meal.totalCarbs = 0;
      meal.totalFat = 0;
      meal.foods.forEach(food => {
        meal.totalCalories += food.calories || 0;
        meal.totalProtein += food.protein || 0;
        meal.totalCarbs += food.carbs || 0;
        meal.totalFat += food.fat || 0;
        DAILY_TOTAL_FIELDS.forEach(f => dailyTotals[f] += (food[f] || 0));
      });
      meal.insights = evaluateMealInteractions(meal.foods);
      meal.bioavailability = calculateEffectiveNutrients(meal.foods);
    });

    const effectiveNutrientTotals = _aggregateEffectiveTotals(meals);

    let log = await NutritionLog.findOne({ user: user._id, date: d });
    if (!log) {
      log = new NutritionLog({ user: user._id, date: d });
    }
    
    log.meals = meals;
    log.dailyTotals = dailyTotals;
    log.effectiveNutrientTotals = effectiveNutrientTotals;
    await log.save();
    console.log(`Seeded day -${i}: ${d.toISOString().split('T')[0]}`);
  }
  
  console.log('Seeded 60 days of historical data successfully.');
  process.exit(0);
}

run();

#!/usr/bin/env node

/**
 * Seed script: Generate realistic nutrition data for a test user
 * Creates 7 days of mixed meals with varied macros and micros
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const { NutritionLog, WeightLog } = require('../models/Logs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifesync';

const SAMPLE_MEALS = {
  breakfast: [
    {
      name: 'Oatmeal with Berries',
      foods: [
        {
          name: 'Rolled Oats',
          quantity: 50,
          unit: 'g',
          calories: 190,
          protein: 5,
          carbs: 34,
          fat: 3,
          fiber: 5,
          vitaminB1: 0.08,
          vitaminB5: 0.5,
          magnesium: 40,
          phosphorus: 150,
          iron: 2.2,
        },
        {
          name: 'Blueberries',
          quantity: 100,
          unit: 'g',
          calories: 57,
          protein: 0.7,
          carbs: 14,
          fat: 0.3,
          fiber: 2.4,
          vitaminC: 9.7,
          vitaminA: 54,
        },
        {
          name: 'Greek Yogurt (plain)',
          quantity: 150,
          unit: 'g',
          calories: 100,
          protein: 17,
          carbs: 7,
          fat: 0.4,
          calcium: 180,
          vitaminB12: 0.24,
          magnesium: 15,
        },
      ],
    },
    {
      name: 'Eggs & Toast',
      foods: [
        {
          name: 'Eggs (2 large)',
          quantity: 100,
          unit: 'g',
          calories: 155,
          protein: 13,
          carbs: 1.1,
          fat: 11,
          vitaminD: 1.8,
          vitaminA: 260,
          selenium: 31,
          choline: 147,
        },
        {
          name: 'Whole Wheat Bread',
          quantity: 60,
          unit: 'g',
          calories: 158,
          protein: 6,
          carbs: 28,
          fat: 2,
          fiber: 4.7,
          vitaminB1: 0.1,
          vitaminB3: 2.4,
          iron: 1.6,
        },
        {
          name: 'Butter',
          quantity: 10,
          unit: 'g',
          calories: 72,
          protein: 0.1,
          carbs: 0,
          fat: 8.1,
          vitaminA: 61,
        },
      ],
    },
  ],
  lunch: [
    {
      name: 'Chicken & Rice Bowl',
      foods: [
        {
          name: 'Chicken Breast (cooked)',
          quantity: 150,
          unit: 'g',
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          vitaminB6: 0.88,
          vitaminB12: 0.3,
          selenium: 22,
          phosphorus: 220,
        },
        {
          name: 'Brown Rice (cooked)',
          quantity: 150,
          unit: 'g',
          calories: 111,
          protein: 2.6,
          carbs: 23,
          fat: 0.9,
          fiber: 1.8,
          magnesium: 42,
          vitaminB1: 0.05,
        },
        {
          name: 'Broccoli (steamed)',
          quantity: 100,
          unit: 'g',
          calories: 34,
          protein: 2.8,
          carbs: 7,
          fat: 0.4,
          fiber: 2.4,
          vitaminC: 89,
          vitaminK: 102,
          calcium: 47,
          iron: 0.7,
        },
      ],
    },
    {
      name: 'Tuna Sandwich',
      foods: [
        {
          name: 'Canned Tuna (in water)',
          quantity: 100,
          unit: 'g',
          calories: 96,
          protein: 21,
          carbs: 0,
          fat: 1,
          vitaminD: 570,
          selenium: 36,
          vitaminB12: 2.4,
          omega3: 0.3,
        },
        {
          name: 'Whole Wheat Bread',
          quantity: 120,
          unit: 'g',
          calories: 316,
          protein: 12,
          carbs: 56,
          fat: 4,
          fiber: 9,
          vitaminB1: 0.2,
          iron: 3.2,
        },
        {
          name: 'Mayonnaise',
          quantity: 15,
          unit: 'g',
          calories: 103,
          protein: 0,
          carbs: 0.1,
          fat: 11.5,
          vitaminE: 3.6,
        },
      ],
    },
  ],
  dinner: [
    {
      name: 'Salmon with Sweet Potato',
      foods: [
        {
          name: 'Salmon (cooked)',
          quantity: 150,
          unit: 'g',
          calories: 280,
          protein: 25,
          carbs: 0,
          fat: 20,
          vitaminD3: 570,
          vitaminB12: 4.8,
          omega3: 2.3,
          selenium: 36,
          phosphorus: 240,
        },
        {
          name: 'Sweet Potato (baked)',
          quantity: 150,
          unit: 'g',
          calories: 103,
          protein: 2,
          carbs: 23,
          fat: 0.1,
          fiber: 3.6,
          vitaminA: 961,
          vitaminC: 13,
          potassium: 337,
        },
        {
          name: 'Asparagus (roasted)',
          quantity: 100,
          unit: 'g',
          calories: 20,
          protein: 2.2,
          carbs: 3.7,
          fat: 0.1,
          fiber: 2.1,
          vitaminK: 60,
          folate: 52,
          vitaminC: 5.6,
        },
      ],
    },
    {
      name: 'Lean Beef & Veggies',
      foods: [
        {
          name: 'Lean Ground Beef (cooked)',
          quantity: 120,
          unit: 'g',
          calories: 215,
          protein: 25,
          carbs: 0,
          fat: 12,
          vitaminB12: 2.4,
          vitaminB6: 0.4,
          iron: 2.5,
          zinc: 5.5,
          phosphorus: 180,
        },
        {
          name: 'Spinach (raw)',
          quantity: 100,
          unit: 'g',
          calories: 23,
          protein: 2.7,
          carbs: 3.6,
          fat: 0.4,
          fiber: 2.2,
          vitaminK: 145,
          folate: 141,
          iron: 2.7,
          calcium: 99,
        },
        {
          name: 'Olive Oil',
          quantity: 15,
          unit: 'g',
          calories: 119,
          protein: 0,
          carbs: 0,
          fat: 14,
          vitaminE: 1.9,
          monounsaturatedFat: 10,
        },
      ],
    },
  ],
  snack: [
    {
      name: 'Almonds & Apple',
      foods: [
        {
          name: 'Almonds',
          quantity: 28,
          unit: 'g',
          calories: 164,
          protein: 6,
          carbs: 6,
          fat: 14,
          fiber: 3.5,
          vitaminE: 25.6,
          magnesium: 76,
          calcium: 76,
        },
        {
          name: 'Apple (medium)',
          quantity: 182,
          unit: 'g',
          calories: 95,
          protein: 0.5,
          carbs: 25,
          fat: 0.3,
          fiber: 4.4,
          vitaminC: 5.7,
          potassium: 195,
        },
      ],
    },
    {
      name: 'Greek Yogurt & Honey',
      foods: [
        {
          name: 'Greek Yogurt',
          quantity: 200,
          unit: 'g',
          calories: 133,
          protein: 23,
          carbs: 9,
          fat: 0.4,
          calcium: 240,
          vitaminB12: 0.32,
          magnesium: 20,
        },
        {
          name: 'Honey',
          quantity: 20,
          unit: 'g',
          calories: 61,
          protein: 0.1,
          carbs: 17,
          fat: 0,
          sugar: 16.5,
        },
      ],
    },
  ],
};

const NUTRITION_PROFILE = {
  proteinTarget: 150,
  carbsTarget: 250,
  fatTarget: 70,
  calorieTarget: 2100,
};

const WEEK_PATTERNS = [
  // Monday - Perfect day
  { meals: ['breakfast', 0, 'lunch', 0, 'dinner', 0, 'snack', 0] },
  // Tuesday - Low protein
  { meals: ['breakfast', 1, 'lunch', 1, 'dinner', 1, 'snack', 0] },
  // Wednesday - High carbs (weekend-like)
  { meals: ['breakfast', 0, 'lunch', 0, 'dinner', 0, 'snack', 0] },
  // Thursday - Balanced
  { meals: ['breakfast', 1, 'lunch', 0, 'dinner', 1, 'snack', 1] },
  // Friday - Carb excess
  { meals: ['breakfast', 0, 'lunch', 1, 'dinner', 0, 'snack', 1] },
  // Saturday - Weekend (higher intake)
  { meals: ['breakfast', 1, 'lunch', 0, 'dinner', 1, 'snack', 1] },
  // Sunday - Recovery (light)
  { meals: ['breakfast', 0, 'lunch', 1, 'dinner', 0, 'snack', 0] },
];

async function seedNutritionData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Retrieve foods from IndbFood
    const IndbFood = require('../models/IndbFood');
    const allFoods = await IndbFood.find().limit(50);
    if (!allFoods || allFoods.length === 0) {
      console.log('No foods found in IndbFood. Please seed the INDB database first.');
      process.exit(1);
    }

    const parseNumCol = (food, key) => {
      const col = food.columns?.find((c) => c.key === key);
      return col ? parseFloat(col.value) || 0 : 0;
    };

    const parseStrCol = (food, key) => {
      const col = food.columns?.find((c) => c.key === key);
      return col ? col.value : null;
    };

    const buildRandomMeals = (type) => {
      const numItems = Math.floor(Math.random() * 3) + 1;
      const foods = [];
      let totalCals = 0, totalP = 0, totalC = 0, totalF = 0;
      for (let i = 0; i < numItems; i++) {
        const rf = allFoods[Math.floor(Math.random() * allFoods.length)];
        const qty = (Math.floor(Math.random() * 4) + 1) * 50; // 50g up to 200g
        const mult = qty / 100;
        
        const rawName = rf.displayName || parseStrCol(rf, 'food_name') || rf.sheetName || 'Unknown Food';
        
        foods.push({
          name: rawName,
          quantity: qty,
          unit: 'g',
          calories: Number((parseNumCol(rf, 'energy_kcal') * mult).toFixed(1)),
          protein: Number((parseNumCol(rf, 'protein_g') * mult).toFixed(1)),
          carbs: Number((parseNumCol(rf, 'carb_g') * mult).toFixed(1)),
          fat: Number((parseNumCol(rf, 'fat_g') * mult).toFixed(1)),
          fiber: Number((parseNumCol(rf, 'fibre_g') * mult).toFixed(1)),
          water: Number((parseNumCol(rf, 'water_g') * mult).toFixed(1)),
          vitaminB1: Number((parseNumCol(rf, 'vitB1_mg') * mult).toFixed(2)),
          vitaminB5: Number((parseNumCol(rf, 'vitB5_mg') * mult).toFixed(2)),
          iron: Number((parseNumCol(rf, 'fe_mg') * mult).toFixed(2)),
          calcium: Number((parseNumCol(rf, 'ca_mg') * mult).toFixed(1)),
          magnesium: Number((parseNumCol(rf, 'mg_mg') * mult).toFixed(1)),
          potassium: Number((parseNumCol(rf, 'k_mg') * mult).toFixed(1)),
          sodium: Number((parseNumCol(rf, 'na_mg') * mult).toFixed(1)),
          zinc: Number((parseNumCol(rf, 'zn_mg') * mult).toFixed(2)),
        });
      }
      return [{
        name: type === 'breakfast' ? 'Morning Assortment' : type === 'lunch' ? 'Midday Meal' : type === 'dinner' ? 'Evening Feast' : 'Quick Snack',
        foods
      }];
    };

    // Find or create test user
    let user = await User.findOne({ email: 'demo@lifesync.local' });
    if (!user) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('demo123456', 10);
      user = await User.create({
        name: 'Demo User',
        email: 'demo@lifesync.local',
        username: 'demo_user',
        password: hashedPassword,
        dob: '1990-01-15',
        height: 180,
        weight: 75,
        gender: 'male',
        biologicalProfile: {
          biologicalSex: 'male',
          heightCm: 180,
          weightKg: 75,
          bodyFatPercentage: 15,
          activityLevel: 'moderately_active',
          dob: new Date('1990-01-15')
        },
        dailyCalorieTarget: NUTRITION_PROFILE.calorieTarget,
        dailyProteinTarget: NUTRITION_PROFILE.proteinTarget,
        preferences: { nutritionGoal: NUTRITION_PROFILE },
      });
      console.log('Created demo user:', user.email);
    } else {
      // Update nutrition goals
      user.dailyCalorieTarget = NUTRITION_PROFILE.calorieTarget;
      user.dailyProteinTarget = NUTRITION_PROFILE.proteinTarget;
      user.preferences = { ...user.preferences, nutritionGoal: NUTRITION_PROFILE };
      user.height = 180;
      user.weight = 75;
      user.gender = 'male';
      user.biologicalProfile = {
        biologicalSex: 'male',
        heightCm: 180,
        weightKg: 75,
        bodyFatPercentage: 15,
        activityLevel: 'moderately_active',
        dob: new Date('1990-01-15')
      };
      await user.save();
      console.log('Updated nutrition goals for user:', user.email);
    }

    // Generate 7 days of nutrition logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const logDate = new Date(today);
      logDate.setDate(logDate.getDate() - (6 - dayOffset)); // Start from 6 days ago

      const pattern = WEEK_PATTERNS[dayOffset];
      let meals = [];

      // Group meals by type
      const mealsByType = {};
      
      // We ignore indices logic and just randomly generate from 1 to 4 meals
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      // Create meals from pattern
      mealTypes.forEach((mealType) => {
        const generatedMeals = buildRandomMeals(mealType);
        generatedMeals.forEach(sampleMeal => {
          const meal = {
            name: sampleMeal.name,
            mealType,
            time: `${8 + Math.floor(Math.random() * 12)}:${Math.floor(Math.random() * 60)
              .toString()
              .padStart(2, '0')}`,
            foods: sampleMeal.foods.map(food => ({
              ...food,
              sourceFoodId: `indb-${food.name.replace(/\s/g, '-')}`,
              sourceKind: 'manual',
            })),
          };

          // Calculate meal totals
          meal.totalCalories = meal.foods.reduce((sum, f) => sum + (f.calories || 0), 0);
          meal.totalProtein = meal.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
          meal.totalCarbs = meal.foods.reduce((sum, f) => sum + (f.carbs || 0), 0);
          meal.totalFat = meal.foods.reduce((sum, f) => sum + (f.fat || 0), 0);

          meals.push(meal);
        });
      });

      // Calculate daily totals
      const dailyTotals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        potassium: 0,
        iron: 0,
        calcium: 0,
        magnesium: 0,
        zinc: 0,
        vitaminA: 0,
        vitaminB: 0,
        vitaminB12: 0,
        vitaminC: 0,
        vitaminD: 0,
        vitaminE: 0,
        folate: 0,
        vitaminB1: 0,
        vitaminB2: 0,
        vitaminB3: 0,
        vitaminB5: 0,
        vitaminB6: 0,
        vitaminB7: 0,
        vitaminB9: 0,
        vitaminD2: 0,
        vitaminD3: 0,
        saturatedFat: 0,
        monounsaturatedFat: 0,
        polyunsaturatedFat: 0,
        cholesterol: 0,
        phosphorus: 0,
        copper: 0,
        selenium: 0,
        manganese: 0,
        omega3: 0,
      };

      meals.forEach(meal => {
        meal.foods?.forEach(food => {
          Object.keys(dailyTotals).forEach(key => {
            dailyTotals[key] += Number(food[key] || 0);
          });
        });
      });

      // Upsert nutrition log
      await NutritionLog.findOneAndUpdate(
        { user: user._id, date: { $gte: logDate, $lt: new Date(logDate.getTime() + 86400000) } },
        {
          user: user._id,
          date: logDate,
          meals,
          waterIntake: 2.5 + Math.random() * 1.5, // 2.5-4L
          dailyTotals,
        },
        { upsert: true, new: true }
      );

      console.log(`✓ Created nutrition log for ${logDate.toLocaleDateString('en-CA')}`);

      // Create weight logs
      const weight = 80 + Math.sin(dayOffset / 3) * 0.5 + Math.random() * 0.3; // Slight trend
      await WeightLog.findOneAndUpdate(
        { user: user._id, date: { $gte: logDate, $lt: new Date(logDate.getTime() + 86400000) } },
        {
          user: user._id,
          date: logDate,
          weightKg: Math.round(weight * 10) / 10,
        },
        { upsert: true, new: true }
      );
    }

    console.log('\n✅ Seeding complete! Demo user ready to use.');
    console.log(`📧 Email: demo@lifesync.local`);
    console.log(`🔑 Password: demo123456`);
    console.log(`\n📊 7 days of nutrition data created with varied macros and micros.`);
    console.log(`\nYou can now view the Insights tab with realistic weekly aggregations.`);

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedNutritionData();

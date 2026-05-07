require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { calculateAdaptiveTDEE, calculateMetabolicMap } = require('../services/nutritionPipeline/adaptiveTdeeEngine');
const { calculateReadiness } = require('../services/insights/readinessEngine');
const { evaluateDayInteractions } = require('../services/nutritionPipeline/nutrientInteractions');
const User = require('../models/User');
const Workout = require('../models/Workout');
const { WeightLog, NutritionLog, MentalLog } = require('../models/Logs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';

async function runDynamicTests() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  // Create a dynamic test user
  const email = `dynamic_${Date.now()}@example.com`;
  let user;
  try {
    user = await User.create({
      name: 'Dynamic Test',
      email,
      password: 'password123',
      weight: 80,
      biologicalProfile: {
        weight: 80,
        biologicalSex: 'male',
        heightCm: 180,
        activityLevel: 'moderately_active' // or lightly_active, just removing it for safety if unknown
      }
    });
  } catch (err) {
    console.error('Failed creating user', err);
    await mongoose.disconnect();
    return;
  }

  console.log(`Created test user: ${user._id}`);

  // We will simulate 30 days of data
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  // 1. Inconsistent Logging Data (Weight & Nutrition)
  console.log('--- Seeding Sparse Weight & Consistent Nutrition Data ---');
  const weights = [];
  const nutritions = [];
  const mentals = [];
  const workouts = [];

  // Add sparse weight (every 4 days) and consistent nutrition
  let weightDrop = 80;
  for (let i = 40; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(12, 0, 0, 0);
    
    // Nutrition: mostly in deficit (TDEE ~2500, eating 2000)
    nutritions.push({
      user: user._id,
      date: d,
      dailyTotals: { calories: 2000, protein: 150, carbs: 200, fat: 60 }
    });

    // Mental Log: Normal sleep & stress
    mentals.push({
      user: user._id,
      date: d,
      sleepHours: 7.5,
      sleepQuality: 8,
      restingHeartRate: 60,
      energyLevel: 7,
      stressLevel: 4
    });

    // Sparse weight logging
    if (i % 4 === 0) {
      weights.push({
        user: user._id,
        date: d,
        weightKg: weightDrop
      });
      weightDrop -= 0.1; // 0.1kg drop every 4 days = ~0.175kg / week
    }

    // Workouts: Heavy focus on bodyweight exercises (Pushups, Pullups) + occasional weights
    if (i % 3 === 0) {
      workouts.push({
        user: user._id,
        date: d,
        name: 'Upper Body',
        exercises: [
          {
            name: 'Pushup',
            muscleGroup: 'chest',
            sets: [{ reps: 15, weight: 0 }, { reps: 12, weight: null }, { reps: 10, weight: 0 }]
          },
          {
            name: 'Pullup',
            muscleGroup: 'back',
            sets: [{ reps: 8, weight: 0 }, { reps: 6, weight: 0 }]
          },
          {
            name: 'Bench Press',
            muscleGroup: 'chest',
            sets: [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }]
          }
        ]
      });
    }
  }

  await WeightLog.insertMany(weights);
  await NutritionLog.insertMany(nutritions);
  await MentalLog.insertMany(mentals);
  await Workout.insertMany(workouts);

  // ----------------------------------------------------
  // TEST 1: TDEE Engine
  // ----------------------------------------------------
  console.log('\n>>> TEST 1: TDEE Engine (Sparse Logging) <<<');
  const tdeeResult = await calculateAdaptiveTDEE(user._id, 30, now);
  console.log('Adaptive TDEE Result:', JSON.stringify({
    status: tdeeResult.status,
    adaptiveTdee: tdeeResult.adaptiveTdee,
    weightChangeKg: tdeeResult.weightChangeKg,
    daysAnalyzed: tdeeResult.daysAnalyzed
  }, null, 2));

  // ----------------------------------------------------
  // TEST 2: Metabolic Map (Includes Bodyweight Volume)
  // ----------------------------------------------------
  console.log('\n>>> TEST 2: Metabolic Map (Bodyweight Volume) <<<');
  const metabolicMap = await calculateMetabolicMap(user._id, 30);
  console.log('Metabolic Map Result:', JSON.stringify({
    dynamicTDEE: metabolicMap.dynamicTDEE,
    trainingModifier: metabolicMap.modifiers?.training,
    adaptationModifier: metabolicMap.modifiers?.adaptation,
    dietPhase: metabolicMap.dietPhase
  }, null, 2));

  // ----------------------------------------------------
  // TEST 3: Readiness Score (Includes Bodyweight Volume)
  // ----------------------------------------------------
  console.log('\n>>> TEST 3: Readiness Score <<<');
  const readiness = await calculateReadiness(user._id);
  console.log('Readiness Result:', JSON.stringify({
    score: readiness.readinessScore,
    status: readiness.status,
    trainingLoad: readiness.components?.trainingLoad,
    overtraining: readiness.overtraining
  }, null, 2));

  // ----------------------------------------------------
  // TEST 4: Nutrient Interactions (Separated Meals)
  // ----------------------------------------------------
  console.log('\n>>> TEST 4: Nutrient Interactions <<<');
  // Simulate 3 meals across the day
  const meals = [
    {
      time: '08:00',
      foods: [
        { name: 'Oatmeal', nutrients: { iron_mg: 3, fibre_g: 5, energy_kcal: 200 } },
        { name: 'Orange Juice', nutrients: { vitc_mg: 50, energy_kcal: 100 } } // Synergy
      ]
    },
    {
      time: '13:00',
      foods: [
        { name: 'Salad', nutrients: { vitk_ug: 50, fat_g: 0, energy_kcal: 50 } } // Low fat -> blockage
      ]
    },
    {
      time: '19:00',
      foods: [
        { name: 'Milk', nutrients: { calcium_mg: 300, energy_kcal: 150 } }, // Calcium here should NOT block morning iron
        { name: 'Tea', nutrients: { energy_kcal: 0 } } // Tannins
      ]
    }
  ];

  const interactions = evaluateDayInteractions(meals);
  console.log('Daily Interactions:', JSON.stringify(interactions, null, 2));

  // Cleanup
  console.log('\nCleaning up dynamic test user...');
  await User.findByIdAndDelete(user._id);
  await WeightLog.deleteMany({ user: user._id });
  await NutritionLog.deleteMany({ user: user._id });
  await MentalLog.deleteMany({ user: user._id });
  await Workout.deleteMany({ user: user._id });

  await mongoose.disconnect();
  console.log('Done.');
}

runDynamicTests().catch(console.error);

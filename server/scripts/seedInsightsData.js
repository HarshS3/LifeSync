const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { WeightLog, NutritionLog, MentalLog, FitnessLog } = require('../models/Logs');
const Workout = require('../models/Workout');
const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';

async function seedData() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const testUserEmail = 'demo_insights@lifesync.ai';
  let user = await User.findOne({ email: testUserEmail });

  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    user = await User.create({
      name: 'Insight Demo',
      email: testUserEmail,
      password: hashedPassword,
      gender: 'male',
      weight: 80,
      onboardingCompleted: true,
      goal: 'recomposition'
    });
    console.log('Created demo user');
  } else {
    // Update existing user password just in case
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    user.password = hashedPassword;
    user.onboardingCompleted = true;
    await user.save();
    console.log('Updated existing demo user password');
  }

  // Clear old logs for this user to ensure clean test
  await Promise.all([
    WeightLog.deleteMany({ user: user._id }),
    NutritionLog.deleteMany({ user: user._id }),
    MentalLog.deleteMany({ user: user._id }),
    Workout.deleteMany({ user: user._id })
  ]);

  const days = 60;
  const now = new Date();

  console.log(`Seeding ${days} days of data...`);

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - i));

    // 1. Weight: Slight plateau pattern
    // Start at 80kg, drop to 78.5kg over 30 days, then stay flat
    let weight = 80 - (i < 30 ? i * 0.05 : 1.5);
    // Add some noise
    weight += Math.random() * 0.2;
    
    // Low Carb Tolerance Pattern: 
    // If Day i-1 was high carb, Day i weight spikes
    const isHighCarbPrev = i > 0 && (i % 5 === 0); // High carb every 5 days
    if (isHighCarbPrev) {
      weight += 1.0; // Significant spike
    }

    await WeightLog.create({ user: user._id, date, weightKg: weight });

    // 2. Nutrition: Correlated with weight spike
    const isHighCarb = (i % 5 === 4); // The day before the spike
    const carbs = isHighCarb ? 350 : 180;
    
    await NutritionLog.create({
      user: user._id,
      date,
      dailyTotals: {
        calories: isHighCarb ? 3000 : 2200,
        carbs,
        protein: 160,
        fat: isHighCarb ? 80 : 60
      }
    });

    // 3. Mental: Sleep Architecture Pattern
    // Sleep varies between 5 and 9 hours
    // i % 3 === 0 -> 5h (low sleep)
    // i % 3 === 1 -> 7.5h (optimal)
    // i % 3 === 2 -> 9h (excessive)
    const sleepHours = i % 3 === 0 ? 5 : i % 3 === 1 ? 7.5 : 9;
    
    // Outcomes on Next Day (approximate)
    // We'll calculate outcome based on PREVIOUS day sleep in the next iteration or just link them here
    // Let's just create the logs; the engine will correlate.
    await MentalLog.create({
      user: user._id,
      date,
      sleepHours,
      energyLevel: sleepHours === 7.5 ? 9 : sleepHours === 5 ? 4 : 7,
      hungerLevel: sleepHours === 5 ? 8 : 4,
      moodScore: 7
    });

    // 4. Workouts: Recovery & Progress Pattern
    // Train every 2nd day
    if (i % 2 === 0) {
      // Progress: weight increases over 60 days
      const progressFactor = 1 + (i * 0.005); // 30% gain over 60 days
      
      await Workout.create({
        user: user._id,
        date,
        name: 'Full Body',
        exercises: [
          {
            name: 'Bench Press',
            muscleGroup: 'Chest',
            sets: [
              { weight: 60 * progressFactor, reps: 10, completed: true },
              { weight: 60 * progressFactor, reps: 8, completed: true }
            ]
          },
          {
            name: 'Squat',
            muscleGroup: 'Legs',
            sets: [
              { weight: 80 * progressFactor, reps: 10, completed: true }
            ]
          }
        ]
      });
    }
  }

  console.log('Seeding complete.');
  console.log(`Demo User ID: ${user._id}`);
  console.log(`Demo Email: ${testUserEmail}`);
  console.log('Password: password123');
  
  process.exit(0);
}

seedData().catch(err => {
  console.error(err);
  process.exit(1);
});

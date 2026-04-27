const mongoose = require('mongoose');
const { ingestFromChat } = require('./services/chatIngestion/ingestFromChat');
require('dotenv').config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to DB');

  const User = require('./models/User');
  const user = await User.findOne();
  console.log('Testing with user:', user._id);

  const result = await ingestFromChat({
    userId: user._id,
    message: 'I ate poha 2 plate in breakfast, paneer butter masala in lunch and manchurian noodles in dinner',
    dryRun: false  // actually commit so we can see names
  });

  console.log('\n=== RESULT ===');
  console.log('ingested:', result.ingested);
  console.log('foodIngestion.agentReply:', result.foodIngestion?.agentReply);

  // Show what was actually saved
  const { NutritionLog } = require('./models/Logs');
  const today = new Date();
  today.setHours(0,0,0,0);
  const log = await NutritionLog.findOne({ user: user._id, date: { $gte: today } }).sort({ date: -1 });
  if (log) {
    console.log('\n=== MEALS SAVED ===');
    log.meals.forEach((meal, i) => {
      console.log(`\nMeal ${i+1}: [${meal.mealType}] ${meal.name}`);
      meal.foods.forEach(f => console.log(`  - ${f.name} | ${f.calories} kcal`));
    });
  }
  process.exit(0);
}
run().catch(console.error);

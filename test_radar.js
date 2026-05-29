const mongoose = require('mongoose');
const { buildNutritionReview } = require('./server/services/nutritionReview/buildNutritionReview');
const User = require('./server/models/User');
require('dotenv').config({ path: './server/.env' });

async function test() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lifesync';
    console.log('Connecting to', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected');

    const user = await User.findOne();
    if (!user) {
      console.log('No user found');
      process.exit(0);
    }
    console.log('Testing with user:', user._id);
    
    // Test with today's date
    const today = new Date().toISOString().split('T')[0];
    const res = await buildNutritionReview({ userId: user._id, dayKey: today });
    
    console.log('\n--- DEFICIENCY RISKS ---');
    console.log(JSON.stringify(res.deficiencyRisks, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();

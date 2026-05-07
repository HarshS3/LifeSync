require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { evaluateProteinDistribution } = require('../services/nutritionPipeline/proteinDistributionEngine');
const { calibrateUserTargets } = require('../services/nutritionPipeline/metabolicCalibration');

async function testNewFeatures() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB for verification');

  const testUserId = '69fc408d3fc17ee8ff393a98'; // Using the ID from previous tests

  // 1. Test Protein Distribution
  const mockMeals = [
    { name: 'Lunch', foods: [{ protein: 40 }] },
    { name: 'Dinner', foods: [{ protein: 10 }] }
  ];
  const proteinResult = await evaluateProteinDistribution(testUserId, mockMeals);
  console.log('Protein Distribution Test:', JSON.stringify(proteinResult, null, 2));

  // 2. Test Calibration Service
  const calibrationResult = await calibrateUserTargets(testUserId);
  console.log('Calibration Test:', JSON.stringify(calibrationResult, null, 2));

  await mongoose.disconnect();
}

testNewFeatures().catch(console.error);

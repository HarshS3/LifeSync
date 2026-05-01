require('dotenv').config();
const mongoose = require('mongoose');
const MfpFood = require('./models/MfpFood');
const IndbFood = require('./models/IndbFood');
const RecipeTemplate = require('./models/nutritionKnowledge').RecipeTemplate;

async function testSearch() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const query = 'roti';

  // Test text search
  console.time('Text Search MfpFood');
  const textRes = await MfpFood.find({ $text: { $search: query } }).lean().limit(100);
  console.timeEnd('Text Search MfpFood');
  console.log('Text Search MfpFood Results:', textRes.length);

  // Test regex search
  console.time('Regex Search MfpFood');
  const regexRes = await MfpFood.find({ searchText: { $regex: query, $options: 'i' } }).lean().limit(100);
  console.timeEnd('Regex Search MfpFood');
  console.log('Regex Search MfpFood Results:', regexRes.length);

  // Test IndbFood text search
  console.time('Text Search IndbFood');
  const textIndbRes = await IndbFood.find({ $text: { $search: query } }).lean().limit(100);
  console.timeEnd('Text Search IndbFood');
  console.log('Text Search IndbFood Results:', textIndbRes.length);

  // Test RecipeTemplate text search
  console.time('Text Search RecipeTemplate');
  const textRecipeRes = await RecipeTemplate.find({ $text: { $search: query } }).lean().limit(100);
  console.timeEnd('Text Search RecipeTemplate');
  console.log('Text Search RecipeTemplate Results:', textRecipeRes.length);

  mongoose.disconnect();
}

testSearch();

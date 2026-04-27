require('dotenv').config();
const mongoose = require('mongoose');
const IndbFood = require('../models/IndbFood');
const TarlaFood = require('../models/TarlaFood');
const MfpFood = require('../models/MfpFood');
const { getEmbedding } = require('../services/nutritionAI/embeddingService');

async function embedCollection(Model, modelName) {
  const foods = await Model.find({ $or: [{ embedding: null }, { embedding: { $size: 0 } }] });
  console.log(`Found ${foods.length} foods to embed in ${modelName}.`);

  for (let i = 0; i < foods.length; i++) {
    const food = foods[i];
    const textToEmbed = food.displayName || food.searchText || "Unknown Food";
    try {
      food.embedding = await getEmbedding(textToEmbed);
      await food.save();
    } catch(e) {
      console.error(`Failed to embed ${textToEmbed} in ${modelName}`, e.message);
    }
    
    if (i > 0 && i % 100 === 0) {
      console.log(`Embedded ${i} of ${foods.length} in ${modelName}`);
    }
  }
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in .env');
    process.exit(1);
  }
  
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to target DB');

  await embedCollection(IndbFood, 'IndbFood');
  await embedCollection(TarlaFood, 'TarlaFood');
  await embedCollection(MfpFood, 'MfpFood');

  console.log('Complete! All foods embedded.');
  process.exit(0);
}

run().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
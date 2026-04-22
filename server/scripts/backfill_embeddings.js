require('dotenv').config();
const mongoose = require('mongoose');
const IndbFood = require('../models/IndbFood');
const { getEmbedding } = require('../services/nutritionAI/embeddingService');

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in .env');
    process.exit(1);
  }
  
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to target DB');

  // Find all foods without an embedding
  const foods = await IndbFood.find({ embedding: null });
  console.log(`Found ${foods.length} foods to embed.`);

  if (foods.length === 0) {
    console.log('No foods need embedding. Exiting.');
    process.exit(0);
  }

  for (let i = 0; i < foods.length; i++) {
    const food = foods[i];
    const textToEmbed = food.displayName || food.searchText || "Unknown Food";
    food.embedding = await getEmbedding(textToEmbed);
    
    // Save, bypassing model validation if necessary, but standard save is fine
    await food.save();
    
    if (i % 50 === 0 && i > 0) {
      console.log(`Embedded ${i} of ${foods.length}`);
    }
  }

  console.log('Complete! All foods embedded.');
  process.exit(0);
}

run().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
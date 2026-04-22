# Implementing MongoDB Atlas Vector Search for Food Database

This guide covers how to set up the fast semantic search (10-15ms latency) using a local embedding model (`all-MiniLM-L6-v2`) and MongoDB Atlas `$vectorSearch`.

---

## Step 1: Install Local Embedding Library

We will embed food items locally using HuggingFace's transformers library for JavaScript, which avoids high API costs and latency.

Navigate to your \`server\` directory and install the necessary package:
\`\`\`bash
cd server
npm install @xenova/transformers
\`\`\`

---

## Step 2: Update your Database Schema

You must modify your \`IndbFood\` schema to store dense vector arrays.

**Open \`server/models/IndbFood.js\` and add the \`embedding\` field:**

\`\`\`javascript
const IndbFoodSchema = new mongoose.Schema(
  {
    // ... existing fields

    // NEW: The dense vector representation of the food name/description
    embedding: {
      type: [Number],  // An array of floating-point numbers
      default: null,
      index: false     // Important: DO NOT create a standard index. We will create an Atlas Search index.
    },
  },
  { timestamps: true }
);
\`\`\`

---

## Step 3: Create the Vector Generation Service

Create a service that generates the embeddings from the raw text.

**Create \`server/services/nutritionAI/embeddingService.js\`:**

\`\`\`javascript
const { pipeline } = require('@xenova/transformers');

let generateEmbeddingPipeline = null;

async function getEmbedding(text) {
  if (!generateEmbeddingPipeline) {
    // Model: all-MiniLM-L6-v2 (generates a 384-dimensional vector)
    generateEmbeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // Uses less memory
    });
  }

  const output = await generateEmbeddingPipeline(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(output.data);
}

module.exports = { getEmbedding };
\`\`\`

---

## Step 4: Backfill Existing Food Data (One-Time Run)

You will need a script to iterate over your database, generate embeddings for each food name, and save them.

**Create \`server/scripts/backfill_embeddings.js\`:**

\`\`\`javascript
require('dotenv').config();
const mongoose = require('mongoose');
const IndbFood = require('../models/IndbFood');
const { getEmbedding } = require('../services/nutritionAI/embeddingService');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to target DB');

  // Find all foods without an embedding
  const foods = await IndbFood.find({ embedding: null });
  console.log(\`Found \${foods.length} foods to embed.\`);

  for (let i = 0; i < foods.length; i++) {
    const food = foods[i];
    const textToEmbed = food.displayName || food.searchText || "Unknown Food";
    food.embedding = await getEmbedding(textToEmbed);
    await food.save();
    
    if (i % 50 === 0) console.log(\`Embedded \${i} of \${foods.length}\`);
  }

  console.log('Complete!');
  process.exit(0);
}

run();
\`\`\`

---

## Step 5: Configure MongoDB Atlas Vector Index

You cannot create a Vector Index using Mongoose. It must be created inside the MongoDB Atlas UI.

1. Log into your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
2. Navigate to your cluster, and click on **Search** (under Data Services or Services).
3. Click **Create Search Index**.
4. Choose **Atlas Vector Search** (JSON Editor).
5. Ensure you select the correct target Database and Collection (\`IndbFood\`).
6. Name the index: \`vector_index\`
7. Paste this configuration JSON exactly:

\`\`\`json
{
  "fields": [
    {
      "numDimensions": 384,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    }
  ]
}
\`\`\`

8. Click **Submit** or **Create** and wait a few minutes for the index to build.

---

## Step 6: Hook it into the ReAct Agent

Update your \`NutritionAgent.js\` to swap the regex/text search for the new '$vectorSearch' pipeline.

**Modify \`server/services/nutritionAI/nutritionAgent.js\` inside \`_executeSearchDB\`:**

\`\`\`javascript
const { getEmbedding } = require('./embeddingService');

// Inside your class:
async _executeSearchDB(foodString) {
  try {
    // 1. Convert the user's string ("a handful of almonds") into a vector array
    const queryVector = await getEmbedding(foodString);

    // 2. Query MongoDB's Atlas Vector Search Engine
    const results = await IndbFood.aggregate([
      {
        $vectorSearch: {
          index: "vector_index", // Must match your Atlas index name
          path: "embedding",
          queryVector: queryVector,
          numCandidates: 10,     // Analyze top 10 fast matches
          limit: 1               // Return the absolute best semantic match
        }
      },
      {
        $project: {
          displayName: 1,
          score: { $meta: "vectorSearchScore" } // Fetch confidence score
        }
      }
    ]);

    if (results && results.length > 0) {
      const dbMatch = results[0];
      
      // Strict sanity threshold: ensure it's statistically similar
      if (dbMatch.score > 0.85) {
         return {
            status: "Found high-confidence literal match in DB",
            food: dbMatch.displayName,
            message: "Apply standard portion scaling."
         };
      }
    }

    return { 
      status: "Miss/Low Similarity. Using general knowledge.", 
      food: "unknown instance",
      message: "Please estimate standard macros for the exact phrasing provided." 
    };

  } catch(err) {
    console.error("Vector Query failed:", err);
    return { status: "Error searching DB. Please estimate macros from general knowledge." };
  }
}
\`\`\`
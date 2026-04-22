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

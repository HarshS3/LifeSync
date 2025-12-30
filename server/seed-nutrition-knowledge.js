const mongoose = require('mongoose')
require('dotenv').config()

const { FoodEntity, FoodAlias } = require('./models/nutritionKnowledge')
const { normalizeText } = require('./services/nutritionPipeline/text')

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync'
  await mongoose.connect(MONGO_URI)

  const canonicalId = 'food_banana_raw'

  await FoodEntity.updateOne(
    { canonicalId },
    {
      $set: {
        canonicalId,
        primaryName: 'banana',
        category: 'fruit',
        descriptors: ['raw'],
        locale: 'en',
        provisional: false,
        provenance: { createdBy: 'seed', createdFrom: 'seed-nutrition-knowledge.js' },
      },
    },
    { upsert: true }
  )

  const aliases = ['banana', 'raw banana', 'ripe banana', 'kela']
  for (const a of aliases) {
    const norm = normalizeText(a)
    await FoodAlias.updateOne(
      { aliasNormalized: norm, locale: 'en' },
      {
        $set: {
          alias: a,
          aliasNormalized: norm,
          canonicalId,
          confidence: a === 'kela' ? 0.92 : 0.98,
          source: 'seed',
          locale: 'en',
        },
      },
      { upsert: true }
    )
  }

  console.log('Seeded nutrition knowledge:', canonicalId)
  await mongoose.disconnect()
}

seed().catch((e) => {
  console.error('Seed failed', e)
  process.exit(1)
})

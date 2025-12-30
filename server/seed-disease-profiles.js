require('dotenv').config()
const mongoose = require('mongoose')

const { DiseaseProfile } = require('./models/nutritionKnowledge')

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync'
  await mongoose.connect(MONGO_URI)

  await DiseaseProfile.updateOne(
    { diseaseId: 'diabetes_type_2', locale: 'en' },
    {
      $set: {
        diseaseId: 'diabetes_type_2',
        name: 'Type 2 Diabetes',
        aliases: ['diabetes', 'type 2 diabetes', 't2d', 'diabetes type 2', 'type-2 diabetes', 'type ii diabetes'],
        category: 'metabolic',
        chronic: true,
        locale: 'en',
        affectedAxes: ['blood_glucose', 'insulin_response', 'glycemic_variability'],
        sensitivities: {
          high_glycemic_load: { effect: 'negative', strength: 0.8 },
          fiber_intake: { effect: 'positive', strength: 0.6 },
          meal_timing_irregularity: { effect: 'negative', strength: 0.5 },
        },
        riskTriggers: [
          {
            pattern: 'frequent_high_glycemic_meals',
            windowDays: 7,
            riskLevel: 'moderate',
            meta: { thresholdCount: 5 },
          },
          {
            pattern: 'persistent_fatigue + thirst',
            windowDays: 14,
            riskLevel: 'high',
            meta: { requiresSymptoms: true },
          },
        ],
        systemLimits: {
          noDiagnosis: true,
          noMedicationAdvice: true,
          noDosageSuggestions: true,
        },
        source: 'seed',
        confidence: 0.75,
        meta: {
          notes: 'This profile encodes computable sensitivities and triggers; outputs must remain non-diagnostic and non-prescriptive.',
        },
      },
    },
    { upsert: true }
  )

  console.log('Seeded DiseaseProfile: diabetes_type_2')
  await mongoose.disconnect()
}

seed().catch((e) => {
  console.error('Seed failed', e)
  process.exit(1)
})

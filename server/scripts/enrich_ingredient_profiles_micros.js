require('dotenv').config();

const mongoose = require('mongoose');
const { IngredientProfile } = require('../models/nutritionKnowledge');
const { lookupMicrosPer100g } = require('../services/nutritionSources/openFoodFacts');
const { searchFoods } = require('../services/nutritionProvider');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isMissingMicros(n) {
  const v = n || {};
  const keys = ['potassium', 'iron', 'calcium', 'vitaminB', 'magnesium', 'zinc', 'vitaminC', 'omega3'];
  return keys.some((k) => !(k in v) || Number(v[k]) === 0);
}

function applyIfProvided(target, patch) {
  const out = { ...target };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v == null) continue;
    const num = Number(v);
    if (!Number.isFinite(num)) continue;
    // Only set when the source has a positive value.
    if (num <= 0) continue;
    out[k] = num;
  }
  return out;
}

async function main() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';
  await mongoose.connect(MONGO_URI);

  const limit = Number(process.env.LIFESYNC_ENRICH_LIMIT) || 50;
  const dryRun = String(process.env.LIFESYNC_ENRICH_DRY_RUN || '').trim() === '1';

  const docs = await IngredientProfile.find({}).limit(limit);

  let scanned = 0;
  let updated = 0;
  let fromOff = 0;
  let fromFatSecret = 0;

  for (const doc of docs) {
    scanned += 1;
    const current = doc.nutrientsPer100g || {};
    if (!isMissingMicros(current)) continue;

    const query = doc.displayName || doc.itemKey;

    let nextNutrients = { ...current };
    let sourceMeta = { ...(doc.meta || {}) };

    // 1) Open Food Facts (no API key)
    try {
      const off = await lookupMicrosPer100g({ query });
      if (off?.micros) {
        nextNutrients = applyIfProvided(nextNutrients, off.micros);
        sourceMeta = { ...sourceMeta, micros_source_off: off.source };
        fromOff += 1;
      }
    } catch (e) {
      // ignore OFF failures
    }

    // 2) FatSecret (if configured + IP allowed)
    try {
      const results = await searchFoods(query);
      const best = Array.isArray(results) ? results[0] : null;
      if (best) {
        nextNutrients = applyIfProvided(nextNutrients, {
          potassium: best.potassium,
          iron: best.iron,
          calcium: best.calcium,
          vitaminB: best.vitaminB,
          magnesium: best.magnesium,
          zinc: best.zinc,
          vitaminC: best.vitaminC,
          omega3: best.omega3,
        });
        sourceMeta = { ...sourceMeta, micros_source_fatsecret: { id: best.id, name: best.name, brand: best.brand || null } };
        fromFatSecret += 1;
      }
    } catch {
      // ignore FatSecret failures
    }

    const changed = JSON.stringify(current) !== JSON.stringify(nextNutrients);
    if (!changed) {
      await sleep(150);
      continue;
    }

    if (!dryRun) {
      doc.nutrientsPer100g = nextNutrients;
      doc.meta = sourceMeta;
      await doc.save();
    }

    updated += 1;
    await sleep(150);
  }

  console.log('[enrich_ingredient_profiles_micros] scanned:', scanned);
  console.log('[enrich_ingredient_profiles_micros] updated:', updated);
  console.log('[enrich_ingredient_profiles_micros] off_attempts_with_data:', fromOff);
  console.log('[enrich_ingredient_profiles_micros] fatsecret_attempts:', fromFatSecret);
  console.log('[enrich_ingredient_profiles_micros] dryRun:', dryRun);
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[enrich_ingredient_profiles_micros] failed:', err?.message || err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await mongoose.disconnect();
      } catch {
        // ignore
      }
    });
}

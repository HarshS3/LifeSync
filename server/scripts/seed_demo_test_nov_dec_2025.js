/*
  Convenience wrapper for the showcase seeder.

  Seeds two months of demo data (Nov + Dec 2025) for a single demo user.

  Usage (PowerShell):
    $env:MONGO_URI="mongodb://localhost:27017/lifesync"   # optional (defaults to local)
    node .\server\scripts\seed_demo_test_nov_dec_2025.js
*/

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');

process.env.SEED_SHOWCASE_EMAIL = process.env.SEED_SHOWCASE_EMAIL || 'test@gmail.com';
process.env.SEED_SHOWCASE_NAME = process.env.SEED_SHOWCASE_NAME || 'Test Demo User';
process.env.SEED_SHOWCASE_PASSWORD = process.env.SEED_SHOWCASE_PASSWORD || 'demopassword';

process.env.SEED_SHOWCASE_START_DAYKEY = process.env.SEED_SHOWCASE_START_DAYKEY || '2025-11-01';
process.env.SEED_SHOWCASE_END_DAYKEY = process.env.SEED_SHOWCASE_END_DAYKEY || '2025-12-31';

const { main } = require('./seed_demo_showcase');

main()
  .catch((err) => {
    console.error('[seed:demo:test] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  });

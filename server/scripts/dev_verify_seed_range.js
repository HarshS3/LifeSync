/*
  Dev helper: verify seeded record counts for a user over a date window.

  Usage (PowerShell):
    $env:MONGO_URI="mongodb://localhost:27017/lifesync"  # optional
    node .\server\scripts\dev_verify_seed_range.js

  Env:
    VERIFY_EMAIL (default: test@gmail.com)
    VERIFY_START (default: 2025-11-01)
    VERIFY_END_EXCLUSIVE (default: 2026-01-01)
*/

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const User = require('../models/User');
const { MentalLog, NutritionLog, FitnessLog, StepsLog, WeightLog } = require('../models/Logs');
const { HabitLog } = require('../models/Habit');
const SymptomLog = require('../models/SymptomLog');
const LabReport = require('../models/LabReport');
const JournalEntry = require('../models/JournalEntry');
const DailyLifeState = require('../models/DailyLifeState');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';
const EMAIL = process.env.VERIFY_EMAIL || 'test@gmail.com';
const START = process.env.VERIFY_START || '2025-11-01';
const END_EXCL = process.env.VERIFY_END_EXCLUSIVE || '2026-01-01';

async function main() {
  await mongoose.connect(MONGO_URI);

  const user = await User.findOne({ email: EMAIL }).lean();
  if (!user) {
    console.log('User not found:', EMAIL);
    return;
  }

  const userId = user._id;
  const start = new Date(`${START}T00:00:00`);
  const end = new Date(`${END_EXCL}T00:00:00`);

  const countByDate = (Model) => Model.countDocuments({ user: userId, date: { $gte: start, $lt: end } });

  const [
    mental,
    nutrition,
    fitness,
    steps,
    weight,
    habitLogs,
    symptoms,
    labs,
    journal,
    dls,
  ] = await Promise.all([
    countByDate(MentalLog),
    countByDate(NutritionLog),
    countByDate(FitnessLog),
    countByDate(StepsLog),
    countByDate(WeightLog),
    HabitLog.countDocuments({ user: userId, date: { $gte: start, $lt: end } }),
    countByDate(SymptomLog),
    LabReport.countDocuments({ user: userId }),
    JournalEntry.countDocuments({ user: userId }),
    DailyLifeState.countDocuments({ user: userId, dayKey: { $gte: START, $lte: '2025-12-31' } }),
  ]);

  console.log({
    email: EMAIL,
    window: { start: START, endExclusive: END_EXCL },
    counts: {
      mental,
      nutrition,
      fitness,
      steps,
      weight,
      habitLogs,
      symptoms,
      labs,
      journal,
      dailyLifeState: dls,
    },
  });
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('verify failed:', err);
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

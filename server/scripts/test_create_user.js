require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const DailyLifeState = require('../models/DailyLifeState');
const PatternMemory = require('../models/PatternMemory');
const IdentityMemory = require('../models/IdentityMemory');
const MemoryOverride = require('../models/MemoryOverride');

const { FitnessLog, NutritionLog, MentalLog, MemorySummary, Goal } = require('../models/Logs');
const JournalEntry = require('../models/JournalEntry');
const { Habit, HabitLog } = require('../models/Habit');
const SymptomLog = require('../models/SymptomLog');
const LabReport = require('../models/LabReport');
const { WardrobeItem } = require('../models/Wardrobe');

const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';

function mustBeMongoUri(uri) {
  const s = String(uri || '').trim();
  if (!s) return 'mongodb://localhost:27017/lifesync';
  return s;
}

async function clearUserData(userId) {
  const filter = { user: userId };

  await Promise.all([
    FitnessLog.deleteMany(filter),
    NutritionLog.deleteMany(filter),
    MentalLog.deleteMany(filter),

    Goal.deleteMany(filter),
    MemorySummary.deleteMany(filter),

    JournalEntry.deleteMany(filter),
    Habit.deleteMany(filter),
    HabitLog.deleteMany(filter),
    SymptomLog.deleteMany(filter),
    LabReport.deleteMany(filter),
    WardrobeItem.deleteMany(filter),

    DailyLifeState.deleteMany(filter),
    PatternMemory.deleteMany(filter),
    IdentityMemory.deleteMany(filter),
    MemoryOverride.deleteMany(filter),
  ]);
}

function makeRunEmail() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `test+${y}${m}${d}${hh}${mm}${ss}@lifesync.dev`;
}

async function ensureTestUserAndReset({
  // If you want a fixed user, set LIFESYNC_TEST_EMAIL.
  // NOTE: by default we create a unique user per run to avoid deleting old data.
  email = process.env.LIFESYNC_TEST_EMAIL || makeRunEmail(),
  name = 'LifeSync Test User',
  password = process.env.LIFESYNC_TEST_PASSWORD || 'test1234!',
  mongoUri,
  // Non-destructive by default. Set LIFESYNC_TEST_CLEAR=1 to wipe this test user.
  clear = String(process.env.LIFESYNC_TEST_CLEAR || '').trim() === '1',
} = {}) {
  const MONGO_URI = mustBeMongoUri(mongoUri || process.env.MONGO_URI);
  await mongoose.connect(MONGO_URI);

  const normalizedEmail = String(email).trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  if (!user) {
    user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      onboardingCompleted: true,
    });
  } else {
    // Ensure password is known for repeatable UI login.
    user.name = user.name || name;
    user.password = hashedPassword;
    await user.save();
  }

  if (clear) {
    await clearUserData(user._id);
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

  return {
    userId: String(user._id),
    email: user.email,
    password,
    token,
    cleared: clear,
  };
}

async function main() {
  const out = await ensureTestUserAndReset();

  // Print minimal, copy-paste friendly output.
  console.log('LifeSync test user ready');
  console.log('userId:', out.userId);
  console.log('email:', out.email);
  console.log('password:', out.password);
  console.log('token:', out.token);
  console.log('cleared:', out.cleared);
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[test_create_user] failed:', err?.message || err);
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

module.exports = { ensureTestUserAndReset };

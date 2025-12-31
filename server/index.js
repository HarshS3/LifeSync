require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const userRoutes = require('./routes/userRoutes');
const logRoutes = require('./routes/logRoutes');
const goalRoutes = require('./routes/goalRoutes');
const aiRoutes = require('./routes/aiRoutes');
const authRoutes = require('./routes/authRoutes');
const gymRoutes = require('./routes/gymRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const habitRoutes = require('./routes/habitRoutes');
const styleRoutes = require('./routes/styleRoutes');
const longTermGoalRoutes = require('./routes/longTermGoalRoutes');
const journalRoutes = require('./routes/journalRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const labRoutes = require('./routes/labRoutes');
const insightRoutes = require('./routes/insightRoutes');
const dailyLifeStateRoutes = require('./routes/dailyLifeStateRoutes');

// Start reminder scheduler
require('./services/reminderScheduler');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';
const LOCAL_MONGO_URI = process.env.MONGO_URI_LOCAL || 'mongodb://localhost:27017/lifesync';
const ALLOW_LOCAL_FALLBACK = String(process.env.MONGO_URI_FALLBACK_LOCAL || '1').trim() !== '0';

app.use(cors());
app.use(express.json());

// Middleware to log API response time
app.use((req, res, next) => {
  const startHrTime = process.hrtime();
  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${elapsedMs.toFixed(2)} ms`);
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'LifeSync API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/gym', gymRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/style', styleRoutes);
app.use('/api/long-term-goals', longTermGoalRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/daily-life-state', dailyLifeStateRoutes);

async function start() {
  try {
    try {
      await mongoose.connect(MONGO_URI);
    } catch (err) {
      const isProd = String(process.env.NODE_ENV || '').trim() === 'production';
      const msg = String(err?.message || '');
      const code = String(err?.code || '');
      const looksLikeSrvDns =
        msg.includes('querySrv') ||
        msg.includes('mongodb+srv') ||
        code === 'ECONNREFUSED' ||
        code === 'ENOTFOUND' ||
        code === 'EAI_AGAIN';

      if (!isProd && ALLOW_LOCAL_FALLBACK && looksLikeSrvDns && MONGO_URI !== LOCAL_MONGO_URI) {
        console.warn('[MongoDB] Primary connection failed. Falling back to local MongoDB for dev.');
        console.warn('[MongoDB] To disable fallback set MONGO_URI_FALLBACK_LOCAL=0');
        await mongoose.connect(LOCAL_MONGO_URI);
      } else {
        throw err;
      }
    }
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`LifeSync API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

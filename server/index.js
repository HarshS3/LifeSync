require('dotenv').config({ path: require('path').join(__dirname, '.env') });
process.env.TZ = 'Asia/Kolkata';
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const userRoutes = require('./routes/userRoutes');
const logRoutes = require('./routes/logRoutes');
const aiRoutes = require('./routes/aiRoutes');
const authRoutes = require('./routes/authRoutes');
const gymRoutes = require('./routes/gymRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const habitRoutes = require('./routes/habitRoutes');
const commitmentRoutes = require('./routes/commitmentRoutes');
const styleRoutes = require('./routes/styleRoutes');
const longTermGoalRoutes = require('./routes/longTermGoalRoutes');
const journalRoutes = require('./routes/journalRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const labRoutes = require('./routes/labRoutes');
const insightRoutes = require('./routes/insightRoutes');
const dailyLifeStateRoutes = require('./routes/dailyLifeStateRoutes');
const sttRoutes = require('./routes/sttRoutes');
const chatIngestionRoutes = require('./routes/chatIngestionRoutes');
const reportRoutes = require('./routes/reportRoutes');
const photoLogRoutes = require('./routes/photoLogRoutes');
const recipeRoutes = require('./routes/recipeRoutes');

const dashboardRoutes = require('./routes/dashboardRoutes');

// Start reminder scheduler
require('./services/reminderScheduler');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('[MongoDB] MONGO_URI env var is not set. Set it to your Atlas connection string.');
  process.exit(1);
}

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ... (existing rate limiters)

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/gym', gymRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/commitments', commitmentRoutes);
app.use('/api/style', styleRoutes);
app.use('/api/long-term-goals', longTermGoalRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/daily-life-state', dailyLifeStateRoutes);
app.use('/api/stt', sttRoutes);
app.use('/api/chat-ingestion', chatIngestionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/photo-log', photoLogRoutes);
app.use('/api/recipes', recipeRoutes);

async function start() {
  try {
    try {
      await mongoose.connect(MONGO_URI);
    } catch (err) {
      throw err;
    }
    console.log('Connected to MongoDB');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`LifeSync API running on port ${PORT} and bound to 0.0.0.0`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

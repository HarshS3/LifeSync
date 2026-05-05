const mongoose = require('mongoose');

const workoutTemplateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  exercises: [{
    name: { type: String, required: true },
    muscleGroup: { type: String },
    notes: { type: String },
    sets: [{
      reps: { type: Number },
      weight: { type: Number },
      duration: { type: Number },
      distance: { type: Number },
      speed: { type: Number },
      incline: { type: Number },
      resistance: { type: Number },
      rpm: { type: Number },
      calories: { type: Number },
      pace: { type: String },
      heartRate: { type: Number },
      rounds: { type: Number },
      laps: { type: Number },
      strokeRate: { type: Number },
      stroke: { type: String },
      floors: { type: Number },
      steps: { type: Number },
      jumps: { type: Number },
      workTime: { type: Number },
      restTime: { type: Number },
      rpe: { type: Number }
    }]
  }],
  lastUsed: { type: Date },
  isFavorite: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WorkoutTemplate', workoutTemplateSchema);

const mongoose = require('mongoose')

const WorkoutSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: String,
    date: { type: Date, default: Date.now },
    duration: Number, // in seconds
    exercises: [
      {
        name: String,
        muscleGroup: String,
        metadata: {
          type: { type: String, enum: ['compound', 'isolation'] },
          primary: String,
          secondary: [String],
        },
        sets: [
          {
            weight: Number,
            reps: Number,
            duration: Number,
            distance: Number,
            speed: Number,
            incline: Number,
            resistance: Number,
            rpm: Number,
            calories: Number,
            pace: String,
            heartRate: Number,
            rounds: Number,
            laps: Number,
            strokeRate: Number,
            stroke: String,
            floors: Number,
            steps: Number,
            jumps: Number,
            workTime: Number,
            restTime: Number,
            rpe: Number,
            completed: { type: Boolean, default: true },
          },
        ],
      },
    ],
    notes: String,
  },
  { timestamps: true }
)

module.exports = mongoose.models.Workout || mongoose.model('Workout', WorkoutSchema)

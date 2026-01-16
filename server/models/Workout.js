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
        sets: [
          {
            weight: Number,
            reps: Number,
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

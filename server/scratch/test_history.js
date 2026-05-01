const mongoose = require('mongoose');
require('dotenv').config();
const Workout = require('../models/Workout');

async function testHistory() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const decodedName = 'Squats'; // From the user's example
  console.log('Testing exercise history for:', decodedName);
  
  const workouts = await Workout.find().sort({ date: -1 }).limit(20);
  console.log(`Found ${workouts.length} total workouts in DB.`);
  
  let foundExercise = false;
  workouts.forEach((workout) => {
    workout.exercises?.forEach((ex) => {
      console.log('Checking exercise in DB:', ex.name);
      if (ex.name?.toLowerCase() === decodedName.toLowerCase()) {
        foundExercise = true;
        console.log('Found match:', ex.name, ex.sets);
      }
    });
  });
  
  if (!foundExercise) {
    console.log('No exact match for', decodedName, 'found in the sampled workouts.');
  }
  
  await mongoose.disconnect();
}

testHistory().catch(console.error);

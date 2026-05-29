/**
 * Server-side Exercise Metadata
 * Provides classification (compound vs isolation) and muscle target data.
 */

const EXERCISE_METADATA = {
  // Chest
  'Barbell Bench Press': { type: 'compound', primary: 'chest', secondary: ['triceps', 'shoulders'] },
  'Incline Barbell Press': { type: 'compound', primary: 'chest', secondary: ['triceps', 'shoulders'] },
  'Dumbbell Bench Press': { type: 'compound', primary: 'chest', secondary: ['triceps', 'shoulders'] },
  'Incline Dumbbell Press': { type: 'compound', primary: 'chest', secondary: ['triceps', 'shoulders'] },
  'Dumbbell Flye': { type: 'isolation', primary: 'chest', secondary: ['shoulders'] },
  'Cable Crossover': { type: 'isolation', primary: 'chest', secondary: [] },
  'Pec Deck Machine': { type: 'isolation', primary: 'chest', secondary: [] },
  'Push-Up': { type: 'compound', primary: 'chest', secondary: ['triceps', 'shoulders'] },
  'Dips (chest)': { type: 'compound', primary: 'chest', secondary: ['triceps', 'shoulders'] },
  'Decline Bench Press': { type: 'compound', primary: 'chest', secondary: ['triceps', 'shoulders'] },
  'Machine Chest Press': { type: 'compound', primary: 'chest', secondary: ['triceps', 'shoulders'] },

  // Back
  'Barbell Deadlift': { type: 'compound', primary: 'back', secondary: ['hamstrings', 'glutes', 'core', 'traps'] },
  'Barbell Row': { type: 'compound', primary: 'back', secondary: ['biceps', 'shoulders'] },
  'Dumbbell Row': { type: 'compound', primary: 'back', secondary: ['biceps', 'shoulders'] },
  'Pull-Up': { type: 'compound', primary: 'back', secondary: ['biceps', 'shoulders'] },
  'Lat Pulldown': { type: 'compound', primary: 'back', secondary: ['biceps', 'shoulders'] },
  'Seated Cable Row': { type: 'compound', primary: 'back', secondary: ['biceps', 'shoulders'] },
  'T-Bar Row': { type: 'compound', primary: 'back', secondary: ['biceps', 'shoulders'] },
  'Straight Arm Pulldown': { type: 'isolation', primary: 'back', secondary: ['triceps'] },
  'Face Pull': { type: 'isolation', primary: 'shoulders', secondary: ['back', 'traps'] },
  'Chin-Up': { type: 'compound', primary: 'back', secondary: ['biceps', 'shoulders'] },
  'Back Extension': { type: 'isolation', primary: 'back', secondary: ['glutes', 'hamstrings'] },
  'Trap Bar Deadlift': { type: 'compound', primary: 'legs', secondary: ['back', 'glutes', 'hamstrings'] },
  'Farmer\'s Carry': { type: 'compound', primary: 'core', secondary: ['back', 'shoulders', 'forearms'] },
  'Chest-Supported Row': { type: 'compound', primary: 'back', secondary: ['biceps'] },

  // Shoulders
  'Overhead Press (Barbell)': { type: 'compound', primary: 'shoulders', secondary: ['triceps'] },
  'Dumbbell Shoulder Press': { type: 'compound', primary: 'shoulders', secondary: ['triceps'] },
  'Arnold Press': { type: 'compound', primary: 'shoulders', secondary: ['triceps'] },
  'Lateral Raise': { type: 'isolation', primary: 'shoulders', secondary: [] },
  'Cable Lateral Raise': { type: 'isolation', primary: 'shoulders', secondary: [] },
  'Rear Delt Flye': { type: 'isolation', primary: 'shoulders', secondary: [] },
  'Machine Shoulder Press': { type: 'compound', primary: 'shoulders', secondary: ['triceps'] },
  'Clean and Press': { type: 'compound', primary: 'shoulders', secondary: ['quads', 'glutes', 'back'] },
  'Front Raise': { type: 'isolation', primary: 'shoulders', secondary: [] },
  'Upright Row': { type: 'compound', primary: 'shoulders', secondary: ['traps', 'biceps'] },
  'Shrugs': { type: 'isolation', primary: 'back', secondary: [] },
  'Reverse Pec Deck': { type: 'isolation', primary: 'shoulders', secondary: [] },

  // Biceps
  'Barbell Curl': { type: 'isolation', primary: 'biceps', secondary: [] },
  'Dumbbell Curl': { type: 'isolation', primary: 'biceps', secondary: [] },
  'Incline Dumbbell Curl': { type: 'isolation', primary: 'biceps', secondary: [] },
  'Hammer Curl': { type: 'isolation', primary: 'biceps', secondary: ['forearms'] },
  'Concentration Curl': { type: 'isolation', primary: 'biceps', secondary: [] },
  'Cable Curl': { type: 'isolation', primary: 'biceps', secondary: [] },
  'Preacher Curl': { type: 'isolation', primary: 'biceps', secondary: [] },
  'Reverse Barbell Curl': { type: 'isolation', primary: 'biceps', secondary: ['forearms'] },

  // Triceps
  'Close Grip Bench Press': { type: 'compound', primary: 'triceps', secondary: ['chest', 'shoulders'] },
  'Skull Crusher': { type: 'isolation', primary: 'triceps', secondary: [] },
  'Tricep Pushdown (Cable)': { type: 'isolation', primary: 'triceps', secondary: [] },
  'Overhead Tricep Extension': { type: 'isolation', primary: 'triceps', secondary: [] },
  'Diamond Push-Up': { type: 'compound', primary: 'triceps', secondary: ['chest', 'shoulders'] },
  'Dips (tricep)': { type: 'compound', primary: 'triceps', secondary: ['chest', 'shoulders'] },
  'Tricep Kickback': { type: 'isolation', primary: 'triceps', secondary: [] },

  // Quads
  'Back Squat': { type: 'compound', primary: 'quads', secondary: ['glutes', 'hamstrings', 'core', 'back'] },
  'Front Squat': { type: 'compound', primary: 'quads', secondary: ['glutes', 'hamstrings', 'core', 'back'] },
  'Leg Press': { type: 'compound', primary: 'quads', secondary: ['glutes', 'hamstrings'] },
  'Bulgarian Split Squat': { type: 'compound', primary: 'quads', secondary: ['glutes', 'hamstrings', 'core'] },
  'Leg Extension': { type: 'isolation', primary: 'quads', secondary: [] },
  'Lunges': { type: 'compound', primary: 'quads', secondary: ['glutes', 'hamstrings'] },
  'Hack Squat': { type: 'compound', primary: 'quads', secondary: ['glutes', 'hamstrings'] },
  'Goblet Squat': { type: 'compound', primary: 'quads', secondary: ['glutes', 'core'] },

  // Hamstrings
  'Romanian Deadlift (RDL)': { type: 'compound', primary: 'hamstrings', secondary: ['glutes', 'back'] },
  'Nordic Curl': { type: 'isolation', primary: 'hamstrings', secondary: [] },
  'Leg Curl (Lying)': { type: 'isolation', primary: 'hamstrings', secondary: [] },
  'Seated Leg Curl': { type: 'isolation', primary: 'hamstrings', secondary: [] },
  'Good Morning': { type: 'compound', primary: 'hamstrings', secondary: ['glutes', 'back'] },
  'Single Leg RDL': { type: 'compound', primary: 'hamstrings', secondary: ['glutes', 'core'] },

  // Glutes
  'Hip Thrust': { type: 'compound', primary: 'glutes', secondary: ['hamstrings'] },
  'Glute Bridge': { type: 'isolation', primary: 'glutes', secondary: ['hamstrings'] },
  'Cable Pull-Through': { type: 'compound', primary: 'glutes', secondary: ['hamstrings', 'back'] },
  'Step-Up': { type: 'compound', primary: 'glutes', secondary: ['quads', 'hamstrings'] },
  'Donkey Kick': { type: 'isolation', primary: 'glutes', secondary: [] },
  'Barbell Hip Thrust (Pause)': { type: 'compound', primary: 'glutes', secondary: ['hamstrings'] },
  'Hip Abductor Machine': { type: 'isolation', primary: 'glutes', secondary: [] },
  'Hip Adductor Machine': { type: 'isolation', primary: 'glutes', secondary: [] },

  // Calves
  'Standing Calf Raise': { type: 'isolation', primary: 'calves', secondary: [] },
  'Seated Calf Raise': { type: 'isolation', primary: 'calves', secondary: [] },
  'Donkey Calf Raise': { type: 'isolation', primary: 'calves', secondary: [] },
  'Leg Press Calf Raise': { type: 'isolation', primary: 'calves', secondary: [] },

  // Core
  'Plank': { type: 'isolation', primary: 'core', secondary: ['shoulders', 'glutes'] },
  'Ab Wheel Rollout': { type: 'compound', primary: 'core', secondary: ['lats', 'shoulders'] },
  'Cable Crunch': { type: 'isolation', primary: 'core', secondary: [] },
  'Hanging Leg Raise': { type: 'isolation', primary: 'core', secondary: ['hip_flexors'] },
  'Russian Twist': { type: 'isolation', primary: 'core', secondary: [] },
  'Dead Bug': { type: 'isolation', primary: 'core', secondary: [] },
  'Pallof Press': { type: 'isolation', primary: 'core', secondary: [] },
  'Side Plank': { type: 'isolation', primary: 'core', secondary: [] },
  'Crunch': { type: 'isolation', primary: 'core', secondary: [] },
  'Mountain Climber': { type: 'compound', primary: 'core', secondary: ['shoulders', 'quads'] },
  'Bicycle Crunches': { type: 'isolation', primary: 'core', secondary: [] },

  // Cardio (MET values)
  'Running': { type: 'cardio', met: 9.8, primary: 'cardio', secondary: ['legs'] },
  'Cycling': { type: 'cardio', met: 7.5, primary: 'cardio', secondary: ['legs'] },
  'Treadmill Walk': { type: 'cardio', met: 3.8, primary: 'cardio', secondary: ['legs'] },
  'Rowing': { type: 'cardio', met: 7.0, primary: 'cardio', secondary: ['back', 'legs'] },
  'Elliptical': { type: 'cardio', met: 5.0, primary: 'cardio', secondary: ['legs'] },
};

module.exports = { EXERCISE_METADATA };

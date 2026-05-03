export const EXERCISE_LIBRARY = {
  chest: {
    label: 'Chest',
    color: '#ef4444',
    exercises: [
      { name: 'Barbell Bench Press', type: 'Compound', pattern: 'push', equipment: 'BB', mechanics: 'Bilateral', primary: 'Chest', secondary: 'Front Delts, Triceps', difficulty: 'Beginner', reps: '6-12', rest: '2-3 min', notes: 'King of chest exercises. Arch back slightly, retract scapula.' },
      { name: 'Incline Barbell Press', type: 'Compound', pattern: 'push', equipment: 'BB', mechanics: 'Bilateral', primary: 'Chest', secondary: 'Upper Chest, Front Delts, Triceps', difficulty: 'Beginner', reps: '8-12', rest: '2-3 min', notes: '30-45° incline hits upper chest. Most neglected chest region.' },
      { name: 'Dumbbell Bench Press', type: 'Compound', pattern: 'push', equipment: 'DB', mechanics: 'Bilateral', primary: 'Chest', secondary: 'Front Delts, Triceps', difficulty: 'Beginner', reps: '8-15', rest: '90s-2 min', notes: 'Greater range of motion than barbell. Better for joint health.' },
      { name: 'Incline Dumbbell Press', type: 'Compound', pattern: 'push', equipment: 'DB', mechanics: 'Bilateral', primary: 'Chest', secondary: 'Upper Chest, Front Delts', difficulty: 'Beginner', reps: '8-15', rest: '90s-2 min', notes: 'Upper chest emphasis. Essential for full chest development.' },
      { name: 'Dumbbell Flye', type: 'Isolated', pattern: 'push', equipment: 'DB', mechanics: 'Bilateral', primary: 'Chest', secondary: 'Front Delts', difficulty: 'Beginner', reps: '12-20', rest: '60-90s', notes: 'Stretch is the point — go deep. Not a heavy exercise.' },
      { name: 'Cable Crossover', type: 'Isolated', pattern: 'push', equipment: 'CB', mechanics: 'Bilateral', primary: 'Chest', secondary: 'Front Delts', difficulty: 'Intermediate', reps: '12-20', rest: '60s', notes: 'Constant tension through full ROM. Best chest isolation.' },
      { name: 'Pec Deck Machine', type: 'Isolated', pattern: 'push', equipment: 'MC', mechanics: 'Bilateral', primary: 'Chest', secondary: 'Front Delts', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Safe isolation. Good finisher for chest day.' },
      { name: 'Push-Up', type: 'Compound', pattern: 'push', equipment: 'BW', mechanics: 'Bilateral', primary: 'Chest', secondary: 'Front Delts, Triceps, Core', difficulty: 'Beginner', reps: '10-20', rest: '60s', notes: 'Always relevant. Add tempo for intensity without load.' },
      { name: 'Dips (chest)', type: 'Compound', pattern: 'push', equipment: 'BW', mechanics: 'Bilateral', primary: 'Chest', secondary: 'Triceps, Front Delts', difficulty: 'Intermediate', reps: '8-15', rest: '2 min', notes: 'Lean forward to shift emphasis to chest vs triceps.' },
      { name: 'Decline Bench Press', type: 'Compound', pattern: 'push', equipment: 'BB', mechanics: 'Bilateral', primary: 'Chest', secondary: 'Lower Chest, Triceps', difficulty: 'Intermediate', reps: '8-12', rest: '2 min', notes: 'Targets the lower portion of the chest.' },
      { name: 'Machine Chest Press', type: 'Compound', pattern: 'push', equipment: 'MC', mechanics: 'Bilateral', primary: 'Chest', secondary: 'Front Delts, Triceps', difficulty: 'Beginner', reps: '10-15', rest: '90s', notes: 'Excellent stability for pure chest hypertrophy.' }
    ]
  },
  back: {
    label: 'Back',
    color: '#3b82f6',
    exercises: [
      { name: 'Barbell Deadlift', type: 'Compound', pattern: 'hinge', equipment: 'BB', mechanics: 'Bilateral', primary: 'Back', secondary: 'Glutes, Hamstrings, Traps, Core', difficulty: 'Intermediate', reps: '3-8', rest: '3-5 min', notes: 'Full posterior chain. Spine neutral mandatory. Most taxing exercise.' },
      { name: 'Barbell Row', type: 'Compound', pattern: 'pull', equipment: 'BB', mechanics: 'Bilateral', primary: 'Back', secondary: 'Biceps, Rear Delts, Traps', difficulty: 'Intermediate', reps: '6-12', rest: '2-3 min', notes: 'Hinge at hip, pull to lower chest. Chest touches bar = too heavy.' },
      { name: 'Dumbbell Row', type: 'Compound', pattern: 'pull', equipment: 'DB', mechanics: 'Unilateral', primary: 'Back', secondary: 'Biceps, Rear Delts', difficulty: 'Beginner', reps: '8-15', rest: '90s', notes: 'Unilateral — corrects imbalances. Elbow drives the movement.' },
      { name: 'Pull-Up', type: 'Compound', pattern: 'pull', equipment: 'BW', mechanics: 'Bilateral', primary: 'Back', secondary: 'Biceps, Rear Delts', difficulty: 'Intermediate', reps: '5-12', rest: '2-3 min', notes: 'Best upper back exercise. Wide grip = lats. Neutral = more bicep.' },
      { name: 'Lat Pulldown', type: 'Compound', pattern: 'pull', equipment: 'CB', mechanics: 'Bilateral', primary: 'Back', secondary: 'Biceps, Rear Delts', difficulty: 'Beginner', reps: '8-15', rest: '90s-2 min', notes: 'Machine pull-up. Great for beginners or adding volume.' },
      { name: 'Seated Cable Row', type: 'Compound', pattern: 'pull', equipment: 'CB', mechanics: 'Bilateral', primary: 'Back', secondary: 'Biceps, Rear Delts, Traps', difficulty: 'Beginner', reps: '10-15', rest: '90s', notes: 'Chest tall, pull to navel, squeeze at peak. No momentum.' },
      { name: 'T-Bar Row', type: 'Compound', pattern: 'pull', equipment: 'BB', mechanics: 'Bilateral', primary: 'Back', secondary: 'Biceps, Traps', difficulty: 'Intermediate', reps: '8-12', rest: '2-3 min', notes: 'Excellent mid-back thickness builder. Chest supported = safer.' },
      { name: 'Straight Arm Pulldown', type: 'Isolated', pattern: 'pull', equipment: 'CB', mechanics: 'Bilateral', primary: 'Back', secondary: 'Long head Triceps', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Pure lat isolation. Keep arms straight throughout. Great finisher.' },
      { name: 'Face Pull', type: 'Isolated', pattern: 'pull', equipment: 'CB', mechanics: 'Bilateral', primary: 'Back', secondary: 'Rear Delts, External Rotators', difficulty: 'Beginner', reps: '15-25', rest: '60s', notes: 'Shoulder health non-negotiable. Should be in every program.' },
      { name: 'Chin-Up', type: 'Compound', pattern: 'pull', equipment: 'BW', mechanics: 'Bilateral', primary: 'Back', secondary: 'Biceps', difficulty: 'Intermediate', reps: '6-12', rest: '2-3 min', notes: 'Supinated grip — more bicep involvement than pull-up. Excellent.' },
      { name: 'Back Extension', type: 'Isolated', pattern: 'hinge', equipment: 'BW', mechanics: 'Bilateral', primary: 'Back', secondary: 'Glutes, Hamstrings', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Lower back endurance and strength. Essential for deadlift health.' },
      { name: 'Trap Bar Deadlift', type: 'Compound', pattern: 'hinge', equipment: 'BB', mechanics: 'Bilateral', primary: 'Back', secondary: 'Quads, Glutes, Hamstrings', difficulty: 'Intermediate', reps: '5-10', rest: '3-5 min', notes: 'Easier to learn than conventional. More quad involvement. Safe for many.' },
      { name: 'Farmer\'s Carry', type: 'Compound', pattern: 'carry', equipment: 'DB', mechanics: 'Bilateral', primary: 'Back', secondary: 'Traps, Core, Forearms, Glutes', difficulty: 'Beginner', reps: '30-60m', rest: '2 min', notes: 'Full body. Grip, core, traps, everything. Criminally underused.' },
      { name: 'Chest-Supported Row', type: 'Compound', pattern: 'pull', equipment: 'MC', mechanics: 'Bilateral', primary: 'Back', secondary: 'Biceps, Rear Delts', difficulty: 'Beginner', reps: '8-15', rest: '90s', notes: 'Removes lower back fatigue, allowing pure lat/rhomboid isolation.' }
    ]
  },
  shoulders: {
    label: 'Shoulders',
    color: '#f59e0b',
    exercises: [
      { name: 'Overhead Press (Barbell)', type: 'Compound', pattern: 'push', equipment: 'BB', mechanics: 'Bilateral', primary: 'Shoulders', secondary: 'Triceps, Upper Traps, Core', difficulty: 'Intermediate', reps: '5-10', rest: '2-3 min', notes: 'King of shoulder mass. Strict form — no leg drive for hypertrophy.' },
      { name: 'Dumbbell Shoulder Press', type: 'Compound', pattern: 'push', equipment: 'DB', mechanics: 'Bilateral', primary: 'Shoulders', secondary: 'Triceps, Upper Traps', difficulty: 'Beginner', reps: '8-15', rest: '90s-2 min', notes: 'Greater ROM than barbell. Fixes side-to-side imbalances.' },
      { name: 'Arnold Press', type: 'Compound', pattern: 'push', equipment: 'DB', mechanics: 'Bilateral', primary: 'Shoulders', secondary: 'Triceps, All 3 delt heads', difficulty: 'Intermediate', reps: '10-15', rest: '90s', notes: 'Hits all three deltoid heads through rotation. Excellent exercise.' },
      { name: 'Lateral Raise', type: 'Isolated', pattern: 'push', equipment: 'DB', mechanics: 'Bilateral', primary: 'Shoulders', secondary: '', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Pure medial delt. The exercise that creates shoulder width. Light weight, full ROM.' },
      { name: 'Cable Lateral Raise', type: 'Isolated', pattern: 'push', equipment: 'CB', mechanics: 'Unilateral', primary: 'Shoulders', secondary: '', difficulty: 'Beginner', reps: '12-25', rest: '60s', notes: 'Constant tension vs dumbbell (which drops tension at bottom). Superior.' },
      { name: 'Rear Delt Flye', type: 'Isolated', pattern: 'pull', equipment: 'DB', mechanics: 'Bilateral', primary: 'Shoulders', secondary: 'Traps, Rhomboids', difficulty: 'Beginner', reps: '15-20', rest: '60s', notes: 'Most neglected muscle. Fixes forward head posture. Do more of this.' },
      { name: 'Machine Shoulder Press', type: 'Compound', pattern: 'push', equipment: 'MC', mechanics: 'Bilateral', primary: 'Shoulders', secondary: 'Triceps', difficulty: 'Beginner', reps: '10-15', rest: '90s', notes: 'Safe for beginners. Good for shoulder rehab.' },
      { name: 'Clean and Press', type: 'Compound', pattern: 'push', equipment: 'BB', mechanics: 'Bilateral', primary: 'Shoulders', secondary: 'Full Body', difficulty: 'Advanced', reps: '3-6', rest: '3-4 min', notes: 'Olympic lift. Builds explosive power. High skill requirement.' },
      { name: 'Front Raise', type: 'Isolated', pattern: 'push', equipment: 'DB', mechanics: 'Bilateral', primary: 'Shoulders', secondary: 'Anterior Deltoid', difficulty: 'Beginner', reps: '10-15', rest: '60s', notes: 'Isolates the front delt.' },
      { name: 'Upright Row', type: 'Compound', pattern: 'pull', equipment: 'BB', mechanics: 'Bilateral', primary: 'Shoulders', secondary: 'Traps, Biceps', difficulty: 'Intermediate', reps: '8-12', rest: '90s', notes: 'Keep elbows higher than wrists.' },
      { name: 'Shrugs', type: 'Isolated', pattern: 'pull', equipment: 'DB', mechanics: 'Bilateral', primary: 'Traps', secondary: 'Shoulders', difficulty: 'Beginner', reps: '10-20', rest: '60s', notes: 'Elevate shoulders directly toward ears.' },
      { name: 'Reverse Pec Deck', type: 'Isolated', pattern: 'pull', equipment: 'MC', mechanics: 'Bilateral', primary: 'Shoulders', secondary: 'Traps, Rhomboids', difficulty: 'Beginner', reps: '15-20', rest: '60s', notes: 'Machine rear delt isolation. Provides excellent constant tension.' }
    ]
  },
  biceps: {
    label: 'Biceps',
    color: '#10b981',
    exercises: [
      { name: 'Barbell Curl', type: 'Isolated', pattern: 'pull', equipment: 'BB', mechanics: 'Bilateral', primary: 'Biceps', secondary: 'Brachialis, Forearms', difficulty: 'Beginner', reps: '8-12', rest: '90s', notes: 'Mass builder for biceps. EZ bar reduces wrist strain.' },
      { name: 'Dumbbell Curl', type: 'Isolated', pattern: 'pull', equipment: 'DB', mechanics: 'Unilateral', primary: 'Biceps', secondary: 'Brachialis, Forearms', difficulty: 'Beginner', reps: '10-15', rest: '60-90s', notes: 'Unilateral — corrects imbalances. Supination is key.' },
      { name: 'Incline Dumbbell Curl', type: 'Isolated', pattern: 'pull', equipment: 'DB', mechanics: 'Unilateral', primary: 'Biceps', secondary: 'Long head bicep', difficulty: 'Beginner', reps: '10-15', rest: '60-90s', notes: 'Long head emphasis — the peak of the bicep. Stretch at bottom.' },
      { name: 'Hammer Curl', type: 'Isolated', pattern: 'pull', equipment: 'DB', mechanics: 'Unilateral', primary: 'Biceps', secondary: 'Brachialis, Forearms', difficulty: 'Beginner', reps: '10-15', rest: '60s', notes: 'Neutral grip hits brachialis — under the bicep, pushes it up.' },
      { name: 'Concentration Curl', type: 'Isolated', pattern: 'pull', equipment: 'DB', mechanics: 'Unilateral', primary: 'Biceps', secondary: '', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Pure isolation. Maximum mind-muscle connection.' },
      { name: 'Cable Curl', type: 'Isolated', pattern: 'pull', equipment: 'CB', mechanics: 'Bilateral', primary: 'Biceps', secondary: 'Brachialis', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Constant tension throughout ROM. Superior to dumbbells for isolation.' },
      { name: 'Preacher Curl', type: 'Isolated', pattern: 'pull', equipment: 'BB', mechanics: 'Bilateral', primary: 'Biceps', secondary: '', difficulty: 'Beginner', reps: '10-15', rest: '60-90s', notes: 'Eliminates cheating. Short head emphasis.' },
      { name: 'Reverse Barbell Curl', type: 'Isolated', pattern: 'pull', equipment: 'BB', mechanics: 'Bilateral', primary: 'Forearms', secondary: 'Biceps, Brachioradialis', difficulty: 'Intermediate', reps: '10-15', rest: '60s', notes: 'Overhand grip prioritizes the brachioradialis and forearm extensors.' }
    ]
  },
  triceps: {
    label: 'Triceps',
    color: '#8b5cf6',
    exercises: [
      { name: 'Close Grip Bench Press', type: 'Compound', pattern: 'push', equipment: 'BB', mechanics: 'Bilateral', primary: 'Triceps', secondary: 'Chest, Front Delts', difficulty: 'Beginner', reps: '6-12', rest: '2 min', notes: 'Best mass builder for triceps. Hands shoulder-width.' },
      { name: 'Skull Crusher', type: 'Isolated', pattern: 'push', equipment: 'BB', mechanics: 'Bilateral', primary: 'Triceps', secondary: '', difficulty: 'Intermediate', reps: '10-15', rest: '90s', notes: 'Long head emphasis. Lower to forehead (EZ bar is safer).' },
      { name: 'Tricep Pushdown (Cable)', type: 'Isolated', pattern: 'push', equipment: 'CB', mechanics: 'Bilateral', primary: 'Triceps', secondary: '', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Most popular tricep isolation. Full extension at bottom mandatory.' },
      { name: 'Overhead Tricep Extension', type: 'Isolated', pattern: 'push', equipment: 'DB', mechanics: 'Bilateral', primary: 'Triceps', secondary: '', difficulty: 'Beginner', reps: '12-20', rest: '60-90s', notes: 'Long head stretch — the largest head of the tricep.' },
      { name: 'Diamond Push-Up', type: 'Compound', pattern: 'push', equipment: 'BW', mechanics: 'Bilateral', primary: 'Triceps', secondary: 'Chest, Front Delts', difficulty: 'Beginner', reps: '10-20', rest: '60s', notes: 'Bodyweight tricep mass builder. Hands form diamond shape.' },
      { name: 'Dips (tricep)', type: 'Compound', pattern: 'push', equipment: 'BW', mechanics: 'Bilateral', primary: 'Triceps', secondary: 'Chest, Front Delts', difficulty: 'Intermediate', reps: '8-15', rest: '2 min', notes: 'Stay upright to hit triceps vs chest. Elbows track back.' },
      { name: 'Tricep Kickback', type: 'Isolated', pattern: 'push', equipment: 'DB', mechanics: 'Unilateral', primary: 'Triceps', secondary: '', difficulty: 'Beginner', reps: '10-15', rest: '60s', notes: 'Extend arm fully backward, keeping upper arm stationary.' }
    ]
  },
  quads: {
    label: 'Quads',
    color: '#ec4899',
    exercises: [
      { name: 'Back Squat', type: 'Compound', pattern: 'squat', equipment: 'BB', mechanics: 'Bilateral', primary: 'Quads', secondary: 'Glutes, Hamstrings, Core', difficulty: 'Intermediate', reps: '5-10', rest: '3-5 min', notes: 'King of leg exercises. Bar on traps, knees track toes.' },
      { name: 'Front Squat', type: 'Compound', pattern: 'squat', equipment: 'BB', mechanics: 'Bilateral', primary: 'Quads', secondary: 'Core, Upper Back', difficulty: 'Advanced', reps: '5-8', rest: '3-5 min', notes: 'More quad-dominant than back squat. Requires significant mobility.' },
      { name: 'Leg Press', type: 'Compound', pattern: 'squat', equipment: 'MC', mechanics: 'Bilateral', primary: 'Quads', secondary: 'Glutes, Hamstrings', difficulty: 'Beginner', reps: '10-20', rest: '2-3 min', notes: 'High foot placement = glutes. Low foot = quads. Safe for heavy loads.' },
      { name: 'Bulgarian Split Squat', type: 'Compound', pattern: 'squat', equipment: 'DB', mechanics: 'Unilateral', primary: 'Quads', secondary: 'Glutes, Hamstrings', difficulty: 'Intermediate', reps: '8-15', rest: '2 min', notes: 'Best unilateral leg exercise. Fixes imbalances. Devastating metabolically.' },
      { name: 'Leg Extension', type: 'Isolated', pattern: 'squat', equipment: 'MC', mechanics: 'Bilateral', primary: 'Quads', secondary: '', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Pure quad isolation. Best for VMO (teardrop). Don\'t load too heavy.' },
      { name: 'Lunges', type: 'Compound', pattern: 'squat', equipment: 'DB', mechanics: 'Unilateral', primary: 'Quads', secondary: 'Glutes, Hamstrings', difficulty: 'Beginner', reps: '10-15', rest: '90s', notes: 'Walking or static. Excellent functional movement. Core engaged.' },
      { name: 'Hack Squat', type: 'Compound', pattern: 'squat', equipment: 'MC', mechanics: 'Bilateral', primary: 'Quads', secondary: 'Glutes', difficulty: 'Intermediate', reps: '8-15', rest: '2-3 min', notes: 'Machine squat — great for pure quad focus without back fatigue.' },
      { name: 'Goblet Squat', type: 'Compound', pattern: 'squat', equipment: 'DB', mechanics: 'Bilateral', primary: 'Quads', secondary: 'Core, Glutes', difficulty: 'Beginner', reps: '10-15', rest: '90s', notes: 'Front-loaded to enforce upright posture and deep depth. Great for beginners.' }
    ]
  },
  hamstrings: {
    label: 'Hamstrings',
    color: '#8b5cf6',
    exercises: [
      { name: 'Romanian Deadlift (RDL)', type: 'Compound', pattern: 'hinge', equipment: 'BB', mechanics: 'Bilateral', primary: 'Hamstrings', secondary: 'Glutes, Lower Back', difficulty: 'Intermediate', reps: '8-12', rest: '2-3 min', notes: 'Hip hinge with slight knee bend. Feel the hamstring stretch.' },
      { name: 'Nordic Curl', type: 'Isolated', pattern: 'hinge', equipment: 'BW', mechanics: 'Bilateral', primary: 'Hamstrings', secondary: '', difficulty: 'Advanced', reps: '3-8', rest: '3 min', notes: 'Best hamstring exercise for injury prevention. Elite movement.' },
      { name: 'Leg Curl (Lying)', type: 'Isolated', pattern: 'hinge', equipment: 'MC', mechanics: 'Bilateral', primary: 'Hamstrings', secondary: '', difficulty: 'Beginner', reps: '12-15', rest: '60-90s', notes: 'Isolates hamstrings. Plantarflex foot at peak for full contraction.' },
      { name: 'Seated Leg Curl', type: 'Isolated', pattern: 'hinge', equipment: 'MC', mechanics: 'Bilateral', primary: 'Hamstrings', secondary: '', difficulty: 'Beginner', reps: '12-15', rest: '60-90s', notes: 'Better stretch at long muscle length vs lying. Superior for hypertrophy.' },
      { name: 'Good Morning', type: 'Compound', pattern: 'hinge', equipment: 'BB', mechanics: 'Bilateral', primary: 'Hamstrings', secondary: 'Glutes, Lower Back, Traps', difficulty: 'Advanced', reps: '8-12', rest: '2-3 min', notes: 'Hip hinge with bar on back. Powerful posterior chain builder. Respect it.' },
      { name: 'Single Leg RDL', type: 'Compound', pattern: 'hinge', equipment: 'DB', mechanics: 'Unilateral', primary: 'Hamstrings', secondary: 'Glutes, Core', difficulty: 'Intermediate', reps: '8-12', rest: '90s', notes: 'Balance challenge + unilateral fix. Reveals hip imbalances.' }
    ]
  },
  glutes: {
    label: 'Glutes',
    color: '#f43f5e',
    exercises: [
      { name: 'Hip Thrust', type: 'Compound', pattern: 'hinge', equipment: 'BB', mechanics: 'Bilateral', primary: 'Glutes', secondary: 'Hamstrings', difficulty: 'Beginner', reps: '10-15', rest: '2 min', notes: 'Bar across hips, shoulders on bench. Full hip extension at top.' },
      { name: 'Glute Bridge', type: 'Isolated', pattern: 'hinge', equipment: 'BW', mechanics: 'Bilateral', primary: 'Glutes', secondary: 'Hamstrings', difficulty: 'Beginner', reps: '15-25', rest: '60s', notes: 'Simpler hip thrust. Great for beginners and warm-up.' },
      { name: 'Cable Pull-Through', type: 'Compound', pattern: 'hinge', equipment: 'CB', mechanics: 'Bilateral', primary: 'Glutes', secondary: 'Hamstrings, Lower Back', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Teaches the hip hinge pattern. Hip-dominant motion.' },
      { name: 'Step-Up', type: 'Compound', pattern: 'squat', equipment: 'DB', mechanics: 'Unilateral', primary: 'Glutes', secondary: 'Quads, Hamstrings', difficulty: 'Beginner', reps: '10-15', rest: '90s', notes: 'Unilateral glute and quad. Drive through the heel of the working leg.' },
      { name: 'Donkey Kick', type: 'Isolated', pattern: 'hinge', equipment: 'BW', mechanics: 'Unilateral', primary: 'Glutes', secondary: '', difficulty: 'Beginner', reps: '15-20', rest: '45s', notes: 'Isolation — squeeze at top. Popular accessory movement.' },
      { name: 'Barbell Hip Thrust (Pause)', type: 'Compound', pattern: 'hinge', equipment: 'BB', mechanics: 'Bilateral', primary: 'Glutes', secondary: 'Hamstrings', difficulty: 'Intermediate', reps: '8-12', rest: '2 min', notes: 'Pause at top removes elastic energy — pure muscle contraction.' },
      { name: 'Hip Abductor Machine', type: 'Isolated', pattern: 'push', equipment: 'MC', mechanics: 'Bilateral', primary: 'Glutes', secondary: '', difficulty: 'Beginner', reps: '15-25', rest: '60s', notes: 'Targets the outer glutes (gluteus medius).' },
      { name: 'Hip Adductor Machine', type: 'Isolated', pattern: 'pull', equipment: 'MC', mechanics: 'Bilateral', primary: 'Adductors', secondary: '', difficulty: 'Beginner', reps: '15-25', rest: '60s', notes: 'Targets the inner thighs (groin).' }
    ]
  },
  calves: {
    label: 'Calves',
    color: '#eab308',
    exercises: [
      { name: 'Standing Calf Raise', type: 'Isolated', pattern: 'push', equipment: 'MC', mechanics: 'Bilateral', primary: 'Calves', secondary: '', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Slow eccentric mandatory — calves adapt fast, need stretch.' },
      { name: 'Seated Calf Raise', type: 'Isolated', pattern: 'push', equipment: 'MC', mechanics: 'Bilateral', primary: 'Calves', secondary: '', difficulty: 'Beginner', reps: '15-25', rest: '60s', notes: 'Hits soleus (deeper calf) — different from standing which hits gastrocnemius.' },
      { name: 'Donkey Calf Raise', type: 'Isolated', pattern: 'push', equipment: 'BW', mechanics: 'Bilateral', primary: 'Calves', secondary: '', difficulty: 'Beginner', reps: '15-25', rest: '60s', notes: 'Old-school — full range of motion with hip hinge position.' },
      { name: 'Leg Press Calf Raise', type: 'Isolated', pattern: 'push', equipment: 'MC', mechanics: 'Bilateral', primary: 'Calves', secondary: '', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Heavy calf isolation utilizing the leg press machine.' }
    ]
  },
  core: {
    label: 'Core',
    color: '#06b6d4',
    exercises: [
      { name: 'Plank', type: 'Isolated', pattern: 'core', equipment: 'BW', mechanics: 'Bilateral', primary: 'Core', secondary: 'Shoulders, Glutes', difficulty: 'Beginner', reps: '30-90s', rest: '60s', notes: 'Anterior core stability. Straight line head to heel. Don\'t hold breath.' },
      { name: 'Ab Wheel Rollout', type: 'Isolated', pattern: 'core', equipment: 'BW', mechanics: 'Bilateral', primary: 'Core', secondary: 'Lats, Shoulders', difficulty: 'Advanced', reps: '8-15', rest: '90s', notes: 'Full anti-extension. Protects spine under load. Master this.' },
      { name: 'Cable Crunch', type: 'Isolated', pattern: 'core', equipment: 'CB', mechanics: 'Bilateral', primary: 'Core', secondary: '', difficulty: 'Beginner', reps: '12-20', rest: '60s', notes: 'Loaded ab flexion. Better than crunches for progressive overload.' },
      { name: 'Hanging Leg Raise', type: 'Isolated', pattern: 'core', equipment: 'BW', mechanics: 'Bilateral', primary: 'Core', secondary: 'Hip Flexors', difficulty: 'Intermediate', reps: '10-15', rest: '90s', notes: 'Full ROM — dead hang to parallel. Hip flexors assist.' },
      { name: 'Russian Twist', type: 'Isolated', pattern: 'core', equipment: 'BW', mechanics: 'Bilateral', primary: 'Core', secondary: 'Obliques', difficulty: 'Beginner', reps: '20-30', rest: '60s', notes: 'Rotational core. Feet off ground for more challenge.' },
      { name: 'Dead Bug', type: 'Isolated', pattern: 'core', equipment: 'BW', mechanics: 'Bilateral', primary: 'Core', secondary: '', difficulty: 'Beginner', reps: '8-12', rest: '60s', notes: 'Anti-extension with coordination. Excellent for lower back health.' },
      { name: 'Pallof Press', type: 'Isolated', pattern: 'core', equipment: 'CB', mechanics: 'Bilateral', primary: 'Core', secondary: 'Shoulders', difficulty: 'Beginner', reps: '10-15', rest: '60s', notes: 'Anti-rotation. Most underrated core exercise. Protects spine under load.' },
      { name: 'Side Plank', type: 'Isolated', pattern: 'core', equipment: 'BW', mechanics: 'Unilateral', primary: 'Core', secondary: 'Glutes', difficulty: 'Beginner', reps: '20-60s', rest: '60s', notes: 'Lateral core stability. Often neglected. Fixes lateral flexion weakness' },
      { name: 'Crunch', type: 'Isolated', pattern: 'core', equipment: 'BW', mechanics: 'Bilateral', primary: 'Core', secondary: '', difficulty: 'Beginner', reps: '15-25', rest: '60s', notes: 'Basic abdominal flexion.' },
      { name: 'Mountain Climber', type: 'Compound', pattern: 'core', equipment: 'BW', mechanics: 'Unilateral', primary: 'Core', secondary: 'Shoulders, Cardio', difficulty: 'Beginner', reps: '30-60s', rest: '60s', notes: 'Dynamic core stability and cardiovascular conditioning.' },
      { name: 'Bicycle Crunches', type: 'Isolated', pattern: 'core', equipment: 'BW', mechanics: 'Unilateral', primary: 'Core', secondary: 'Obliques', difficulty: 'Beginner', reps: '20-40', rest: '60s', notes: 'High activation for both rectus abdominis and obliques.' }
    ]
  },
  cardio: {
    label: 'Cardio',
    color: '#f97316',
    exercises: [
      { name: 'Running', type: 'Cardio', equipment: 'BW', primary: 'Cardiovascular System', difficulty: 'Beginner' },
      { name: 'Cycling', type: 'Cardio', equipment: 'MC', primary: 'Cardiovascular System', difficulty: 'Beginner' },
      { name: 'Rowing', type: 'Cardio', equipment: 'MC', primary: 'Cardiovascular System', difficulty: 'Beginner' },
      { name: 'Jump Rope', type: 'Cardio', equipment: 'BW', primary: 'Cardiovascular System', difficulty: 'Beginner' },
      { name: 'Stair Climber', type: 'Cardio', equipment: 'MC', primary: 'Cardiovascular System', difficulty: 'Beginner' },
      { name: 'Elliptical', type: 'Cardio', equipment: 'MC', primary: 'Cardiovascular System', difficulty: 'Beginner' },
      { name: 'Swimming', type: 'Cardio', equipment: 'BW', primary: 'Cardiovascular System', difficulty: 'Beginner' },
      { name: 'HIIT', type: 'Cardio', equipment: 'Mixed', primary: 'Cardiovascular System', difficulty: 'Intermediate' }
    ]
  }
};

require('dotenv').config()

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const User = require('../models/User')
const Workout = require('../models/Workout')

function parseArgs(argv) {
  const out = {}
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = next
      i += 1
    }
  }
  return out
}

async function connectMongo() {
  const primary = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync'
  const local = process.env.MONGO_URI_LOCAL || 'mongodb://localhost:27017/lifesync'
  const allowLocalFallback = String(process.env.MONGO_URI_FALLBACK_LOCAL || '1').trim() !== '0'

  try {
    await mongoose.connect(primary)
    return { uri: primary, fallback: false }
  } catch (err) {
    const msg = String(err?.message || '')
    const code = String(err?.code || '')
    const looksLikeSrvDns =
      msg.includes('querySrv') ||
      msg.includes('mongodb+srv') ||
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN'

    if (!allowLocalFallback || !looksLikeSrvDns) throw err
    await mongoose.connect(local)
    return { uri: local, fallback: true }
  }
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function mkWorkout({ userId, date, name, durationMin, notes, exercises }) {
  return {
    user: userId,
    name,
    date,
    duration: Math.max(0, Math.round((Number(durationMin) || 0) * 60)),
    notes,
    exercises,
  }
}

function ex(name, muscleGroup, sets) {
  return { name, muscleGroup, sets: sets.map(([weight, reps]) => ({ weight, reps, completed: true })) }
}

async function main() {
  const args = parseArgs(process.argv)
  const email = String(args.email || '').trim().toLowerCase()
  const password = String(args.password || '')

  if (!email || !password) {
    console.error('Usage: node scripts/seed_workouts_for_user.js --email you@example.com --password yourPassword')
    process.exitCode = 1
    return
  }

  const conn = await connectMongo()
  console.log(`[seed_workouts_for_user] Connected to Mongo (${conn.fallback ? 'fallback' : 'primary'}): ${conn.uri}`)

  const user = await User.findOne({ email })
  if (!user) {
    console.error(`[seed_workouts_for_user] No user found for email: ${email}`)
    process.exitCode = 1
    return
  }

  const ok = await bcrypt.compare(password, String(user.password || ''))
  if (!ok) {
    console.error('[seed_workouts_for_user] Password mismatch for that user (aborting).')
    process.exitCode = 1
    return
  }

  const seedPrefix = '[seed-workouts]'
  await Workout.deleteMany({ user: user._id, notes: { $regex: `^\\Q${seedPrefix}\\E` } }).catch(() => {
    // Fallback for Mongo regex escaping differences
    return Workout.deleteMany({ user: user._id, notes: { $regex: '^\\[seed-workouts\\]' } })
  })

  const workouts = []

  // Older week (8-14 days ago): slightly lighter
  workouts.push(
    mkWorkout({
      userId: user._id,
      date: daysAgo(14),
      name: 'Full Body A',
      durationMin: 45,
      notes: `${seedPrefix} baseline`,
      exercises: [
        ex('Bench Press', 'chest', [
          [50, 8],
          [52.5, 6],
          [50, 8],
        ]),
        ex('Lat Pulldown', 'back', [
          [45, 10],
          [50, 8],
          [45, 10],
        ]),
        ex('Squat', 'legs', [
          [60, 6],
          [60, 6],
          [55, 8],
        ]),
      ],
    })
  )

  workouts.push(
    mkWorkout({
      userId: user._id,
      date: daysAgo(12),
      name: 'Upper Push',
      durationMin: 40,
      notes: `${seedPrefix} baseline`,
      exercises: [
        ex('Incline Bench Press', 'chest', [
          [40, 8],
          [42.5, 6],
          [40, 8],
        ]),
        ex('Overhead Press', 'shoulders', [
          [30, 8],
          [32.5, 6],
          [30, 8],
        ]),
        ex('Tricep Pushdowns', 'triceps', [
          [25, 12],
          [25, 12],
          [25, 12],
        ]),
      ],
    })
  )

  workouts.push(
    mkWorkout({
      userId: user._id,
      date: daysAgo(10),
      name: 'Lower',
      durationMin: 50,
      notes: `${seedPrefix} baseline`,
      exercises: [
        ex('Deadlift', 'back', [
          [80, 5],
          [85, 3],
          [80, 5],
        ]),
        ex('Leg Press', 'legs', [
          [140, 10],
          [140, 10],
          [140, 10],
        ]),
      ],
    })
  )

  // Recent week (0-6 days ago): higher volume + a couple PR bumps
  workouts.push(
    mkWorkout({
      userId: user._id,
      date: daysAgo(6),
      name: 'Upper Pull',
      durationMin: 45,
      notes: `${seedPrefix} recent`,
      exercises: [
        ex('Barbell Rows', 'back', [
          [50, 10],
          [55, 8],
          [55, 8],
        ]),
        ex('Bicep Curls', 'biceps', [
          [12.5, 12],
          [12.5, 12],
          [12.5, 12],
        ]),
      ],
    })
  )

  workouts.push(
    mkWorkout({
      userId: user._id,
      date: daysAgo(3),
      name: 'Full Body B',
      durationMin: 55,
      notes: `${seedPrefix} recent`,
      exercises: [
        // PR: bench up vs baseline
        ex('Bench Press', 'chest', [
          [52.5, 8],
          [55, 6],
          [52.5, 8],
        ]),
        // PR: squat up vs baseline
        ex('Squat', 'legs', [
          [65, 6],
          [65, 6],
          [60, 8],
        ]),
        ex('Lat Pulldown', 'back', [
          [50, 10],
          [55, 8],
          [50, 10],
        ]),
      ],
    })
  )

  workouts.push(
    mkWorkout({
      userId: user._id,
      date: daysAgo(2),
      name: 'Upper Push (Heavy)',
      durationMin: 45,
      notes: `${seedPrefix} recent`,
      exercises: [
        ex('Overhead Press', 'shoulders', [
          [32.5, 8],
          [35, 6],
          [32.5, 8],
        ]),
        ex('Incline Bench Press', 'chest', [
          [42.5, 8],
          [45, 6],
          [42.5, 8],
        ]),
      ],
    })
  )

  // consecutive-day workout to generate a small streak
  workouts.push(
    mkWorkout({
      userId: user._id,
      date: daysAgo(1),
      name: 'Lower (Light)',
      durationMin: 35,
      notes: `${seedPrefix} recent`,
      exercises: [
        ex('Leg Press', 'legs', [
          [150, 10],
          [150, 10],
          [150, 10],
        ]),
        ex('Deadlift', 'back', [
          [85, 5],
          [90, 3],
          [85, 5],
        ]),
      ],
    })
  )

  // today
  workouts.push(
    mkWorkout({
      userId: user._id,
      date: daysAgo(0),
      name: 'Quick Pump',
      durationMin: 25,
      notes: `${seedPrefix} recent`,
      exercises: [
        ex('Push-ups', 'chest', [
          [0, 20],
          [0, 15],
          [0, 12],
        ]),
        ex('Face Pulls', 'shoulders', [
          [20, 15],
          [20, 15],
          [20, 15],
        ]),
      ],
    })
  )

  const inserted = await Workout.insertMany(workouts)
  console.log(`[seed_workouts_for_user] Inserted ${inserted.length} workouts for ${email}`)
  console.log('[seed_workouts_for_user] Done. Open Insights → Training or Training → Overview to see Training Insights.')
}

main()
  .catch((err) => {
    console.error('[seed_workouts_for_user] Failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await mongoose.disconnect()
    } catch {
      // ignore
    }
  })

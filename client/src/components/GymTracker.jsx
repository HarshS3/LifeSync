import { useState, useEffect, useMemo, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import TimerIcon from '@mui/icons-material/Timer'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import CloseIcon from '@mui/icons-material/Close'
import Calendar from './Calendar'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'
import { computeTrainingInsights } from '../lib/trainingInsights'
import { computeMuscleHeatmap } from '../lib/muscleHeatmap'
import MuscleHeatmapFigure from './MuscleHeatmapFigure'
import GlbModelViewer from './GlbModelViewer.jsx'
import RestTimer from './RestTimer'
import PlateCalculator from './PlateCalculator'

const DEFAULT_BODY_MODEL_GLB_URL = new URL('../assets/Untitled.glb', import.meta.url).href

// Exercise Library with muscle groups
const EXERCISE_LIBRARY = {
  chest: {
    label: 'Chest',
    color: '#ef4444',
    exercises: ['Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Dumbbell Flyes', 'Cable Crossover', 'Push-ups', 'Chest Dips', 'Pec Deck Machine']
  },
  back: {
    label: 'Back',
    color: '#3b82f6',
    exercises: ['Deadlift', 'Pull-ups', 'Lat Pulldown', 'Barbell Rows', 'Dumbbell Rows', 'Cable Rows', 'T-Bar Rows', 'Face Pulls']
  },
  shoulders: {
    label: 'Shoulders',
    color: '#f59e0b',
    exercises: ['Overhead Press', 'Lateral Raises', 'Front Raises', 'Rear Delt Flyes', 'Arnold Press', 'Upright Rows', 'Shrugs', 'Face Pulls']
  },
  biceps: {
    label: 'Biceps',
    color: '#10b981',
    exercises: ['Barbell Curls', 'Dumbbell Curls', 'Hammer Curls', 'Preacher Curls', 'Concentration Curls', 'Cable Curls', 'Incline Curls']
  },
  triceps: {
    label: 'Triceps',
    color: '#8b5cf6',
    exercises: ['Tricep Pushdowns', 'Skull Crushers', 'Overhead Extensions', 'Dips', 'Close Grip Bench', 'Kickbacks', 'Diamond Push-ups']
  },
  legs: {
    label: 'Legs',
    color: '#ec4899',
    exercises: ['Squats', 'Leg Press', 'Lunges', 'Romanian Deadlift', 'Leg Curls', 'Leg Extensions', 'Calf Raises', 'Hip Thrusts', 'Bulgarian Split Squats']
  },
  core: {
    label: 'Core',
    color: '#06b6d4',
    exercises: ['Planks', 'Crunches', 'Russian Twists', 'Leg Raises', 'Ab Wheel', 'Cable Crunches', 'Dead Bug', 'Mountain Climbers']
  },
  cardio: {
    label: 'Cardio',
    color: '#f97316',
    exercises: ['Running', 'Cycling', 'Rowing', 'Jump Rope', 'Stair Climber', 'Elliptical', 'Swimming', 'HIIT']
  }
}

function GymTracker() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [calendarWorkouts, setCalendarWorkouts] = useState([])
  const [calendarLoading, setCalendarLoading] = useState(false)

  const [aiWorkoutSuggestion, setAiWorkoutSuggestion] = useState('')
  const [aiWorkoutSuggestionLoading, setAiWorkoutSuggestionLoading] = useState(false)
  const [aiRecoverySuggestion, setAiRecoverySuggestion] = useState('')
  const [aiRecoverySuggestionLoading, setAiRecoverySuggestionLoading] = useState(false)

  // Steps (daily)
  const [stepsDate, setStepsDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [stepsValue, setStepsValue] = useState('')
  const [stepsRangeMode, setStepsRangeMode] = useState('week')
  const [stepsSeries, setStepsSeries] = useState([])
  const [stepsLoading, setStepsLoading] = useState(false)
  const [stepsSaving, setStepsSaving] = useState(false)
  const [stepsError, setStepsError] = useState('')
  
  // Current workout state
  const [currentWorkout, setCurrentWorkout] = useState(null)
  const [workoutStartTime, setWorkoutStartTime] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  
  // Dialog states
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templates, setTemplates] = useState([])
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState('')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [customExercise, setCustomExercise] = useState('')
  
  // Stats
  const [stats, setStats] = useState({
    weeklyWorkouts: 0,
    currentStreak: 0,
    hardSetsPerMuscle: {}, // New: weekly sets per muscle
  })

  const [restTimerSeconds, setRestTimerSeconds] = useState(0)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [recentPRs, setRecentPRs] = useState({}) // exercise -> best 1RM

  const muscleHeatmap = useMemo(() => computeMuscleHeatmap(workouts, { days: 30 }), [workouts])

  const trainingInsights = useMemo(() => computeTrainingInsights(workouts), [workouts])

  useEffect(() => {
    loadWorkouts()
    loadTemplates()
  }, [token])

  useEffect(() => {
    loadStepsDayAndRange()
  }, [token, stepsDate, stepsRangeMode])

  const safeReadJson = async (res) => {
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  const buildRecentWorkoutsSummary = useCallback(() => {
    const sorted = [...(workouts || [])].sort((a, b) => new Date(b?.date).getTime() - new Date(a?.date).getTime())
    return sorted.slice(0, 7).map((w) => {
      const d = new Date(w?.date)
      const day = Number.isNaN(d.getTime()) ? 'unknown date' : d.toISOString().slice(0, 10)
      const name = w?.name || 'Workout'
      const exercises = Array.isArray(w?.exercises) ? w.exercises : []
      const exNames = exercises.map((e) => String(e?.name || '').trim()).filter(Boolean).slice(0, 6)
      const exLine = exNames.length ? exNames.join(', ') : '(no exercises)'
      const durationMin = w?.duration ? Math.round(Number(w.duration) / 60) : null
      return `- ${day}: ${name}${durationMin ? ` (${durationMin} min)` : ''} | ${exLine}`
    }).join('\n')
  }, [workouts])

  const generateAiWorkoutSuggestion = useCallback(async () => {
    if (!token) return

    setAiWorkoutSuggestionLoading(true)
    try {
      const recent = buildRecentWorkoutsSummary()
      const heatTop = Object.entries(muscleHeatmap?.normalized || {})
        .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
        .join(', ')

      const insightTitles = (trainingInsights || []).slice(0, 6).map((i) => i?.title).filter(Boolean).join(' | ')

      const message = [
        'Suggest a workout plan for today based on my recent workouts.',
        'I am explicitly asking for suggestions.',
        '',
        'Recent workouts (most recent first):',
        recent || '- (none logged)',
        '',
        heatTop ? `Muscle heatmap (30d, top): ${heatTop}` : null,
        insightTitles ? `Deterministic training insights: ${insightTitles}` : null,
        '',
        'Return 2 options:',
        'A) Training day (45–60 min) with exercise list + sets x reps + RPE guidance',
        'B) Recovery day (20–30 min) with mobility + easy cardio suggestions',
        '',
        'Constraints:',
        '- No diagnosis, no medical advice, no supplements.',
        '- Keep it concise and practical.',
        '- Use neutral language; everything is optional.',
      ].filter(Boolean).join('\n')

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `AI request failed (${res.status})`)
      }

      const json = await safeReadJson(res)
      setAiWorkoutSuggestion(String(json?.reply || json?.message || 'No AI reply returned.'))
    } catch (e) {
      alert(e?.message || 'Failed to generate a workout suggestion.')
    } finally {
      setAiWorkoutSuggestionLoading(false)
    }
  }, [API_BASE, token, buildRecentWorkoutsSummary, muscleHeatmap, trainingInsights])

  const generateAiRecoverySuggestion = useCallback(async () => {
    if (!token) return

    setAiRecoverySuggestionLoading(true)
    try {
      const recent = buildRecentWorkoutsSummary()
      const insightTitles = (trainingInsights || []).slice(0, 8).map((i) => `${i?.title}: ${i?.detail}`).filter(Boolean).join('\n')

      const message = [
        'Based on my recent training, suggest a gentle recovery plan and whether I should adjust my workout plan this week.',
        'I am explicitly asking for guidance; keep it optional and non-medical.',
        '',
        'Recent workouts (most recent first):',
        recent || '- (none logged)',
        '',
        insightTitles ? `Signals (deterministic):\n${insightTitles}` : null,
        '',
        'Return:',
        '1) Recovery suggestion for today (sleep, hydration, light activity, mobility) in 5 bullets max',
        '2) A plan adjustment recommendation for the next 3 workouts (e.g., keep as-is / deload / swap muscle groups) with rationale',
        '',
        'Constraints:',
        '- No diagnosis, no medical advice.',
        '- Don\'t shame or moralize.',
        '- Prefer fewer, higher-confidence suggestions.',
      ].filter(Boolean).join('\n')

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `AI request failed (${res.status})`)
      }

      const json = await safeReadJson(res)
      setAiRecoverySuggestion(String(json?.reply || json?.message || 'No AI reply returned.'))
    } catch (e) {
      alert(e?.message || 'Failed to generate a recovery suggestion.')
    } finally {
      setAiRecoverySuggestionLoading(false)
    }
  }, [API_BASE, token, buildRecentWorkoutsSummary, trainingInsights])

  const buildStepsChart = ({ start, end, days, series }) => {
    const byDay = new Map()
    ;(series || []).forEach((d) => {
      const dt = new Date(d?.date)
      if (Number.isNaN(dt.getTime())) return
      dt.setHours(0, 0, 0, 0)
      const key = dt.toISOString().slice(0, 10)
      const s = d?.stepsCount
      if (typeof s === 'number' && Number.isFinite(s)) byDay.set(key, s)
    })

    const values = []
    const labels = []
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      labels.push(key.slice(5))
      values.push(byDay.has(key) ? byDay.get(key) : null)
    }

    const numeric = values.filter((v) => typeof v === 'number')
    if (numeric.length === 0) return { points: '', min: null, max: null, labels, dims: null }

    let min = Math.min(...numeric)
    let max = Math.max(...numeric)
    if (min === max) {
      min = Math.max(0, min - 1000)
      max = max + 1000
    }

    const W = 560
    const H = 200
    const M = {
      left: 64,
      right: 16,
      top: 16,
      bottom: 44,
    }
    const innerW = W - M.left - M.right
    const innerH = H - M.top - M.bottom

    const pts = []
    for (let i = 0; i < values.length; i++) {
      const v = values[i]
      if (v == null) continue
      const x = M.left + (innerW * i) / Math.max(1, values.length - 1)
      const t = (v - min) / (max - min)
      const y = M.top + innerH * (1 - t)
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }

    return {
      points: pts.join(' '),
      min,
      max,
      labels,
      dims: {
        W,
        H,
        M,
        innerW,
        innerH,
        x0: M.left,
        x1: M.left + innerW,
        y0: M.top,
        y1: M.top + innerH,
      },
    }
  }

  const loadStepsDayAndRange = async () => {
    if (!token) return
    setStepsLoading(true)
    setStepsError('')
    try {
      const dayRes = await fetch(`${API_BASE}/api/gym/steps/date/${encodeURIComponent(stepsDate)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const dayJson = await safeReadJson(dayRes)
      if (!dayRes.ok) {
        throw new Error(dayJson?.error || `Failed to load steps (${dayRes.status})`)
      }
      setStepsValue(dayJson?.stepsCount == null ? '' : String(dayJson.stepsCount))

      const end = new Date(stepsDate)
      end.setHours(23, 59, 59, 999)
      const start = new Date(end)
      const days = stepsRangeMode === 'month' ? 30 : 7
      start.setDate(start.getDate() - days + 1)
      start.setHours(0, 0, 0, 0)

      const rangeRes = await fetch(
        `${API_BASE}/api/gym/steps/range/${encodeURIComponent(start.toISOString())}/${encodeURIComponent(end.toISOString())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const rangeJson = await safeReadJson(rangeRes)
      if (!rangeRes.ok) {
        throw new Error(rangeJson?.error || `Failed to load steps range (${rangeRes.status})`)
      }
      setStepsSeries(Array.isArray(rangeJson) ? rangeJson : [])
    } catch (e) {
      setStepsError(e?.message || 'Failed to load steps')
    } finally {
      setStepsLoading(false)
    }
  }

  const saveSteps = async () => {
    if (!token) return
    const d = new Date(stepsDate)
    if (Number.isNaN(d.getTime())) {
      setStepsError('Invalid date')
      return
    }
    const s = Number(stepsValue)
    if (!Number.isFinite(s) || s < 0 || s > 200000) {
      setStepsError('Enter a valid step count')
      return
    }

    setStepsSaving(true)
    setStepsError('')
    try {
      const res = await fetch(`${API_BASE}/api/gym/steps`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: d.toISOString(), stepsCount: s }),
      })
      if (!res.ok) {
        const errJson = await safeReadJson(res)
        throw new Error(errJson?.error || `Failed to save (${res.status})`)
      }
      await loadStepsDayAndRange()
    } catch (e) {
      setStepsError(e?.message || 'Failed to save steps')
    } finally {
      setStepsSaving(false)
    }
  }

  useEffect(() => {
    let interval
    if (currentWorkout && workoutStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - workoutStartTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [currentWorkout, workoutStartTime])

  const loadWorkouts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/gym/workouts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        const arr = Array.isArray(data) ? data : []
        setWorkouts(arr)

        // Lightly exercise GET /api/gym/workouts/:id (no UI changes)
        if (arr[0]?._id) {
          touchWorkoutById(arr[0]._id)
        }

        // Prefer server-computed stats when available (covers /api/gym/stats)
        const usedServerStats = await loadStatsFromServer()
        if (!usedServerStats) calculateStats(data)
      }
    } catch (err) {
      console.error('Failed to load workouts:', err)
    }
    setLoading(false)
  }

  const loadTemplates = async () => {
    if (!token) return
    setTemplateLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/gym/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTemplates(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load templates:', err)
    } finally {
      setTemplateLoading(false)
    }
  }

  const saveCurrentAsTemplate = async (name) => {
    if (!token || !currentWorkout || !name) return
    try {
      const res = await fetch(`${API_BASE}/api/gym/templates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          exercises: currentWorkout.exercises,
          description: `Created from ${currentWorkout.name}`
        }),
      })
      if (res.ok) {
        setTemplateName('')
        loadTemplates()
        alert('Routine saved successfully!')
      }
    } catch (err) {
      console.error('Failed to save template:', err)
    }
  }

  const useTemplate = (tpl) => {
    setCurrentWorkout({
      name: tpl.name,
      exercises: tpl.exercises.map(ex => ({
        ...ex,
        sets: ex.sets?.map(s => ({ ...s })) || [{ reps: 0, weight: 0, rpe: 8 }]
      })),
      date: new Date(),
    })
    setWorkoutStartTime(Date.now())
    setElapsedTime(0)
  }

  const touchWorkoutById = async (id) => {
    if (!token || !id) return
    try {
      await fetch(`${API_BASE}/api/gym/workouts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // ignore
    }
  }

  const loadCalendarRange = useCallback(
    async (monthDate) => {
      if (!token) return
      const d = monthDate instanceof Date ? monthDate : new Date()
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)

      setCalendarLoading(true)
      try {
        const res = await fetch(
          `${API_BASE}/api/gym/workouts/range/${encodeURIComponent(start.toISOString())}/${encodeURIComponent(end.toISOString())}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const data = await res.json()
          setCalendarWorkouts(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error('Failed to load workouts range:', err)
      }
      setCalendarLoading(false)
    },
    [token]
  )

  const loadStatsFromServer = async () => {
    if (!token) return false
    try {
      const res = await fetch(`${API_BASE}/api/gym/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return false
      const data = await res.json()
      setStats(prev => ({
        ...prev,
        totalWorkouts: data.totalWorkouts ?? prev.totalWorkouts,
        totalVolume: data.totalVolume ?? prev.totalVolume,
        muscleDistribution: data.muscleDistribution ?? prev.muscleDistribution,
        weeklyWorkouts: data.weeklyWorkouts ?? prev.weeklyWorkouts,
        // Keep local streak calc (backend doesn't currently provide it)
      }))
      return true
    } catch {
      return false
    }
  }

  const calculateStats = (workoutData) => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    let totalVolume = 0
    const muscleCount = {}
    let weeklyCount = 0
    
    workoutData.forEach(w => {
      const wDate = new Date(w.date)
      if (wDate > weekAgo) {
        weeklyCount++
        
        w.exercises?.forEach(ex => {
          const muscle = ex.muscleGroup || 'other'
          // Count "Hard Sets" (assume any set with weight/reps is a hard set for now, or could filter by RPE >= 7)
          const hardSets = ex.sets?.filter(s => (s.reps || 0) > 0).length || 0
          muscleCount[muscle] = (muscleCount[muscle] || 0) + hardSets
        })
      }
      
      // Calculate total volume across all time (for display)
      w.exercises?.forEach(ex => {
        ex.sets?.forEach(set => {
          totalVolume += (set.reps || 0) * (set.weight || 0)
        })
      })
    })

    // Calculate streak
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const hasWorkout = workoutData.some(w => 
        new Date(w.date).toDateString() === checkDate.toDateString()
      )
      if (hasWorkout) streak++
      else if (i > 0) break
    }

    setStats({
      totalWorkouts: workoutData.length,
      totalVolume,
      muscleDistribution: muscleCount,
      weeklyWorkouts: weeklyCount,
      currentStreak: streak,
    })
  }

  const startWorkout = () => {
    setCurrentWorkout({
      name: `Workout - ${new Date().toLocaleDateString()}`,
      exercises: [],
      date: new Date(),
    })
    setWorkoutStartTime(Date.now())
    setElapsedTime(0)
  }

  const cancelWorkout = () => {
    if (window.confirm('Discard this workout?')) {
      setCurrentWorkout(null)
      setWorkoutStartTime(null)
      setElapsedTime(0)
    }
  }

  const addExercise = () => {
    const exerciseName = customExercise || selectedExercise
    if (!exerciseName || !selectedMuscle) return

    const newExercise = {
      name: exerciseName,
      muscleGroup: selectedMuscle,
      sets: [{ reps: 0, weight: 0, rpe: 8 }],
    }

    setCurrentWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise],
    }))

    setExerciseDialogOpen(false)
    setSelectedMuscle('')
    setSelectedExercise('')
    setCustomExercise('')
  }

  const updateSet = (exerciseIdx, setIdx, field, value) => {
    setCurrentWorkout(prev => {
      const updated = { ...prev }
      updated.exercises = [...prev.exercises]
      updated.exercises[exerciseIdx] = { ...updated.exercises[exerciseIdx] }
      updated.exercises[exerciseIdx].sets = [...updated.exercises[exerciseIdx].sets]
      updated.exercises[exerciseIdx].sets[setIdx] = {
        ...updated.exercises[exerciseIdx].sets[setIdx],
        [field]: Number(value) || 0,
      }
      
      // Auto-trigger rest timer if a set was completed (weight/reps > 0)
      if (field === 'reps' || field === 'weight') {
        const set = updated.exercises[exerciseIdx].sets[setIdx]
        if (set.reps > 0 && set.weight > 0) {
          setRestTimerSeconds(60) // default 60s
          setShowRestTimer(true)
        }
      }
      
      return updated
    })
  }

  const addSet = (exerciseIdx) => {
    setCurrentWorkout(prev => {
      const updated = { ...prev }
      updated.exercises = [...prev.exercises]
      updated.exercises[exerciseIdx] = { ...updated.exercises[exerciseIdx] }
      const lastSet = updated.exercises[exerciseIdx].sets.slice(-1)[0] || { reps: 0, weight: 0, rpe: 8 }
      updated.exercises[exerciseIdx].sets = [...updated.exercises[exerciseIdx].sets, { ...lastSet }]
      return updated
    })
  }

  const removeSet = (exerciseIdx, setIdx) => {
    setCurrentWorkout(prev => {
      const updated = { ...prev }
      updated.exercises = [...prev.exercises]
      updated.exercises[exerciseIdx] = { ...updated.exercises[exerciseIdx] }
      updated.exercises[exerciseIdx].sets = updated.exercises[exerciseIdx].sets.filter((_, i) => i !== setIdx)
      return updated
    })
  }

  const removeExercise = (exerciseIdx) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== exerciseIdx),
    }))
  }

  const finishWorkout = async () => {
    if (!currentWorkout || currentWorkout.exercises.length === 0) {
      alert('Add at least one exercise!')
      return
    }

    const workoutData = {
      ...currentWorkout,
      duration: elapsedTime,
      date: new Date(),
    }

    try {
      const res = await fetch(`${API_BASE}/api/gym/workouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(workoutData),
      })

      if (res.ok) {
        setCurrentWorkout(null)
        setWorkoutStartTime(null)
        setElapsedTime(0)
        loadWorkouts()
      }
    } catch (err) {
      console.error('Failed to save workout:', err)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const calendarEventSource = calendarWorkouts.length ? calendarWorkouts : workouts

  // Calendar events from workouts
  const calendarEvents = calendarEventSource.map(w => ({
    date: w.date,
    type: 'workout',
    title: w.name || 'Workout',
    details: `${w.exercises?.length || 0} exercises • ${Math.round((w.duration || 0) / 60)}min`,
    exercises: w.exercises,
  }))

  // Muscle distribution for chart
  const muscleTotal = Object.values(stats.muscleDistribution).reduce((a, b) => a + b, 0) || 1

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717' }}>
            Gym Tracker
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Log workouts, track progress, build strength
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ position: 'relative' }}>
            <Button
              variant="outlined"
              onClick={() => setTemplateDialogOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 600, color: '#171717', borderColor: '#e5e7eb' }}
            >
              Routines
            </Button>
            {templates.length > 0 && (
              <Box sx={{ 
                position: 'absolute', top: -5, right: -5, 
                width: 18, height: 18, bgcolor: '#ef4444', 
                borderRadius: '50%', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', 
                color: '#fff', fontSize: '10px', fontWeight: 700,
                border: '2px solid #fff'
              }}>
                {templates.length}
              </Box>
            )}
          </Box>
          {!currentWorkout && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={startWorkout}
              sx={{
                bgcolor: '#171717',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#374151' },
              }}
            >
              Start Workout
            </Button>
          )}
        </Box>
      </Box>

      {/* Routine/Template Selection Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Workout Routines</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
            Choose a saved routine to start your workout instantly.
          </Typography>
          {templates.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #e2e8f0' }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>You haven't saved any routines yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {templates.map((tpl) => (
                <Box 
                  key={tpl._id} 
                  sx={{ 
                    p: 2, borderRadius: 2, border: '1px solid #e2e8f0', 
                    cursor: 'pointer', transition: 'all 0.2s',
                    '&:hover': { bgcolor: '#f0f9ff', borderColor: '#38bdf8' }
                  }}
                  onClick={() => { useTemplate(tpl); setTemplateDialogOpen(false); }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{tpl.name}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {tpl.exercises?.length || 0} exercises • {tpl.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Active Workout */}
      {currentWorkout && (
        <Box sx={{ 
          p: 3, 
          mb: 3, 
          bgcolor: '#171717', 
          borderRadius: 2,
          color: '#fff',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#9ca3af' }}>
                Active Workout
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TimerIcon sx={{ color: '#f59e0b' }} />
                <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {formatTime(elapsedTime)}
                </Typography>
              </Box>
            </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  const name = prompt('Enter routine name:');
                  if (name) {
                    saveCurrentAsTemplate(name);
                  }
                }}
                sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#9ca3af', textTransform: 'none' }}
              >
                Save as Routine
              </Button>
              <Button
                variant="outlined"
                onClick={cancelWorkout}
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.3)', 
                  color: '#9ca3af',
                  textTransform: 'none',
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={finishWorkout}
                sx={{ 
                  bgcolor: '#15803d', 
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#166534' },
                }}
              >
                Finish Workout
              </Button>
            </Box>
          </Box>

          {/* Exercises */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {currentWorkout.exercises.map((exercise, exIdx) => (
              <Box 
                key={exIdx}
                sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={EXERCISE_LIBRARY[exercise.muscleGroup]?.label || exercise.muscleGroup}
                      size="small"
                      sx={{
                        bgcolor: EXERCISE_LIBRARY[exercise.muscleGroup]?.color || '#6b7280',
                        color: '#fff',
                        fontWeight: 600,
                      }}
                    />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {exercise.name}
                    </Typography>
                    <Chip 
                      label="PR WATCH" 
                      size="small" 
                      sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid #f59e0b', fontWeight: 700 }}
                    />
                  </Box>
                  <IconButton size="small" onClick={() => removeExercise(exIdx)} sx={{ color: '#ef4444' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Sets */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 40px', gap: 1, mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>Set</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>Weight (kg)</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>Reps</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>RPE</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}></Typography>
                  </Box>
                  {exercise.sets.map((set, setIdx) => (
                    <Box key={setIdx} sx={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 40px', gap: 1, mb: 1, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 600 }}>{setIdx + 1}</Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                          },
                          '& input': { color: '#fff', textAlign: 'center' },
                        }}
                      />
                      <TextField
                        type="number"
                        value={set.reps || ''}
                        onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          },
                          '& input': { color: '#fff', textAlign: 'center' },
                        }}
                      />
                      <IconButton 
                        size="small" 
                        onClick={() => removeSet(exIdx, setIdx)}
                        disabled={exercise.sets.length <= 1}
                        sx={{ color: '#6b7280' }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    size="small"
                    onClick={() => addSet(exIdx)}
                    sx={{ color: '#60a5fa', textTransform: 'none', alignSelf: 'flex-start' }}
                  >
                    + Add Set
                  </Button>
                </Box>
              </Box>
            ))}

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setExerciseDialogOpen(true)}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#fff',
                textTransform: 'none',
                py: 1.5,
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Add Exercise
            </Button>
          </Box>
        </Box>
      )}

      {/* Tabs */}
      {!currentWorkout && (
        <>
          <Box sx={{ borderBottom: '1px solid #e5e7eb', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(e, v) => setActiveTab(v)}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  color: '#6b7280',
                  '&.Mui-selected': { color: '#171717' },
                },
                '& .MuiTabs-indicator': { bgcolor: '#171717' },
              }}
            >
              <Tab icon={<TrendingUpIcon />} label="Overview" iconPosition="start" />
              <Tab icon={<TimerIcon />} label="Steps" iconPosition="start" />
              <Tab icon={<CalendarMonthIcon />} label="Calendar" iconPosition="start" />
              <Tab icon={<FitnessCenterIcon />} label="History" iconPosition="start" />
            </Tabs>
          </Box>

          {/* Overview Tab */}
          {activeTab === 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {/* Stats Cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <StatCard
                  icon={<FitnessCenterIcon />}
                  label="Total Workouts"
                  value={stats.totalWorkouts}
                  color="#2563eb"
                />
                <StatCard
                  icon={<WhatshotIcon />}
                  label="This Week"
                  value={stats.weeklyWorkouts}
                  color="#f59e0b"
                />
                <StatCard
                  icon={<TrendingUpIcon />}
                  label="Total Volume"
                  value={`${(stats.totalVolume / 1000).toFixed(1)}k`}
                  sublabel="kg"
                  color="#15803d"
                />
                <StatCard
                  icon={<CheckCircleIcon />}
                  label="Streak"
                  value={stats.currentStreak}
                  sublabel="days"
                  color="#9333ea"
                />
              </Box>

              {/* Training Insights - Advanced Analysis */}
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <AutoGraphIcon sx={{ color: '#38bdf8' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      Performance Analysis & Insights
                    </Typography>
                  </Box>
                  
                  {trainingInsights.length > 0 ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                      {trainingInsights.map((insight, idx) => {
                        // Determine icon and color based on insight title
                        let Icon = InsightsIcon;
                        let color = '#64748b';
                        let bgColor = '#f8fafc';
                        
                        if (insight.title.includes('Progression')) { Icon = TimelineIcon; color = '#10b981'; bgColor = '#ecfdf5'; }
                        else if (insight.title.includes('Plateau')) { Icon = WarningAmberIcon; color = '#f59e0b'; bgColor = '#fffbeb'; }
                        else if (insight.title.includes('Load') || insight.title.includes('Volume')) { Icon = FitnessCenterIcon; color = '#3b82f6'; bgColor = '#eff6ff'; }
                        else if (insight.title.includes('Consistency') || insight.title.includes('Streak') || insight.title.includes('Balance')) { Icon = TrendingUpIcon; color = '#8b5cf6'; bgColor = '#f5f3ff'; }
                        else if (insight.title.includes('Best') || insight.title.includes('PR')) { Icon = EmojiEventsIcon; color = '#eab308'; bgColor = '#fefce8'; }
                        else if (insight.title.includes('Muscle')) { Icon = InsightsIcon; color = '#0ea5e9'; bgColor = '#f0f9ff'; }

                        return (
                          <Box key={idx} sx={{ 
                            p: 2.5, 
                            bgcolor: '#fff', 
                            borderRadius: 2, 
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            gap: 2,
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              borderColor: color
                            }
                          }}>
                            <Box sx={{ 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              width: 40, height: 40, borderRadius: 2, 
                              bgcolor: bgColor, color: color, flexShrink: 0 
                            }}>
                              <Icon fontSize="small" />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" sx={{ color: '#1e293b', fontWeight: 700, mb: 0.5 }}>
                                {insight.title}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.5 }}>
                                {insight.detail}
                              </Typography>
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                      <AutoGraphIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1, opacity: 0.5 }} />
                      <Typography variant="body1" sx={{ color: '#475569', fontWeight: 600 }}>
                        No insights generated yet.
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                        Log a few more workouts to unlock advanced performance analysis and trend detection.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* AI Suggestions */}
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    AI Suggestions
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 2 }}>
                    Generated only when you ask—useful for demo or low-friction planning.
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={generateAiWorkoutSuggestion}
                      disabled={aiWorkoutSuggestionLoading}
                      sx={{ textTransform: 'none' }}
                    >
                      {aiWorkoutSuggestionLoading ? 'Thinking…' : 'Suggest Today’s Workout'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={generateAiRecoverySuggestion}
                      disabled={aiRecoverySuggestionLoading}
                      sx={{ textTransform: 'none' }}
                    >
                      {aiRecoverySuggestionLoading ? 'Thinking…' : 'Recovery + Plan Adjustment'}
                    </Button>
                  </Box>

                  {(aiWorkoutSuggestion || aiRecoverySuggestion) ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {aiWorkoutSuggestion ? (
                        <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                            Today’s Workout
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: '#374151', lineHeight: 1.7 }}>
                            {aiWorkoutSuggestion}
                          </Typography>
                        </Box>
                      ) : null}

                      {aiRecoverySuggestion ? (
                        <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                            Recovery + Adjustment
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: '#374151', lineHeight: 1.7 }}>
                            {aiRecoverySuggestion}
                          </Typography>
                        </Box>
                      ) : null}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      Ask when you want suggestions.
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Monthly Muscle Heatmap */}
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Muscle Heatmap (30 days)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Based on logged sets
                    </Typography>
                  </Box>

                  {muscleHeatmap && muscleHeatmap.scoredSets > 0 ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                      <Box>
                        <MuscleHeatmapFigure intensityByRegion={muscleHeatmap.normalized} />
                      </Box>
                      <GlbModelViewer
                        src={DEFAULT_BODY_MODEL_GLB_URL}
                        intensityByRegion={muscleHeatmap.normalized}
                        height={420}
                        title="Body Model"
                        subtitle="Use this as a base for muscle visualization"
                      />
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      Log a few workouts with named exercises to see this.
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Weekly Hypertrophy Volume (Hard Sets) */}
              <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Weekly Hypertrophy Volume
                  </Typography>
                  <Chip 
                    label="Target: 10 sets/week" 
                    size="small" 
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#f1f5f9', color: '#64748b' }} 
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Object.entries(EXERCISE_LIBRARY).map(([key, data]) => {
                    if (key === 'cardio') return null;
                    const count = stats.muscleDistribution[key] || 0
                    const target = 10;
                    const percentage = Math.min((count / target) * 100, 100)
                    const statusColor = count >= 10 ? '#10b981' : count >= 5 ? '#f59e0b' : '#64748b'
                    
                    return (
                      <Box key={key}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>
                            {data.label}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: statusColor }}>
                            {count}/{target} sets
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#f1f5f9',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: statusColor,
                              borderRadius: 3,
                            },
                          }}
                        />
                      </Box>
                    )
                  })}
                </Box>
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#94a3b8', fontStyle: 'italic' }}>
                  * Scientific standard: 10-20 "hard sets" per muscle group per week is optimal for muscle growth.
                </Typography>
              </Box>

              {/* Recent Workouts Preview */}
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    Recent Workouts
                  </Typography>
                  {workouts.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {workouts.slice(0, 5).map((workout, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 2,
                            bgcolor: '#f9fafb',
                            borderRadius: 1.5,
                          }}
                        >
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {workout.name || 'Workout'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6b7280' }}>
                              {new Date(workout.date).toLocaleDateString()} • {workout.exercises?.length || 0} exercises
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {[...new Set(workout.exercises?.map(e => e.muscleGroup) || [])].slice(0, 4).map((muscle, i) => (
                              <Box
                                key={i}
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: EXERCISE_LIBRARY[muscle]?.color || '#6b7280',
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                      No workouts yet. Start your first workout!
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          {/* Steps Tab */}
          {activeTab === 1 && (
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717' }}>
                    Daily steps
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Log your steps for a day and view trends.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant={stepsRangeMode === 'week' ? 'contained' : 'outlined'}
                    onClick={() => setStepsRangeMode('week')}
                    sx={{ textTransform: 'none' }}
                  >
                    Week
                  </Button>
                  <Button
                    variant={stepsRangeMode === 'month' ? 'contained' : 'outlined'}
                    onClick={() => setStepsRangeMode('month')}
                    sx={{ textTransform: 'none' }}
                  >
                    Month
                  </Button>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Date"
                  type="date"
                  value={stepsDate}
                  onChange={(e) => setStepsDate(e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 180 } }}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Steps"
                  type="number"
                  value={stepsValue}
                  onChange={(e) => setStepsValue(e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 180 } }}
                />
                <Button variant="contained" onClick={saveSteps} disabled={stepsSaving || stepsLoading}>
                  {stepsSaving ? 'Saving…' : 'Save Steps'}
                </Button>
                {stepsError ? (
                  <Typography variant="body2" sx={{ color: '#b91c1c' }}>
                    {stepsError}
                  </Typography>
                ) : null}
              </Box>

              {stepsLoading ? (
                <LinearProgress />
              ) : (
                (() => {
                  const end = new Date(stepsDate)
                  end.setHours(23, 59, 59, 999)
                  const start = new Date(end)
                  const days = stepsRangeMode === 'month' ? 30 : 7
                  start.setDate(start.getDate() - days + 1)
                  start.setHours(0, 0, 0, 0)
                  const chart = buildStepsChart({ start, end, days, series: stepsSeries })

                  if (!chart.dims) {
                    return (
                      <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                        No steps logged in this range.
                      </Typography>
                    )
                  }

                  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const fmtSteps = (v) => (typeof v === 'number' ? `${Math.round(v).toLocaleString()} steps` : '')

                  const d = chart.dims
                  const yMin = chart.min
                  const yMax = chart.max
                  const yMid = yMin != null && yMax != null ? (yMin + yMax) / 2 : null

                  return (
                    <Box>
                      <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
                        {fmt(start)} – {fmt(end)}
                      </Typography>
                      <Box sx={{ width: '100%', overflowX: 'auto' }}>
                        <Box sx={{ minWidth: 560 }}>
                          <svg width="560" height="200" viewBox="0 0 560 200" role="img" aria-label="Steps chart">
                            <rect x="0" y="0" width="560" height="200" fill="#ffffff" />

                            {/* axes */}
                            <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke="#e5e7eb" strokeWidth="1" />
                            <line x1={d.x0} y1={d.y0} x2={d.x0} y2={d.y1} stroke="#e5e7eb" strokeWidth="1" />

                            {/* y grid */}
                            <line x1={d.x0} y1={d.y0} x2={d.x1} y2={d.y0} stroke="#f3f4f6" strokeWidth="1" />
                            <line
                              x1={d.x0}
                              y1={(d.y0 + d.y1) / 2}
                              x2={d.x1}
                              y2={(d.y0 + d.y1) / 2}
                              stroke="#f3f4f6"
                              strokeWidth="1"
                            />
                            <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke="#f3f4f6" strokeWidth="1" />

                            {/* y labels */}
                            <text x={d.x0 - 8} y={d.y0 + 3} fontSize="10" fill="#6b7280" textAnchor="end">
                              {fmtSteps(yMax)}
                            </text>
                            <text x={d.x0 - 8} y={(d.y0 + d.y1) / 2 + 3} fontSize="10" fill="#9ca3af" textAnchor="end">
                              {fmtSteps(yMid)}
                            </text>
                            <text x={d.x0 - 8} y={d.y1 + 3} fontSize="10" fill="#6b7280" textAnchor="end">
                              {fmtSteps(yMin)}
                            </text>

                            {/* axis titles */}
                            <text x={(d.x0 + d.x1) / 2} y={200 - 8} fontSize="10" fill="#6b7280" textAnchor="middle">
                              Date
                            </text>
                            <text
                              x="16"
                              y={(d.y0 + d.y1) / 2}
                              fontSize="10"
                              fill="#6b7280"
                              textAnchor="middle"
                              transform={`rotate(-90 16 ${(d.y0 + d.y1) / 2})`}
                            >
                              Steps
                            </text>

                            {/* line */}
                            <polyline fill="none" stroke="#171717" strokeWidth="2" points={chart.points} />

                            {/* points */}
                            {chart.points
                              .split(' ')
                              .filter(Boolean)
                              .map((p, i) => {
                                const [x, y] = p.split(',').map(Number)
                                return <circle key={i} cx={x} cy={y} r={3} fill="#171717" />
                              })}
                          </svg>
                        </Box>
                      </Box>
                    </Box>
                  )
                })()
              )}
            </Box>
          )}

          {/* Calendar Tab */}
          {activeTab === 2 && (
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              {calendarLoading && <LinearProgress sx={{ mb: 2 }} />}
              <Calendar events={calendarEvents} onMonthChange={loadCalendarRange} />
            </Box>
          )}

          {/* History Tab */}
          {activeTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {workouts.length > 0 ? (
                workouts.map((workout, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 3,
                      bgcolor: '#fff',
                      borderRadius: 2,
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {workout.name || 'Workout'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {new Date(workout.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })} • {Math.round((workout.duration || 0) / 60)} min
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {[...new Set(workout.exercises?.map(e => e.muscleGroup) || [])].map((muscle, i) => (
                          <Chip
                            key={i}
                            label={EXERCISE_LIBRARY[muscle]?.label || muscle}
                            size="small"
                            sx={{
                              bgcolor: EXERCISE_LIBRARY[muscle]?.color || '#6b7280',
                              color: '#fff',
                              fontWeight: 500,
                              fontSize: '0.7rem',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {workout.exercises?.map((ex, i) => (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f3f4f6' }}>
                          <Typography variant="body2">{ex.name}</Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {ex.sets?.map(s => `${s.weight}kg × ${s.reps}`).join(', ')}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <FitnessCenterIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
                  <Typography variant="body1" sx={{ color: '#6b7280' }}>
                    No workouts logged yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Start your first workout to see your history
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </>
      )}

      {/* Add Exercise Dialog */}
      <Dialog open={exerciseDialogOpen} onClose={() => setExerciseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Exercise</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Muscle Group</InputLabel>
              <Select
                value={selectedMuscle}
                onChange={(e) => {
                  setSelectedMuscle(e.target.value)
                  setSelectedExercise('')
                }}
                label="Muscle Group"
              >
                {Object.entries(EXERCISE_LIBRARY).map(([key, data]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: data.color }} />
                      {data.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedMuscle && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Exercise</InputLabel>
                  <Select
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    label="Exercise"
                  >
                    {EXERCISE_LIBRARY[selectedMuscle]?.exercises.map((ex) => (
                      <MenuItem key={ex} value={ex}>{ex}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center' }}>
                  — or —
                </Typography>

                <TextField
                  label="Custom Exercise"
                  value={customExercise}
                  onChange={(e) => setCustomExercise(e.target.value)}
                  placeholder="Enter custom exercise name"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExerciseDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={addExercise}
            variant="contained"
            disabled={!selectedMuscle || (!selectedExercise && !customExercise)}
            sx={{ bgcolor: '#171717', '&:hover': { bgcolor: '#374151' } }}
          >
            Add Exercise
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Rest Timer */}
      {showRestTimer && (
        <RestTimer 
          initialSeconds={restTimerSeconds} 
          onClose={() => setShowRestTimer(false)} 
        />
      )}
    </Box>
  )
}

// Stat Card Component
function StatCard({ icon, label, value, sublabel, color }) {
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: '#fff',
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        textAlign: 'center',
      }}
    >
      <Box sx={{ color, mb: 1 }}>{icon}</Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#171717' }}>
        {value}
        {sublabel && (
          <Typography component="span" variant="body2" sx={{ color: '#6b7280', ml: 0.5 }}>
            {sublabel}
          </Typography>
        )}
      </Typography>
      <Typography variant="caption" sx={{ color: '#6b7280' }}>{label}</Typography>
    </Box>
  )
}

export default GymTracker

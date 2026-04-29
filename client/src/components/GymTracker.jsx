import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  TextField
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import TimerIcon from '@mui/icons-material/Timer'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'
import { toast } from 'react-hot-toast'
import { computeTrainingInsights } from '../lib/trainingInsights'
import { computeMuscleHeatmap } from '../lib/muscleHeatmap'
import RestTimer from './RestTimer'
import PlateCalculator from './PlateCalculator'

import { EXERCISE_LIBRARY } from '../lib/gymConstants'
import GymOverviewTab from './Gym/GymOverviewTab'
import GymStepsTab from './Gym/GymStepsTab'
import GymCalendarTab from './Gym/GymCalendarTab'
import GymHistoryTab from './Gym/GymHistoryTab'
import ActiveWorkoutSession from './Gym/ActiveWorkoutSession'

// Global cache to prevent re-fetching on tab switch
let gymCache = {
  workouts: null,
  templates: null,
  nutritionHistory: null,
  correlatedInsights: null,
  readiness: null,
  stepsSeries: null,
  token: null
}

function GymTracker() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [workouts, setWorkouts] = useState(gymCache.workouts || [])
  const [loading, setLoading] = useState(!gymCache.workouts)
  const [calendarWorkouts, setCalendarWorkouts] = useState([])
  const [calendarLoading, setCalendarLoading] = useState(false)

  const [aiWorkoutSuggestion, setAiWorkoutSuggestion] = useState('')
  const [aiWorkoutSuggestionLoading, setAiWorkoutSuggestionLoading] = useState(false)
  const [aiRecoverySuggestion, setAiRecoverySuggestion] = useState('')
  const [aiRecoverySuggestionLoading, setAiRecoverySuggestionLoading] = useState(false)

  // Steps
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
  const [saveRoutineDialogOpen, setSaveRoutineDialogOpen] = useState(false)
  const [templates, setTemplates] = useState(gymCache.templates || [])
  const [templateName, setTemplateName] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState('')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [customExercise, setCustomExercise] = useState('')
  const [manualLogDialogOpen, setManualLogDialogOpen] = useState(false)
  const [manualLogDate, setManualLogDate] = useState(() => new Date().toISOString().split('T')[0])
  
  // Stats
  const [stats, setStats] = useState({
    weeklyWorkouts: 0,
    currentStreak: 0,
    totalWorkouts: 0,
    totalVolume: 0,
    muscleDistribution: {},
  })

  const [restTimerSeconds, setRestTimerSeconds] = useState(0)
  const [showRestTimer, setShowRestTimer] = useState(false)

  const muscleHeatmap = useMemo(() => computeMuscleHeatmap(workouts, { days: 30 }), [workouts])
  const trainingInsights = useMemo(() => computeTrainingInsights(workouts), [workouts])

  const [selectedAnalysisExercise, setSelectedAnalysisExercise] = useState('')
  const [analysisChartMode, setAnalysisChartMode] = useState('1rm')
  const [nutritionHistory, setNutritionHistory] = useState(gymCache.nutritionHistory || [])
  const [correlatedInsights, setCorrelatedInsights] = useState(gymCache.correlatedInsights || [])
  const [readiness, setReadiness] = useState(gymCache.readiness || null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  
  const allExerciseNames = useMemo(() => {
    const names = new Set()
    workouts.forEach(w => w.exercises?.forEach(ex => {
      if (ex.name) names.add(ex.name)
    }))
    return Array.from(names).sort()
  }, [workouts])

  useEffect(() => {
    if (allExerciseNames.length > 0 && !selectedAnalysisExercise) {
      setSelectedAnalysisExercise(allExerciseNames[0])
    }
  }, [allExerciseNames, selectedAnalysisExercise])

  const exerciseProgressionData = useMemo(() => {
    if (!selectedAnalysisExercise) return []
    const data = []
    workouts.slice().reverse().forEach(w => {
      const ex = w.exercises?.find(e => e.name === selectedAnalysisExercise)
      if (ex && ex.sets?.length > 0) {
        const maxWeight = Math.max(...ex.sets.map(s => s.weight || 0))
        const est1RM = Math.max(...ex.sets.map(s => {
          if (s.reps > 1) return (s.weight || 0) / (1.0278 - (0.0278 * (s.reps || 1)))
          return s.weight || 0
        }))
        
        data.push({
          date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          weight: maxWeight,
          oneRepMax: Math.round(est1RM),
          workoutName: w.name
        })
      }
    })
    return data
  }, [workouts, selectedAnalysisExercise])

  const loadCorrelationData = async () => {
    if (!token) return
    if (gymCache.token === token && gymCache.nutritionHistory) {
      setNutritionHistory(gymCache.nutritionHistory)
      return
    }
    
    try {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      
      const res = await fetch(`${API_BASE}/api/nutrition/logs/range?start=${start.toISOString()}&end=${end.toISOString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const logs = data.dailyLogs || []
        setNutritionHistory(logs)
        gymCache.nutritionHistory = logs
      }
    } catch (err) {
      console.error('Failed to load correlation data:', err)
    }
  }

  const loadCorrelatedInsights = async () => {
    if (!token) return
    if (gymCache.token === token && gymCache.correlatedInsights) {
      setCorrelatedInsights(gymCache.correlatedInsights)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/gym/correlations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCorrelatedInsights(data || [])
        gymCache.correlatedInsights = data || []
      }
    } catch (err) {
      console.error('Failed to load correlated insights:', err)
    }
  }

  const loadReadiness = async () => {
    if (!token) return
    if (gymCache.token === token && gymCache.readiness) {
      setReadiness(gymCache.readiness)
      return
    }

    setReadinessLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/gym/readiness`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setReadiness(data)
        gymCache.readiness = data
      }
    } catch (err) {
      console.error('Failed to load readiness:', err)
    } finally {
      setReadinessLoading(false)
    }
  }

  const correlationChartData = useMemo(() => {
    const dayMap = {}
    workouts.forEach(w => {
      const d = new Date(w.date).toDateString()
      const vol = w.exercises?.reduce((sum, ex) => sum + (ex.sets?.reduce((s, set) => s + (set.reps * set.weight), 0) || 0), 0) || 0
      if (!dayMap[d]) dayMap[d] = { date: d, volume: 0, calories: 0, protein: 0 }
      dayMap[d].volume += vol
    })
    nutritionHistory.forEach(log => {
      const d = new Date(log.date).toDateString()
      if (!dayMap[d]) dayMap[d] = { date: d, volume: 0, calories: 0, protein: 0 }
      dayMap[d].calories = log.macros?.calories || 0
      dayMap[d].protein = log.macros?.protein || 0
    })
    return Object.values(dayMap).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14)
  }, [workouts, nutritionHistory])

  useEffect(() => {
    if (gymCache.token !== token) {
      gymCache = {
        workouts: null,
        templates: null,
        nutritionHistory: null,
        correlatedInsights: null,
        readiness: null,
        stepsSeries: null,
        token: token
      }
    }
    loadWorkouts()
    loadTemplates()
    loadCorrelationData()
    loadCorrelatedInsights()
    loadReadiness()
  }, [token])

  useEffect(() => {
    loadStepsDayAndRange()
  }, [token, stepsDate, stepsRangeMode])

  useEffect(() => {
    let interval
    if (currentWorkout && workoutStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - workoutStartTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [currentWorkout, workoutStartTime])

  const volumeChartData = useMemo(() => {
    return workouts.slice().reverse().map(w => ({
      date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      volume: w.exercises?.reduce((sum, ex) => sum + (ex.sets?.reduce((s, set) => s + (set.reps * set.weight), 0) || 0), 0) || 0,
      duration: w.duration || 0
    }))
  }, [workouts])

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
        gymCache.workouts = arr
        calculateStats(arr)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadTemplates = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/gym/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const arr = Array.isArray(data) ? data : []
        setTemplates(arr)
        gymCache.templates = arr
      }
    } catch (err) { console.error(err) }
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
          const hardSets = ex.sets?.filter(s => (s.reps || 0) > 0).length || 0
          muscleCount[muscle] = (muscleCount[muscle] || 0) + hardSets
        })
      }
      w.exercises?.forEach(ex => {
        ex.sets?.forEach(set => {
          totalVolume += (set.reps || 0) * (set.weight || 0)
        })
      })
    })

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const hasWorkout = workoutData.some(w => new Date(w.date).toDateString() === checkDate.toDateString())
      if (hasWorkout) streak++
      else if (i > 0) break
    }

    setStats({ totalWorkouts: workoutData.length, totalVolume, muscleDistribution: muscleCount, weeklyWorkouts: weeklyCount, currentStreak: streak })
  }

  const startWorkout = (targetDate = null) => {
    const d = targetDate ? new Date(targetDate) : new Date()
    setCurrentWorkout({ name: `Workout - ${d.toLocaleDateString()}`, exercises: [], date: d.toISOString().split('T')[0] })
    setWorkoutStartTime(Date.now())
    setElapsedTime(0)
  }

  const startManualWorkout = () => { startWorkout(manualLogDate); setManualLogDialogOpen(false) }

  const cancelWorkout = () => { if (window.confirm('Discard?')) { setCurrentWorkout(null); setWorkoutStartTime(null); setElapsedTime(0); } }

  const addExercise = () => {
    const exerciseName = customExercise || selectedExercise
    if (!exerciseName || !selectedMuscle) return
    setCurrentWorkout(prev => ({ 
      ...prev, 
      exercises: [...prev.exercises, { 
        name: exerciseName, 
        muscleGroup: selectedMuscle, 
        sets: [{ reps: 0, weight: 0, rpe: 8, completed: false }] 
      }] 
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
      updated.exercises[exerciseIdx].sets[setIdx] = { ...updated.exercises[exerciseIdx].sets[setIdx], [field]: Number(value) || 0 }
      return updated
    })
  }

  const triggerRestTimer = (seconds = 60) => {
    setRestTimerSeconds(seconds)
    setShowRestTimer(true)
  }

  const addSet = (exerciseIdx) => {
    setCurrentWorkout(prev => {
      const updated = { ...prev }
      updated.exercises = [...prev.exercises]
      updated.exercises[exerciseIdx] = { ...updated.exercises[exerciseIdx] }
      const lastSet = updated.exercises[exerciseIdx].sets.slice(-1)[0] || { reps: 0, weight: 0, rpe: 8 }
      updated.exercises[exerciseIdx].sets = [...updated.exercises[exerciseIdx].sets, { ...lastSet, completed: false }]
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

  const completeSet = (exerciseIdx, setIdx) => {
    setCurrentWorkout(prev => {
      const updated = { ...prev }
      updated.exercises = [...prev.exercises]
      updated.exercises[exerciseIdx] = { ...updated.exercises[exerciseIdx] }
      updated.exercises[exerciseIdx].sets = [...updated.exercises[exerciseIdx].sets]
      
      const isCompleting = !updated.exercises[exerciseIdx].sets[setIdx].completed
      updated.exercises[exerciseIdx].sets[setIdx] = { 
        ...updated.exercises[exerciseIdx].sets[setIdx], 
        completed: isCompleting 
      }
      
      if (isCompleting) {
        triggerRestTimer(60)
      }
      
      return updated
    })
  }

  const removeExercise = (exerciseIdx) => { setCurrentWorkout(prev => ({ ...prev, exercises: prev.exercises.filter((_, i) => i !== exerciseIdx) })) }

  const finishWorkout = async () => {
    if (!currentWorkout || currentWorkout.exercises.length === 0) return
    const res = await fetch(`${API_BASE}/api/gym/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ...currentWorkout, duration: elapsedTime }),
    })
    if (res.ok) { setCurrentWorkout(null); setWorkoutStartTime(null); setElapsedTime(0); loadWorkouts() }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const calendarEvents = useMemo(() => {
    const calendarEventSource = calendarWorkouts.length ? calendarWorkouts : workouts
    return calendarEventSource
      .filter(w => {
        const name = (w.name || '').toLowerCase()
        return !name.includes('nutrition') && !name.includes('wellness')
      })
      .map(w => ({
        date: w.date,
        type: 'workout',
        title: w.name || 'Workout',
        details: `${w.exercises?.length || 0} exercises • ${Math.round((w.duration || 0) / 60)}min`,
        exercises: w.exercises,
      }))
  }, [calendarWorkouts, workouts])

  const loadCalendarRange = useCallback(async (monthDate) => {
    if (!token) return
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString()
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString()
    setCalendarLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/gym/workouts/range/${encodeURIComponent(start)}/${encodeURIComponent(end)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setCalendarWorkouts(await res.json())
    } catch (err) { console.error(err) }
    finally { setCalendarLoading(false) }
  }, [token])

  const saveCurrentAsTemplate = async (name) => {
    if (!token || !currentWorkout || !name) return
    const res = await fetch(`${API_BASE}/api/gym/templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, exercises: currentWorkout.exercises, description: `Routine saved on ${new Date().toLocaleDateString()}` })
    })
    if (res.ok) { setTemplateName(''); loadTemplates(); toast.success('Routine saved!') }
  }

  const useTemplate = (tpl) => {
    setCurrentWorkout({
      name: tpl.name,
      exercises: tpl.exercises.map(ex => ({ ...ex, sets: ex.sets?.map(s => ({ ...s })) || [{ reps: 0, weight: 0, rpe: 8 }] })),
      date: new Date().toISOString().split('T')[0],
    })
    setWorkoutStartTime(Date.now())
    setElapsedTime(0)
  }

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
      const d = new Date(start); d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      labels.push(key.slice(5))
      values.push(byDay.has(key) ? byDay.get(key) : null)
    }
    const numeric = values.filter((v) => typeof v === 'number')
    if (numeric.length === 0) return { points: '', min: null, max: null, labels, dims: null }
    let min = Math.min(...numeric); let max = Math.max(...numeric)
    if (min === max) { min = Math.max(0, min - 1000); max = max + 1000 }
    const W = 560; const H = 200; const M = { top: 20, right: 20, bottom: 40, left: 60 }
    const innerW = W - M.left - M.right; const innerH = H - M.top - M.bottom
    const pts = []
    for (let i = 0; i < values.length; i++) {
      const v = values[i]; if (v == null) continue
      const x = M.left + (innerW * i) / Math.max(1, values.length - 1)
      const t = (v - min) / (max - min)
      const y = M.top + innerH * (1 - t)
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    return { points: pts.join(' '), min, max, labels, dims: { W, H, M, innerW, innerH, x0: M.left, x1: M.left + innerW, y0: M.top, y1: M.top + innerH } }
  }

  const loadStepsDayAndRange = async () => {
    if (!token) return
    setStepsLoading(true)
    try {
      const end = new Date(stepsDate); end.setHours(23, 59, 59, 999)
      const start = new Date(end); const days = stepsRangeMode === 'month' ? 30 : 7; start.setDate(start.getDate() - days + 1); start.setHours(0, 0, 0, 0)
      const res = await fetch(`${API_BASE}/api/gym/steps/range/${encodeURIComponent(start.toISOString())}/${encodeURIComponent(end.toISOString())}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setStepsSeries(Array.isArray(data) ? data : [])
    } catch (e) { setStepsError(e.message) }
    finally { setStepsLoading(false) }
  }

  const saveSteps = async () => {
    if (!token) return
    setStepsSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/gym/steps`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: stepsDate, stepsCount: Number(stepsValue) }),
      })
      if (res.ok) await loadStepsDayAndRange()
    } catch (e) { setStepsError(e.message) }
    finally { setStepsSaving(false) }
  }

  const generateAiWorkoutSuggestion = useCallback(async () => {
    if (!token) return
    setAiWorkoutSuggestionLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Suggest a workout plan based on my history." }),
      })
      const json = await res.json()
      setAiWorkoutSuggestion(json?.reply || 'No response')
    } catch (e) { console.error(e) }
    finally { setAiWorkoutSuggestionLoading(false) }
  }, [token])

  const generateAiRecoverySuggestion = useCallback(async () => {
    if (!token) return
    setAiRecoverySuggestionLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Suggest recovery plan." }),
      })
      const json = await res.json()
      setAiRecoverySuggestion(json?.reply || 'No response')
    } catch (e) { console.error(e) }
    finally { setAiRecoverySuggestionLoading(false) }
  }, [token])

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Gym Tracker</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>Log workouts, track progress, build strength</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => setTemplateDialogOpen(true)}>Routines</Button>
          {!currentWorkout && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={() => setManualLogDialogOpen(true)}>Log Past Workout</Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => startWorkout()} sx={{ bgcolor: '#171717' }}>Start Workout</Button>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Workout Routines</DialogTitle>
        <DialogContent>
          {templates.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #e2e8f0' }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>You haven't saved any routines yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {templates.map((tpl) => (
                <Box 
                  key={tpl._id} 
                  sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0', cursor: 'pointer', '&:hover': { bgcolor: '#f0f9ff' } }}
                  onClick={() => { useTemplate(tpl); setTemplateDialogOpen(false); }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{tpl.name}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>{tpl.exercises?.length || 0} exercises</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setTemplateDialogOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      {currentWorkout && (
        <ActiveWorkoutSession
          currentWorkout={currentWorkout}
          setCurrentWorkout={setCurrentWorkout}
          elapsedTime={elapsedTime}
          formatTime={formatTime}
          setTemplateName={setTemplateName}
          setSaveRoutineDialogOpen={setSaveRoutineDialogOpen}
          cancelWorkout={cancelWorkout}
          finishWorkout={finishWorkout}
          removeExercise={removeExercise}
          updateSet={updateSet}
          removeSet={removeSet}
          addSet={addSet}
          completeSet={completeSet}
          setExerciseDialogOpen={setExerciseDialogOpen}
        />
      )}

      {!currentWorkout && (
        <>
          <Box sx={{ borderBottom: '1px solid #e5e7eb', mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              <Tab icon={<TrendingUpIcon />} label="Overview" iconPosition="start" />
              <Tab icon={<TimerIcon />} label="Steps" iconPosition="start" />
              <Tab icon={<CalendarMonthIcon />} label="Calendar" iconPosition="start" />
              <Tab icon={<FitnessCenterIcon />} label="History" iconPosition="start" />
            </Tabs>
          </Box>

          {activeTab === 0 && (
            <GymOverviewTab
              stats={stats}
              readiness={readiness}
              readinessLoading={readinessLoading}
              volumeChartData={volumeChartData}
              allExerciseNames={allExerciseNames}
              selectedAnalysisExercise={selectedAnalysisExercise}
              setSelectedAnalysisExercise={setSelectedAnalysisExercise}
              analysisChartMode={analysisChartMode}
              setAnalysisChartMode={setAnalysisChartMode}
              exerciseProgressionData={exerciseProgressionData}
              trainingInsights={trainingInsights}
              generateAiWorkoutSuggestion={generateAiWorkoutSuggestion}
              aiWorkoutSuggestionLoading={aiWorkoutSuggestionLoading}
              generateAiRecoverySuggestion={generateAiRecoverySuggestion}
              aiRecoverySuggestionLoading={aiRecoverySuggestionLoading}
              aiWorkoutSuggestion={aiWorkoutSuggestion}
              aiRecoverySuggestion={aiRecoverySuggestion}
              correlationChartData={correlationChartData}
              correlatedInsights={correlatedInsights}
              muscleHeatmap={muscleHeatmap}
            />
          )}

          {activeTab === 1 && (
            <GymStepsTab
              stepsDate={stepsDate}
              setStepsDate={setStepsDate}
              stepsValue={stepsValue}
              setStepsValue={setStepsValue}
              stepsRangeMode={stepsRangeMode}
              setStepsRangeMode={setStepsRangeMode}
              stepsLoading={stepsLoading}
              stepsSaving={stepsSaving}
              stepsError={stepsError}
              saveSteps={saveSteps}
              buildStepsChart={buildStepsChart}
              stepsSeries={stepsSeries}
            />
          )}

          {activeTab === 2 && (
            <GymCalendarTab
              calendarEvents={calendarEvents}
              loadCalendarRange={loadCalendarRange}
              calendarLoading={calendarLoading}
            />
          )}

          {activeTab === 3 && (
            <GymHistoryTab
              workouts={workouts}
              loading={loading}
            />
          )}
        </>
      )}

      <PlateCalculator />
      <RestTimer 
        open={showRestTimer} 
        onClose={() => setShowRestTimer(false)} 
        initialSeconds={restTimerSeconds} 
      />

      <Dialog open={exerciseDialogOpen} onClose={() => setExerciseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Exercise</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Muscle Group</InputLabel>
              <Select value={selectedMuscle} onChange={(e) => setSelectedMuscle(e.target.value)} label="Muscle Group">
                {Object.entries(EXERCISE_LIBRARY).map(([key, val]) => (
                  <MenuItem key={key} value={key}>{val.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" disabled={!selectedMuscle}>
              <InputLabel>Exercise</InputLabel>
              <Select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)} label="Exercise">
                {selectedMuscle && EXERCISE_LIBRARY[selectedMuscle].exercises.map(ex => (
                  <MenuItem key={ex} value={ex}>{ex}</MenuItem>
                ))}
                <Divider />
                <MenuItem value="custom">Custom...</MenuItem>
              </Select>
            </FormControl>
            {selectedExercise === 'custom' && (
              <TextField label="Custom Exercise Name" value={customExercise} onChange={(e) => setCustomExercise(e.target.value)} size="small" fullWidth />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExerciseDialogOpen(false)}>Cancel</Button>
          <Button onClick={addExercise} variant="contained" disabled={!selectedMuscle || (!selectedExercise && !customExercise)}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={manualLogDialogOpen} onClose={() => setManualLogDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Log Past Workout</DialogTitle>
        <DialogContent>
          <TextField type="date" label="Workout Date" value={manualLogDate} onChange={(e) => setManualLogDate(e.target.value)} fullWidth sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualLogDialogOpen(false)}>Cancel</Button>
          <Button onClick={startManualWorkout} variant="contained" sx={{ bgcolor: '#171717' }}>Start Logging</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={saveRoutineDialogOpen} onClose={() => setSaveRoutineDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Save as Routine</DialogTitle>
        <DialogContent>
          <TextField label="Routine Name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} fullWidth sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveRoutineDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => { saveCurrentAsTemplate(templateName); setSaveRoutineDialogOpen(false); }} variant="contained" sx={{ bgcolor: '#171717' }}>Save Routine</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default GymTracker

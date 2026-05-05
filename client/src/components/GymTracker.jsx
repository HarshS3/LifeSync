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
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import TimerIcon from '@mui/icons-material/Timer'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import CloseIcon from '@mui/icons-material/Close'
import TimelineIcon from '@mui/icons-material/Timeline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import InsightsIcon from '@mui/icons-material/Insights'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import BarChartIcon from '@mui/icons-material/BarChart'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts'
import Calendar from './Calendar'
import { useAuth } from '../context/AuthContext'
import { useWorkout } from '../context/WorkoutContext'
import { API_BASE } from '../config'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { computeTrainingInsights } from '../lib/trainingInsights'
import { computeMuscleHeatmap } from '../lib/muscleHeatmap'
import MuscleHeatmapFigure from './MuscleHeatmapFigure'
import GlbModelViewer from './GlbModelViewer.jsx'
import RestTimer from './RestTimer'
import PlateCalculator from './PlateCalculator'
import LastSetsReference from './LastSetsReference'
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary'

const DEFAULT_BODY_MODEL_GLB_URL = new URL('../assets/Untitled.glb', import.meta.url).href

function GymTracker() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { token } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const [showAdvancedOverview, setShowAdvancedOverview] = useState(false)
  const [exerciseLastSets, setExerciseLastSets] = useState({})
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
  
  const { 
    currentWorkout, 
    setCurrentWorkout, 
    elapsedTime, 
    setWorkoutStartTime, 
    startWorkout, 
    cancelWorkout, 
    finishWorkout 
  } = useWorkout()
  
  // Dialog states
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [saveRoutineDialogOpen, setSaveRoutineDialogOpen] = useState(false)
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
    muscleDistribution: {},
  })

  const [restTimerSeconds, setRestTimerSeconds] = useState(0)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [recentPRs, setRecentPRs] = useState({}) // exercise -> best 1RM

  const muscleHeatmap = useMemo(() => computeMuscleHeatmap(workouts, { days: 30 }), [workouts])

  const trainingInsights = useMemo(() => computeTrainingInsights(workouts), [workouts])

  const [selectedAnalysisExercise, setSelectedAnalysisExercise] = useState('')
  const [analysisChartMode, setAnalysisChartMode] = useState('1rm') // '1rm' or 'weight'
  const [nutritionHistory, setNutritionHistory] = useState([])
  const [correlatedInsights, setCorrelatedInsights] = useState([])
  const [correlationLoading, setCorrelationLoading] = useState(false)
  const [readiness, setReadiness] = useState(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false)

  const [editTimerOpen, setEditTimerOpen] = useState(false)
  const [editTimerHours, setEditTimerHours] = useState(0)
  const [editTimerMinutes, setEditTimerMinutes] = useState(0)
  const [editTimerSeconds, setEditTimerSeconds] = useState(0)

  const handleTimerClick = () => {
    const h = Math.floor(elapsedTime / 3600)
    const m = Math.floor((elapsedTime % 3600) / 60)
    const s = elapsedTime % 60
    setEditTimerHours(h)
    setEditTimerMinutes(m)
    setEditTimerSeconds(s)
    setEditTimerOpen(true)
  }

  const handleTimerSave = () => {
    const newTotalSeconds = (parseInt(editTimerHours) || 0) * 3600 + (parseInt(editTimerMinutes) || 0) * 60 + (parseInt(editTimerSeconds) || 0)
    setWorkoutStartTime(Date.now() - newTotalSeconds * 1000)
    setElapsedTime(newTotalSeconds)
    setEditTimerOpen(false)
  }

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
  }, [allExerciseNames])

  const exerciseProgressionData = useMemo(() => {
    if (!selectedAnalysisExercise) return []
    const data = []
    workouts.slice().reverse().forEach(w => {
      const ex = w.exercises?.find(e => e.name === selectedAnalysisExercise)
      if (ex && ex.sets?.length > 0) {
        const maxWeight = Math.max(...ex.sets.map(s => s.weight || 0))
        // Brzycki formula for 1RM: Weight / (1.0278 - (0.0278 * Reps))
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

  const handleWorkoutClick = (workout) => {
    setSelectedWorkout(workout)
    setWorkoutDialogOpen(true)
  }

  const loadCorrelationData = async () => {
    if (!token) return
    setCorrelationLoading(true)
    try {
      // Fetch last 30 days of nutrition
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      
      const res = await fetch(`${API_BASE}/api/nutrition/logs/range?start=${start.toISOString()}&end=${end.toISOString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setNutritionHistory(data.dailyLogs || [])
      }
    } catch (err) {
      console.error('Failed to load correlation data:', err)
    } finally {
      setCorrelationLoading(false)
    }
  }

  const loadCorrelatedInsights = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/gym/correlations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCorrelatedInsights(data || [])
      }
    } catch (err) {
      console.error('Failed to load correlated insights:', err)
    }
  }

  const loadReadiness = async () => {
    if (!token) return
    setReadinessLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/gym/readiness`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setReadiness(await res.json())
    } catch (err) {
      console.error('Failed to load readiness:', err)
    } finally {
      setReadinessLoading(false)
    }
  }

  const correlationChartData = useMemo(() => {
    // Map of date string -> { volume, calories, protein }
    const dayMap = {}
    
    // Process Workouts
    workouts.forEach(w => {
      const d = new Date(w.date).toDateString()
      const vol = w.exercises?.reduce((sum, ex) => sum + (ex.sets?.reduce((s, set) => s + (set.reps * set.weight), 0) || 0), 0) || 0
      if (!dayMap[d]) dayMap[d] = { date: d, volume: 0, calories: 0, protein: 0 }
      dayMap[d].volume += vol
    })
    
    // Process Nutrition
    nutritionHistory.forEach(log => {
      const d = new Date(log.date).toDateString()
      if (!dayMap[d]) dayMap[d] = { date: d, volume: 0, calories: 0, protein: 0 }
      dayMap[d].calories = log.macros?.calories || 0
      dayMap[d].protein = log.macros?.protein || 0
    })
    
    return Object.values(dayMap).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14)
  }, [workouts, nutritionHistory])

  useEffect(() => {
    loadWorkouts()
    loadTemplates()
    loadCorrelationData()
    loadCorrelatedInsights()
    loadReadiness()
  }, [token])

  useEffect(() => {
    loadStepsDayAndRange()
  }, [token, stepsDate, stepsRangeMode])

  const volumeChartData = useMemo(() => {
    return workouts.slice().reverse().map(w => ({
      date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      volume: w.exercises?.reduce((sum, ex) => sum + (ex.sets?.reduce((s, set) => s + (set.reps * set.weight), 0) || 0), 0) || 0,
      duration: w.duration || 0
    }))
  }, [workouts])

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
        left: 80,
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
        const dayRes = await fetch(`${API_BASE}/api/gym/steps/date/${encodeURIComponent(stepsDate)}?t=${Date.now()}`, {
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
          `${API_BASE}/api/gym/steps/range/${encodeURIComponent(start.toISOString())}/${encodeURIComponent(end.toISOString())}?t=${Date.now()}`,
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
          description: `Created from ${currentWorkout.name || 'workout'}`
        }),
      })
      if (res.ok) {
        setTemplateName('')
        loadTemplates()
        toast.success('Routine saved successfully!')
      } else {
        toast.error('Failed to save routine')
      }
    } catch (err) {
      console.error('Failed to save template:', err)
      toast.error('Failed to save routine')
    }
  }

  const useTemplate = (tpl) => {
    startWorkout({
      name: tpl.name,
      exercises: tpl.exercises.map(ex => ({
        ...ex,
        sets: ex.sets?.map(s => ({ ...s })) || [{ reps: 0, weight: 0, rpe: 8 }]
      })),
      date: new Date().toISOString().split('T')[0],
    })
    setActiveTab(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  const addExercise = () => {
    const exerciseName = customExercise || selectedExercise
    if (!exerciseName || !selectedMuscle) return

    // Look up exercise definition
    const allExercises = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises)
    const exDef = allExercises.find(e => e.name.toLowerCase() === exerciseName.toLowerCase())
    
    let initialSet = { reps: 0, weight: 0, rpe: 8 }
    if (exDef && exDef.logType === 'cardio' && exDef.logFields) {
      initialSet = {}
      exDef.logFields.forEach(f => {
        initialSet[f.key] = ''
      })
    }

    const newExercise = {
      name: exerciseName,
      muscleGroup: selectedMuscle,
      sets: [initialSet],
    }

    setCurrentWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise],
    }))

    // Load last sets for this exercise
    loadLastSets(exerciseName)

    setExerciseDialogOpen(false)
    setSelectedMuscle('')
    setSelectedExercise('')
    setCustomExercise('')
  }

  const loadLastSets = async (exerciseName) => {
    try {
      const res = await fetch(`${API_BASE}/api/gym/exercise-history/${encodeURIComponent(exerciseName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.history && data.history.length > 0) {
          const lastLog = data.history[0]
          setExerciseLastSets(prev => ({
            ...prev,
            [exerciseName]: lastLog.sets || []
          }))
        }
      }
    } catch (err) {
      console.error('Failed to load exercise last sets:', err)
    }
  }

  const updateSet = (exerciseIdx, setIdx, field, value) => {
    setCurrentWorkout(prev => {
      const updated = { ...prev }
      updated.exercises = [...prev.exercises]
      updated.exercises[exerciseIdx] = { ...updated.exercises[exerciseIdx] }
      updated.exercises[exerciseIdx].sets = [...updated.exercises[exerciseIdx].sets]
      updated.exercises[exerciseIdx].sets[setIdx] = {
        ...updated.exercises[exerciseIdx].sets[setIdx],
        [field]: value === '' ? '' : (isNaN(value) ? value : (value.startsWith('0') && value.length > 1 && !value.startsWith('0.') ? Number(value) : value)),
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
      const exercise = updated.exercises[exerciseIdx]
      updated.exercises = [...prev.exercises]
      updated.exercises[exerciseIdx] = { ...exercise }
      
      const allExercises = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises)
      const exDef = allExercises.find(e => e.name.toLowerCase() === exercise.name.toLowerCase())
      
      let newSet = { reps: 0, weight: 0, rpe: 8 }
      if (exDef && exDef.logType === 'cardio' && exDef.logFields) {
        newSet = {}
        exDef.logFields.forEach(f => { newSet[f.key] = '' })
      }
      
      const lastSet = exercise.sets.slice(-1)[0]
      updated.exercises[exerciseIdx].sets = [...exercise.sets, lastSet ? { ...lastSet } : newSet]
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

  const deleteWorkout = async (id, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this workout?')) return
    try {
      const res = await fetch(`${API_BASE}/api/gym/workouts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('Workout deleted')
        loadWorkouts()
      }
    } catch (err) {
      console.error('Failed to delete workout:', err)
      toast.error('Failed to delete workout')
    }
  }

  const editWorkout = (workout, e) => {
    if (e) e.stopPropagation()
    setCurrentWorkout({
      ...workout,
      exercises: workout.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({ ...s }))
      }))
    })
    setWorkoutStartTime(Date.now() - (workout.duration || 0) * 1000)
    setActiveTab(0) // Switch to active workout tab
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteTemplate = async (id, e) => {
    if (e) e.stopPropagation()
    if (!window.confirm('Delete this routine?')) return
    try {
      const res = await fetch(`${API_BASE}/api/gym/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('Routine deleted')
        loadTemplates()
      }
    } catch (err) {
      console.error('Failed to delete template:', err)
    }
  }

  const handleFinishWorkout = async () => {
    const success = await finishWorkout()
    if (success) {
      loadWorkouts()
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const calendarEventSource = calendarWorkouts.length ? calendarWorkouts : workouts

  // Calendar events from workouts
  const calendarEvents = calendarEventSource
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
      original: w,
    }))

  // Muscle distribution for chart
  const muscleDistribution = stats.muscleDistribution || {}
  const muscleTotal = Object.values(muscleDistribution).reduce((a, b) => a + b, 0) || 1

  return (
    <Box>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Gym Tracker
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Log workouts, track progress, build strength
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}>
          <Box sx={{ position: 'relative' }}>
            <Button
              variant="outlined"
              onClick={() => setTemplateDialogOpen(true)}
              fullWidth={isMobile}
              sx={{ 
                textTransform: 'none', 
                fontWeight: 600, 
                color: 'text.primary', 
                borderColor: 'divider',
                transition: 'all 0.2s ease',
                '&:hover': { 
                  borderColor: '#1f2937',
                  bgcolor: 'action.hover',
                  transform: 'translateY(-1px)'
                },
                '&:active': { 
                  transform: 'translateY(0px)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                },
                '&:focus': { outline: '2px solid #3b82f6', outlineOffset: 2 }
              }}
            >
              Routines
            </Button>
            {templates.length > 0 && (
              <Box sx={{ 
                position: 'absolute', top: -5, right: -5, 
                width: 18, height: 18, bgcolor: '#ef4444', 
                borderRadius: '50%', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', 
                color: 'background.paper', fontSize: '10px', fontWeight: 700,
                border: '2px solid #fff',
                animation: 'pulse 2s infinite'
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
              fullWidth={isMobile}
              sx={{
                bgcolor: 'text.primary',
                textTransform: 'none',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                '&:hover': { 
                  bgcolor: '#1f2937',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                },
                '&:active': { 
                  transform: 'translateY(0px)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                },
                '&:focus': { outline: '2px solid #3b82f6', outlineOffset: 2 }
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
            <Box sx={{ py: 4, textAlign: 'center', bgcolor: 'background.default', borderRadius: 2, border: '1px dashed #e2e8f0' }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>You haven't saved any routines yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {templates.map((tpl) => (
                <Box 
                  key={tpl._id} 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    border: '1px solid #e2e8f0', 
                    cursor: 'pointer', 
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': { 
                      bgcolor: '#f0f9ff', 
                      borderColor: '#38bdf8',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    },
                    '&:active': { 
                      transform: 'translateY(0px)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }
                  }}
                  onClick={() => { useTemplate(tpl); setTemplateDialogOpen(false); }}
                  >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{tpl.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {tpl.exercises?.length || 0} exercises • {tpl.description}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={(e) => deleteTemplate(tpl._id, e)}
                      sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  </Box>              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setTemplateDialogOpen(false)}
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: 'action.selected' },
              '&:active': { opacity: 0.7 },
              '&:focus': { outline: '2px solid #1f2937' }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Active Workout */}
      {currentWorkout && (
        <Box sx={{ 
          p: 3, 
          pb: { xs: 12, sm: 3 }, // extra padding for fixed mobile action bar
          mb: 3, 
          bgcolor: '#111827', 
          borderRadius: 2,
          color: '#f9fafb',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#9ca3af' }}>
                Active Workout
              </Typography>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  cursor: 'pointer',
                  p: 1,
                  borderRadius: 1,
                  transition: 'background-color 0.2s ease',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' }
                }}
                onClick={handleTimerClick}
                title="Edit workout timer"
              >
                <TimerIcon sx={{ color: '#f59e0b' }} />
                <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {formatTime(elapsedTime)}
                </Typography>
              </Box>
              <TextField
                type="date"
                size="small"
                value={currentWorkout.date ? new Date(currentWorkout.date).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setCurrentWorkout(prev => ({ ...prev, date: newDate }));
                }}
                sx={{ 
                  mt: 1,
                  '& .MuiOutlinedInput-root': { 
                    color: '#9ca3af', 
                    fontSize: '0.75rem',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } 
                  } 
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setTemplateName(currentWorkout.name || '');
                  setSaveRoutineDialogOpen(true);
                }}
                fullWidth={isMobile}
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.3)', 
                  color: '#9ca3af', 
                  textTransform: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    borderColor: 'rgba(255,255,255,0.6)',
                    color: '#ffffff',
                    bgcolor: 'rgba(255,255,255,0.05)'
                  },
                  '&:active': { opacity: 0.7 },
                  '&:focus': { outline: '2px solid #60a5fa', outlineOffset: 2 }
                }}
              >
                Save as Routine
              </Button>
              <Button
                variant="outlined"
                onClick={cancelWorkout}
                fullWidth={isMobile}
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.3)', 
                  color: '#9ca3af',
                  textTransform: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    borderColor: 'rgba(255,255,255,0.6)',
                    color: '#ffffff',
                    bgcolor: 'rgba(255,255,255,0.05)'
                  },
                  '&:active': { opacity: 0.7 },
                  '&:focus': { outline: '2px solid #60a5fa', outlineOffset: 2 }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleFinishWorkout}
                fullWidth={isMobile}
                sx={{ 
                  bgcolor: '#15803d',
                  textTransform: 'none',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    bgcolor: '#166534',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(21, 128, 61, 0.3)'
                  },
                  '&:active': { 
                    transform: 'translateY(0px)',
                    boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
                  },
                  '&:focus': { outline: '2px solid #3b82f6', outlineOffset: 2 }
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
                        bgcolor: EXERCISE_LIBRARY[exercise.muscleGroup]?.color || 'text.secondary',
                        color: '#ffffff',
                        fontWeight: 600,
                      }}
                    />
                    <Typography 
                      variant="subtitle1" 
                      sx={{ fontWeight: 600, cursor: 'pointer', color: '#3b82f6', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => navigate(`/exercise-history/${encodeURIComponent(exercise.name)}`)}
                      title="View exercise history"
                    >
                      {exercise.name}
                    </Typography>
                    <Chip 
                      label="PR WATCH" 
                      size="small" 
                      sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid #f59e0b', fontWeight: 700 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                      size="small" 
                      onClick={() => navigate(`/exercise-history/${encodeURIComponent(exercise.name)}`)}
                      sx={{ textTransform: 'none', color: '#3b82f6', fontSize: '0.75rem' }}
                    >
                      History →
                    </Button>
                    <IconButton size="small" onClick={() => removeExercise(exIdx)} sx={{ color: '#ef4444' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>


                {/* Sets — smart rendering based on exercise logType */}
                {(() => {
                  // Look up exercise definition for logType
                  const allExercises = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises)
                  const exDef = allExercises.find(e => e.name.toLowerCase() === exercise.name.toLowerCase())
                  const isCardio = exDef?.logType === 'cardio'
                  const logFields = exDef?.logFields || []

                  if (isCardio && logFields.length > 0) {
                    // ── Cardio logging UI ──
                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {exercise.sets.map((set, setIdx) => (
                          <Box key={setIdx} sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="caption" sx={{ color: '#60a5fa', fontWeight: 700 }}>Session {setIdx + 1}</Typography>
                              <IconButton size="small" onClick={() => removeSet(exIdx, setIdx)} disabled={exercise.sets.length <= 1} sx={{ color: 'rgba(255,255,255,0.4)', p: 0.25 }}>
                                <CloseIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
                              {logFields.map(field => (
                                <Box key={field.key}>
                                  <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mb: 0.25, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {field.label}{field.unit ? ` (${field.unit})` : ''}
                                  </Typography>
                                  <TextField
                                    size="small"
                                    type={field.inputType || 'number'}
                                    value={set[field.key] || ''}
                                    onChange={e => updateSet(exIdx, setIdx, field.key, e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    sx={{
                                      width: '100%',
                                      '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.1)', color: '#f9fafb', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } },
                                      '& input': { color: '#f9fafb', textAlign: 'center', py: 0.75 },
                                    }}
                                  />
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        ))}
                        <Button size="small" onClick={() => addSet(exIdx)} sx={{ color: '#60a5fa', textTransform: 'none', alignSelf: 'flex-start' }}>
                          + Add Session
                        </Button>
                      </Box>
                    )
                  }

                  // ── Standard weight + reps UI ──
                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '32px 1fr 1fr 64px', sm: '40px 1fr 1fr 80px' }, gap: 1, mb: 1 }}>
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>Set</Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>Weight (kg)</Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>Reps</Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}></Typography>
                      </Box>
                      {exercise.sets.map((set, setIdx) => {
                        const prevSet = exerciseLastSets[exercise.name]?.[setIdx];
                        return (
                          <Box key={setIdx} sx={{ display: 'grid', gridTemplateColumns: { xs: '24px 1fr 1fr 76px', sm: '40px 1fr 1fr 80px' }, gap: 1, mb: 1, alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{setIdx + 1}</Typography>
                            <TextField size="small" type="number" value={set.weight || ''} placeholder={prevSet?.weight ? String(prevSet.weight) : ''} onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)} onFocus={(e) => e.target.select()}
                              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.1)', color: '#f9fafb', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& input': { color: '#f9fafb', textAlign: 'center' }, '& input::placeholder': { color: '#9ca3af', opacity: 1 } }}
                            />
                            <TextField size="small" type="number" value={set.reps || ''} placeholder={prevSet?.reps ? String(prevSet.reps) : ''} onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)} onFocus={(e) => e.target.select()}
                              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.1)', color: '#f9fafb', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& input': { color: '#f9fafb', textAlign: 'center' }, '& input::placeholder': { color: '#9ca3af', opacity: 1 } }}
                            />
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton size="small" onClick={() => { if (prevSet) { updateSet(exIdx, setIdx, 'weight', prevSet.weight); updateSet(exIdx, setIdx, 'reps', prevSet.reps); } }} disabled={!prevSet}
                                sx={{ color: prevSet ? '#10b981' : 'rgba(255,255,255,0.3)', '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.1)' } }}>
                                <CheckIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => removeSet(exIdx, setIdx)} disabled={exercise.sets.length <= 1} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        )
                      })}
                      <Button size="small" onClick={() => addSet(exIdx)} sx={{ color: '#60a5fa', textTransform: 'none', alignSelf: 'flex-start' }}>+ Add Set</Button>
                    </Box>
                  )
                })()}
              </Box>
            ))}

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setExerciseDialogOpen(true)}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#ffffff',
                textTransform: 'none',
                py: 1.5,
                '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Add Exercise
            </Button>
          </Box>
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid #e5e7eb', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          allowScrollButtonsMobile={isMobile}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              minHeight: { xs: 48, sm: 48 },
              py: { xs: 0.5, sm: 1 },
              color: 'text.secondary',
              '&.Mui-selected': { color: 'text.primary' },
            },
            '& .MuiTabs-indicator': { bgcolor: 'text.primary' },
          }}
        >
          {currentWorkout && (
            <Tab 
              icon={<FitnessCenterIcon sx={{ color: '#f59e0b' }} />} 
              label="Active Session" 
              iconPosition={isMobile ? 'top' : 'start'} 
              sx={{ fontWeight: 700, color: '#f59e0b !important' }}
            />
          )}
          <Tab icon={<TrendingUpIcon />} label={isMobile ? 'Home' : 'Overview'} iconPosition={isMobile ? 'top' : 'start'} />
          <Tab icon={<TimerIcon />} label="Steps" iconPosition={isMobile ? 'top' : 'start'} />
          <Tab icon={<CalendarMonthIcon />} label={isMobile ? 'Cal' : 'Calendar'} iconPosition={isMobile ? 'top' : 'start'} />
          <Tab icon={<FitnessCenterIcon />} label={isMobile ? 'Logs' : 'History'} iconPosition={isMobile ? 'top' : 'start'} />
        </Tabs>
      </Box>

      {/* Tabs Content */}
      <Box>
        {/* Active Workout Content */}
        {currentWorkout && activeTab === 0 && (
          <Box sx={{ 
            p: 3, 
            pb: { xs: 12, sm: 3 }, // extra padding for fixed mobile action bar
            mb: 3, 
            bgcolor: '#111827', 
            borderRadius: 2,
            color: '#f9fafb',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#9ca3af' }}>
                  Active Workout
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 1,
                    transition: 'background-color 0.2s ease',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' }
                  }}
                  onClick={handleTimerClick}
                  title="Edit workout timer"
                >
                  <TimerIcon sx={{ color: '#f59e0b' }} />
                  <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {formatTime(elapsedTime)}
                  </Typography>
                </Box>
                <TextField
                  type="date"
                  size="small"
                  value={currentWorkout.date ? new Date(currentWorkout.date).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setCurrentWorkout(prev => ({ ...prev, date: newDate }));
                  }}
                  sx={{ 
                    mt: 1,
                    '& .MuiOutlinedInput-root': { 
                      color: '#9ca3af', 
                      fontSize: '0.75rem',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } 
                    } 
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setTemplateName(currentWorkout.name || '');
                    setSaveRoutineDialogOpen(true);
                  }}
                  fullWidth={isMobile}
                  sx={{ 
                    borderColor: 'rgba(255,255,255,0.3)', 
                    color: '#9ca3af', 
                    textTransform: 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      borderColor: 'rgba(255,255,255,0.6)',
                      color: '#ffffff',
                      bgcolor: 'rgba(255,255,255,0.05)'
                    },
                    '&:active': { opacity: 0.7 },
                    '&:focus': { outline: '2px solid #60a5fa', outlineOffset: 2 }
                  }}
                >
                  Save as Routine
                </Button>
                <Button
                  variant="outlined"
                  onClick={cancelWorkout}
                  fullWidth={isMobile}
                  sx={{ 
                    borderColor: 'rgba(255,255,255,0.3)', 
                    color: '#9ca3af',
                    textTransform: 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      borderColor: 'rgba(255,255,255,0.6)',
                      color: '#ffffff',
                      bgcolor: 'rgba(255,255,255,0.05)'
                    },
                    '&:active': { opacity: 0.7 },
                    '&:focus': { outline: '2px solid #60a5fa', outlineOffset: 2 }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleFinishWorkout}
                  fullWidth={isMobile}
                  sx={{ 
                    bgcolor: '#15803d',
                    textTransform: 'none',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      bgcolor: '#166534',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(21, 128, 61, 0.3)'
                    },
                    '&:active': { 
                      transform: 'translateY(0px)',
                      boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
                    },
                    '&:focus': { outline: '2px solid #3b82f6', outlineOffset: 2 }
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
                          bgcolor: EXERCISE_LIBRARY[exercise.muscleGroup]?.color || 'text.secondary',
                          color: '#ffffff',
                          fontWeight: 600,
                        }}
                      />
                      <Typography 
                        variant="subtitle1" 
                        sx={{ fontWeight: 600, cursor: 'pointer', color: '#3b82f6', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => navigate(`/exercise-history/${encodeURIComponent(exercise.name)}`)}
                        title="View exercise history"
                      >
                        {exercise.name}
                      </Typography>
                      <Chip 
                        label="PR WATCH" 
                        size="small" 
                        sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid #f59e0b', fontWeight: 700 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        size="small" 
                        onClick={() => navigate(`/exercise-history/${encodeURIComponent(exercise.name)}`)}
                        sx={{ textTransform: 'none', color: '#3b82f6', fontSize: '0.75rem' }}
                      >
                        History →
                      </Button>
                      <IconButton size="small" onClick={() => removeExercise(exIdx)} sx={{ color: '#ef4444' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>


                  {/* Sets — smart rendering based on exercise logType */}
                  {(() => {
                    // Look up exercise definition for logType
                    const allExercises = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises)
                    const exDef = allExercises.find(e => e.name.toLowerCase() === exercise.name.toLowerCase())
                    const isCardio = exDef?.logType === 'cardio'
                    const logFields = exDef?.logFields || []

                    if (isCardio && logFields.length > 0) {
                      // ── Cardio logging UI ──
                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {exercise.sets.map((set, setIdx) => (
                            <Box key={setIdx} sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.1)' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" sx={{ color: '#60a5fa', fontWeight: 700 }}>Session {setIdx + 1}</Typography>
                                <IconButton size="small" onClick={() => removeSet(exIdx, setIdx)} disabled={exercise.sets.length <= 1} sx={{ color: 'rgba(255,255,255,0.4)', p: 0.25 }}>
                                  <CloseIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Box>
                              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
                                {logFields.map(field => (
                                  <Box key={field.key}>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mb: 0.25, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      {field.label}{field.unit ? ` (${field.unit})` : ''}
                                    </Typography>
                                    <TextField
                                      size="small"
                                      type={field.inputType || 'number'}
                                      value={set[field.key] || ''}
                                      onChange={e => updateSet(exIdx, setIdx, field.key, e.target.value)}
                                      onFocus={(e) => e.target.select()}
                                      sx={{
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.1)', color: '#f9fafb', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } },
                                        '& input': { color: '#f9fafb', textAlign: 'center', py: 0.75 },
                                      }}
                                    />
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          ))}
                          <Button size="small" onClick={() => addSet(exIdx)} sx={{ color: '#60a5fa', textTransform: 'none', alignSelf: 'flex-start' }}>
                            + Add Session
                          </Button>
                        </Box>
                      )
                    }

                    // ── Standard weight + reps UI ──
                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '32px 1fr 1fr 64px', sm: '40px 1fr 1fr 80px' }, gap: 1, mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>Set</Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>Weight (kg)</Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>Reps</Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}></Typography>
                        </Box>
                        {exercise.sets.map((set, setIdx) => {
                          const prevSet = exerciseLastSets[exercise.name]?.[setIdx];
                          return (
                            <Box key={setIdx} sx={{ display: 'grid', gridTemplateColumns: { xs: '24px 1fr 1fr 76px', sm: '40px 1fr 1fr 80px' }, gap: 1, mb: 1, alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{setIdx + 1}</Typography>
                              <TextField size="small" type="number" value={set.weight || ''} placeholder={prevSet?.weight ? String(prevSet.weight) : ''} onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)} onFocus={(e) => e.target.select()}
                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.1)', color: '#f9fafb', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& input': { color: '#f9fafb', textAlign: 'center' }, '& input::placeholder': { color: '#9ca3af', opacity: 1 } }}
                              />
                              <TextField size="small" type="number" value={set.reps || ''} placeholder={prevSet?.reps ? String(prevSet.reps) : ''} onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)} onFocus={(e) => e.target.select()}
                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.1)', color: '#f9fafb', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& input': { color: '#f9fafb', textAlign: 'center' }, '& input::placeholder': { color: '#9ca3af', opacity: 1 } }}
                              />
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton size="small" onClick={() => { if (prevSet) { updateSet(exIdx, setIdx, 'weight', prevSet.weight); updateSet(exIdx, setIdx, 'reps', prevSet.reps); } }} disabled={!prevSet}
                                  sx={{ color: prevSet ? '#10b981' : 'rgba(255,255,255,0.3)', '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.1)' } }}>
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={() => removeSet(exIdx, setIdx)} disabled={exercise.sets.length <= 1} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          )
                        })}
                        <Button size="small" onClick={() => addSet(exIdx)} sx={{ color: '#60a5fa', textTransform: 'none', alignSelf: 'flex-start' }}>+ Add Set</Button>
                      </Box>
                    )
                  })()}
                </Box>
              ))}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setExerciseDialogOpen(true)}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  textTransform: 'none',
                  py: 1.5,
                  '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                Add Exercise
              </Button>
            </Box>
          </Box>
        )}

        {/* Overview Tab */}
        {activeTab === (currentWorkout ? 1 : 0) && (
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

            {/* Readiness */}
            <Box sx={{ gridColumn: { md: '1 / -1' } }}>
               {/* Readiness Content (already there in the file, I'll just keep it) */}
                <Box sx={{
                  p: 3, borderRadius: 2,
                  background: readiness
                    ? `linear-gradient(135deg, ${readiness.color}12 0%, #fff 60%)`
                    : 'background.paper',
                  border: `1px solid ${readiness ? readiness.color + '40' : 'divider'}`,
                  position: 'relative', overflow: 'hidden'
                }}>
                  {/* Background glow */}
                  {readiness && (
                    <Box sx={{
                      position: 'absolute', top: -40, right: -40,
                      width: 180, height: 180, borderRadius: '50%',
                      bgcolor: readiness.color, opacity: 0.06, pointerEvents: 'none'
                    }} />
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                    <WhatshotIcon sx={{ color: readiness?.color || '#f59e0b' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                      Today's Training Readiness
                    </Typography>
                    {readinessLoading && (
                      <Typography variant="caption" sx={{ color: '#94a3b8', ml: 'auto' }}>Calculating…</Typography>
                    )}
                  </Box>

                  {!readiness && !readinessLoading && (
                    <Typography variant="body2" sx={{ color: '#94a3b8', py: 2 }}>
                      Log your daily wellness check-in (sleep, energy, stress) for 3+ days to unlock your readiness score.
                    </Typography>
                  )}

                  {readiness && (
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      {/* Score ring */}
                      <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                        <Box sx={{
                          width: 120, height: 120, borderRadius: '50%', mx: 'auto',
                          border: `8px solid ${readiness.color}`,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          boxShadow: `0 0 24px ${readiness.color}40`
                        }}>
                          <Typography sx={{ fontSize: '2.2rem', fontWeight: 900, color: readiness.color, lineHeight: 1 }}>
                            {readiness.readinessScore}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>/10</Typography>
                        </Box>
                        <Box sx={{
                          mt: 1.5, px: 2, py: 0.5, borderRadius: 2,
                          bgcolor: readiness.color, display: 'inline-block'
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'background.paper', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                            {readiness.status === 'push_hard' ? '🔥 Push Hard'
                              : readiness.status === 'train_normal' ? '💪 Train Normal'
                              : readiness.status === 'train_light' ? '🔄 Train Light'
                              : '😴 Rest Day'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Recommendation + Components */}
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.7, mb: 2, fontSize: '0.95rem' }}>
                          {readiness.recommendation}
                        </Typography>

                        {/* Component scores */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                          {[
                            { label: 'Sleep', score: readiness.components.sleep.score, detail: `${readiness.components.sleep.avgHours}h (${readiness.components.sleep.quality}/10 qual)`, emoji: '😴' },
                            { label: 'RHR', score: readiness.components.rhr.score, detail: `${readiness.components.rhr.avgRhr} bpm`, emoji: '🫀' },
                            { label: 'Energy', score: readiness.components.energy.score, detail: `${readiness.components.energy.avgRating}/10`, emoji: '⚡' },
                            { label: 'Stress', score: readiness.components.stress.score, detail: `${readiness.components.stress.avgRating}/10 stress`, emoji: '🧘' },
                            { label: 'Load', score: readiness.components.trainingLoad.score, detail: `${Math.round(readiness.components.trainingLoad.volumeRatio * 100)}% base${readiness.components.trainingLoad.daysSinceRestDay > 3 ? ` (${readiness.components.trainingLoad.daysSinceRestDay}d no rest)` : ''}`, emoji: '🏋️' },
                          ].map(comp => {
                            const pct = (comp.score / 10) * 100
                            const c = comp.score >= 7 ? '#22c55e' : comp.score >= 5 ? '#f59e0b' : '#ef4444'
                            return (
                              <Box key={comp.label} sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
                                    {comp.emoji} {comp.label}
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 800, color: c }}>{comp.score}/10</Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate" value={pct}
                                  sx={{ height: 4, borderRadius: 2, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: c, borderRadius: 2 } }}
                                />
                                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>{comp.detail}</Typography>
                              </Box>
                            )
                          })}
                        </Box>
                      </Box>

                      {/* Overtraining risk */}
                      {readiness.overtraining.risk !== 'low' && (
                        <Box sx={{
                          p: 2, borderRadius: 2, minWidth: 200, flex: 1,
                          bgcolor: readiness.overtraining.risk === 'high' ? '#fef2f2' : '#fffbeb',
                          border: `1px solid ${readiness.overtraining.risk === 'high' ? '#fca5a5' : '#fde68a'}`
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <WarningAmberIcon sx={{ fontSize: 18, color: readiness.overtraining.risk === 'high' ? '#ef4444' : '#f59e0b' }} />
                            <Typography variant="caption" sx={{ fontWeight: 800, color: readiness.overtraining.risk === 'high' ? '#991b1b' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {readiness.overtraining.risk === 'high' ? 'Overtraining Risk: HIGH' : 'Overtraining Risk: Moderate'}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.6, display: 'block' }}>
                            {readiness.overtraining.detail}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Stagnation Alerts */}
                  {readiness?.stagnationAlerts?.length > 0 && (
                    <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid #e2e8f0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <TrendingUpIcon sx={{ color: '#7c3aed', fontSize: 20 }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Stagnation Detected — {readiness.stagnationAlerts.length} exercise{readiness.stagnationAlerts.length > 1 ? 's' : ''} plateaued
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {readiness.stagnationAlerts.map((alert, i) => (
                          <Box key={i} sx={{
                            p: 2, bgcolor: '#faf5ff', borderRadius: 1.5,
                            borderLeft: '4px solid #7c3aed', display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap'
                          }}>
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: '#3b0764', display: 'block' }}>
                                {alert.exercise}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#6b21a8' }}>
                                No progress in {alert.sessionsStagnated} sessions — best: {alert.currentBest}kg
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.6, maxWidth: 300 }}>
                              💡 {alert.suggestion}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>

              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {isMobile ? 'Advanced analytics are available below when needed.' : 'Advanced analytics are shown below.'}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setShowAdvancedOverview(v => !v)}
                    sx={{ 
                      textTransform: 'none',
                      transition: 'all 0.2s ease',
                      borderColor: 'divider',
                      color: 'text.secondary',
                      '&:hover': { 
                        borderColor: 'text.primary',
                        color: 'text.primary',
                        bgcolor: 'action.hover',
                        transform: 'translateY(-1px)'
                      },
                      '&:active': { 
                        transform: 'translateY(0px)',
                        opacity: 0.85
                      },
                      '&:focus': { outline: '2px solid #3b82f6', outlineOffset: 2 }
                    }}
                  >
                    {showAdvancedOverview ? 'Hide Advanced' : 'Show Advanced'}
                  </Button>
                </Box>
              </Box>

              {/* Performance Charts */}
              {(!isMobile || showAdvancedOverview) && (
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <BarChartIcon sx={{ color: '#8b5cf6' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary' }}>
                      Volume & Intensity Trends
                    </Typography>
                  </Box>
                  
                  <Box sx={{ height: { xs: 220, md: 300 }, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={volumeChartData}>
                        <defs>
                          <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: theme.palette.text.secondary }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                          tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '8px', 
                            border: 'none', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            backgroundColor: theme.palette.background.paper,
                            color: theme.palette.text.primary
                          }}
                          itemStyle={{ color: theme.palette.text.primary }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="volume" 
                          stroke="#8b5cf6" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorVol)" 
                          name="Volume (kg)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              </Box>
              )}

              {/* Exercise Specific Progression */}
              {(!isMobile || showAdvancedOverview) && (
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AutoGraphIcon sx={{ color: '#ec4899' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                        Exercise Progression
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Select
                        size="small"
                        value={selectedAnalysisExercise}
                        onChange={(e) => setSelectedAnalysisExercise(e.target.value)}
                        sx={{ minWidth: 200, height: 32, fontSize: '0.8rem' }}
                      >
                        {allExerciseNames.map(name => (
                          <MenuItem key={name} value={name}>{name}</MenuItem>
                        ))}
                      </Select>
                      <Select
                        size="small"
                        value={analysisChartMode}
                        onChange={(e) => setAnalysisChartMode(e.target.value)}
                        sx={{ height: 32, fontSize: '0.8rem' }}
                      >
                        <MenuItem value="1rm">Est. 1RM</MenuItem>
                        <MenuItem value="weight">Max Weight</MenuItem>
                      </Select>
                    </Box>
                  </Box>

                  {exerciseProgressionData.length > 1 ? (
                    <Box sx={{ height: { xs: 220, md: 300 }, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={exerciseProgressionData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#94a3b8' }} 
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            unit="kg"
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey={analysisChartMode === '1rm' ? 'oneRepMax' : 'weight'} 
                            stroke="#ec4899" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: 'background.paper' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            name={analysisChartMode === '1rm' ? 'Est. 1RM' : 'Max Weight'}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                        Need at least 2 sessions with this exercise to show a trend.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              )}

              {/* Training Insights - Advanced Analysis */}
              {(!isMobile || showAdvancedOverview) && (
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
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
                        let bgColor = 'background.default';
                        
                        if (insight.title.includes('Progression')) { Icon = TimelineIcon; color = '#10b981'; bgColor = '#ecfdf5'; }
                        else if (insight.title.includes('Plateau')) { Icon = WarningAmberIcon; color = '#f59e0b'; bgColor = '#fffbeb'; }
                        else if (insight.title.includes('Load') || insight.title.includes('Volume')) { Icon = FitnessCenterIcon; color = '#3b82f6'; bgColor = '#eff6ff'; }
                        else if (insight.title.includes('Consistency') || insight.title.includes('Streak') || insight.title.includes('Balance')) { Icon = TrendingUpIcon; color = '#8b5cf6'; bgColor = '#f5f3ff'; }
                        else if (insight.title.includes('Best') || insight.title.includes('PR')) { Icon = EmojiEventsIcon; color = '#eab308'; bgColor = '#fefce8'; }
                        else if (insight.title.includes('Muscle')) { Icon = InsightsIcon; color = '#0ea5e9'; bgColor = '#f0f9ff'; }

                        return (
                          <Box key={idx} sx={{ 
                            p: 2.5, 
                            bgcolor: 'background.paper', 
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
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
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
              )}

              {/* AI Suggestions */}
              {(!isMobile || showAdvancedOverview) && (
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    AI Suggestions
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
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
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                            Today’s Workout
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.secondary', lineHeight: 1.7 }}>
                            {aiWorkoutSuggestion}
                          </Typography>
                        </Box>
                      ) : null}

                      {aiRecoverySuggestion ? (
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                            Recovery + Adjustment
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.secondary', lineHeight: 1.7 }}>
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
              )}

              {/* Life Sync: Cross-Domain Correlation */}
              {(!isMobile || showAdvancedOverview) && (
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 3, bgcolor: '#0f172a', borderRadius: 2, border: '1px solid rgba(56, 189, 248, 0.2)', color: 'background.paper' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <InsightsIcon sx={{ color: '#38bdf8' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#38bdf8' }}>
                      Correlation Center: Fuel vs. Output
                    </Typography>
                  </Box>
                  
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 3 }}>
                    This chart connects your vertical health slices. See how your nutrition (Protein/Calories) directly impacts your gym performance over the last 14 days.
                  </Typography>

                  <Box sx={{ height: { xs: 220, md: 300 }, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={correlationChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#64748b' }} 
                          tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ bgcolor: '#1e293b', border: 'none', borderRadius: '8px', color: 'background.paper' }}
                        />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="volume" 
                          stroke="#38bdf8" 
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Workout Volume (kg)"
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="protein" 
                          stroke="#f472b6" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 3 }}
                          name="Protein Intake (g)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              </Box>
              )}

              {/* Life Sync: Deep Correlation Insights */}
              {(!isMobile || showAdvancedOverview) && correlatedInsights.length > 0 && (
                <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                  <Box sx={{ p: 3, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #ffedd5' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <AutoGraphIcon sx={{ color: '#ea580c' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#9a3412' }}>
                        Deep Sync: Clinical Pattern Analysis
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {correlatedInsights.map((insight, idx) => (
                        <Box key={idx} sx={{ 
                          p: 3, 
                          bgcolor: 'background.paper', 
                          borderRadius: 2, 
                          borderLeft: `6px solid ${insight.impact === 'high' ? '#ef4444' : '#f97316'}`,
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', mb: 1 }}>
                            {insight.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, mb: 2 }}>
                            {insight.detail}
                          </Typography>
                          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px dashed #e2e8f0' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                              Recommended Action
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                              {insight.action}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Monthly Muscle Heatmap */}
              {(!isMobile || showAdvancedOverview) && (
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Muscle Heatmap (30 days)
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Based on logged sets
                    </Typography>
                  </Box>

                  {muscleHeatmap && muscleHeatmap.scoredSets > 0 ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr' }, gap: 2 }}>
                      <Box>
                        <MuscleHeatmapFigure intensityByRegion={muscleHeatmap.normalized} />
                      </Box>
                      {/* === TEMPORARILY DISABLED 3D MODEL === 
                      <GlbModelViewer
                        src={DEFAULT_BODY_MODEL_GLB_URL}
                        intensityByRegion={muscleHeatmap.normalized}
                        height={420}
                        title="Body Model"
                        subtitle="Use this as a base for muscle visualization"
                      />
                      */}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      Log a few workouts with named exercises to see this.
                    </Typography>
                  )}
                </Box>
              </Box>
              )}

              {/* Weekly Hypertrophy Volume (Hard Sets) */}
              {(!isMobile || showAdvancedOverview) && (
              <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
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
                    const count = muscleDistribution[key] || 0
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
              )}

              {/* Recent Workouts Preview */}
              {(!isMobile || showAdvancedOverview) && (
              <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
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
                            bgcolor: 'action.hover',
                            borderRadius: 1.5,
                          }}
                        >
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {workout.name || 'Workout'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
                                  bgcolor: EXERCISE_LIBRARY[muscle]?.color || 'text.secondary',
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
              )}
            </Box>
          )}

          {/* Steps Tab */}
          {activeTab === (currentWorkout ? 2 : 1) && (
            <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Daily steps
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
                  onFocus={(e) => e.target.select()}
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
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                        {fmt(start)} – {fmt(end)}
                      </Typography>
                      <Box sx={{ width: '100%' }}>
                        <Box component="svg" viewBox="0 0 560 200" role="img" aria-label="Steps chart" sx={{ width: '100%', maxWidth: 560, height: 'auto' }}>
                            <rect x="0" y="0" width="560" height="200" fill='background.paper' />

                            {/* axes */}
                            <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke='divider' strokeWidth="1" />
                            <line x1={d.x0} y1={d.y0} x2={d.x0} y2={d.y1} stroke='divider' strokeWidth="1" />

                            {/* y grid */}
                            <line x1={d.x0} y1={d.y0} x2={d.x1} y2={d.y0} stroke='action.selected' strokeWidth="1" />
                            <line
                              x1={d.x0}
                              y1={(d.y0 + d.y1) / 2}
                              x2={d.x1}
                              y2={(d.y0 + d.y1) / 2}
                              stroke='action.selected'
                              strokeWidth="1"
                            />
                            <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke='action.selected' strokeWidth="1" />

                            {/* y labels */}
                            <text x={d.x0 - 8} y={d.y0 + 3} fontSize="10" fill='text.secondary' textAnchor="end">
                              {fmtSteps(yMax)}
                            </text>
                            <text x={d.x0 - 8} y={(d.y0 + d.y1) / 2 + 3} fontSize="10" fill="#9ca3af" textAnchor="end">
                              {fmtSteps(yMid)}
                            </text>
                            <text x={d.x0 - 8} y={d.y1 + 3} fontSize="10" fill='text.secondary' textAnchor="end">
                              {fmtSteps(yMin)}
                            </text>

                            {/* axis titles */}
                            <text x={(d.x0 + d.x1) / 2} y={200 - 8} fontSize="10" fill='text.secondary' textAnchor="middle">
                              Date
                            </text>
                            <text
                              x="16"
                              y={(d.y0 + d.y1) / 2}
                              fontSize="10"
                              fill='text.secondary'
                              textAnchor="middle"
                              transform={`rotate(-90 16 ${(d.y0 + d.y1) / 2})`}
                            >
                              Steps
                            </text>

                            {/* line */}
                            <polyline fill="none" stroke='text.primary' strokeWidth="2" points={chart.points} />

                            {/* points */}
                            {chart.points
                              .split(' ')
                              .filter(Boolean)
                              .map((p, i) => {
                                const [x, y] = p.split(',').map(Number)
                                return <circle key={i} cx={x} cy={y} r={3} fill='text.primary' />
                              })}
                        </Box>
                      </Box>
                    </Box>
                  )
                })()
              )}
            </Box>
          )}

          {/* Calendar Tab */}
          {activeTab === (currentWorkout ? 3 : 2) && (
            <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              {calendarLoading && <LinearProgress sx={{ mb: 2 }} />}
              <Calendar 
                events={calendarEvents} 
                compact={isMobile} 
                onMonthChange={loadCalendarRange} 
                onEventClick={(event) => {
                  if (event.original) {
                    editWorkout(event.original);
                  }
                }}
              />
            </Box>
          )}

          {/* History Tab */}
          {activeTab === (currentWorkout ? 4 : 3) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {workouts.length > 0 ? (
                workouts.map((workout, idx) => (
                  <Box
                    key={idx}
                    onClick={() => handleWorkoutClick(workout)}
                    sx={{
                      p: { xs: 2, sm: 3 },
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'text.primary', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {workout.name || 'Workout'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {new Date(workout.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                          })} • {Math.round((workout.duration || 0) / 60)} min
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                        <IconButton 
                          size="small" 
                          onClick={(e) => editWorkout(workout, e)}
                          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'rgba(0,0,0,0.04)' } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={(e) => deleteWorkout(workout._id, e)}
                          sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                      {[...new Set(workout.exercises?.map(e => e.muscleGroup) || [])].map((muscle, i) => (
                          <Chip
                            key={i}
                            label={EXERCISE_LIBRARY[muscle]?.label || muscle}
                            size="small"
                            sx={{
                              bgcolor: EXERCISE_LIBRARY[muscle]?.color || 'text.secondary',
                              color: 'background.paper',
                              fontWeight: 500,
                              fontSize: '0.7rem',
                            }}
                          />
                        ))}
                      </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {workout.exercises?.map((ex, i) => {
                        const allExercises = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises);
                        const exDef = allExercises.find(e => e.name === ex.name);
                        const isCardio = exDef?.logType === 'cardio';

                        return (
                          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f3f4f6' }}>
                            <Typography variant="body2">{ex.name}</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {ex.sets?.map(s => {
                                if (isCardio) {
                                  return `${s.duration || 0}m` + (s.distance ? ` (${s.distance}km)` : '');
                                }
                                return `${s.weight}kg × ${s.reps}`;
                              }).join(', ')}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <FitnessCenterIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    No workouts logged yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Start your first workout to see your history
                  </Typography>
                </Box>
              )}
            </Box>
          )}
      </Box>

      {currentWorkout && isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            right: 16,
            zIndex: 50,
            p: 1.5,
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            bgcolor: 'rgba(17, 17, 17, 0.95)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            gap: 1.5,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setExerciseDialogOpen(true)}
            fullWidth
            sx={{ borderColor: 'rgba(255,255,255,0.35)', color: '#ffffff', textTransform: 'none' }}
          >
            Add Exercise
          </Button>
          <Button
            variant="contained"
            onClick={handleFinishWorkout}
            fullWidth
            sx={{ bgcolor: '#15803d', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#166534' } }}
          >
            Finish
          </Button>
        </Box>
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
                      <MenuItem key={ex.name} value={ex.name}>{ex.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
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
            sx={{ bgcolor: 'text.primary', '&:hover': { bgcolor: 'text.secondary' } }}
          >
            Add Exercise
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Timer Dialog */}
      <Dialog open={editTimerOpen} onClose={() => setEditTimerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Workout Time</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 1, justifyContent: 'center' }}>
            <TextField
              label="Hours"
              type="number"
              value={editTimerHours}
              onChange={(e) => {
                const val = e.target.value.replace(/^0+/, '')
                setEditTimerHours(val === '' ? 0 : parseInt(val))
              }}
              onFocus={(e) => e.target.select()}
              inputProps={{ min: 0 }}
              sx={{ width: '80px' }}
            />
            <TextField
              label="Minutes"
              type="number"
              value={editTimerMinutes}
              onChange={(e) => {
                const val = e.target.value.replace(/^0+/, '')
                setEditTimerMinutes(val === '' ? 0 : Math.min(59, parseInt(val)))
              }}
              onFocus={(e) => e.target.select()}
              inputProps={{ min: 0, max: 59 }}
              sx={{ width: '80px' }}
            />
            <TextField
              label="Seconds"
              type="number"
              value={editTimerSeconds}
              onChange={(e) => {
                const val = e.target.value.replace(/^0+/, '')
                setEditTimerSeconds(val === '' ? 0 : Math.min(59, parseInt(val)))
              }}
              onFocus={(e) => e.target.select()}
              inputProps={{ min: 0, max: 59 }}
              sx={{ width: '80px' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTimerOpen(false)}>Cancel</Button>
          <Button onClick={handleTimerSave} variant="contained" sx={{ bgcolor: 'text.primary', '&:hover': { bgcolor: 'text.secondary' } }}>
            Save Time
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Routine Dialog */}
      <Dialog open={saveRoutineDialogOpen} onClose={() => setSaveRoutineDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Save Routine</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, pt: 1 }}>
            <TextField
              fullWidth
              label="Routine Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Pull Day, Legs Focused..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && templateName.trim()) {
                  saveCurrentAsTemplate(templateName.trim())
                  setSaveRoutineDialogOpen(false)
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setSaveRoutineDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (templateName.trim()) {
                saveCurrentAsTemplate(templateName.trim())
                setSaveRoutineDialogOpen(false)
              }
            }}
            sx={{ bgcolor: 'text.primary', '&:hover': { bgcolor: 'text.secondary' } }}
            disabled={!templateName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Workout Details Dialog */}
      <Dialog open={workoutDialogOpen} onClose={() => setWorkoutDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {selectedWorkout?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {selectedWorkout?.date && new Date(selectedWorkout.date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setWorkoutDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedWorkout && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Workout Stats */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<TimerIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${Math.round((selectedWorkout.duration || 0) / 60)} min`}
                  size="small"
                  sx={{ height: 24, fontSize: '0.75rem', bgcolor: 'action.selected' }}
                />
                <Chip
                  icon={<FitnessCenterIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${(selectedWorkout.exercises?.reduce((sum, ex) => sum + (ex.sets?.reduce((s, set) => s + (set.reps * set.weight), 0) || 0), 0) / 1000).toFixed(1)}k kg`}
                  size="small"
                  sx={{ height: 24, fontSize: '0.75rem', bgcolor: '#f0fdf4', color: '#166534' }}
                />
                <Chip
                  label={`${selectedWorkout.exercises?.length || 0} exercises`}
                  size="small"
                  sx={{ height: 24, fontSize: '0.75rem', bgcolor: '#eff6ff', color: '#1e40af' }}
                />
              </Box>

              {/* Exercises Details */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedWorkout.exercises?.map((ex, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 2,
                      bgcolor: 'action.hover',
                      borderRadius: 1.5,
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {ex.name}
                      </Typography>
                      <Chip
                        label={ex.muscleGroup}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: EXERCISE_LIBRARY[ex.muscleGroup]?.color || 'divider',
                          color: 'background.paper'
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
                      {ex.sets?.map((set, setIdx) => (
                        <Box
                          key={setIdx}
                          sx={{
                            p: 1,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: '1px solid #e5e7eb',
                            textAlign: 'center'
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            Set {setIdx + 1}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {(() => {
                              const allExercises = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises);
                              const exDef = allExercises.find(e => e.name === ex.name);
                              if (exDef?.logType === 'cardio') {
                                return `${set.duration || 0}m` + (set.distance ? ` @ ${set.distance}km` : '');
                              }
                              return `${set.weight}kg × ${set.reps}`;
                            })()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Notes */}
              {selectedWorkout.notes && (
                <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 1.5, border: '1px solid #fcd34d' }}>
                  <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Notes
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#78350f' }}>
                    {selectedWorkout.notes}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
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
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        textAlign: 'center',
      }}
    >
      <Box sx={{ color, mb: 1 }}>{icon}</Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {value}
        {sublabel && (
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary', ml: 0.5 }}>
            {sublabel}
          </Typography>
        )}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
    </Box>
  )
}

export default GymTracker

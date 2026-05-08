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
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'
import HistoryIcon from '@mui/icons-material/History'
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
import RestTimer from './RestTimer'
import PlateCalculator from './PlateCalculator'
import LastSetsReference from './LastSetsReference'
import StatCard from './gym/StatCard';
import ActiveWorkoutView from './gym/ActiveWorkoutView';
import OverviewTab from './gym/OverviewTab';
import StepsTab from './gym/StepsTab';
import CalendarTab from './gym/CalendarTab';
import HistoryTab from './gym/HistoryTab';
import WorkoutDialogs from './gym/WorkoutDialogs';
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary'

const EXERCISE_HISTORY_LIMIT = 50

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
    setElapsedTime,
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
    setCorrelationLoading(true)
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
    } finally {
      setCorrelationLoading(false)
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
      ; (series || []).forEach((d) => {
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

  const startWorkout = (tpl) => {
    startWorkout({
      name: tpl.name,
      exercises: tpl.exercises.map(ex => ({
        ...ex,
        sets: ex.sets?.map(s => ({ ...s })) || [{ reps: 0, weight: 0, rpe: 8 }]
      })),
      date: new Date().toISOString().split('T')[0],
    })
    setActiveTab(4)
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

      const lastSet = exercise.sets?.slice(-1)[0]
      updated.exercises[exerciseIdx].sets = [...(exercise.sets || []), lastSet ? { ...lastSet } : newSet]
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
      exercises: workout.exercises?.map(ex => ({
        ...ex,
        sets: ex.sets?.map(s => ({ ...s }))
      })) || []
    })
    setWorkoutStartTime(Date.now() - (workout.duration || 0) * 1000)
    setActiveTab(4) // Switch to active workout tab
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
              onClick={() => startWorkout({ name: 'New Workout', exercises: [] })}
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

      <WorkoutDialogs
        templateDialogOpen={templateDialogOpen}
        setTemplateDialogOpen={setTemplateDialogOpen}
        templates={templates}
        useTemplate={startWorkout}
        deleteTemplate={deleteTemplate}
        saveRoutineDialogOpen={saveRoutineDialogOpen}
        setSaveRoutineDialogOpen={setSaveRoutineDialogOpen}
        templateName={templateName}
        setTemplateName={setTemplateName}
        saveCurrentAsTemplate={saveCurrentAsTemplate}
        workoutDialogOpen={workoutDialogOpen}
        setWorkoutDialogOpen={setWorkoutDialogOpen}
        selectedWorkout={selectedWorkout}
        EXERCISE_LIBRARY={EXERCISE_LIBRARY}
        editTimerOpen={editTimerOpen}
        setEditTimerOpen={setEditTimerOpen}
        editTimerHours={editTimerHours}
        setEditTimerHours={setEditTimerHours}
        editTimerMinutes={editTimerMinutes}
        setEditTimerMinutes={setEditTimerMinutes}
        editTimerSeconds={editTimerSeconds}
        setEditTimerSeconds={setEditTimerSeconds}
        handleTimerSave={handleTimerSave}
        exerciseDialogOpen={exerciseDialogOpen}
        setExerciseDialogOpen={setExerciseDialogOpen}
        selectedMuscle={selectedMuscle}
        setSelectedMuscle={setSelectedMuscle}
        selectedExercise={selectedExercise}
        setSelectedExercise={setSelectedExercise}
        customExercise={customExercise}
        setCustomExercise={setCustomExercise}
        addExercise={addExercise}
      />

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
          <Tab icon={<TrendingUpIcon />} label={isMobile ? 'Home' : 'Overview'} iconPosition={isMobile ? 'top' : 'start'} />
          <Tab icon={<DirectionsRunIcon />} label={isMobile ? 'Steps' : 'Daily Steps'} iconPosition={isMobile ? 'top' : 'start'} />
          <Tab icon={<CalendarMonthIcon />} label={isMobile ? 'Cal' : 'Calendar'} iconPosition={isMobile ? 'top' : 'start'} />
          <Tab icon={<HistoryIcon />} label={isMobile ? 'Logs' : 'History'} iconPosition={isMobile ? 'top' : 'start'} />
          {currentWorkout && (
            <Tab
              icon={<FitnessCenterIcon sx={{ color: '#f59e0b' }} />}
              label="Active Session"
              iconPosition={isMobile ? 'top' : 'start'}
              sx={{ fontWeight: 700, color: '#f59e0b !important' }}
            />
          )}
        </Tabs>
      </Box>

      {/* Tabs Content */}
      <Box>
        {/* Overview Tab */}
        {activeTab === 0 && (
          <OverviewTab
            stats={stats}
            readiness={readiness}
            readinessLoading={readinessLoading}
            showAdvancedOverview={showAdvancedOverview}
            setShowAdvancedOverview={setShowAdvancedOverview}
            volumeChartData={volumeChartData}
            selectedAnalysisExercise={selectedAnalysisExercise}
            setSelectedAnalysisExercise={setSelectedAnalysisExercise}
            allExerciseNames={allExerciseNames}
            analysisChartMode={analysisChartMode}
            setAnalysisChartMode={setAnalysisChartMode}
            exerciseProgressionData={exerciseProgressionData}
            trainingInsights={trainingInsights}
            generateAiWorkoutSuggestion={generateAiWorkoutSuggestion}
            aiWorkoutSuggestionLoading={aiWorkoutSuggestionLoading}
            aiWorkoutSuggestion={aiWorkoutSuggestion}
            generateAiRecoverySuggestion={generateAiRecoverySuggestion}
            aiRecoverySuggestionLoading={aiRecoverySuggestionLoading}
            aiRecoverySuggestion={aiRecoverySuggestion}
            correlationChartData={correlationChartData}
            correlatedInsights={correlatedInsights}
            loadCorrelatedInsights={loadCorrelatedInsights}
            correlationLoading={correlationLoading}
            muscleHeatmap={muscleHeatmap}
            muscleDistribution={muscleDistribution}
            workouts={workouts}
            isMobile={isMobile}
            EXERCISE_LIBRARY={EXERCISE_LIBRARY}
          />
        )}

        {/* Steps Tab */}
        {activeTab === 1 && (
          <StepsTab
            stepsRangeMode={stepsRangeMode}
            setStepsRangeMode={setStepsRangeMode}
            stepsDate={stepsDate}
            setStepsDate={setStepsDate}
            stepsValue={stepsValue}
            setStepsValue={setStepsValue}
            saveSteps={saveSteps}
            stepsSaving={stepsSaving}
            stepsLoading={stepsLoading}
            stepsError={stepsError}
            stepsSeries={stepsSeries}
            buildStepsChart={buildStepsChart}
            isMobile={isMobile}
          />
        )}

        {/* Calendar Tab */}
        {activeTab === 2 && (
          <CalendarTab
            calendarLoading={calendarLoading}
            calendarEvents={calendarEvents}
            isMobile={isMobile}
            loadCalendarRange={loadCalendarRange}
            editWorkout={editWorkout}
          />
        )}

        {/* History Tab */}
        {activeTab === 3 && (
          <HistoryTab
            workouts={workouts}
            handleWorkoutClick={handleWorkoutClick}
            editWorkout={editWorkout}
            deleteWorkout={deleteWorkout}
            EXERCISE_LIBRARY={EXERCISE_LIBRARY}
          />
        )}

        {/* Active Workout Content */}
        {currentWorkout && activeTab === 4 && (
          <ActiveWorkoutView
            currentWorkout={currentWorkout}
            elapsedTime={elapsedTime}
            formatTime={formatTime}
            handleTimerClick={handleTimerClick}
            templateName={templateName}
            setTemplateName={setTemplateName}
            setSaveRoutineDialogOpen={setSaveRoutineDialogOpen}
            cancelWorkout={cancelWorkout}
            handleFinishWorkout={handleFinishWorkout}
            removeExercise={removeExercise}
            removeSet={removeSet}
            updateSet={updateSet}
            addSet={addSet}
            setExerciseDialogOpen={setExerciseDialogOpen}
            exerciseLastSets={exerciseLastSets}
            navigate={navigate}
            isMobile={isMobile}
            EXERCISE_LIBRARY={EXERCISE_LIBRARY}
          />
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



export default GymTracker

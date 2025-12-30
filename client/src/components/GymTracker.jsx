import { useState, useEffect } from 'react'
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
  
  // Current workout state
  const [currentWorkout, setCurrentWorkout] = useState(null)
  const [workoutStartTime, setWorkoutStartTime] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  
  // Dialog states
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false)
  const [selectedMuscle, setSelectedMuscle] = useState('')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [customExercise, setCustomExercise] = useState('')
  
  // Stats
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalVolume: 0,
    muscleDistribution: {},
    weeklyWorkouts: 0,
    currentStreak: 0,
  })

  useEffect(() => {
    loadWorkouts()
  }, [token])

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

  const loadCalendarRange = async (monthDate) => {
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
  }

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
      if (new Date(w.date) > weekAgo) weeklyCount++
      
      w.exercises?.forEach(ex => {
        // Count muscle groups
        const muscle = ex.muscleGroup || 'other'
        muscleCount[muscle] = (muscleCount[muscle] || 0) + 1
        
        // Calculate volume (sets * reps * weight)
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
      sets: [{ reps: 0, weight: 0 }],
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
      return updated
    })
  }

  const addSet = (exerciseIdx) => {
    setCurrentWorkout(prev => {
      const updated = { ...prev }
      updated.exercises = [...prev.exercises]
      updated.exercises[exerciseIdx] = { ...updated.exercises[exerciseIdx] }
      const lastSet = updated.exercises[exerciseIdx].sets.slice(-1)[0] || { reps: 0, weight: 0 }
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
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={cancelWorkout}
                sx={{ 
                  borderColor: '#6b7280', 
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
                  </Box>
                  <IconButton size="small" onClick={() => removeExercise(exIdx)} sx={{ color: '#ef4444' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Sets */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: 1, mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>Set</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>Weight (kg)</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>Reps</Typography>
                    <Box />
                  </Box>
                  {exercise.sets.map((set, setIdx) => (
                    <Box key={setIdx} sx={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: 1, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                        {setIdx + 1}
                      </Typography>
                      <TextField
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
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
              <Tab icon={<CalendarMonthIcon />} label="Calendar" iconPosition="start" />
              <Tab icon={<FitnessCenterIcon />} label="History" iconPosition="start" />
            </Tabs>
          </Box>

          {/* Overview Tab */}
          {activeTab === 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {/* Stats Cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
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

              {/* Muscle Distribution */}
              <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Muscle Distribution
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {Object.entries(EXERCISE_LIBRARY).map(([key, data]) => {
                    const count = stats.muscleDistribution[key] || 0
                    const percentage = (count / muscleTotal) * 100
                    return (
                      <Box key={key}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {data.label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            {count} exercises
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: '#f3f4f6',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: data.color,
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                    )
                  })}
                </Box>
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

          {/* Calendar Tab */}
          {activeTab === 1 && (
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              {calendarLoading && <LinearProgress sx={{ mb: 2 }} />}
              <Calendar events={calendarEvents} onMonthChange={loadCalendarRange} />
            </Box>
          )}

          {/* History Tab */}
          {activeTab === 2 && (
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

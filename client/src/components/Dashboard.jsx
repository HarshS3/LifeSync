import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Slider from '@mui/material/Slider'
import CircularProgress from '@mui/material/CircularProgress'
import BoltIcon from '@mui/icons-material/Bolt'
import MoodIcon from '@mui/icons-material/Mood'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import TimelineIcon from '@mui/icons-material/Timeline'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [todayState, setTodayState] = useState({
    energy: 5,
    mood: 5,
    bodyFeel: 5,
    sleep: 7,
  })
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [insight, setInsight] = useState(null)
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [recentLogs, setRecentLogs] = useState({ fitness: [], mental: [], nutrition: [] })
  const [weeklyStats, setWeeklyStats] = useState({
    avgEnergy: 0,
    avgMood: 0,
    avgSleep: 0,
    workouts: 0,
    streak: 0,
  })
  const [patterns, setPatterns] = useState([])
  const [timeline, setTimeline] = useState([])

  useEffect(() => {
    loadData()
  }, [token])

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch recent logs
      const [fitness, mental, nutrition] = await Promise.all([
        fetchJson('/api/logs/fitness'),
        fetchJson('/api/logs/mental'),
        fetchJson('/api/logs/nutrition'),
      ])
      
      setRecentLogs({ fitness, mental, nutrition })
      
      // Calculate weekly stats
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const recentMental = mental.filter(m => new Date(m.date) > weekAgo)
      const recentFitness = fitness.filter(f => new Date(f.date) > weekAgo)
      
      setWeeklyStats({
        avgEnergy: recentMental.length ? Math.round(recentMental.reduce((s, m) => s + (m.energyLevel || 0), 0) / recentMental.length) : 0,
        avgMood: recentMental.length ? Math.round(recentMental.reduce((s, m) => s + (m.moodScore || 0), 0) / recentMental.length) : 0,
        avgSleep: recentMental.length ? (recentMental.reduce((s, m) => s + (m.sleepHours || 0), 0) / recentMental.length).toFixed(1) : 0,
        workouts: recentFitness.length,
        streak: calculateStreak(mental),
      })

      // Build timeline events
      const timelineEvents = buildTimeline(fitness, mental, nutrition)
      setTimeline(timelineEvents)

      // Detect patterns from data
      const detectedPatterns = detectPatterns(mental, fitness, nutrition)
      setPatterns(detectedPatterns)

      // Check if already checked in today
      const today = new Date().toDateString()
      const todayLog = mental.find(m => new Date(m.date).toDateString() === today)
      if (todayLog) {
        setHasCheckedIn(true)
        setTodayState({
          energy: todayLog.energyLevel || 5,
          mood: todayLog.moodScore || 5,
          bodyFeel: todayLog.bodyFeel || 5,
          sleep: todayLog.sleepHours || 7,
        })
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    }
    setLoading(false)
  }

  const fetchJson = async (url) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }

  const calculateStreak = (logs) => {
    if (!logs.length) return 0
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const hasLog = logs.some(l => new Date(l.date).toDateString() === checkDate.toDateString())
      if (hasLog) streak++
      else if (i > 0) break
    }
    return streak
  }

  // Build timeline with connected events
  const buildTimeline = (fitness, mental, nutrition) => {
    const events = []
    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)

    mental.forEach(m => {
      if (new Date(m.date) > last7Days) {
        events.push({
          date: new Date(m.date),
          type: 'mental',
          icon: '🧠',
          title: `Mood ${m.moodScore || 5}/10`,
          detail: `Energy ${m.energyLevel || 5}/10, Sleep ${m.sleepHours || 0}h`,
          values: { mood: m.moodScore, energy: m.energyLevel, sleep: m.sleepHours },
        })
      }
    })

    fitness.forEach(f => {
      if (new Date(f.date) > last7Days) {
        events.push({
          date: new Date(f.date),
          type: 'fitness',
          icon: '💪',
          title: f.activityType || f.type || 'Workout',
          detail: `${f.duration || 30}min, Intensity ${f.intensity || 5}/10`,
          values: { intensity: f.intensity, duration: f.duration },
        })
      }
    })

    nutrition.forEach(n => {
      if (new Date(n.date) > last7Days) {
        const calories = n.totalCalories || (n.meals?.reduce((s, m) => s + (m.calories || 0), 0)) || 0
        events.push({
          date: new Date(n.date),
          type: 'nutrition',
          icon: '🥗',
          title: 'Nutrition logged',
          detail: calories ? `${calories} kcal` : 'Meals tracked',
          values: { calories },
        })
      }
    })

    return events.sort((a, b) => b.date - a.date).slice(0, 10)
  }

  // AI Pattern Detection
  const detectPatterns = (mental, fitness, nutrition) => {
    const patterns = []
    
    if (mental.length < 2) return patterns

    // Sort by date
    const sortedMental = [...mental].sort((a, b) => new Date(a.date) - new Date(b.date))
    
    // Pattern 1: Poor sleep → Low energy chain
    for (let i = 1; i < sortedMental.length; i++) {
      const prev = sortedMental[i - 1]
      const curr = sortedMental[i]
      
      if ((prev.sleepHours || 7) < 6 && (curr.energyLevel || 5) < 5) {
        const dayAfter = sortedMental[i + 1]
        const chain = ['Poor sleep', 'Low energy']
        
        // Check if low energy led to skipped workout
        const currDate = new Date(curr.date).toDateString()
        const hadWorkout = fitness.some(f => new Date(f.date).toDateString() === currDate)
        if (!hadWorkout && fitness.length > 0) {
          chain.push('No workout')
        }
        
        // Check if mood dropped
        if (dayAfter && (dayAfter.moodScore || 5) < (curr.moodScore || 5)) {
          chain.push('Lower mood')
        }
        
        if (chain.length >= 3) {
          patterns.push({
            type: 'negative',
            chain,
            insight: 'Sleep deprivation is creating a cascade effect on your wellbeing.',
            action: 'Prioritize 7+ hours tonight to break the cycle.',
          })
          break
        }
      }
    }

    // Pattern 2: Workout → Better mood
    const workoutDays = fitness.map(f => new Date(f.date).toDateString())
    const moodAfterWorkout = sortedMental.filter(m => workoutDays.includes(new Date(m.date).toDateString()))
    const moodWithoutWorkout = sortedMental.filter(m => !workoutDays.includes(new Date(m.date).toDateString()))
    
    if (moodAfterWorkout.length > 0 && moodWithoutWorkout.length > 0) {
      const avgMoodWithWorkout = moodAfterWorkout.reduce((s, m) => s + (m.moodScore || 5), 0) / moodAfterWorkout.length
      const avgMoodWithout = moodWithoutWorkout.reduce((s, m) => s + (m.moodScore || 5), 0) / moodWithoutWorkout.length
      
      if (avgMoodWithWorkout > avgMoodWithout + 1) {
        patterns.push({
          type: 'positive',
          chain: ['Workout', 'Higher mood', 'Better energy'],
          insight: `Your mood is ${(avgMoodWithWorkout - avgMoodWithout).toFixed(1)} points higher on workout days!`,
          action: 'Exercise is your mood booster. Try to maintain consistency.',
        })
      }
    }

    // Pattern 3: Stress cycle detection
    const highStressDays = sortedMental.filter(m => (m.stressLevel || 0) >= 7)
    if (highStressDays.length >= 3) {
      patterns.push({
        type: 'warning',
        chain: ['High stress', 'Multiple days', 'Needs attention'],
        insight: `You've had ${highStressDays.length} high-stress days recently.`,
        action: 'Consider adding recovery activities or talking to someone.',
      })
    }

    // Pattern 4: Consistency reward
    const streak = calculateStreak(mental)
    if (streak >= 5) {
      patterns.push({
        type: 'achievement',
        chain: ['Consistent tracking', `${streak} day streak`, 'Building insight'],
        insight: 'Your consistency is helping build accurate patterns!',
        action: 'Keep it up! More data = better personalization.',
      })
    }

    return patterns.slice(0, 3) // Max 3 patterns
  }

  const handleQuickCheckIn = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/logs/mental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moodScore: todayState.mood,
          energyLevel: todayState.energy,
          bodyFeel: todayState.bodyFeel,
          sleepHours: todayState.sleep,
          date: new Date(),
        }),
      })
      setHasCheckedIn(true)
      // Fetch AI insight after check-in
      fetchInsight()
    } catch (err) {
      console.error(err)
    }
    setSubmitting(false)
  }

  const fetchInsight = async () => {
    setLoadingInsight(true)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: `Based on my current state (energy: ${todayState.energy}/10, mood: ${todayState.mood}/10, body feel: ${todayState.bodyFeel}/10, sleep: ${todayState.sleep}h) and my recent patterns, give me ONE key insight and ONE specific action I should take today. Be concise and personal. Format: "Insight: [insight]" then "Action: [action]"`,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setInsight(data.reply || data.message)
      }
    } catch (err) {
      console.error(err)
    }
    setLoadingInsight(false)
  }

  const getStateColor = (value) => {
    if (value >= 7) return '#15803d'
    if (value >= 5) return '#ca8a04'
    return '#dc2626'
  }

  const getStateLabel = (value) => {
    if (value >= 8) return 'Great'
    if (value >= 6) return 'Good'
    if (value >= 4) return 'Okay'
    return 'Low'
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#171717' }} />
      </Box>
    )
  }

  const StatCard = ({ icon, label, value, unit, color }) => (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Box sx={{ color: color || '#6b7280', mb: 1 }}>{icon}</Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: color || '#171717' }}>
        {value}
        {unit && <Typography component="span" variant="body2" sx={{ color: '#6b7280' }}>{unit}</Typography>}
      </Typography>
      <Typography variant="caption" sx={{ color: '#6b7280' }}>{label}</Typography>
    </Box>
  )

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '280px 1fr 320px' }, gap: 3 }}>
      {/* LEFT: Life Summary */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 2 }}>
            This Week
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">Avg Energy</Typography>
              <Chip 
                label={`${weeklyStats.avgEnergy}/10`} 
                size="small" 
                sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 600 }} 
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">Avg Mood</Typography>
              <Chip 
                label={`${weeklyStats.avgMood}/10`} 
                size="small" 
                sx={{ bgcolor: '#faf5ff', color: '#9333ea', fontWeight: 600 }} 
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">Avg Sleep</Typography>
              <Chip 
                label={`${weeklyStats.avgSleep}h`} 
                size="small" 
                sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 600 }} 
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">Workouts</Typography>
              <Chip 
                label={weeklyStats.workouts} 
                size="small" 
                sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 600 }} 
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
            Check-in Streak
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700, color: '#171717' }}>
            {weeklyStats.streak}
            <Typography component="span" variant="body1" sx={{ color: '#6b7280', ml: 0.5 }}>
              days
            </Typography>
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
            Keep going! Consistency builds insight.
          </Typography>
        </Box>

        <Box sx={{ p: 3, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
            Recent Activity
          </Typography>
          {recentLogs.fitness.slice(0, 3).map((log, i) => (
            <Box key={i} sx={{ py: 1, borderBottom: i < 2 ? '1px solid #e5e7eb' : 'none' }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {log.activityType || 'Workout'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                {log.duration}min • {new Date(log.date).toLocaleDateString()}
              </Typography>
            </Box>
          ))}
          {recentLogs.fitness.length === 0 && (
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>No recent workouts</Typography>
          )}
        </Box>
      </Box>

      {/* CENTER: Today's State */}
      <Box>
        <Box sx={{ p: 4, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717' }}>
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0] || 'there'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Typography>
            </Box>
            {hasCheckedIn && (
              <Chip
                icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
                label="Checked in"
                sx={{ bgcolor: '#f0fdf4', color: '#15803d' }}
              />
            )}
          </Box>

          <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 2, fontWeight: 600 }}>
            {hasCheckedIn ? "Today's State" : "How are you feeling?"}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
            {/* Energy */}
            <Box sx={{ p: 2, bgcolor: '#fafafa', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BoltIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Energy</Typography>
                <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 600, color: getStateColor(todayState.energy) }}>
                  {todayState.energy}/10
                </Typography>
              </Box>
              <Slider
                value={todayState.energy}
                onChange={(e, v) => !hasCheckedIn && setTodayState(prev => ({ ...prev, energy: v }))}
                min={1}
                max={10}
                disabled={hasCheckedIn}
                sx={{
                  color: getStateColor(todayState.energy),
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>

            {/* Mood */}
            <Box sx={{ p: 2, bgcolor: '#fafafa', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MoodIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Mood</Typography>
                <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 600, color: getStateColor(todayState.mood) }}>
                  {todayState.mood}/10
                </Typography>
              </Box>
              <Slider
                value={todayState.mood}
                onChange={(e, v) => !hasCheckedIn && setTodayState(prev => ({ ...prev, mood: v }))}
                min={1}
                max={10}
                disabled={hasCheckedIn}
                sx={{
                  color: getStateColor(todayState.mood),
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>

            {/* Body Feel */}
            <Box sx={{ p: 2, bgcolor: '#fafafa', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FitnessCenterIcon sx={{ fontSize: 18, color: '#10b981' }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Body Feel</Typography>
                <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 600, color: getStateColor(todayState.bodyFeel) }}>
                  {todayState.bodyFeel}/10
                </Typography>
              </Box>
              <Slider
                value={todayState.bodyFeel}
                onChange={(e, v) => !hasCheckedIn && setTodayState(prev => ({ ...prev, bodyFeel: v }))}
                min={1}
                max={10}
                disabled={hasCheckedIn}
                sx={{
                  color: getStateColor(todayState.bodyFeel),
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>

            {/* Sleep */}
            <Box sx={{ p: 2, bgcolor: '#fafafa', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <NightsStayIcon sx={{ fontSize: 18, color: '#6366f1' }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Sleep</Typography>
                <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 600, color: getStateColor(todayState.sleep >= 7 ? 8 : todayState.sleep >= 5 ? 5 : 3) }}>
                  {todayState.sleep}h
                </Typography>
              </Box>
              <Slider
                value={todayState.sleep}
                onChange={(e, v) => !hasCheckedIn && setTodayState(prev => ({ ...prev, sleep: v }))}
                min={0}
                max={12}
                step={0.5}
                disabled={hasCheckedIn}
                sx={{
                  color: todayState.sleep >= 7 ? '#15803d' : todayState.sleep >= 5 ? '#ca8a04' : '#dc2626',
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>
          </Box>

          {!hasCheckedIn && (
            <Button
              fullWidth
              variant="contained"
              onClick={handleQuickCheckIn}
              disabled={submitting}
              sx={{
                py: 1.5,
                bgcolor: '#171717',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#374151', boxShadow: 'none' },
              }}
            >
              {submitting ? 'Saving...' : 'Check In'}
            </Button>
          )}
        </Box>

        {/* Quick Actions */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            { label: 'Log Workout', icon: '💪', color: '#eff6ff' },
            { label: 'Log Meal', icon: '🥗', color: '#f0fdf4' },
            { label: 'Talk to AI', icon: '🤖', color: '#faf5ff' },
          ].map((action) => (
            <Box
              key={action.label}
              sx={{
                p: 2,
                bgcolor: action.color,
                borderRadius: 2,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <Typography variant="h5" sx={{ mb: 0.5 }}>{action.icon}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                {action.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* RIGHT: AI Reasoning */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TipsAndUpdatesIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717' }}>
              Today's Insight
            </Typography>
          </Box>

          {loadingInsight ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} sx={{ color: '#6b7280' }} />
            </Box>
          ) : insight ? (
            <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {insight}
            </Typography>
          ) : hasCheckedIn ? (
            <Box>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
                Get personalized insights based on your check-in.
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                onClick={fetchInsight}
                sx={{
                  textTransform: 'none',
                  borderColor: '#e5e7eb',
                  color: '#374151',
                  '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
                }}
              >
                Generate Insight
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Check in first to get AI insights about your day.
            </Typography>
          )}
        </Box>

        <Box sx={{ p: 3, bgcolor: '#171717', borderRadius: 2, color: '#fff' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#9ca3af' }}>
            AI Understanding
          </Typography>
          <Typography variant="body2" sx={{ color: '#e5e7eb', lineHeight: 1.6, mb: 2 }}>
            I'm learning your patterns. The more you check in, the better I understand:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              'When you perform best',
              'What affects your mood',
              'Your recovery patterns',
              'What motivates you',
            ].map((item, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#6366f1' }} />
                <Typography variant="caption" sx={{ color: '#d1d5db' }}>{item}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ p: 3, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TimelineIcon sx={{ fontSize: 18, color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ color: '#171717', fontWeight: 600 }}>
              Pattern Detection
            </Typography>
          </Box>
          
          {patterns.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {patterns.map((pattern, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: pattern.type === 'negative' ? '#fef2f2' 
                           : pattern.type === 'positive' ? '#f0fdf4'
                           : pattern.type === 'warning' ? '#fffbeb'
                           : '#eff6ff',
                    border: `1px solid ${
                      pattern.type === 'negative' ? '#fecaca'
                      : pattern.type === 'positive' ? '#bbf7d0'
                      : pattern.type === 'warning' ? '#fde68a'
                      : '#bfdbfe'
                    }`,
                  }}
                >
                  {/* Pattern Chain Visualization */}
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                    {pattern.chain.map((step, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip
                          label={step}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: pattern.type === 'negative' ? '#fee2e2'
                                   : pattern.type === 'positive' ? '#dcfce7'
                                   : pattern.type === 'warning' ? '#fef3c7'
                                   : '#dbeafe',
                            color: pattern.type === 'negative' ? '#dc2626'
                                 : pattern.type === 'positive' ? '#15803d'
                                 : pattern.type === 'warning' ? '#b45309'
                                 : '#2563eb',
                          }}
                        />
                        {i < pattern.chain.length - 1 && (
                          <ArrowForwardIcon sx={{ 
                            fontSize: 14, 
                            mx: 0.5,
                            color: pattern.type === 'negative' ? '#f87171'
                                 : pattern.type === 'positive' ? '#4ade80'
                                 : pattern.type === 'warning' ? '#fbbf24'
                                 : '#60a5fa',
                          }} />
                        )}
                      </Box>
                    ))}
                  </Box>
                  
                  <Typography variant="body2" sx={{ 
                    color: '#374151', 
                    fontWeight: 500,
                    mb: 0.5,
                  }}>
                    {pattern.insight}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    💡 {pattern.action}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <AutoAwesomeIcon sx={{ fontSize: 32, color: '#d1d5db', mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Keep logging to discover your patterns
              </Typography>
              <Typography variant="caption" sx={{ color: '#d1d5db' }}>
                AI needs more data to detect cycles
              </Typography>
            </Box>
          )}
        </Box>

        {/* Mini Timeline */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#171717', fontWeight: 600 }}>
              Recent Timeline
            </Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
              Last 7 days
            </Typography>
          </Box>
          
          {timeline.length > 0 ? (
            <Box sx={{ position: 'relative' }}>
              {/* Vertical line */}
              <Box sx={{ 
                position: 'absolute', 
                left: 11, 
                top: 8, 
                bottom: 8, 
                width: 2, 
                bgcolor: '#e5e7eb',
                borderRadius: 1,
              }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {timeline.slice(0, 6).map((event, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                    {/* Event dot */}
                    <Box sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: event.type === 'mental' ? '#faf5ff'
                             : event.type === 'fitness' ? '#eff6ff'
                             : '#f0fdf4',
                      border: `2px solid ${
                        event.type === 'mental' ? '#9333ea'
                        : event.type === 'fitness' ? '#2563eb'
                        : '#15803d'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      zIndex: 1,
                      flexShrink: 0,
                    }}>
                      {event.icon}
                    </Box>
                    
                    {/* Event content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717' }}>
                          {event.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', flexShrink: 0, ml: 1 }}>
                          {event.date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {event.detail}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 2 }}>
              No activity yet this week
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default Dashboard

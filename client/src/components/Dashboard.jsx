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
import { API_BASE } from '../config'
import { GlowingEffect } from './ui/glowing-effect.jsx'

function Dashboard() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dailyLifeState, setDailyLifeState] = useState(null)
  const [stateReflection, setStateReflection] = useState(null)
  const [todayState, setTodayState] = useState({
    energy: 5,
    mood: 5,
    bodyFeel: 5,
    sleep: 7,
  })
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [recentLogs, setRecentLogs] = useState({ fitness: [], mental: [], nutrition: [] })
  const [recentGymWorkouts, setRecentGymWorkouts] = useState([])
  const [weeklyStats, setWeeklyStats] = useState({
    avgEnergy: 0,
    avgMood: 0,
    avgSleep: 0,
    workouts: 0,
    streak: 0,
  })
  const [timeline, setTimeline] = useState([])

  useEffect(() => {
    loadData()
  }, [token])

  useEffect(() => {
    const handler = (e) => {
      const log = e?.detail?.log
      if (!log) return

      const todayKey = new Date().toDateString()
      const logKey = new Date(log.date).toDateString()
      if (logKey !== todayKey) return

      setHasCheckedIn(true)
      setTodayState({
        energy: Number(log.energyLevel ?? log.energy ?? 5) || 5,
        mood: Number(log.moodScore ?? log.mood ?? 5) || 5,
        bodyFeel: Number(log.bodyFeel ?? 5) || 5,
        sleep: Number(log.sleepHours ?? log.sleep ?? 7) || 7,
      })

      // Keep the rest of the dashboard in sync too.
      loadData()
    }

    window.addEventListener('lifesync:mental:updated', handler)
    return () => window.removeEventListener('lifesync:mental:updated', handler)
  }, [token])

  const moodEnumToScore10 = (mood) => {
    const m = String(mood || '').trim().toLowerCase()
    if (!m) return null
    if (m === 'very-low') return 2
    if (m === 'low') return 4
    if (m === 'neutral') return 5
    if (m === 'good') return 7
    if (m === 'great') return 9
    return null
  }

  const dayKeyFromDate = (d) => {
    const date = new Date(d)
    if (Number.isNaN(date.getTime())) return null
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const fetchDailyLifeState = async (dayKey) => {
    if (!token || !dayKey) return null
    try {
      const res = await fetch(`${API_BASE}/api/daily-life-state/${dayKey}?refresh=1`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      const reflectionHeader = res.headers.get('X-LifeSync-State-Reflection')
      const data = await res.json()
      return { data: data || null, reflection: reflectionHeader || null }
    } catch {
      return null
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch recent logs
      if (!user || !user._id) throw new Error('User not found')
      const todayKey = dayKeyFromDate(new Date())

      const [fitness, mental, nutrition, gymWorkouts, dlsResult] = await Promise.all([
        fetchJson(`${API_BASE}/api/logs/fitness`),
        fetchJson(`${API_BASE}/api/logs/mental`),
        fetchJson(`${API_BASE}/api/logs/nutrition`),
        fetchJson(`${API_BASE}/api/gym/workouts`),
        fetchDailyLifeState(todayKey),
      ])
      
      setRecentLogs({ fitness, mental, nutrition })
      setRecentGymWorkouts(gymWorkouts)
      setDailyLifeState(dlsResult?.data || null)
      setStateReflection(dlsResult?.reflection || null)
      
      // Calculate weekly stats
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const recentMental = mental.filter(m => new Date(m.date) > weekAgo)
      const recentFitness = fitness.filter(f => new Date(f.date) > weekAgo)
      const recentGym = gymWorkouts.filter(w => new Date(w.date) > weekAgo)

      const avgFrom = (arr) => {
        const nums = (arr || []).filter((n) => Number.isFinite(n))
        if (!nums.length) return null
        return nums.reduce((a, b) => a + b, 0) / nums.length
      }

      const avgEnergy = avgFrom(recentMental.map((m) => Number(m.energyLevel)))
      const avgMood = avgFrom(
        recentMental.map((m) => {
          const direct = Number(m.moodScore)
          if (Number.isFinite(direct) && direct > 0) return direct
          return moodEnumToScore10(m.mood)
        })
      )
      const avgSleep = avgFrom(recentMental.map((m) => Number(m.sleepHours)))
      
      setWeeklyStats({
        avgEnergy: avgEnergy == null ? '—' : String(Math.round(avgEnergy)),
        avgMood: avgMood == null ? '—' : String(Math.round(avgMood)),
        avgSleep: avgSleep == null ? '—' : String(avgSleep.toFixed(1)),
        workouts: recentGym.length + recentFitness.length,
        streak: calculateStreak(mental),
      })

      // Build timeline events
      const timelineEvents = buildTimeline(fitness, mental, nutrition)
      setTimeline(timelineEvents)

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
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
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
      if (!token) {
        alert('Please log in to check in.')
        setSubmitting(false)
        return
      }

      const res = await fetch(`${API_BASE}/api/logs/mental`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          moodScore: todayState.mood,
          energyLevel: todayState.energy,
          bodyFeel: todayState.bodyFeel,
          sleepHours: todayState.sleep,
          date: new Date(),
        }),
      })
      if (!res.ok) {
        const msg = await res.text().catch(() => '')
        throw new Error(msg || 'Check-in failed')
      }

      const saved = await res.json().catch(() => null)
      window.dispatchEvent(new CustomEvent('lifesync:mental:updated', { detail: { log: saved } }))
      setHasCheckedIn(true)
      await loadData()
      // Insights are centralized in the Insights tab.
    } catch (err) {
      console.error(err)
    }
    setSubmitting(false)
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

  const dayTone = stateReflection

  const navigateTo = (section) => {
    window.dispatchEvent(new CustomEvent('lifesync:navigate', { detail: { section } }))
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '280px 1fr 320px' }, gap: 3 }}>
      {/* LEFT: Life Summary */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', position: 'relative', overflow: 'hidden' }}>
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
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
          {(recentGymWorkouts.length ? recentGymWorkouts : recentLogs.fitness)
            .slice(0, 3)
            .map((log, i) => {
              const isGym = Boolean(log?.exercises)
              const title = isGym ? log?.name || 'Workout' : log?.activityType || log?.type || 'Workout'
              const durationMin = isGym
                ? Math.round((Number(log?.duration) || 0) / 60)
                : Number(log?.duration) || 0
              const detail = isGym
                ? `${log?.exercises?.length || 0} exercises • ${durationMin}min`
                : `${durationMin}min`

              return (
                <Box key={log?._id || i} sx={{ py: 1, borderBottom: i < 2 ? '1px solid #e5e7eb' : 'none' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    {detail} • {new Date(log.date).toLocaleDateString()}
                  </Typography>
                </Box>
              )
            })}
          {recentGymWorkouts.length === 0 && recentLogs.fitness.length === 0 && (
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>No recent workouts</Typography>
          )}
        </Box>
      </Box>

      {/* CENTER: Today's State */}
      <Box>
        <Box sx={{ p: 4, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3, position: 'relative', overflow: 'hidden' }}>
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717' }}>
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0] || 'there'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Typography>
              {dayTone && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#6b7280' }}>
                  {dayTone}
                </Typography>
              )}
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

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {[
            { label: 'Log Workout', icon: '💪', color: '#eff6ff', section: 'logs' },
            { label: 'Log Meal', icon: '🥗', color: '#f0fdf4', section: 'nutrition' },
            { label: 'Talk to AI', icon: '🤖', color: '#faf5ff', section: 'chat' },
          ].map((action) => (
            <Box
              key={action.label}
              onClick={() => navigateTo(action.section)}
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
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', position: 'relative', overflow: 'hidden' }}>
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TipsAndUpdatesIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717' }}>
              Insights
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
            Insights are now centralized in the Insights tab.
          </Typography>

          {hasCheckedIn ? (
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                try {
                  localStorage.setItem('lifesync:insights:activeTab', '2')
                } catch {
                  // ignore
                }
                window.dispatchEvent(new CustomEvent('lifesync:navigate', { detail: { section: 'trends' } }))
              }}
              sx={{
                textTransform: 'none',
                borderColor: '#e5e7eb',
                color: '#374151',
                '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
              }}
            >
              Open Insights
            </Button>
          ) : (
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                try {
                  localStorage.setItem('lifesync:insights:activeTab', '2')
                } catch {
                  // ignore
                }
                window.dispatchEvent(new CustomEvent('lifesync:navigate', { detail: { section: 'trends' } }))
              }}
              sx={{
                textTransform: 'none',
                borderColor: '#e5e7eb',
                color: '#374151',
                '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
              }}
            >
              Open Insights
            </Button>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TimelineIcon sx={{ fontSize: 18, color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ color: '#171717', fontWeight: 600 }}>
              Patterns
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
            Pattern insights now live in the Insights tab.
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              try {
                localStorage.setItem('lifesync:insights:activeTab', '2')
              } catch {
                // ignore
              }
              window.dispatchEvent(new CustomEvent('lifesync:navigate', { detail: { section: 'trends' } }))
            }}
            sx={{
              textTransform: 'none',
              borderColor: '#e5e7eb',
              color: '#374151',
              '&:hover': { borderColor: '#d1d5db', bgcolor: '#fff' },
            }}
          >
            Open Insights
          </Button>
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

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

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

import RestaurantIcon from '@mui/icons-material/Restaurant'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'
import { GlowingEffect } from './ui/glowing-effect.jsx'
import ProgressNarrative from './ProgressNarrative'

// Global cache to prevent re-fetching on tab switch
let dashboardCache = {
  data: null,
  token: null
}

function Dashboard() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(!dashboardCache.data)
  const [dailyLifeState, setDailyLifeState] = useState(dashboardCache.data?.dailyLifeState || null)
  const [stateReflection, setStateReflection] = useState(dashboardCache.data?.stateReflection || null)
  const [todayState, setTodayState] = useState(dashboardCache.data?.todayState || {
    energy: 5,
    mood: 5,
    bodyFeel: 5,
    hunger: 5,
    sleep: 7,
  })
  const [hasCheckedIn, setHasCheckedIn] = useState(dashboardCache.data?.hasCheckedIn || false)
  const [submitting, setSubmitting] = useState(false)

  const [weeklyStats, setWeeklyStats] = useState(dashboardCache.data?.weeklyStats || {
    avgEnergy: 0,
    avgMood: 0,
    avgSleep: 0,
    workouts: 0,
    streak: 0,
  })


  useEffect(() => {
    if (dashboardCache.token !== token) {
      dashboardCache = { data: null, token: token }
    }
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
        hunger: Number(log.hungerLevel ?? 5) || 5,
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
    if (!dashboardCache.data) {
      setLoading(true)
    }
    
    try {
      if (!user || !user._id) return
      const todayKey = dayKeyFromDate(new Date())

      const [fitness, mental, nutrition, gymWorkouts, dlsResult] = await Promise.all([
        fetchJson(`${API_BASE}/api/logs/fitness`),
        fetchJson(`${API_BASE}/api/logs/mental`),
        fetchJson(`${API_BASE}/api/logs/nutrition`),
        fetchJson(`${API_BASE}/api/gym/workouts`),
        fetchDailyLifeState(todayKey),
      ])
      

      setDailyLifeState(dlsResult?.data || null)
      setStateReflection(dlsResult?.reflection || null)
      
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

      const avgEnergy = avgFrom(recentMental.map((m) => m.energyLevel).filter(e => e != null))
      const avgMood = avgFrom(
        recentMental.map((m) => {
          if (m.moodScore != null) return m.moodScore
          if (m.mood != null) return moodEnumToScore10(m.mood)
          return null
        }).filter(v => v != null)
      )
      const avgSleep = avgFrom(recentMental.map((m) => m.sleepHours).filter(s => s != null))
      
      const newWeeklyStats = {
        avgEnergy: avgEnergy == null ? '—' : String(Math.round(avgEnergy)),
        avgMood: avgMood == null ? '—' : String(Math.round(avgMood)),
        avgSleep: avgSleep == null ? '—' : String(avgSleep.toFixed(1)),
        workouts: recentGym.length + recentFitness.length,
        streak: calculateStreak(mental),
      }
      setWeeklyStats(newWeeklyStats)



      const todayStr = new Date().toDateString()
      const todayLog = mental.find(m => new Date(m.date).toDateString() === todayStr)
      let currentTodayState = todayState
      let currentHasCheckedIn = hasCheckedIn

      if (todayLog) {
        currentHasCheckedIn = true
        currentTodayState = {
          energy: todayLog.energyLevel || 5,
          mood: todayLog.moodScore || 5,
          bodyFeel: todayLog.bodyFeel || 5,
          hunger: todayLog.hungerLevel || 5,
          sleep: todayLog.sleepHours || 7,
        }
        setHasCheckedIn(true)
        setTodayState(currentTodayState)
      }

      // Update cache
      dashboardCache.data = {
        dailyLifeState: dlsResult?.data || null,
        stateReflection: dlsResult?.reflection || null,
        todayState: currentTodayState,
        hasCheckedIn: currentHasCheckedIn,

        weeklyStats: newWeeklyStats,

      }
      dashboardCache.token = token
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
          hungerLevel: todayState.hunger,
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
        <CircularProgress sx={{ color: 'text.primary' }} />
      </Box>
    )
  }

  const StatCard = ({ icon, label, value, unit, color }) => (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Box sx={{ color: color || 'text.secondary', mb: 1 }}>{icon}</Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: color || 'text.primary' }}>
        {value}
        {unit && <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>{unit}</Typography>}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
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
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', position: 'relative', overflow: 'hidden' }}>
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2 }}>
            This Week
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>Avg Energy</Typography>
              <Chip 
                label={`${weeklyStats.avgEnergy}/10`} 
                size="small" 
                sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 600 }} 
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>Avg Mood</Typography>
              <Chip 
                label={`${weeklyStats.avgMood}/10`} 
                size="small" 
                sx={{ bgcolor: '#faf5ff', color: '#9333ea', fontWeight: 600 }} 
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>Avg Sleep</Typography>
              <Chip 
                label={`${weeklyStats.avgSleep}h`} 
                size="small" 
                sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 600 }} 
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>Workouts</Typography>
              <Chip 
                label={weeklyStats.workouts} 
                size="small" 
                sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 600 }} 
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>Current Weight</Typography>
              <Chip 
                label={user?.biologicalProfile?.weightKg || user?.weight || '—'} 
                size="small" 
                sx={{ bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 600 }} 
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
            Check-in Streak
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>
            {weeklyStats.streak}
            <Typography component="span" variant="body1" sx={{ color: 'text.secondary', ml: 0.5 }}>
              days
            </Typography>
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Keep going! Consistency builds insight.
          </Typography>
        </Box>


      </Box>

      {/* CENTER: Today's State */}
      <Box>
        <ProgressNarrative />
        <Box sx={{ p: 4, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3, position: 'relative', overflow: 'hidden' }}>
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
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0] || 'there'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Typography>
              {dayTone && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
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

          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2, fontWeight: 600 }}>
            {hasCheckedIn ? "Today's State" : "How are you feeling?"}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
            {/* Energy */}
            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
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
            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
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
            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
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

            {/* Hunger */}
            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <RestaurantIcon sx={{ fontSize: 18, color: '#ec4899' }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Hunger</Typography>
                <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 600, color: getStateColor(11 - todayState.hunger) }}>
                  {todayState.hunger}/10
                </Typography>
              </Box>
              <Slider
                value={todayState.hunger}
                onChange={(e, v) => !hasCheckedIn && setTodayState(prev => ({ ...prev, hunger: v }))}
                min={1}
                max={10}
                disabled={hasCheckedIn}
                sx={{
                  color: getStateColor(11 - todayState.hunger),
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>

            {/* Sleep */}
            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
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
                bgcolor: 'text.primary',
                color: 'background.default',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                boxShadow: 'none',
                '&:hover': { bgcolor: 'text.secondary', boxShadow: 'none' },
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
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {[
            { label: 'Log Workout', icon: '💪', color: '#eff6ff', section: 'logs' },
            { label: 'Log Meal', icon: '🥗', color: '#f0fdf4', section: 'nutrition' },
            { label: 'Log Weight', icon: '⚖️', color: '#fef3c7', section: 'nutrition', tab: 'Weight' },
            { label: 'Talk to AI', icon: '🤖', color: '#faf5ff', section: 'chat' },
          ].map((action) => (
            <Box
              key={action.label}
              onClick={() => {
                navigateTo(action.section)
                if (action.tab) {
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('lifesync:nutrition:tab', { detail: { tab: action.tab } }))
                  }, 100)
                }
              }}
              sx={{
                p: 2,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : action.color,
                borderRadius: 2,
                textAlign: 'center',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'divider' : 'transparent',
                transition: 'transform 0.15s',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <Typography variant="h5" sx={{ mb: 0.5 }}>{action.icon}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                {action.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* RIGHT: AI Reasoning */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', position: 'relative', overflow: 'hidden' }}>
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
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Insights & Patterns
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            All pattern analysis and AI insights are now centralized in the Insights tab.
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
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
            }}
          >
            Open Insights
          </Button>
        </Box>

        <Box 
          sx={{ 
            p: 3, 
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'primary.main' : '#111827', 
            borderRadius: 2, 
            color: 'background.paper' 
          }}
        >
          <Typography 
            variant="subtitle2" 
            sx={{ 
              mb: 1, 
              color: (theme) => theme.palette.mode === 'dark' ? 'background.default' : '#9ca3af' 
            }}
          >
            AI Understanding
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)', 
              lineHeight: 1.6, 
              mb: 2 
            }}
          >
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
                <Box 
                  sx={{ 
                    width: 4, 
                    height: 4, 
                    borderRadius: '50%', 
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'secondary.main' : '#6366f1' 
                  }} 
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.8)' : '#d1d5db' 
                  }}
                >
                  {item}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>




      </Box>
    </Box>
  )
}

export default Dashboard

import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

function TrendsPanel() {
  const initialTab = useMemo(() => {
    try {
      const raw = localStorage.getItem('lifesync:insights:activeTab')
      const n = Number.parseInt(raw || '', 10)
      if (Number.isFinite(n) && n >= 0 && n <= 2) return n
    } catch {
      // ignore
    }
    return 0
  }, [])

  const [activeTab, setActiveTab] = useState(initialTab)
  const [data, setData] = useState({ fitness: [], nutrition: [], mental: [] })

  const [checkinInsight, setCheckinInsight] = useState(null)
  const [journalInsight, setJournalInsight] = useState(null)

  const [journalToday, setJournalToday] = useState('')
  const [journalTodayLoading, setJournalTodayLoading] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)

  const { token, user } = useAuth()

  useEffect(() => {
    try {
      localStorage.setItem('lifesync:insights:activeTab', String(activeTab))
    } catch {
      // ignore
    }
  }, [activeTab])

  useEffect(() => {
    const readLocalInsights = () => {
      try {
        const rawCheckin = localStorage.getItem('lifesync:insights:checkin')
        const rawJournal = localStorage.getItem('lifesync:insights:journal')
        setCheckinInsight(rawCheckin ? JSON.parse(rawCheckin) : null)
        setJournalInsight(rawJournal ? JSON.parse(rawJournal) : null)
      } catch {
        setCheckinInsight(null)
        setJournalInsight(null)
      }
    }

    readLocalInsights()
    const handler = () => readLocalInsights()
    window.addEventListener('lifesync:insights:updated', handler)
    return () => window.removeEventListener('lifesync:insights:updated', handler)
  }, [])

  useEffect(() => {
    const fetchTodaysJournal = async () => {
      if (!token) return
      if (activeTab !== 2) return

      setJournalTodayLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/journal`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          setJournalToday('')
          return
        }
        const entries = await res.json().catch(() => [])
        const today = new Date().toDateString()
        const todayEntry = Array.isArray(entries) ? entries.find(e => new Date(e.date).toDateString() === today) : null
        setJournalToday(todayEntry?.text || '')
      } catch {
        setJournalToday('')
      } finally {
        setJournalTodayLoading(false)
      }
    }

    fetchTodaysJournal()
  }, [token, activeTab])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchJson = async (url) => {
          const res = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (!res.ok) return []
          const text = await res.text()
          try {
            return JSON.parse(text)
          } catch {
            return []
          }
        }
        if (!user || !user._id) {
          setData({ fitness: [], nutrition: [], mental: [] })
          return
        }
        const userId = user._id
        const [fit, nut, men] = await Promise.all([
          fetchJson(`${API_BASE}/api/logs/fitness/${userId}`),
          fetchJson(`${API_BASE}/api/logs/nutrition/${userId}`),
          fetchJson(`${API_BASE}/api/logs/mental/${userId}`),
        ])

        const normalizedNutrition = Array.isArray(nut)
          ? nut.map(n => {
              const daily = n.dailyTotals || {}
              const totalCalories = n.totalCalories ?? daily.calories ?? 0
              const protein = n.protein ?? daily.protein ?? 0
              const hydrationLevel = n.hydrationLevel ?? (n.waterIntake ? Math.min(10, Math.round((n.waterIntake || 0) / 250)) : 0)
              return { ...n, totalCalories, protein, hydrationLevel }
            })
          : []

        setData({ 
          fitness: Array.isArray(fit) ? fit.slice(0, 7) : [], 
          nutrition: normalizedNutrition.slice(0, 7), 
          mental: Array.isArray(men) ? men.slice(0, 7) : [] 
        })
      } catch (err) {
        console.error('Failed to fetch trends:', err)
      }
    }
    fetchData()
  }, [token])

  const latestMentalLog = useMemo(() => {
    if (!Array.isArray(data.mental) || data.mental.length === 0) return null
    const sorted = [...data.mental].sort((a, b) => new Date(b.date) - new Date(a.date))
    return sorted[0] || null
  }, [data.mental])

  const saveInsight = (key, text, meta = {}) => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          text,
          createdAt: new Date().toISOString(),
          ...meta,
        })
      )
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('lifesync:insights:updated'))
  }

  const generateCheckinInsight = async () => {
    if (!token) return
    if (!latestMentalLog) return

    setAiGenerating(true)
    try {
      const mood = latestMentalLog.moodScore ?? 5
      const energy = latestMentalLog.energyLevel ?? 5
      const sleep = latestMentalLog.sleepHours ?? 7
      const bodyFeel = latestMentalLog.bodyFeel ?? latestMentalLog.body ?? null
      const dateStr = latestMentalLog.date ? new Date(latestMentalLog.date).toLocaleDateString() : ''

      const message = [
        `Based on my latest check-in (${dateStr}), give me ONE key insight and ONE specific action I should take today.`,
        'Be concise and personal.',
        'Do not diagnose or give medication advice.',
        '',
        `mood: ${mood}/10`,
        `energy: ${energy}/10`,
        bodyFeel != null ? `body feel: ${bodyFeel}/10` : null,
        `sleep: ${sleep}h`,
      ].filter(Boolean).join('\n')

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        alert('Failed to generate insight. Please try again.')
        return
      }

      const json = await res.json().catch(() => null)
      const text = json?.reply || json?.message || 'No AI reply returned.'
      saveInsight('lifesync:insights:checkin', text, { source: 'checkin', forDate: latestMentalLog.date || null })
    } catch {
      alert('Failed to generate insight. Please try again.')
    } finally {
      setAiGenerating(false)
    }
  }

  const generateJournalInsight = async () => {
    if (!token) return
    if (!journalToday || !journalToday.trim()) return

    setAiGenerating(true)
    try {
      const message = [
        'Give me a short summary and 2-3 practical insights based on this journal entry.',
        'Do not diagnose or give medication advice.',
        '',
        'JOURNAL_ENTRY:',
        journalToday.trim(),
      ].join('\n')

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        alert('Failed to generate journal insight. Please try again.')
        return
      }

      const json = await res.json().catch(() => null)
      const text = json?.reply || json?.message || 'No AI reply returned.'
      saveInsight('lifesync:insights:journal', text, { source: 'journal' })
    } catch {
      alert('Failed to generate journal insight. Please try again.')
    } finally {
      setAiGenerating(false)
    }
  }

  const StatCard = ({ label, value, unit, trend }) => (
    <Box
      sx={{
        p: 3,
        bgcolor: '#fff',
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        flex: 1,
        minWidth: 140,
      }}
    >
      <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#171717' }}>
          {value}
        </Typography>
        {unit && (
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            {unit}
          </Typography>
        )}
      </Box>
      {trend && (
        <Typography
          variant="caption"
          sx={{
            color: trend > 0 ? '#15803d' : trend < 0 ? '#dc2626' : '#6b7280',
            fontWeight: 500,
          }}
        >
          {trend > 0 ? '+' : ''}{trend}% vs last week
        </Typography>
      )}
    </Box>
  )

  const BarChart = ({ items, maxValue, valueKey, labelKey }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 160 }}>
      {items.map((item, i) => {
        const val = item[valueKey] || 0
        const height = maxValue ? (val / maxValue) * 100 : 0
        return (
          <Box
            key={i}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: 40,
                height: `${Math.max(height, 4)}%`,
                bgcolor: '#171717',
                borderRadius: 1,
                transition: 'height 0.3s',
              }}
            />
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {new Date(item[labelKey]).toLocaleDateString('en-US', { weekday: 'short' })}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )

  const calcAvg = (arr, key) => {
    if (!arr.length) return 0
    return Math.round(arr.reduce((sum, item) => sum + (item[key] || 0), 0) / arr.length)
  }

  const calculateStreak = (logs) => {
    if (!Array.isArray(logs) || logs.length === 0) return 0
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

  const detectPatterns = (mental, fitness) => {
    const patterns = []
    if (!Array.isArray(mental) || mental.length < 2) return patterns

    const sortedMental = [...mental].sort((a, b) => new Date(a.date) - new Date(b.date))

    // Poor sleep -> low energy chain
    for (let i = 1; i < sortedMental.length; i++) {
      const prev = sortedMental[i - 1]
      const curr = sortedMental[i]

      if ((prev.sleepHours || 7) < 6 && (curr.energyLevel || 5) < 5) {
        const chain = ['Poor sleep', 'Low energy']
        const currDate = new Date(curr.date).toDateString()
        const hadWorkout = Array.isArray(fitness) && fitness.some(f => new Date(f.date).toDateString() === currDate)
        if (!hadWorkout && Array.isArray(fitness) && fitness.length > 0) {
          chain.push('No workout')
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

    // Workout -> better mood
    const workoutDays = Array.isArray(fitness) ? fitness.map(f => new Date(f.date).toDateString()) : []
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

    // Stress cycle
    const highStressDays = sortedMental.filter(m => (m.stressLevel || 0) >= 7)
    if (highStressDays.length >= 3) {
      patterns.push({
        type: 'warning',
        chain: ['High stress', 'Multiple days', 'Needs attention'],
        insight: `You've had ${highStressDays.length} high-stress days recently.`,
        action: 'Add recovery time and consider talking to someone if it persists.',
      })
    }

    // Consistency reward
    const streak = calculateStreak(mental)
    if (streak >= 5) {
      patterns.push({
        type: 'achievement',
        chain: ['Consistent tracking', `${streak} day streak`, 'Building insight'],
        insight: 'Your consistency is helping build accurate patterns!',
        action: 'Keep it up! More data = better personalization.',
      })
    }

    return patterns.slice(0, 3)
  }

  const patterns = useMemo(() => detectPatterns(data.mental, data.fitness), [data.mental, data.fitness])

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: '#171717' }}>
        Insights
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: '#6b7280' }}>
        Insights from your logged data
      </Typography>

      <Box sx={{ borderBottom: '1px solid #e5e7eb', mb: 4 }}>
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
            '& .MuiTabs-indicator': { bgcolor: '#171717', height: 2 },
          }}
        >
          <Tab label="Training" />
          <Tab label="Nutrition" />
          <Tab label="Wellness" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <StatCard label="Avg Duration" value={calcAvg(data.fitness, 'duration')} unit="min" trend={8} />
            <StatCard label="Avg Intensity" value={calcAvg(data.fitness, 'intensity')} unit="/10" trend={-3} />
            <StatCard label="Sessions" value={data.fitness.length} trend={12} />
          </Box>
          {data.fitness.length > 0 && (
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ mb: 3, color: '#6b7280' }}>
                Duration (last 7 sessions)
              </Typography>
              <BarChart items={data.fitness} maxValue={120} valueKey="duration" labelKey="date" />
            </Box>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <StatCard label="Avg Calories" value={calcAvg(data.nutrition, 'totalCalories')} unit="kcal" trend={5} />
            <StatCard label="Avg Protein" value={calcAvg(data.nutrition, 'protein')} unit="g" trend={15} />
            <StatCard label="Hydration" value={calcAvg(data.nutrition, 'hydrationLevel')} unit="/10" trend={0} />
          </Box>

          {data.nutrition.length > 0 && (
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ mb: 3, color: '#6b7280' }}>
                Calories (last 7 days)
              </Typography>
              <BarChart items={data.nutrition} maxValue={3000} valueKey="totalCalories" labelKey="date" />
            </Box>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', flex: 1, minWidth: 280 }}>
              <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
                AI Insight (check-in)
              </Typography>
              {checkinInsight?.text ? (
                <>
                  <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                    {checkinInsight.text}
                  </Typography>
                  {checkinInsight?.createdAt && (
                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 1 }}>
                      Updated {new Date(checkinInsight.createdAt).toLocaleString()}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                  Generate an insight from your latest check-in.
                </Typography>
              )}

              <Button
                variant="outlined"
                size="small"
                onClick={generateCheckinInsight}
                disabled={aiGenerating || !latestMentalLog}
                sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
              >
                {aiGenerating ? 'Generating…' : 'Generate'}
              </Button>
            </Box>

            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', flex: 1, minWidth: 280 }}>
              <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
                AI Insight (journal)
              </Typography>
              {journalInsight?.text ? (
                <>
                  <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                    {journalInsight.text}
                  </Typography>
                  {journalInsight?.createdAt && (
                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 1 }}>
                      Updated {new Date(journalInsight.createdAt).toLocaleString()}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                  Generate an insight from today’s journal.
                </Typography>
              )}

              <Button
                variant="outlined"
                size="small"
                onClick={generateJournalInsight}
                disabled={aiGenerating || journalTodayLoading || !journalToday.trim()}
                sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
              >
                {journalTodayLoading ? 'Loading journal…' : aiGenerating ? 'Generating…' : 'Generate'}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
              Pattern Insights
            </Typography>

            {patterns.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {patterns.map((p, idx) => (
                  <Box key={idx} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 600, mb: 0.5 }}>
                      {p.insight}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                      {p.action}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                Keep logging to discover patterns.
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <StatCard label="Avg Mood" value={calcAvg(data.mental, 'moodScore')} unit="/10" trend={10} />
            <StatCard label="Avg Energy" value={calcAvg(data.mental, 'energyLevel')} unit="/10" trend={-5} />
            <StatCard label="Avg Sleep" value={calcAvg(data.mental, 'sleepHours')} unit="hrs" trend={3} />
          </Box>
          {data.mental.length > 0 && (
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ mb: 3, color: '#6b7280' }}>
                Mood (last 7 days)
              </Typography>
              <BarChart items={data.mental} maxValue={10} valueKey="moodScore" labelKey="date" />
            </Box>
          )}
        </Box>
      )}

      {data.fitness.length === 0 && data.nutrition.length === 0 && data.mental.length === 0 && (
        <Box
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: '#f9fafb',
            borderRadius: 2,
            border: '1px solid #e5e7eb',
          }}
        >
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 1 }}>
            No data yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Start logging your activities to see trends here
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default TrendsPanel

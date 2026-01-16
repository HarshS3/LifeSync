import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'
import { computeTrainingInsights } from '../lib/trainingInsights'

function TrendsPanel() {
  const initialTab = useMemo(() => {
    try {
      const raw = localStorage.getItem('lifesync:insights:activeTab')
      const n = Number.parseInt(raw || '', 10)
      if (Number.isFinite(n) && n >= 0 && n <= 3) return n
    } catch {
      // ignore
    }
    return 0
  }, [])

  const [activeTab, setActiveTab] = useState(initialTab)
  const [data, setData] = useState({ fitness: [], nutrition: [], mental: [], workouts: [] })

  const [checkinInsight, setCheckinInsight] = useState(null)
  const [journalInsight, setJournalInsight] = useState(null)
  const [nutritionInsight, setNutritionInsight] = useState(null)

  const [journalToday, setJournalToday] = useState('')
  const [journalTodayLoading, setJournalTodayLoading] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)

  const [learningOverview, setLearningOverview] = useState(null)
  const [learningLoading, setLearningLoading] = useState(false)
  const [learningError, setLearningError] = useState('')

  const [todayLifeState, setTodayLifeState] = useState(null)
  const [todayLifeStateReflection, setTodayLifeStateReflection] = useState('')
  const [todayLifeStateLoading, setTodayLifeStateLoading] = useState(false)
  const [todayLifeStateError, setTodayLifeStateError] = useState('')

  const [nutritionReview, setNutritionReview] = useState(null)
  const [nutritionReviewNarration, setNutritionReviewNarration] = useState('')
  const [nutritionReviewLoading, setNutritionReviewLoading] = useState(false)
  const [nutritionReviewError, setNutritionReviewError] = useState('')

  const { token, user } = useAuth()

  const defaultWellnessDayKey = useMemo(() => {
    const dt = new Date()
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  const [wellnessDayKey, setWellnessDayKey] = useState(defaultWellnessDayKey)

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
        const rawNutrition = localStorage.getItem('lifesync:insights:nutrition')
        setCheckinInsight(rawCheckin ? JSON.parse(rawCheckin) : null)
        setJournalInsight(rawJournal ? JSON.parse(rawJournal) : null)
        setNutritionInsight(rawNutrition ? JSON.parse(rawNutrition) : null)
      } catch {
        setCheckinInsight(null)
        setJournalInsight(null)
        setNutritionInsight(null)
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
    const fetchTodayLifeState = async () => {
      if (!token) return
      if (activeTab !== 2) return

      const dayKey = wellnessDayKey

      setTodayLifeStateError('')
      setTodayLifeStateLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/daily-life-state/${dayKey}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const reflection = res.headers.get('X-LifeSync-State-Reflection') || ''
        setTodayLifeStateReflection(reflection)

        if (!res.ok) {
          const msg = await res.text().catch(() => '')
          setTodayLifeState(null)
          setTodayLifeStateError(msg || 'Failed to load DailyLifeState.')
          return
        }

        const json = await res.json().catch(() => null)
        setTodayLifeState(json)
      } catch {
        setTodayLifeState(null)
        setTodayLifeStateReflection('')
        setTodayLifeStateError('Failed to load DailyLifeState.')
      } finally {
        setTodayLifeStateLoading(false)
      }
    }

    fetchTodayLifeState()
  }, [token, activeTab, wellnessDayKey])

  useEffect(() => {
    const fetchNutritionReview = async () => {
      if (!token) return
      if (activeTab !== 2) return

      setNutritionReviewError('')
      setNutritionReviewLoading(true)
      try {
        const res = await fetch(
          `${API_BASE}/api/insights/nutrition/review?dayKey=${encodeURIComponent(wellnessDayKey)}&narrate=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) {
          const msg = await res.text().catch(() => '')
          setNutritionReview(null)
          setNutritionReviewNarration('')
          setNutritionReviewError(msg || 'Failed to load nutrition review.')
          return
        }
        const json = await res.json().catch(() => null)
        setNutritionReview(json?.review || null)
        setNutritionReviewNarration(json?.narration || '')
      } catch {
        setNutritionReview(null)
        setNutritionReviewNarration('')
        setNutritionReviewError('Failed to load nutrition review.')
      } finally {
        setNutritionReviewLoading(false)
      }
    }

    fetchNutritionReview()
  }, [token, activeTab, wellnessDayKey])

  useEffect(() => {
    const fetchLearning = async () => {
      if (!token) return
      if (activeTab !== 3) return

      setLearningError('')
      setLearningLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/insights/learning/overall?days=120`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const msg = await res.text().catch(() => '')
          setLearningOverview(null)
          setLearningError(msg || 'Failed to load learning overview.')
          return
        }
        const json = await res.json().catch(() => null)
        setLearningOverview(json)
      } catch {
        setLearningOverview(null)
        setLearningError('Failed to load learning overview.')
      } finally {
        setLearningLoading(false)
      }
    }

    fetchLearning()
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
        const [fit, nut, men, workouts] = await Promise.all([
          fetchJson(`${API_BASE}/api/logs/fitness/${userId}`),
          fetchJson(`${API_BASE}/api/logs/nutrition/${userId}`),
          fetchJson(`${API_BASE}/api/logs/mental/${userId}`),
          fetchJson(`${API_BASE}/api/gym/workouts`),
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
          mental: Array.isArray(men) ? men.slice(0, 7) : [],
          workouts: Array.isArray(workouts) ? workouts.slice(0, 50) : [],
        })
      } catch (err) {
        console.error('Failed to fetch trends:', err)
      }
    }
    fetchData()
  }, [token])

  const trainingInsights = useMemo(() => computeTrainingInsights(data.workouts), [data.workouts])

  const latestMentalLog = useMemo(() => {
    if (!Array.isArray(data.mental) || data.mental.length === 0) return null
    const sorted = [...data.mental].sort((a, b) => new Date(b.date) - new Date(a.date))
    return sorted[0] || null
  }, [data.mental])

  const latestNutritionLog = useMemo(() => {
    if (!Array.isArray(data.nutrition) || data.nutrition.length === 0) return null
    const sorted = [...data.nutrition].sort((a, b) => new Date(b.date) - new Date(a.date))
    return sorted[0] || null
  }, [data.nutrition])

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

  const generateNutritionInsight = async () => {
    if (!token) return
    if (!latestNutritionLog) return

    setAiGenerating(true)
    try {
      const dt = latestNutritionLog.date ? new Date(latestNutritionLog.date) : null
      const dateStr = dt ? dt.toLocaleDateString() : ''

      const daily = latestNutritionLog.dailyTotals || {}
      const calories = latestNutritionLog.totalCalories ?? daily.calories ?? 0
      const protein = latestNutritionLog.protein ?? daily.protein ?? 0
      const carbs = latestNutritionLog.carbs ?? daily.carbs ?? null
      const fat = latestNutritionLog.fat ?? daily.fat ?? null
      const fiber = latestNutritionLog.fiber ?? daily.fiber ?? null
      const water = latestNutritionLog.waterIntake ?? null
      const notes = (latestNutritionLog.notes || '').trim()

      const message = [
        `Based on my latest nutrition log (${dateStr}), write a short reflection.`,
        'Return exactly: (1) one key observation and (2) one gentle optional suggestion.',
        'Be calm and concise. No diagnosis, no medical advice, no moralizing.',
        '',
        `calories: ${calories} kcal`,
        `protein: ${protein} g`,
        carbs != null ? `carbs: ${carbs} g` : null,
        fat != null ? `fat: ${fat} g` : null,
        fiber != null ? `fiber: ${fiber} g` : null,
        water != null ? `water: ${water} ml` : null,
        notes ? `notes: ${notes}` : null,
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
        alert('Failed to generate nutrition insight. Please try again.')
        return
      }

      const json = await res.json().catch(() => null)
      const text = json?.reply || json?.message || 'No AI reply returned.'
      saveInsight('lifesync:insights:nutrition', text, { source: 'nutrition', forDate: latestNutritionLog.date || null })
    } catch {
      alert('Failed to generate nutrition insight. Please try again.')
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
          <Tab label="Overall Learning" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <StatCard label="Avg Duration" value={calcAvg(data.fitness, 'duration')} unit="min" trend={8} />
            <StatCard label="Avg Intensity" value={calcAvg(data.fitness, 'intensity')} unit="/10" trend={-3} />
            <StatCard label="Sessions" value={data.fitness.length} trend={12} />
          </Box>

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
              Training Insights
            </Typography>
            {trainingInsights.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {trainingInsights.map((p, idx) => (
                  <Box key={idx} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 600, mb: 0.5 }}>
                      {p.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                      {p.detail}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                Log a few workouts to surface training insights here.
              </Typography>
            )}
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
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
              AI Insight (nutrition)
            </Typography>

            {nutritionInsight?.text ? (
              <>
                <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                  {nutritionInsight.text}
                </Typography>
                {nutritionInsight?.createdAt && (
                  <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 1 }}>
                    Updated {new Date(nutritionInsight.createdAt).toLocaleString()}
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                Generate an insight from your latest nutrition log.
              </Typography>
            )}

            <Button
              variant="outlined"
              size="small"
              onClick={generateNutritionInsight}
              disabled={aiGenerating || !latestNutritionLog}
              sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
            >
              {aiGenerating ? 'Generating…' : 'Generate'}
            </Button>
          </Box>

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
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
              Wellness date
            </Typography>
            <TextField
              type="date"
              size="small"
              value={wellnessDayKey}
              onChange={(e) => setWellnessDayKey(e.target.value)}
              sx={{ maxWidth: 220 }}
              inputProps={{ max: defaultWellnessDayKey }}
            />
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 1 }}>
              Tip for demos: pick a seeded date like 2025-12-15.
            </Typography>
          </Box>

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
              Today’s Life State (derived)
            </Typography>

            {todayLifeStateError ? (
              <Typography variant="caption" sx={{ color: '#991b1b', display: 'block', whiteSpace: 'pre-line' }}>
                {todayLifeStateError}
              </Typography>
            ) : todayLifeStateLoading ? (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                Loading today’s state…
              </Typography>
            ) : todayLifeState?.summaryState ? (
              <>
                <Typography variant="body2" sx={{ color: '#111827', fontWeight: 700 }}>
                  {todayLifeState.summaryState.label || 'unknown'}
                  {todayLifeState.summaryState.confidence != null
                    ? ` (conf ${Math.round((todayLifeState.summaryState.confidence || 0) * 100)}%)`
                    : ''}
                </Typography>
                {Array.isArray(todayLifeState.summaryState.reasons) && todayLifeState.summaryState.reasons.length ? (
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.75 }}>
                    {todayLifeState.summaryState.reasons.join(' • ')}
                  </Typography>
                ) : null}

                {todayLifeStateReflection ? (
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                      Calm reflection
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                      {todayLifeStateReflection}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 1 }}>
                    No reflection generated (silence is normal when confidence is low).
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                No daily state yet. Add a check-in (sleep/stress/energy) or logs.
              </Typography>
            )}

            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setTodayLifeState(null)
                setTodayLifeStateReflection('')
                setTodayLifeStateError('')
                setTodayLifeStateLoading(true)

                const dayKey = wellnessDayKey

                fetch(`${API_BASE}/api/daily-life-state/${dayKey}?refresh=1`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then(async (r) => {
                    const reflection = r.headers.get('X-LifeSync-State-Reflection') || ''
                    setTodayLifeStateReflection(reflection)
                    if (!r.ok) throw new Error(await r.text().catch(() => 'Failed'))
                    return r.json()
                  })
                  .then((json) => setTodayLifeState(json))
                  .catch((e) => setTodayLifeStateError(String(e?.message || 'Failed to refresh DailyLifeState.')))
                  .finally(() => setTodayLifeStateLoading(false))
              }}
              disabled={todayLifeStateLoading || !token}
              sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
            >
              {todayLifeStateLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </Box>

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
              Nutrition Review (medical-style)
            </Typography>

            {nutritionReviewError ? (
              <Typography variant="caption" sx={{ color: '#991b1b', display: 'block', whiteSpace: 'pre-line' }}>
                {nutritionReviewError}
              </Typography>
            ) : nutritionReviewLoading ? (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                Building nutrition review…
              </Typography>
            ) : nutritionReview ? (
              <>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
                  confidence {Math.round((nutritionReview.confidence || 0) * 100)}% • completeness {Math.round((nutritionReview.completeness || 0) * 100)}%
                </Typography>

                {nutritionReviewNarration ? (
                  <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                      {nutritionReviewNarration}
                    </Typography>
                  </Box>
                ) : null}

                {Array.isArray(nutritionReview.flags) && nutritionReview.flags.length ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {nutritionReview.flags.slice(0, 6).map((f) => (
                      <Box key={f.key} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                        <Typography variant="body2" sx={{ color: '#111827', fontWeight: 700 }}>
                          {f.title}
                          <Typography component="span" variant="caption" sx={{ color: '#6b7280', fontWeight: 500, ml: 1 }}>
                            ({f.severity})
                          </Typography>
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                    No notable flags found for this day.
                  </Typography>
                )}

                {Array.isArray(nutritionReview.questionsForClinician) && nutritionReview.questionsForClinician.length ? (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
                      Questions to discuss with a clinician (optional):
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                      {nutritionReview.questionsForClinician.map((q) => `• ${q}`).join('\n')}
                    </Typography>
                  </>
                ) : null}
              </>
            ) : (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                No nutrition log found for this date.
              </Typography>
            )}

            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setNutritionReview(null)
                setNutritionReviewNarration('')
                setNutritionReviewError('')
                setNutritionReviewLoading(true)
                fetch(`${API_BASE}/api/insights/nutrition/review?dayKey=${encodeURIComponent(wellnessDayKey)}&narrate=1`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then(async (r) => {
                    if (!r.ok) throw new Error(await r.text().catch(() => 'Failed'))
                    return r.json()
                  })
                  .then((json) => {
                    setNutritionReview(json?.review || null)
                    setNutritionReviewNarration(json?.narration || '')
                  })
                  .catch((e) => setNutritionReviewError(String(e?.message || 'Failed to refresh nutrition review.')))
                  .finally(() => setNutritionReviewLoading(false))
              }}
              disabled={nutritionReviewLoading || !token}
              sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
            >
              {nutritionReviewLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </Box>

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

      {activeTab === 3 && (
        <Box>
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
              What LifeSync has learned (deterministic)
            </Typography>
            <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.7 }}>
              This view shows stable patterns and identities derived from DailyLifeState. It’s designed to be calm and factual.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setLearningOverview(null)
                setLearningError('')
                setLearningLoading(true)
                fetch(`${API_BASE}/api/insights/learning/overall?days=120`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                  .then(async (r) => {
                    if (!r.ok) throw new Error(await r.text().catch(() => 'Failed'))
                    return r.json()
                  })
                  .then((json) => setLearningOverview(json))
                  .catch((e) => {
                    setLearningOverview(null)
                    setLearningError(String(e?.message || 'Failed to refresh learning overview.'))
                  })
                  .finally(() => setLearningLoading(false))
              }}
              disabled={learningLoading || !token}
              sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
            >
              {learningLoading ? 'Loading…' : 'Refresh'}
            </Button>
          </Box>

          {learningError ? (
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #fecaca', mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#991b1b', whiteSpace: 'pre-line' }}>
                {learningError}
              </Typography>
            </Box>
          ) : null}

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', flex: 1, minWidth: 280 }}>
              <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
                Recent Day-State (last {learningOverview?.windowDays ?? 120} days)
              </Typography>
              {learningOverview?.stateSummary?.latestDayKey ? (
                <>
                  <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600 }}>
                    Latest: {learningOverview.stateSummary.latestDayKey}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
                    {learningOverview.stateSummary.latestSummaryState?.label || 'unknown'}
                    {learningOverview.stateSummary.latestSummaryState?.confidence != null
                      ? ` (conf ${Math.round((learningOverview.stateSummary.latestSummaryState.confidence || 0) * 100)}%)`
                      : ''}
                  </Typography>
                  {Array.isArray(learningOverview.stateSummary.latestSummaryState?.reasons) &&
                  learningOverview.stateSummary.latestSummaryState.reasons.length ? (
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 1 }}>
                      {learningOverview.stateSummary.latestSummaryState.reasons.join(' • ')}
                    </Typography>
                  ) : null}
                </>
              ) : (
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                  No daily state data found yet for this window.
                </Typography>
              )}
            </Box>

            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', flex: 1, minWidth: 280 }}>
              <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
                Counts
              </Typography>
              <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.8 }}>
                Total days with state: {learningOverview?.stateSummary?.totalDaysWithState ?? 0}
                <br />
                Stable: {learningOverview?.stateSummary?.counts?.stable ?? 0} | Recovering:{' '}
                {learningOverview?.stateSummary?.counts?.recovering ?? 0}
                <br />
                Overloaded: {learningOverview?.stateSummary?.counts?.overloaded ?? 0} | Depleted:{' '}
                {learningOverview?.stateSummary?.counts?.depleted ?? 0}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 2 }}>
              PatternMemory (correlations)
            </Typography>
            {Array.isArray(learningOverview?.patterns) && learningOverview.patterns.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {learningOverview.patterns.slice(0, 20).map((p) => (
                  <Box
                    key={p._id || p.patternKey}
                    sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}
                  >
                    <Typography variant="body2" sx={{ color: '#111827', fontWeight: 700 }}>
                      {(p.conditions || []).join(' + ') || 'context'} → {p.effect}
                      <Typography component="span" variant="caption" sx={{ color: '#6b7280', fontWeight: 500, ml: 1 }}>
                        ({p.window})
                      </Typography>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.25 }}>
                      conf {Math.round((p.confidence || 0) * 100)}% • support {p.supportCount || 0} • last{' '}
                      {p.lastObserved ? new Date(p.lastObserved).toLocaleDateString() : '—'} • {p.status}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                Not enough repeated signal yet to form patterns.
              </Typography>
            )}
          </Box>

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 2 }}>
              IdentityMemory (stable truths)
            </Typography>
            {Array.isArray(learningOverview?.identities) && learningOverview.identities.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {learningOverview.identities.slice(0, 12).map((im) => (
                  <Box
                    key={im._id || im.identityKey}
                    sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}
                  >
                    <Typography variant="body2" sx={{ color: '#111827', fontWeight: 700 }}>
                      {im.claim}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.25 }}>
                      conf {Math.round((im.confidence || 0) * 100)}% • stability {Math.round((im.stabilityScore || 0) * 100)}% • last{' '}
                      {im.lastReinforced ? new Date(im.lastReinforced).toLocaleDateString() : '—'} • {im.status}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                No identities confirmed yet.
              </Typography>
            )}
          </Box>

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
              Field coverage (what feeds learning today)
            </Typography>
            {learningOverview?.fieldCoverage?.learnedFrom ? (
              <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                {(learningOverview.fieldCoverage.learnedFrom.dailyLifeStateSignals || []).map((x) => `• ${x}`).join('\n')}
                {'\n'}
                {(learningOverview.fieldCoverage.learnedFrom.contextSignals || []).map((x) => `• ${x}`).join('\n')}
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                Coverage info unavailable.
              </Typography>
            )}

            {learningOverview?.fieldCoverage?.notYetUsed?.examples?.length ? (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
                  Not yet used for learning:
                </Typography>
                <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                  {(learningOverview.fieldCoverage.notYetUsed.examples || []).map((x) => `• ${x}`).join('\n')}
                </Typography>
              </>
            ) : null}
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default TrendsPanel

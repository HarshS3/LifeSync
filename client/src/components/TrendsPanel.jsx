import { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import TodayIcon from '@mui/icons-material/Today'
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

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const [dailyInsight, setDailyInsight] = useState(null)
  const [dailyInsightLoading, setDailyInsightLoading] = useState(false)
  const [dailyInsightError, setDailyInsightError] = useState('')

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

  useEffect(() => {
    const fetchDailyInsight = async () => {
      if (!token) return
      if (!user || !user._id) return
      if (activeTab !== 1) return

      setDailyInsightLoading(true)
      setDailyInsightError('')
      try {
        const params = new URLSearchParams({ date: selectedDate.toISOString() })
        const res = await fetch(`${API_BASE}/api/insights/daily?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          setDailyInsight(null)
          setDailyInsightError('Could not load daily insights.')
          return
        }
        const json = await res.json().catch(() => null)
        setDailyInsight(json)
      } catch (err) {
        console.error('Failed to fetch daily insights:', err)
        setDailyInsight(null)
        setDailyInsightError('Could not load daily insights.')
      } finally {
        setDailyInsightLoading(false)
      }
    }

    fetchDailyInsight()
  }, [token, user, activeTab, selectedDate])

  const recomputeDailyInsight = async () => {
    if (!token) return
    if (!user || !user._id) return

    setDailyInsightLoading(true)
    setDailyInsightError('')
    try {
      const res = await fetch(`${API_BASE}/api/insights/daily/recompute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date: selectedDate.toISOString() }),
      })

      if (!res.ok) {
        setDailyInsightError('Could not recompute daily insights.')
        return
      }

      const json = await res.json().catch(() => null)
      setDailyInsight(json)
    } catch (err) {
      console.error('Failed to recompute daily insights:', err)
      setDailyInsightError('Could not recompute daily insights.')
    } finally {
      setDailyInsightLoading(false)
    }
  }

  const shiftDay = (deltaDays) => {
    setSelectedDate(prev => {
      const next = new Date(prev)
      next.setDate(next.getDate() + deltaDays)
      next.setHours(0, 0, 0, 0)
      return next
    })
  }

  const formatDay = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const buildDailyNutritionSummary = (insight) => {
    const mealsCount = Number(insight?.mealsCount) || 0
    const totals = insight?.dailyTotalsLogged || {}
    const calories = Number(totals?.calories) || 0
    const protein = Number(totals?.protein) || 0
    const fiber = Number(totals?.fiber) || 0
    const sugar = Number(totals?.sugar) || 0
    const sodium = Number(totals?.sodium) || 0
    const waterMl = Number(insight?.waterIntake) || 0

    if (mealsCount === 0 && calories === 0) return ''

    const calorieTarget = Number(user?.dailyCalorieTarget) || 0
    const proteinTarget = Number(user?.dailyProteinTarget) || 0

    const goalBucket = (actual, target, withinFrac) => {
      if (!target || !actual) return null
      const frac = Math.abs(actual - target) / target
      if (frac <= withinFrac) return 'on track'
      if (actual > target) return 'high'
      return 'low'
    }

    const parts = []
    if (calorieTarget > 0 && calories > 0) {
      const b = goalBucket(calories, calorieTarget, 0.07)
      parts.push(`calories ${b}`)
    } else if (calories > 0) {
      parts.push(`calories ${Math.round(calories)} kcal`)
    }

    if (proteinTarget > 0 && protein > 0) {
      const b = goalBucket(protein, proteinTarget, 0.10)
      parts.push(`protein ${b}`)
    } else if (protein > 0) {
      parts.push(`protein ${Math.round(protein)}g`)
    }

    const quality = []
    if (fiber > 0) quality.push(fiber < 20 ? 'fiber low' : fiber >= 25 ? 'fiber strong' : 'fiber ok')
    if (sodium > 0) quality.push(sodium > 2300 ? 'sodium high' : 'sodium ok')
    if (sugar > 0) quality.push(sugar > 60 ? 'sugar high' : 'sugar ok')
    if (waterMl > 0) quality.push(waterMl < 1500 ? 'hydration low' : 'hydration ok')

    const left = parts.length ? parts.join(' • ') : 'logged'
    const right = quality.length ? ` — ${quality.join(', ')}` : ''
    return `${left}${right}`
  }

  const buildEvidencePrompts = (daily) => {
    const prompts = []
    const totals = daily?.nutrition?.dailyTotalsLogged || {}
    const waterMl = Number(daily?.nutrition?.waterIntake) || 0
    const sodium = Number(totals?.sodium) || 0
    const sugar = Number(totals?.sugar) || 0
    const highGly = Number(daily?.nutrition?.mealSignals?.high_glycemic_proxy_meals) || 0

    const symptomItems = Array.isArray(daily?.symptoms?.items) ? daily.symptoms.items : []
    const labItems = Array.isArray(daily?.labs?.items) ? daily.labs.items : []

    const topSymptom = symptomItems.length
      ? [...symptomItems].sort((a, b) => (Number(b?.severity) || 0) - (Number(a?.severity) || 0))[0]
      : null

    if (topSymptom?.symptomName) {
      const name = String(topSymptom.symptomName).toLowerCase()
      const sev = Number(topSymptom?.severity)

      // Simple context-aware prompts (non-causal).
      if (name.includes('headache') && waterMl > 0) {
        prompts.push(waterMl < 1500
          ? 'You had a headache around this time; hydration was low that day — see if headaches cluster on low-water days.'
          : 'You had a headache around this time — consider tracking hydration/caffeine/alcohol and meal timing to spot patterns.')
      } else if ((name.includes('bloat') || name.includes('gas') || name.includes('reflux') || name.includes('heartburn')) && highGly > 0) {
        prompts.push('GI symptoms are nearby; this day has some high-glycemic meals — if it repeats, try logging meal timing + trigger foods to compare days.')
      } else {
        prompts.push('A symptom is nearby — if it repeats, tag likely context (sleep, hydration, caffeine/alcohol, stress, meal timing) so patterns can emerge.')
      }

      if (Number.isFinite(sev) && sev >= 7) {
        prompts.push('Severity is high — treat this as a signal to track a few basics consistently for a week (sleep, water, caffeine, meal timing) and compare.')
      }
    }

    const newestLab = labItems.length ? labItems[0] : null
    const abnormal = Array.isArray(newestLab?.results)
      ? newestLab.results.filter(r => r?.flag === 'high' || r?.flag === 'low')
      : []

    if (newestLab?.panelName) {
      if (abnormal.length > 0) {
        const topFlags = abnormal.slice(0, 2).map(r => `${r?.name} (${r?.flag})`).filter(Boolean)
        if (topFlags.length > 0) prompts.push(`Lab shows flagged markers: ${topFlags.join(', ')}. Consider reviewing the full panel for context.`)

        const names = abnormal.map(r => String(r?.name || '').toLowerCase()).join(' | ')
        if (/(ldl|hdl|triglycer|cholesterol)/.test(names)) {
          prompts.push('If lipid markers are flagged, compare higher-fiber days vs lower-fiber days and note saturated-fat-heavy meals (pattern tracking, not diagnosis).')
        } else if (/(glucose|hba1c|a1c|insulin)/.test(names)) {
          prompts.push('If glucose markers are flagged, compare days with more high-glycemic meals vs balanced meals (protein/fiber alongside carbs).')
        } else if (/(ferritin|iron|hemoglobin|b12|folate)/.test(names)) {
          prompts.push('If iron/B-vitamin markers are flagged, consider tracking iron-rich foods and pairing with vitamin C (and review clinician guidance if you have it).')
        }
      } else {
        prompts.push('A lab panel is nearby — if you mark results as high/low, this view can surface nutrition-related patterns without guessing.')
      }
    }

    // Soft prompt if quality markers are notable.
    if (sodium > 2300 && waterMl > 0) prompts.push('Sodium was high — if symptoms recur, see whether high-sodium days coincide (context only).')
    if (sugar > 60) prompts.push('Sugar was high — if energy/mood swings are a theme, compare lower-sugar days vs higher-sugar days.')

    return prompts.filter(Boolean).slice(0, 4)
  }

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

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#6b7280' }}>
                  Daily nutrition insights
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                  {formatDay(selectedDate)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton size="small" onClick={() => shiftDay(-1)} aria-label="Previous day">
                  <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    const d = new Date()
                    d.setHours(0, 0, 0, 0)
                    setSelectedDate(d)
                  }}
                  aria-label="Today"
                >
                  <TodayIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton size="small" onClick={() => shiftDay(1)} aria-label="Next day">
                  <ArrowForwardIosIcon sx={{ fontSize: 16 }} />
                </IconButton>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.75 }} />
                <Button
                  size="small"
                  variant="text"
                  onClick={recomputeDailyInsight}
                  disabled={dailyInsightLoading}
                  sx={{ textTransform: 'none', color: '#111827' }}
                >
                  Recompute
                </Button>
              </Box>
            </Box>

            {dailyInsightLoading && <LinearProgress sx={{ height: 6, borderRadius: 99, mb: 1 }} />}

            {dailyInsightError && (
              <Typography variant="caption" sx={{ color: '#b91c1c', display: 'block' }}>
                {dailyInsightError}
              </Typography>
            )}

            {!dailyInsightLoading && !dailyInsightError && dailyInsight?.status === 'no_data' && (
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                No meals logged for this day yet. Log meals in Nutrition to see insights here.
              </Typography>
            )}

            {!dailyInsightLoading && !dailyInsightError && dailyInsight?.nutrition && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {(() => {
                  const summary = buildDailyNutritionSummary(dailyInsight?.nutrition)
                  if (!summary) return null
                  return (
                    <Typography variant="caption" sx={{ color: '#111827', display: 'block', fontWeight: 600 }}>
                      Summary: {summary}.
                    </Typography>
                  )
                })()}

                {Array.isArray(dailyInsight.nutrition.bullets) && dailyInsight.nutrition.bullets.length > 0 ? (
                  <Box>
                    {dailyInsight.nutrition.bullets.slice(0, 6).map((b, i) => (
                      <Typography key={i} variant="caption" sx={{ color: '#374151', display: 'block' }}>
                        • {b}
                      </Typography>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                    No insights computed yet.
                  </Typography>
                )}

                {((Array.isArray(dailyInsight?.symptoms?.items) && dailyInsight.symptoms.items.length > 0) ||
                  (Array.isArray(dailyInsight?.labs?.items) && dailyInsight.labs.items.length > 0)) && (
                  <Box sx={{ mt: 0.5, p: 1.25, borderRadius: 1.5, border: '1px solid #e5e7eb', bgcolor: '#f9fafb' }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', fontWeight: 600, mb: 0.5 }}>
                      Nearby evidence (not causation){
                        (() => {
                          const sw = Number(dailyInsight?.symptoms?.windowDays)
                          const lw = Number(dailyInsight?.labs?.windowDays)
                          const parts = []
                          if (Number.isFinite(sw) && sw > 0) parts.push(`symptoms ±${sw}d`)
                          if (Number.isFinite(lw) && lw > 0) parts.push(`labs ±${lw}d`)
                          return parts.length ? ` — ${parts.join(', ')}` : ''
                        })()
                      }
                    </Typography>

                    {Array.isArray(dailyInsight?.symptoms?.items) && dailyInsight.symptoms.items.length > 0 ? (
                      (() => {
                        const top = [...dailyInsight.symptoms.items]
                          .sort((a, b) => (Number(b?.severity) || 0) - (Number(a?.severity) || 0))[0]
                        if (!top?.symptomName) return null
                        const sev = top?.severity
                        const ds = top?.date ? new Date(top.date).toLocaleDateString() : ''
                        return (
                          <Typography variant="caption" sx={{ color: '#374151', display: 'block' }}>
                            Symptom nearby: {top.symptomName}{Number.isFinite(sev) ? ` (${sev}/10)` : ''}{ds ? ` • ${ds}` : ''}
                          </Typography>
                        )
                      })()
                    ) : null}

                    {Array.isArray(dailyInsight?.labs?.items) && dailyInsight.labs.items.length > 0 ? (
                      (() => {
                        const top = dailyInsight.labs.items[0]
                        if (!top?.panelName) return null
                        const ds = top?.date ? new Date(top.date).toLocaleDateString() : ''
                        return (
                          <Typography variant="caption" sx={{ color: '#374151', display: 'block' }}>
                            Lab nearby: {top.panelName}{ds ? ` • ${ds}` : ''}
                          </Typography>
                        )
                      })()
                    ) : null}

                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.5 }}>
                      These are time-adjacent logs shown for context only.
                    </Typography>

                    {(() => {
                      const prompts = buildEvidencePrompts(dailyInsight)
                      if (!prompts.length) return null
                      return (
                        <Box sx={{ mt: 0.75 }}>
                          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', fontWeight: 600, mb: 0.25 }}>
                            Evidence insights (non-causal)
                          </Typography>
                          {prompts.map((p, idx) => (
                            <Typography key={idx} variant="caption" sx={{ color: '#4b5563', display: 'block' }}>
                              - {p}
                            </Typography>
                          ))}
                        </Box>
                      )
                    })()}
                  </Box>
                )}

                {dailyInsight?.narrative?.text && (
                  <Typography variant="caption" sx={{ color: '#374151', whiteSpace: 'pre-wrap' }}>
                    {dailyInsight.narrative.text}
                  </Typography>
                )}

                <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                  Generated from your logged meals for the selected day.
                </Typography>
              </Box>
            )}
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

import { useMemo, useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'
import { computeTrainingInsights } from '../lib/trainingInsights'

// Sub-components
import TrainingTab from './Trends/TrainingTab'
import NutritionTab from './Trends/NutritionTab'
import WellnessTab from './Trends/WellnessTab'
import LearningTab from './Trends/LearningTab'

// Global cache to prevent re-fetching on tab switch
let trendsCache = {
  data: null,
  journal: null,
  lifeState: {}, // key -> state
  nutritionReview: {}, // key -> review
  learning: null,
  token: null
}

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

  const defaultWellnessDayKey = useMemo(() => {
    const dt = new Date()
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  const [wellnessDayKey, setWellnessDayKey] = useState(defaultWellnessDayKey)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [data, setData] = useState(trendsCache.data || { fitness: [], nutrition: [], mental: [], workouts: [] })

  const [checkinInsight, setCheckinInsight] = useState(null)
  const [journalInsight, setJournalInsight] = useState(null)
  const [nutritionInsight, setNutritionInsight] = useState(null)

  const [journalToday, setJournalToday] = useState('')
  const [journalTodayLoading, setJournalTodayLoading] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)

  const [learningOverview, setLearningOverview] = useState(trendsCache.learning || null)
  const [learningLoading, setLearningLoading] = useState(activeTab === 3 && !trendsCache.learning)
  const [learningError, setLearningError] = useState('')

  const { token, user } = useAuth()

  const [todayLifeState, setTodayLifeState] = useState(trendsCache.lifeState[wellnessDayKey]?.json || null)
  const [todayLifeStateReflection, setTodayLifeStateReflection] = useState(trendsCache.lifeState[wellnessDayKey]?.reflection || '')
  const [todayLifeStateLoading, setTodayLifeStateLoading] = useState(activeTab === 2 && !trendsCache.lifeState[wellnessDayKey])
  const [todayLifeStateError, setTodayLifeStateError] = useState('')

  const [nutritionReview, setNutritionReview] = useState(trendsCache.nutritionReview[wellnessDayKey]?.json || null)
  const [nutritionReviewNarration, setNutritionReviewNarration] = useState(trendsCache.nutritionReview[wellnessDayKey]?.narration || '')
  const [nutritionReviewLoading, setNutritionReviewLoading] = useState(activeTab === 2 && !trendsCache.nutritionReview[wellnessDayKey])
  const [nutritionReviewError, setNutritionReviewError] = useState('')

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

      if (trendsCache.journal && trendsCache.token === token) {
        setJournalToday(trendsCache.journal)
      } else {
        setJournalTodayLoading(true)
      }
      
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
        const txt = todayEntry?.text || ''
        setJournalToday(txt)
        trendsCache.journal = txt
        trendsCache.token = token
      } catch (err) {
        console.error('Failed to fetch journal:', err)
      } finally {
        setJournalTodayLoading(false)
      }
    }
    fetchTodaysJournal()
  }, [token, activeTab])

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      try {
        const [fitRes, nutRes, menRes, gymRes] = await Promise.all([
          fetch(`${API_BASE}/api/fitness`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/nutrition/daily-summaries?days=7`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/mental`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/gym/workouts?limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const fit = await fitRes.json().catch(() => [])
        const nut = await nutRes.json().catch(() => [])
        const men = await menRes.json().catch(() => [])
        const workouts = await gymRes.json().catch(() => [])

        const normalizedNutrition = Array.isArray(nut) 
          ? nut.map(n => ({
              date: n.date,
              totalCalories: n.calories || 0,
              totalProtein: n.protein || 0,
              totalCarbs: n.carbs || 0,
              totalFat: n.fat || 0
            }))
          : []

        const newData = {
          fitness: Array.isArray(fit) ? fit.slice(0, 7) : [],
          nutrition: normalizedNutrition.slice(0, 7),
          mental: Array.isArray(men) ? men.slice(0, 7) : [],
          workouts: Array.isArray(workouts) ? workouts.slice(0, 50) : [],
        }
        setData(newData)
        trendsCache.data = newData
        trendsCache.token = token
      } catch (err) {
        console.error('Failed to fetch trends:', err)
      }
    }
    fetchData()
  }, [token])

  useEffect(() => {
    const fetchLearning = async () => {
      if (!token || activeTab !== 3 || trendsCache.learning) return
      setLearningLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/insights/learning/overall?days=120`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch learning overview')
        const json = await res.json()
        setLearningOverview(json)
        trendsCache.learning = json
      } catch (err) {
        setLearningError(err.message)
      } finally {
        setLearningLoading(false)
      }
    }
    fetchLearning()
  }, [token, activeTab])

  useEffect(() => {
    const fetchStates = async () => {
      if (!token || activeTab !== 2) return
      if (trendsCache.lifeState[wellnessDayKey] && trendsCache.nutritionReview[wellnessDayKey]) {
        setTodayLifeState(trendsCache.lifeState[wellnessDayKey].json)
        setTodayLifeStateReflection(trendsCache.lifeState[wellnessDayKey].reflection)
        setNutritionReview(trendsCache.nutritionReview[wellnessDayKey].json)
        setNutritionReviewNarration(trendsCache.nutritionReview[wellnessDayKey].narration)
        return
      }

      setTodayLifeStateLoading(true)
      setNutritionReviewLoading(true)

      try {
        const [stateRes, reviewRes] = await Promise.all([
          fetch(`${API_BASE}/api/daily-life-state/${wellnessDayKey}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/insights/nutrition/review?dayKey=${encodeURIComponent(wellnessDayKey)}&narrate=1`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ])

        if (stateRes.ok) {
          const reflection = stateRes.headers.get('X-LifeSync-State-Reflection') || ''
          const json = await stateRes.json()
          setTodayLifeState(json)
          setTodayLifeStateReflection(reflection)
          trendsCache.lifeState[wellnessDayKey] = { json, reflection }
        }

        if (reviewRes.ok) {
          const json = await reviewRes.json()
          setNutritionReview(json?.review || null)
          setNutritionReviewNarration(json?.narration || '')
          trendsCache.nutritionReview[wellnessDayKey] = { json: json?.review || null, narration: json?.narration || '' }
        }
      } catch (err) {
        console.error('Failed to fetch wellness states:', err)
      } finally {
        setTodayLifeStateLoading(false)
        setNutritionReviewLoading(false)
      }
    }
    fetchStates()
  }, [token, activeTab, wellnessDayKey])

  const trainingInsights = useMemo(() => computeTrainingInsights(data.workouts), [data.workouts])

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
    if (!token || !latestMentalLog) return
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
    if (!token || !journalToday || !journalToday.trim()) return
    setAiGenerating(true)
    try {
      const message = [
        'Based on today’s journal entry, give me ONE key insight and ONE specific action I should take today.',
        'Be concise and personal.',
        '',
        journalToday,
      ].join('\n')

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        alert('Failed to generate insight. Please try again.')
        return
      }

      const json = await res.json().catch(() => null)
      const text = json?.reply || json?.message || 'No AI reply returned.'
      saveInsight('lifesync:insights:journal', text, { source: 'journal', forDate: new Date().toISOString() })
    } catch {
      alert('Failed to generate insight. Please try again.')
    } finally {
      setAiGenerating(false)
    }
  }

  const calcAvg = (arr, key) => {
    const values = (arr || []).map(item => item[key]).filter(v => v != null && typeof v === 'number');
    if (!values.length) return 0;
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }

  const detectPatterns = useCallback((mental, fitness) => {
    const patterns = []
    if (!Array.isArray(mental) || mental.length < 2) return patterns
    const sortedMental = [...mental].sort((a, b) => new Date(a.date) - new Date(b.date))

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
        patterns.push({
          insight: chain.join(' → '),
          action: 'Prioritize 7.5h sleep tonight to break the cycle.',
        })
      }
    }

    if (calcAvg(mental, 'moodScore') > 7 && fitness.length >= 3) {
      patterns.push({
        insight: 'High activity + High mood',
        action: 'Keep it up! More data = better personalization.',
      })
    }
    return patterns.slice(0, 3)
  }, [])

  const patterns = useMemo(() => detectPatterns(data.mental, data.fitness), [data.mental, data.fitness, detectPatterns])

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>Insights</Typography>
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>Insights from your logged data</Typography>

      <Box sx={{ borderBottom: '1px solid #e5e7eb', mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              minHeight: { xs: 48, sm: 48 },
              color: 'text.secondary',
              '&.Mui-selected': { color: 'text.primary' },
            },
            '& .MuiTabs-indicator': { bgcolor: 'text.primary', height: 2 },
          }}
        >
          <Tab label="Training" />
          <Tab label="Nutrition" />
          <Tab label="Wellness" />
          <Tab label="Overall Learning" />
        </Tabs>
      </Box>

      {activeTab === 0 && <TrainingTab data={data} trainingInsights={trainingInsights} calcAvg={calcAvg} />}
      {activeTab === 1 && <NutritionTab data={data} nutritionInsight={nutritionInsight} calcAvg={calcAvg} />}
      {activeTab === 2 && (
        <WellnessTab
          wellnessDayKey={wellnessDayKey}
          setWellnessDayKey={setWellnessDayKey}
          defaultWellnessDayKey={defaultWellnessDayKey}
          todayLifeState={todayLifeState}
          setTodayLifeState={setTodayLifeState}
          todayLifeStateReflection={todayLifeStateReflection}
          setTodayLifeStateReflection={setTodayLifeStateReflection}
          todayLifeStateLoading={todayLifeStateLoading}
          setTodayLifeStateLoading={setTodayLifeStateLoading}
          todayLifeStateError={todayLifeStateError}
          setTodayLifeStateError={setTodayLifeStateError}
          nutritionReview={nutritionReview}
          setNutritionReview={setNutritionReview}
          nutritionReviewNarration={nutritionReviewNarration}
          setNutritionReviewNarration={setNutritionReviewNarration}
          nutritionReviewLoading={nutritionReviewLoading}
          setNutritionReviewLoading={setNutritionReviewLoading}
          nutritionReviewError={nutritionReviewError}
          setNutritionReviewError={setNutritionReviewError}
          token={token}
          API_BASE={API_BASE}
          checkinInsight={checkinInsight}
          generateCheckinInsight={generateCheckinInsight}
          journalInsight={journalInsight}
          generateJournalInsight={generateJournalInsight}
          journalToday={journalToday}
          journalTodayLoading={journalTodayLoading}
          aiGenerating={aiGenerating}
          latestMentalLog={latestMentalLog}
          patterns={patterns}
          data={data}
          calcAvg={calcAvg}
        />
      )}
      {activeTab === 3 && (
        <LearningTab
          learningOverview={learningOverview}
          setLearningOverview={setLearningOverview}
          learningLoading={learningLoading}
          setLearningLoading={setLearningLoading}
          learningError={learningError}
          setLearningError={setLearningError}
          token={token}
          API_BASE={API_BASE}
        />
      )}

      {data.fitness.length === 0 && data.nutrition.length === 0 && data.mental.length === 0 && activeTab !== 3 && (
        <Box sx={{ p: 6, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2, border: '1px solid #e5e7eb', mt: 3 }}>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>No data yet</Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>Start logging your activities to see trends here</Typography>
        </Box>
      )}
    </Box>
  )
}

export default TrendsPanel

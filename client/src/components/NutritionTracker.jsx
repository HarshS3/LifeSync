import { useState, useEffect, useMemo, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import LocalDiningIcon from '@mui/icons-material/LocalDining'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import TodayIcon from '@mui/icons-material/Today'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

const MEAL_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'pre-workout',
  'post-workout',
]

const EMPTY_TOTALS = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
  potassium: 0,
  iron: 0,
  calcium: 0,
  vitaminB: 0,
  magnesium: 0,
  zinc: 0,
  vitaminC: 0,
  omega3: 0,
}

function NutritionTracker() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [log, setLog] = useState({ meals: [], waterIntake: 0, dailyTotals: EMPTY_TOTALS, notes: '' })
  const [loading, setLoading] = useState(false)

  const [nutritionInsight, setNutritionInsight] = useState(null)
  const [nutritionInsightGenerating, setNutritionInsightGenerating] = useState(false)

  const [mealSuggestions, setMealSuggestions] = useState('')
  const [mealSuggestionsGenerating, setMealSuggestionsGenerating] = useState(false)

  const [foodSearchQuery, setFoodSearchQuery] = useState('')
  const [foodResults, setFoodResults] = useState([])
  const [foodSearchLoading, setFoodSearchLoading] = useState(false)

  const [selectedFoodForAnalysis, setSelectedFoodForAnalysis] = useState('')
  const [foodAnalysis, setFoodAnalysis] = useState(null)
  const [foodAnalysisLoading, setFoodAnalysisLoading] = useState(false)
  const [foodAnalysisError, setFoodAnalysisError] = useState('')

  const [nutritionStats, setNutritionStats] = useState(null)
  const [nutritionStatsLoading, setNutritionStatsLoading] = useState(false)
  const [rangeDaysLogged, setRangeDaysLogged] = useState(null)

  const [weightValue, setWeightValue] = useState('')
  const [weightLoading, setWeightLoading] = useState(false)
  const [weightSaving, setWeightSaving] = useState(false)
  const [weightError, setWeightError] = useState('')
  const [weightRangeMode, setWeightRangeMode] = useState('week')
  const [weightSeries, setWeightSeries] = useState([])

  const [resolvedFood, setResolvedFood] = useState(null)
  const [resolvedFoodLoading, setResolvedFoodLoading] = useState(false)
  const [foodGraph, setFoodGraph] = useState(null)
  const [foodGraphLoading, setFoodGraphLoading] = useState(false)
  const [foodCausal, setFoodCausal] = useState(null)
  const [foodCausalLoading, setFoodCausalLoading] = useState(false)
  const [hypothesesCount, setHypothesesCount] = useState(null)
  const [hypothesesLoading, setHypothesesLoading] = useState(false)

  const foodPipelineRunIdRef = useRef(0)

  const [newMeal, setNewMeal] = useState({
    name: '',
    mealType: 'breakfast',
    time: '',
    foods: [
      {
        name: '',
        quantity: '',
        unit: 'g',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        fiber: '',
        sugar: '',
        sodium: '',
        potassium: '',
        iron: '',
        calcium: '',
        vitaminB: '',
        magnesium: '',
        zinc: '',
        vitaminC: '',
        omega3: '',
      },
    ],
    notes: '',
  })

  const calorieTarget = user?.dailyCalorieTarget || 2000
  const proteinTarget = user?.dailyProteinTarget || 120

  useEffect(() => {
    const readLocalInsight = () => {
      try {
        const raw = localStorage.getItem('lifesync:insights:nutrition')
        setNutritionInsight(raw ? JSON.parse(raw) : null)
      } catch {
        setNutritionInsight(null)
      }
    }

    readLocalInsight()
    const handler = () => readLocalInsight()
    window.addEventListener('lifesync:insights:updated', handler)
    return () => window.removeEventListener('lifesync:insights:updated', handler)
  }, [])

  useEffect(() => {
    if (!token) return
    loadDay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedDate])

  useEffect(() => {
    setMealSuggestions('')
  }, [selectedDate])

  useEffect(() => {
    if (!token) return
    if (activeTab !== 2) return
    loadSummaryStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab])

  useEffect(() => {
    if (!token) return
    if (activeTab !== 1) return
    loadWeightDayAndRange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab, selectedDate, weightRangeMode])

  const getAuthHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {})

  const safeReadJson = async (res) => {
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  const loadWeightDayAndRange = async () => {
    setWeightLoading(true)
    setWeightError('')
    try {
      const headers = getAuthHeaders()
      const dateStr = selectedDate.toISOString()

      const end = new Date(selectedDate)
      end.setHours(23, 59, 59, 999)
      const start = new Date(end)
      start.setDate(start.getDate() - (weightRangeMode === 'month' ? 30 : 7) + 1)
      start.setHours(0, 0, 0, 0)

      const [dayRes, rangeRes] = await Promise.all([
        fetch(`${API_BASE}/api/nutrition/weight/date/${encodeURIComponent(dateStr)}`, { headers }),
        fetch(
          `${API_BASE}/api/nutrition/weight/range/${encodeURIComponent(start.toISOString())}/${encodeURIComponent(end.toISOString())}`,
          { headers }
        ),
      ])

      if (dayRes.ok) {
        const dayData = await safeReadJson(dayRes)
        const w = dayData?.weightKg
        setWeightValue(w == null ? '' : String(w))
      }

      if (rangeRes.ok) {
        const arr = await safeReadJson(rangeRes)
        setWeightSeries(Array.isArray(arr) ? arr : [])
      }
    } catch (e) {
      setWeightError(e?.message || 'Failed to load weight')
    } finally {
      setWeightLoading(false)
    }
  }

  const saveWeight = async () => {
    if (!token) return
    const w = Number(weightValue)
    if (!Number.isFinite(w) || w <= 0) {
      setWeightError('Enter a valid weight')
      return
    }
    setWeightSaving(true)
    setWeightError('')
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/weight`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate.toISOString(), weightKg: w }),
      })
      if (!res.ok) {
        const errJson = await safeReadJson(res)
        throw new Error(errJson?.error || `Failed to save (${res.status})`)
      }
      await loadWeightDayAndRange()
    } catch (e) {
      setWeightError(e?.message || 'Failed to save weight')
    } finally {
      setWeightSaving(false)
    }
  }

  const buildWeightChart = ({ start, days, series }) => {
    const byDay = new Map()
    ;(series || []).forEach((d) => {
      const dt = new Date(d?.date)
      if (Number.isNaN(dt.getTime())) return
      dt.setHours(0, 0, 0, 0)
      const key = dt.toISOString().slice(0, 10)
      const w = d?.weightKg
      if (typeof w === 'number' && Number.isFinite(w)) byDay.set(key, w)
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
      min = min - 1
      max = max + 1
    }

    const W = 560
    const H = 200
    const M = {
      left: 52,
      right: 16,
      top: 16,
      bottom: 44,
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

  const loadSummaryStats = async () => {
    setNutritionStatsLoading(true)
    try {
      const headers = getAuthHeaders()

      const [statsRes, rangeRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/nutrition/stats`, { headers }),
        (() => {
          const end = new Date()
          end.setHours(23, 59, 59, 999)
          const start = new Date(end)
          start.setDate(start.getDate() - 30)
          start.setHours(0, 0, 0, 0)
          return fetch(
            `${API_BASE}/api/nutrition/logs/range/${encodeURIComponent(start.toISOString())}/${encodeURIComponent(end.toISOString())}`,
            { headers }
          )
        })(),
      ])

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = await safeReadJson(statsRes.value)
        setNutritionStats(data)
      }

      if (rangeRes.status === 'fulfilled' && rangeRes.value.ok) {
        const logs = await safeReadJson(rangeRes.value)
        setRangeDaysLogged(Array.isArray(logs) ? logs.length : null)
      }
    } catch (err) {
      console.error('Failed to load nutrition summary stats:', err)
    } finally {
      setNutritionStatsLoading(false)
    }
  }


  const loadDay = async () => {
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString()
      if (!user || !user._id) {
        setLog({ meals: [], waterIntake: 0, dailyTotals: { ...EMPTY_TOTALS }, notes: '' })
        return
      }
      const res = await fetch(`${API_BASE}/api/nutrition/logs/date/${encodeURIComponent(dateStr)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setLog({
          meals: data.meals || [],
          waterIntake: data.waterIntake || 0,
          dailyTotals: data.dailyTotals || { ...EMPTY_TOTALS },
          notes: data.notes || '',
          _id: data._id,
        })
      } else {
        setLog({ meals: [], waterIntake: 0, dailyTotals: { ...EMPTY_TOTALS }, notes: '' })
      }
    } catch (err) {
      console.error('Failed to load nutrition log:', err)
      setLog({ meals: [], waterIntake: 0, dailyTotals: { ...EMPTY_TOTALS }, notes: '' })
    }
    setLoading(false)
  }

  const changeDay = (delta) => {
    setSelectedDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + delta)
      d.setHours(0, 0, 0, 0)
      return d
    })
  }

  const goToday = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setSelectedDate(d)
  }

  const updateFoodField = (index, field, value) => {
    setNewMeal(prev => {
      const updated = { ...prev }
      updated.foods = prev.foods.map((f, i) => (i === index ? { ...f, [field]: value } : f))
      return updated
    })
  }

  const addFoodRow = () => {
    setNewMeal(prev => ({
      ...prev,
      foods: [
        ...prev.foods,
        {
          name: '',
          quantity: '',
          unit: 'g',
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
          fiber: '',
          sugar: '',
          sodium: '',
          potassium: '',
          iron: '',
          calcium: '',
          vitaminB: '',
          magnesium: '',
          zinc: '',
          vitaminC: '',
          omega3: '',
        },
      ],
    }))
  }

  const applyFoodResultToRow = (food, index = 0) => {
    setNewMeal(prev => {
      const foods = [...prev.foods]
      const row = foods[index] || {
        name: '',
        quantity: '',
        unit: 'g',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        fiber: '',
        sugar: '',
        sodium: '',
        potassium: '',
        iron: '',
        calcium: '',
        vitaminB: '',
        magnesium: '',
        zinc: '',
        vitaminC: '',
        omega3: '',
      }
      foods[index] = {
        ...row,
        name: food.name,
        quantity: food.servingQty || 1,
        unit: food.servingUnit || 'serving',
        calories: food.calories || '',
        protein: food.protein || '',
        carbs: food.carbs || '',
        fat: food.fat || '',
        fiber: food.fiber || '',
        sugar: food.sugar || '',
        sodium: food.sodium || '',
        potassium: food.potassium || '',
        iron: food.iron || '',
        calcium: food.calcium || '',
        vitaminB: food.vitaminB || '',
        magnesium: food.magnesium || '',
        zinc: food.zinc || '',
        vitaminC: food.vitaminC || '',
        omega3: food.omega3 || '',
      }
      return { ...prev, foods }
    })
  }

  const searchFoods = async () => {
    if (!foodSearchQuery.trim()) return
    try {
      setFoodSearchLoading(true)
      setFoodResults([])
      setSelectedFoodForAnalysis('')
      setFoodAnalysis(null)
      setFoodAnalysisError('')
      const params = new URLSearchParams({ q: foodSearchQuery.trim() })
      const res = await fetch(`${API_BASE}/api/nutrition/search?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setFoodResults(Array.isArray(data) ? data.slice(0, 10) : [])
        if (Array.isArray(data) && data[0]?.name) setSelectedFoodForAnalysis(String(data[0].name))
      }
    } catch (err) {
      console.error('Food search failed:', err)
    } finally {
      setFoodSearchLoading(false)
    }
  }

  const queueAdvancedFoodFetches = async ({ q, canonicalId }) => {
    if (!token) return
    const runId = ++foodPipelineRunIdRef.current
    const headers = getAuthHeaders()

    setResolvedFoodLoading(true)
    setFoodGraphLoading(true)
    setFoodCausalLoading(true)
    setHypothesesLoading(true)

    try {
      const resolveParams = new URLSearchParams({ q })
      const graphParams = new URLSearchParams({ canonical_id: canonicalId || '' })
      const causalParams = new URLSearchParams({ canonical_id: canonicalId || '' })

      const [resolveRes, graphRes, causalRes, hypoRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/nutrition/food/resolve?${resolveParams.toString()}`, { headers }),
        canonicalId ? fetch(`${API_BASE}/api/nutrition/food/graph?${graphParams.toString()}`, { headers }) : Promise.resolve(null),
        canonicalId ? fetch(`${API_BASE}/api/nutrition/food/causal?${causalParams.toString()}`, { headers }) : Promise.resolve(null),
        fetch(`${API_BASE}/api/nutrition/hypotheses`, { headers }),
      ])

      if (foodPipelineRunIdRef.current !== runId) return

      if (resolveRes.status === 'fulfilled' && resolveRes.value?.ok) {
        setResolvedFood(await safeReadJson(resolveRes.value))
      } else {
        setResolvedFood(null)
      }

      if (graphRes.status === 'fulfilled' && graphRes.value?.ok) {
        setFoodGraph(await safeReadJson(graphRes.value))
      } else {
        setFoodGraph(null)
      }

      if (causalRes.status === 'fulfilled' && causalRes.value?.ok) {
        setFoodCausal(await safeReadJson(causalRes.value))
      } else {
        setFoodCausal(null)
      }

      if (hypoRes.status === 'fulfilled' && hypoRes.value?.ok) {
        const hypos = await safeReadJson(hypoRes.value)
        setHypothesesCount(Array.isArray(hypos) ? hypos.length : null)
      } else {
        setHypothesesCount(null)
      }
    } catch (err) {
      console.error('Advanced nutrition pipeline fetch failed:', err)
    } finally {
      if (foodPipelineRunIdRef.current === runId) {
        setResolvedFoodLoading(false)
        setFoodGraphLoading(false)
        setFoodCausalLoading(false)
        setHypothesesLoading(false)
      }
    }
  }

  const analyzeSelectedFood = async ({ includeLLM = false } = {}) => {
    const q = (selectedFoodForAnalysis || foodSearchQuery || '').trim()
    if (!q) return
    try {
      setFoodAnalysisLoading(true)
      setFoodAnalysis(null)
      setFoodAnalysisError('')
      const params = new URLSearchParams({ q })
      if (includeLLM) params.set('includeLLM', '1')

      const headers = getAuthHeaders()

      // Primary: GET
      const res = await fetch(`${API_BASE}/api/nutrition/food/analyze?${params.toString()}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setFoodAnalysis(data)
        queueAdvancedFoodFetches({ q, canonicalId: data?.canonical_id })
        return
      }

      // Fallback: POST (covers backend POST /food/analyze)
      const postRes = await fetch(`${API_BASE}/api/nutrition/food/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ foodName: q, includeLLM }),
      })
      if (!postRes.ok) {
        const errJson = await postRes.json().catch(() => null)
        setFoodAnalysisError(errJson?.error || 'Food analysis failed')
        return
      }
      const data = await postRes.json()
      setFoodAnalysis(data)
      queueAdvancedFoodFetches({ q, canonicalId: data?.canonical_id })
    } catch (err) {
      console.error('Food analysis failed:', err)
      setFoodAnalysisError('Food analysis failed')
    } finally {
      setFoodAnalysisLoading(false)
    }
  }

  const resetNewMeal = () => {
    setNewMeal({
      name: '',
      mealType: 'breakfast',
      time: '',
      foods: [
        {
          name: '',
          quantity: '',
          unit: 'g',
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
          fiber: '',
          sugar: '',
          sodium: '',
          potassium: '',
          iron: '',
          calcium: '',
          vitaminB: '',
          magnesium: '',
          zinc: '',
          vitaminC: '',
          omega3: '',
        },
      ],
      notes: '',
    })
  }

  const addMealToDay = () => {
    if (!newMeal.name.trim()) return

    const foods = newMeal.foods.map(f => ({
      ...f,
      quantity: Number(f.quantity) || 0,
      calories: Number(f.calories) || 0,
      protein: Number(f.protein) || 0,
      carbs: Number(f.carbs) || 0,
      fat: Number(f.fat) || 0,
      fiber: Number(f.fiber) || 0,
      sugar: Number(f.sugar) || 0,
      sodium: Number(f.sodium) || 0,
      potassium: Number(f.potassium) || 0,
      iron: Number(f.iron) || 0,
      calcium: Number(f.calcium) || 0,
      vitaminB: Number(f.vitaminB) || 0,
      magnesium: Number(f.magnesium) || 0,
      zinc: Number(f.zinc) || 0,
      vitaminC: Number(f.vitaminC) || 0,
      omega3: Number(f.omega3) || 0,
    }))

    const meal = {
      name: newMeal.name.trim(),
      mealType: newMeal.mealType,
      time: newMeal.time,
      foods,
      notes: newMeal.notes,
    }

    setLog(prev => ({
      ...prev,
      meals: [...prev.meals, meal],
    }))

    resetNewMeal()
  }

  const handleWaterChange = (delta) => {
    setLog(prev => ({
      ...prev,
      waterIntake: Math.max(0, (prev.waterIntake || 0) + delta),
    }))
  }

  const saveDay = async () => {
    try {
      const payload = {
        date: selectedDate.toISOString(),
        meals: log.meals,
        waterIntake: log.waterIntake || 0,
        notes: log.notes,
      }

      if (!token) {
        alert('Please log in to save your nutrition log.')
        return
      }

      const res = await fetch(`${API_BASE}/api/nutrition/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('Save nutrition log failed:', res.status, text)
        if (res.status === 401) {
          alert('Your session expired. Please log in again and retry saving the day.')
        } else {
          alert('Could not save this day. Please try again in a moment.')
        }
        return
      }

      const saved = await res.json()
      setLog({
        meals: saved.meals || [],
        waterIntake: saved.waterIntake || 0,
        dailyTotals: saved.dailyTotals || { ...EMPTY_TOTALS },
        notes: saved.notes || '',
        _id: saved._id,
      })
    } catch (err) {
      console.error('Failed to save nutrition log:', err)
      alert('An unexpected error occurred while saving this day.')
    }
  }

  // Derived totals from current log
  const totals = (() => {
    // Prefer server-calculated dailyTotals only if they have any non-zero values
    if (log.dailyTotals && Object.keys(log.dailyTotals).length) {
      const hasNonZero = Object.values(log.dailyTotals).some(v => (v || 0) > 0)
      if (hasNonZero) return { ...EMPTY_TOTALS, ...log.dailyTotals }
    }

    // Otherwise compute from in-memory meals so changes reflect immediately
    const t = { ...EMPTY_TOTALS }
    log.meals?.forEach(meal => {
      meal.foods?.forEach(food => {
        t.calories += food.calories || 0
        t.protein += food.protein || 0
        t.carbs += food.carbs || 0
        t.fat += food.fat || 0
        t.fiber += food.fiber || 0
        t.sugar += food.sugar || 0
        t.sodium += food.sodium || 0
        t.potassium += food.potassium || 0
        t.iron += food.iron || 0
        t.calcium += food.calcium || 0
        t.vitaminB += food.vitaminB || 0
        t.magnesium += food.magnesium || 0
        t.zinc += food.zinc || 0
        t.vitaminC += food.vitaminC || 0
        t.omega3 += food.omega3 || 0
      })
    })
    return t
  })()

  const macroCalories = {
    protein: totals.protein * 4,
    carbs: totals.carbs * 4,
    fat: totals.fat * 9,
  }
  const totalMacroCalories = macroCalories.protein + macroCalories.carbs + macroCalories.fat || 1

  const percent = (value, target) => {
    if (!target) return 0
    return Math.min(100, Math.round((value / target) * 100))
  }

  const formatDate = (d) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const insightMatchesSelectedDay = useMemo(() => {
    if (!nutritionInsight?.forDate) return false
    const dt = new Date(nutritionInsight.forDate)
    if (Number.isNaN(dt.getTime())) return false
    return dt.toDateString() === selectedDate.toDateString()
  }, [nutritionInsight, selectedDate])

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

  const generateNutritionInsight = async () => {
    if (!token) return

    const hasAnySignal =
      (totals?.calories || 0) > 0 ||
      (totals?.protein || 0) > 0 ||
      (totals?.carbs || 0) > 0 ||
      (totals?.fat || 0) > 0 ||
      (log?.waterIntake || 0) > 0 ||
      Boolean((log?.notes || '').trim())

    if (!hasAnySignal) return

    setNutritionInsightGenerating(true)
    try {
      const dateStr = formatDate(selectedDate)
      const notes = (log.notes || '').trim()

      const message = [
        `Based on my nutrition log for ${dateStr}, write a short reflection.`,
        'Return exactly: (1) one key observation and (2) one gentle optional suggestion.',
        'Be calm and concise. No diagnosis, no medical advice, no moralizing.',
        '',
        `calories: ${totals.calories} kcal`,
        `protein: ${totals.protein} g`,
        `carbs: ${totals.carbs} g`,
        `fat: ${totals.fat} g`,
        `fiber: ${totals.fiber} g`,
        `water: ${log.waterIntake || 0} ml`,
        notes ? `notes: ${notes}` : null,
      ].filter(Boolean).join('\n')

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        alert('Failed to generate nutrition insight. Please try again.')
        return
      }

      const json = await safeReadJson(res)
      const text = json?.reply || json?.message || 'No AI reply returned.'
      saveInsight('lifesync:insights:nutrition', text, { source: 'nutrition', forDate: selectedDate.toISOString() })
    } catch {
      alert('Failed to generate nutrition insight. Please try again.')
    } finally {
      setNutritionInsightGenerating(false)
    }
  }

  const generateMealSuggestions = async () => {
    if (!token) return

    const hasAnySignal =
      (totals?.calories || 0) > 0 ||
      (totals?.protein || 0) > 0 ||
      (totals?.carbs || 0) > 0 ||
      (totals?.fat || 0) > 0 ||
      (log?.waterIntake || 0) > 0

    if (!hasAnySignal) {
      alert('Log at least one meal or water first.')
      return
    }

    setMealSuggestionsGenerating(true)
    try {
      const dateStr = formatDate(selectedDate)
      const remainingCalories = Math.max(0, Math.round((calorieTarget || 0) - (totals.calories || 0)))
      const remainingProtein = Math.max(0, Math.round((proteinTarget || 0) - (totals.protein || 0)))

      const message = [
        `I want meal suggestions for the rest of ${dateStr}.`,
        'Context:',
        `- calories so far: ${Math.round(totals.calories || 0)} kcal (target ${Math.round(calorieTarget || 0)})`,
        `- protein so far: ${Math.round(totals.protein || 0)} g (target ${Math.round(proteinTarget || 0)})`,
        `- carbs so far: ${Math.round(totals.carbs || 0)} g`,
        `- fat so far: ${Math.round(totals.fat || 0)} g`,
        `- fiber so far: ${Math.round(totals.fiber || 0)} g`,
        `- water so far: ${Math.round(log.waterIntake || 0)} ml`,
        '',
        'Give 3 options for what to eat next (simple, commonly available foods).',
        'Each option must include:',
        '- a meal name',
        '- approximate calories + protein',
        '- why it fits (1 short line)',
        '',
        `Aim roughly for remaining calories: ${remainingCalories} kcal and remaining protein: ${remainingProtein} g (but don\'t be rigid).`,
        'Constraints:',
        '- No diagnosis, no medical advice, no moralizing.',
        '- If you mention any adjustment, phrase it as optional.',
        '- Keep it concise and formatted as a short list.',
      ].join('\n')

      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        alert('Failed to generate meal suggestions. Please try again.')
        return
      }

      const json = await safeReadJson(res)
      const text = json?.reply || json?.message || 'No AI reply returned.'
      setMealSuggestions(String(text || ''))
    } catch {
      alert('Failed to generate meal suggestions. Please try again.')
    } finally {
      setMealSuggestionsGenerating(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717' }}>
            Nutrition
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Log meals, macros, and hydration
          </Typography>
        </Box>
      </Box>

      {/* Date controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          p: 2.5,
          borderRadius: 2,
          bgcolor: '#fff',
          border: '1px solid #e5e7eb',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton size="small" onClick={() => changeDay(-1)}>
            <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Box>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              {selectedDate.toDateString() === new Date().toDateString() ? 'Today' : 'Selected day'}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {formatDate(selectedDate)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => changeDay(1)}>
            <ArrowForwardIosIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Button
            size="small"
            startIcon={<TodayIcon sx={{ fontSize: 16 }} />}
            onClick={goToday}
            sx={{ ml: 1, textTransform: 'none' }}
          >
            Today
          </Button>
        </Box>
        <Button
          variant="contained"
          onClick={saveDay}
          disabled={loading}
        >
          Save Day
        </Button>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, color: '#6b7280', '&.Mui-selected': { color: '#171717' } }, '& .MuiTabs-indicator': { bgcolor: '#171717' } }}
      >
        <Tab label="Today" />
        <Tab label="Weight" />
        <Tab label="Summary" />
      </Tabs>

      {activeTab === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' }, gap: 3 }}>
          {/* Meals list */}
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Meals
              </Typography>
              <Chip
                icon={<RestaurantIcon sx={{ fontSize: 16 }} />}
                label={`${totals.calories} kcal`}
                size="small"
                sx={{ bgcolor: '#f0fdf4', color: '#166534', borderRadius: 1 }}
              />
            </Box>

            {log.meals?.length === 0 && (
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                No meals logged yet for this day.
              </Typography>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {log.meals?.map((meal, idx) => {
                const mealTotals = meal.foods?.reduce(
                  (acc, f) => ({
                    calories: acc.calories + (f.calories || 0),
                    protein: acc.protein + (f.protein || 0),
                    carbs: acc.carbs + (f.carbs || 0),
                    fat: acc.fat + (f.fat || 0),
                  }),
                  { calories: 0, protein: 0, carbs: 0, fat: 0 }
                ) || { calories: 0, protein: 0, carbs: 0, fat: 0 }

                return (
                  <Box
                    key={idx}
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      border: '1px solid #e5e7eb',
                      bgcolor: '#f9fafb',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {meal.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={meal.mealType}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#e5e7eb' }}
                          />
                          {meal.time && (
                            <Typography variant="caption" sx={{ color: '#6b7280' }}>
                              {meal.time}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {mealTotals.calories} kcal
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          P {mealTotals.protein}g · C {mealTotals.carbs}g · F {mealTotals.fat}g
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {meal.foods?.map((food, i) => (
                        <Typography key={i} variant="caption" sx={{ color: '#6b7280' }}>
                          {food.name} {food.quantity ? `· ${food.quantity}${food.unit}` : ''}{' '}
                          {food.calories ? `· ${food.calories} kcal` : ''}
                        </Typography>
                      ))}
                    </Box>

                    {meal.notes && (
                      <Typography variant="caption" sx={{ color: '#9ca3af', mt: 0.5, display: 'block' }}>
                        {meal.notes}
                      </Typography>
                    )}
                  </Box>
                )
              })}
            </Box>
          </Box>

          {/* Add meal + hydration */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                AI Insight (nutrition)
              </Typography>

              {insightMatchesSelectedDay && nutritionInsight?.text ? (
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
                  Generate an insight for this day’s nutrition.
                </Typography>
              )}

              <Button
                variant="outlined"
                size="small"
                onClick={generateNutritionInsight}
                disabled={nutritionInsightGenerating}
                sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
              >
                {nutritionInsightGenerating ? 'Generating…' : 'Generate'}
              </Button>
            </Box>

            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                AI Meal Suggestions
              </Typography>

              {mealSuggestions ? (
                <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                  {mealSuggestions}
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                  Get a few meal options based on today’s totals and your targets.
                </Typography>
              )}

              <Button
                variant="outlined"
                size="small"
                onClick={generateMealSuggestions}
                disabled={mealSuggestionsGenerating}
                sx={{ mt: 2, textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
              >
                {mealSuggestionsGenerating ? 'Thinking…' : 'Suggest Meals'}
              </Button>
            </Box>

            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Add Meal
              </Typography>

              {/* Food search using public API */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', mb: 0.5, display: 'block' }}>
                  Search dish or ingredient (powered by nutrition API)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    placeholder="e.g. paneer tikka, dal, rice"
                    value={foodSearchQuery}
                    onChange={(e) => setFoodSearchQuery(e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={searchFoods}
                    disabled={foodSearchLoading}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {foodSearchLoading ? 'Searching…' : 'Search'}
                  </Button>
                </Box>

                {foodResults.length > 0 && (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    maxHeight: 180,
                    overflow: 'auto',
                    borderRadius: 1,
                    border: '1px solid #e5e7eb',
                    p: 1,
                    mb: 1.5,
                    bgcolor: '#f9fafb',
                  }}>
                    {foodResults.map((f, idx) => (
                      <Box
                        key={f.id || idx}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#e5e7eb' },
                        }}
                        onClick={() => {
                          applyFoodResultToRow(f, 0)
                          setSelectedFoodForAnalysis(String(f.name || ''))
                        }}
                      >
                        <Box sx={{ mr: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {f.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                            {f.servingQty} {f.servingUnit} · {Math.round(f.calories)} kcal
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          P {Math.round(f.protein)}g · C {Math.round(f.carbs)}g · F {Math.round(f.fat)}g
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Advanced pipeline: analysis preview */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  <TextField
                    label="Analyze food"
                    value={selectedFoodForAnalysis}
                    onChange={(e) => setSelectedFoodForAnalysis(e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => analyzeSelectedFood({ includeLLM: false })}
                    disabled={foodAnalysisLoading}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {foodAnalysisLoading ? 'Analyzing…' : 'Analyze'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => analyzeSelectedFood({ includeLLM: true })}
                    disabled={foodAnalysisLoading}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    + LLM
                  </Button>
                </Box>

                {foodAnalysisError && (
                  <Typography variant="caption" sx={{ color: '#b91c1c', display: 'block', mb: 1 }}>
                    {foodAnalysisError}
                  </Typography>
                )}

                {foodAnalysis && (
                  <Box sx={{
                    borderRadius: 1,
                    border: '1px solid #e5e7eb',
                    bgcolor: '#ffffff',
                    p: 1.5,
                    mb: 1,
                  }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                      Canonical: {foodAnalysis.canonical_id || '—'} ({Math.round((foodAnalysis.resolver?.confidence || 0) * 100)}%)
                    </Typography>

                    <Typography variant="caption" sx={{ display: 'block', color: '#6b7280' }}>
                      Resolve: {resolvedFoodLoading ? '…' : (resolvedFood?.canonical_id || resolvedFood?.canonicalId || '—')}
                      {resolvedFood?.confidence != null ? ` (${Math.round((resolvedFood.confidence || 0) * 100)}%)` : ''}
                    </Typography>

                    <Typography variant="caption" sx={{ display: 'block', color: '#6b7280' }}>
                      Graph edges: {foodGraphLoading ? '…' : (Array.isArray(foodGraph?.edges) ? foodGraph.edges.length : '—')}
                      {' · '}
                      Causal links: {foodCausalLoading ? '…' : (Array.isArray(foodCausal?.causal_links) ? foodCausal.causal_links.length : '—')}
                      {' · '}
                      Hypotheses: {hypothesesLoading ? '…' : (hypothesesCount ?? '—')}
                    </Typography>

                    {foodAnalysis.meal_object && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          Meal object (local recipe)
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          {foodAnalysis.meal_object.name} · {foodAnalysis.meal_object.category || '—'}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Serving: {foodAnalysis.meal_object.serving?.description || '—'} ({foodAnalysis.meal_object.serving?.weight_g || '—'} g)
                        </Typography>
                        {Array.isArray(foodAnalysis.meal_object.recipe?.ingredients) && foodAnalysis.meal_object.recipe.ingredients.length > 0 && (
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            Ingredients: {foodAnalysis.meal_object.recipe.ingredients.slice(0, 6).map((x) => `${x.item} ${x.grams}g`).join(', ')}
                            {foodAnalysis.meal_object.recipe.ingredients.length > 6 ? '…' : ''}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Source: {foodAnalysis.meal_object.source || '—'} · Status: {foodAnalysis.meal_object.status || '—'}
                        </Typography>
                      </Box>
                    )}

                    {foodAnalysis.dish_breakdown?.missing_ingredients?.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#b45309', display: 'block' }}>
                          Missing ingredients in local DB: {foodAnalysis.dish_breakdown.missing_ingredients.join(', ')}
                        </Typography>
                      </Box>
                    )}

                    {!!foodAnalysis.derived_metrics && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          Derived metrics
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Glycemic pressure: {foodAnalysis.derived_metrics.glycemic_pressure?.label} ({Math.round((foodAnalysis.derived_metrics.glycemic_pressure?.score || 0) * 100)}%)
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Satiety index: {foodAnalysis.derived_metrics.satiety_index?.label} ({Math.round((foodAnalysis.derived_metrics.satiety_index?.score || 0) * 100)}%)
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Inflammatory potential: {foodAnalysis.derived_metrics.inflammatory_potential?.label} ({Math.round((foodAnalysis.derived_metrics.inflammatory_potential?.score || 0) * 100)}%)
                        </Typography>
                      </Box>
                    )}

                    {!!foodAnalysis.uncertainty && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          Uncertainty
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Nutrient accuracy: {Math.round((foodAnalysis.uncertainty.nutrient_accuracy || 0) * 100)}%
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Interaction estimate: {Math.round((foodAnalysis.uncertainty.interaction_estimate || 0) * 100)}%
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Population variance: {foodAnalysis.uncertainty.population_variance}
                        </Typography>
                      </Box>
                    )}

                    {Array.isArray(foodAnalysis.interactions) && foodAnalysis.interactions.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          Interactions (rule-driven)
                        </Typography>
                        {foodAnalysis.interactions.slice(0, 4).map((it, i) => (
                          <Typography key={i} variant="caption" sx={{ display: 'block' }}>
                            {it.targetKind}: {it.targetKey} · {it.interactionType} · risk {it.riskLevel}
                          </Typography>
                        ))}
                      </Box>
                    )}

                    {Array.isArray(foodAnalysis.disease_analysis) && foodAnalysis.disease_analysis.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          Disease analysis (mechanical, non-diagnostic)
                        </Typography>
                        {foodAnalysis.disease_analysis.slice(0, 2).map((d, i) => (
                          <Box key={i} sx={{ mb: 0.75 }}>
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                              {d?.disease?.name || d?.disease?.disease_id}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              {d?.safe_output?.headline}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              Risk contribution: {Math.round((d?.computed?.risk_contribution_score01 || 0) * 100)}% · Highest trigger: {d?.computed?.highest_trigger?.pattern || '—'} ({d?.computed?.highest_trigger?.risk_level || 'low'})
                            </Typography>
                            {Array.isArray(d?.sensitivities) && d.sensitivities.length > 0 && (
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                Top sensitivities: {d.sensitivities
                                  .filter((s) => typeof s?.contribution === 'number')
                                  .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
                                  .slice(0, 3)
                                  .map((s) => `${s.sensitivity} (${s.interpretation})`)
                                  .join(' · ')}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ display: 'block', color: '#6b7280' }}>
                              Limits: no diagnosis · no medication advice · no dosage suggestions
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {foodAnalysis.llm?.narrative && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          LLM summary
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          {foodAnalysis.llm.narrative}
                        </Typography>
                      </Box>
                    )}

                    {foodAnalysis.explanation?.narrative && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          Personalized explanation
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          {foodAnalysis.explanation.narrative}
                        </Typography>

                        {Array.isArray(foodAnalysis.explanation.bullets) && foodAnalysis.explanation.bullets.length > 0 && (
                          <Box sx={{ mt: 0.75 }}>
                            {foodAnalysis.explanation.bullets.slice(0, 6).map((b, i) => (
                              <Typography key={i} variant="caption" sx={{ display: 'block' }}>
                                • {b}
                              </Typography>
                            ))}
                          </Box>
                        )}

                        {Array.isArray(foodAnalysis.explanation.cautions) && foodAnalysis.explanation.cautions.length > 0 && (
                          <Box sx={{ mt: 0.75 }}>
                            <Typography variant="caption" sx={{ color: '#b45309', display: 'block' }}>
                              Caution: {foodAnalysis.explanation.cautions.join(' ')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Meal name"
                  value={newMeal.name}
                  onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                  fullWidth
                  size="small"
                />
                <TextField
                  select
                  label="Type"
                  value={newMeal.mealType}
                  onChange={(e) => setNewMeal({ ...newMeal, mealType: e.target.value })}
                  size="small"
                  SelectProps={{ native: true }}
                  sx={{ minWidth: { xs: '100%', sm: 130 } }}
                >
                  {MEAL_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </TextField>
              </Box>

              <TextField
                label="Time (optional)"
                value={newMeal.time}
                onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />

              <Typography variant="caption" sx={{ fontWeight: 500, color: '#6b7280', mb: 1, display: 'block' }}>
                Foods in this meal
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 1.5 }}>
                {newMeal.foods.map((food, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <TextField
                      label="Food"
                      value={food.name}
                      onChange={(e) => updateFoodField(idx, 'name', e.target.value)}
                      size="small"
                      sx={{ flex: 2, minWidth: { xs: '100%', sm: 240 } }}
                    />
                    <TextField
                      label="Qty"
                      value={food.quantity}
                      onChange={(e) => updateFoodField(idx, 'quantity', e.target.value)}
                      size="small"
                      sx={{ width: { xs: '100%', sm: 80 } }}
                    />
                    <TextField
                      label="Unit"
                      value={food.unit}
                      onChange={(e) => updateFoodField(idx, 'unit', e.target.value)}
                      size="small"
                      sx={{ width: { xs: '100%', sm: 70 } }}
                    />
                    <TextField
                      label="kcal"
                      value={food.calories}
                      onChange={(e) => updateFoodField(idx, 'calories', e.target.value)}
                      size="small"
                      sx={{ width: { xs: '100%', sm: 80 } }}
                    />
                  </Box>
                ))}
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <Button size="small" onClick={addFoodRow} sx={{ textTransform: 'none' }}>
                  + Add food row
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <TextField
                  label="Protein (g)"
                  value={newMeal.foods[0]?.protein || ''}
                  onChange={(e) => updateFoodField(0, 'protein', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 110 } }}
                />
                <TextField
                  label="Carbs (g)"
                  value={newMeal.foods[0]?.carbs || ''}
                  onChange={(e) => updateFoodField(0, 'carbs', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 110 } }}
                />
                <TextField
                  label="Fat (g)"
                  value={newMeal.foods[0]?.fat || ''}
                  onChange={(e) => updateFoodField(0, 'fat', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 110 } }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                <TextField
                  label="Fiber (g)"
                  value={newMeal.foods[0]?.fiber || ''}
                  onChange={(e) => updateFoodField(0, 'fiber', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 110 } }}
                />
                <TextField
                  label="Sugar (g)"
                  value={newMeal.foods[0]?.sugar || ''}
                  onChange={(e) => updateFoodField(0, 'sugar', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 110 } }}
                />
                <TextField
                  label="Sodium (mg)"
                  value={newMeal.foods[0]?.sodium || ''}
                  onChange={(e) => updateFoodField(0, 'sodium', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 130 } }}
                />
                <TextField
                  label="Potassium (mg)"
                  value={newMeal.foods[0]?.potassium || ''}
                  onChange={(e) => updateFoodField(0, 'potassium', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 150 } }}
                />
                <TextField
                  label="Calcium (mg)"
                  value={newMeal.foods[0]?.calcium || ''}
                  onChange={(e) => updateFoodField(0, 'calcium', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 130 } }}
                />
                <TextField
                  label="Magnesium (mg)"
                  value={newMeal.foods[0]?.magnesium || ''}
                  onChange={(e) => updateFoodField(0, 'magnesium', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 150 } }}
                />
                <TextField
                  label="Iron (mg)"
                  value={newMeal.foods[0]?.iron || ''}
                  onChange={(e) => updateFoodField(0, 'iron', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 120 } }}
                />
                <TextField
                  label="Zinc (mg)"
                  value={newMeal.foods[0]?.zinc || ''}
                  onChange={(e) => updateFoodField(0, 'zinc', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 120 } }}
                />
                <TextField
                  label="Vitamin B (mg)"
                  value={newMeal.foods[0]?.vitaminB || ''}
                  onChange={(e) => updateFoodField(0, 'vitaminB', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 150 } }}
                />
                <TextField
                  label="Vitamin C (mg)"
                  value={newMeal.foods[0]?.vitaminC || ''}
                  onChange={(e) => updateFoodField(0, 'vitaminC', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 150 } }}
                />
                <TextField
                  label="Omega-3 (g)"
                  value={newMeal.foods[0]?.omega3 || ''}
                  onChange={(e) => updateFoodField(0, 'omega3', e.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 140 } }}
                />
              </Box>

              <TextField
                label="Notes (optional)"
                value={newMeal.notes}
                onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                multiline
                minRows={2}
                fullWidth
                size="small"
                sx={{ mt: 2 }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                <Button variant="outlined" size="small" onClick={resetNewMeal}>
                  Clear
                </Button>
                <Button variant="contained" size="small" onClick={addMealToDay}>
                  Add Meal
                </Button>
              </Box>
            </Box>

            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Hydration
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WaterDropIcon sx={{ color: '#0ea5e9' }} />
                <Typography variant="body2" sx={{ color: '#374151' }}>
                  Water today: {Math.round((log.waterIntake || 0) / 250)} glasses ({log.waterIntake || 0} ml)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleWaterChange(250)}
                  startIcon={<WaterDropIcon sx={{ fontSize: 16 }} />}
                >
                  +250 ml
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleWaterChange(500)}
                  startIcon={<WaterDropIcon sx={{ fontSize: 16 }} />}
                >
                  +500 ml
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 3 }}>
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Daily Summary
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: '#374151' }}>
                    Calories
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {totals.calories} / {calorieTarget} kcal
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={percent(totals.calories, calorieTarget)}
                  sx={{ height: 8, borderRadius: 99, '& .MuiLinearProgress-bar': { bgcolor: '#16a34a' } }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: '#374151' }}>
                    Protein
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {totals.protein} / {proteinTarget} g
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={percent(totals.protein, proteinTarget)}
                  sx={{ height: 8, borderRadius: 99, '& .MuiLinearProgress-bar': { bgcolor: '#2563eb' } }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    Carbs
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {totals.carbs} g
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    Fat
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {totals.fat} g
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    Fiber
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {totals.fiber} g
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Micros
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Sodium</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{Math.round(totals.sodium)} mg</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Potassium</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{Math.round(totals.potassium)} mg</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Calcium</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{Math.round(totals.calcium)} mg</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Magnesium</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{Math.round(totals.magnesium)} mg</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Iron</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{Math.round(totals.iron)} mg</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Zinc</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{Math.round(totals.zinc)} mg</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Vitamin B</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{Number(totals.vitaminB || 0).toFixed(1)} mg</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Vitamin C</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{Math.round(totals.vitaminC)} mg</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Omega-3</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{Number(totals.omega3 || 0).toFixed(1)} g</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Macro Split (by calories)
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Chip
                  icon={<LocalDiningIcon sx={{ fontSize: 16 }} />}
                  label={`Protein ${Math.round((macroCalories.protein / totalMacroCalories) * 100)}%`}
                  size="small"
                  sx={{ bgcolor: '#eff6ff', color: '#1d4ed8' }}
                />
                <Chip
                  icon={<LocalDiningIcon sx={{ fontSize: 16 }} />}
                  label={`Carbs ${Math.round((macroCalories.carbs / totalMacroCalories) * 100)}%`}
                  size="small"
                  sx={{ bgcolor: '#fef9c3', color: '#854d0e' }}
                />
                <Chip
                  icon={<LocalDiningIcon sx={{ fontSize: 16 }} />}
                  label={`Fat ${Math.round((macroCalories.fat / totalMacroCalories) * 100)}%`}
                  size="small"
                  sx={{ bgcolor: '#fee2e2', color: '#b91c1c' }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                Based on logged macros. Calories from alcohol or unlogged foods are not included.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Trends (server)
              </Typography>

              {nutritionStatsLoading && <LinearProgress sx={{ height: 6, borderRadius: 99, mb: 1 }} />}

              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                7d avg: {nutritionStats?.weeklyAvg?.calories ?? '—'} kcal · P {nutritionStats?.weeklyAvg?.protein ?? '—'}g · Water {nutritionStats?.weeklyAvg?.water ?? '—'} ml
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                30d avg: {nutritionStats?.monthlyAvg?.calories ?? '—'} kcal · P {nutritionStats?.monthlyAvg?.protein ?? '—'}g · Water {nutritionStats?.monthlyAvg?.water ?? '—'} ml
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.5 }}>
                Days logged: 7d {nutritionStats?.weeklyAvg?.daysLogged ?? '—'} · 30d {nutritionStats?.monthlyAvg?.daysLogged ?? '—'} · 30d range {rangeDaysLogged ?? '—'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Notes
            </Typography>
            <TextField
              multiline
              minRows={6}
              value={log.notes || ''}
              onChange={(e) => setLog(prev => ({ ...prev, notes: e.target.value }))}
              fullWidth
            />
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717' }}>
                Daily weight
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Log your weight for the selected day and view trends.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant={weightRangeMode === 'week' ? 'contained' : 'outlined'}
                onClick={() => setWeightRangeMode('week')}
                sx={{ textTransform: 'none' }}
              >
                Week
              </Button>
              <Button
                variant={weightRangeMode === 'month' ? 'contained' : 'outlined'}
                onClick={() => setWeightRangeMode('month')}
                sx={{ textTransform: 'none' }}
              >
                Month
              </Button>
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Weight (kg)"
              type="number"
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 180 } }}
            />
            <Button variant="contained" onClick={saveWeight} disabled={weightSaving || weightLoading}>
              {weightSaving ? 'Saving…' : 'Save Weight'}
            </Button>
            {weightError ? (
              <Typography variant="body2" sx={{ color: '#b91c1c' }}>
                {weightError}
              </Typography>
            ) : null}
          </Box>

          {weightLoading ? (
            <LinearProgress />
          ) : (
            (() => {
              const end = new Date(selectedDate)
              end.setHours(23, 59, 59, 999)
              const start = new Date(end)
              const days = weightRangeMode === 'month' ? 30 : 7
              start.setDate(start.getDate() - days + 1)
              start.setHours(0, 0, 0, 0)
              const chart = buildWeightChart({ start, end, days, series: weightSeries })

              const fmt = (d) =>
                d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const startLabel = fmt(start)
              const endLabel = fmt(end)

              return (
                <Box>
                  <Box sx={{ width: '100%', overflowX: 'auto' }}>
                    <Box sx={{ minWidth: 560 }}>
                      <svg
                        width="560"
                        height="200"
                        viewBox="0 0 560 200"
                        role="img"
                        aria-label="Weight chart"
                      >
                        <rect x="0" y="0" width="560" height="200" fill="#ffffff" />

                        {(() => {
                          const d = chart.dims
                          if (!d) return null

                          const yMin = chart.min
                          const yMax = chart.max
                          const yMid = yMin != null && yMax != null ? (yMin + yMax) / 2 : null

                          const fmtKg = (v) => (typeof v === 'number' ? `${v.toFixed(1)} kg` : '')

                          return (
                            <>
                              {/* axes */}
                              <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke="#e5e7eb" strokeWidth="1" />
                              <line x1={d.x0} y1={d.y0} x2={d.x0} y2={d.y1} stroke="#e5e7eb" strokeWidth="1" />

                              {/* y ticks (max/mid/min) */}
                              <line x1={d.x0} y1={d.y0} x2={d.x1} y2={d.y0} stroke="#f3f4f6" strokeWidth="1" />
                              <line
                                x1={d.x0}
                                y1={(d.y0 + d.y1) / 2}
                                x2={d.x1}
                                y2={(d.y0 + d.y1) / 2}
                                stroke="#f3f4f6"
                                strokeWidth="1"
                              />
                              <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke="#f3f4f6" strokeWidth="1" />

                              <text x={d.x0 - 8} y={d.y0 + 3} fontSize="10" fill="#6b7280" textAnchor="end">
                                {fmtKg(yMax)}
                              </text>
                              <text
                                x={d.x0 - 8}
                                y={(d.y0 + d.y1) / 2 + 3}
                                fontSize="10"
                                fill="#9ca3af"
                                textAnchor="end"
                              >
                                {fmtKg(yMid)}
                              </text>
                              <text x={d.x0 - 8} y={d.y1 + 3} fontSize="10" fill="#6b7280" textAnchor="end">
                                {fmtKg(yMin)}
                              </text>

                              {/* axis titles */}
                              <text x={(d.x0 + d.x1) / 2} y={200 - 8} fontSize="10" fill="#6b7280" textAnchor="middle">
                                Date
                              </text>
                              <text
                                x="14"
                                y={(d.y0 + d.y1) / 2}
                                fontSize="10"
                                fill="#6b7280"
                                textAnchor="middle"
                                transform={`rotate(-90 14 ${(d.y0 + d.y1) / 2})`}
                              >
                                Weight (kg)
                              </text>

                              {/* x tick labels */}
                              <text x={d.x0} y={200 - 22} fontSize="10" fill="#6b7280" textAnchor="start">
                                {startLabel}
                              </text>
                              <text x={d.x1} y={200 - 22} fontSize="10" fill="#6b7280" textAnchor="end">
                                {endLabel}
                              </text>

                              {chart.points ? (
                                <polyline fill="none" stroke="#171717" strokeWidth="2" points={chart.points} />
                              ) : null}
                            </>
                          )
                        })()}
                      </svg>
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ color: '#6b7280', mt: 1 }}>
                    {chart.points ? 'Showing logged days only (gaps are days without entries).' : 'No weight entries yet for this range.'}
                  </Typography>
                </Box>
              )
            })()
          )}
        </Box>
      )}
    </Box>
  )
}

export default NutritionTracker

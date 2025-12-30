import { useState, useEffect, useRef } from 'react'
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
      },
    ],
    notes: '',
  })

  const calorieTarget = user?.dailyCalorieTarget || 2000
  const proteinTarget = user?.dailyProteinTarget || 120

  useEffect(() => {
    if (!token) return
    loadDay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedDate])

  useEffect(() => {
    if (!token) return
    if (activeTab !== 1) return
    loadSummaryStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab])

  const getAuthHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {})

  const safeReadJson = async (res) => {
    try {
      return await res.json()
    } catch {
      return null
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


  const navigateToInsights = (tabIndex = 1) => {
    try {
      localStorage.setItem('lifesync:insights:activeTab', String(tabIndex))
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('lifesync:navigate', { detail: { section: 'trends' } }))
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

  const removeFoodRow = (index) => {
    setNewMeal(prev => ({
      ...prev,
      foods: prev.foods.filter((_, i) => i !== index),
    }))
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

      // Insights are centralized in the Insights tab.
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
      if (hasNonZero) return log.dailyTotals
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

              <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
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
                  sx={{ minWidth: 130 }}
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
                  <Box key={idx} sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      label="Food"
                      value={food.name}
                      onChange={(e) => updateFoodField(idx, 'name', e.target.value)}
                      size="small"
                      sx={{ flex: 2 }}
                    />
                    <TextField
                      label="Qty"
                      value={food.quantity}
                      onChange={(e) => updateFoodField(idx, 'quantity', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                    <TextField
                      label="Unit"
                      value={food.unit}
                      onChange={(e) => updateFoodField(idx, 'unit', e.target.value)}
                      size="small"
                      sx={{ width: 70 }}
                    />
                    <TextField
                      label="kcal"
                      value={food.calories}
                      onChange={(e) => updateFoodField(idx, 'calories', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  </Box>
                ))}
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <Button size="small" onClick={addFoodRow} sx={{ textTransform: 'none' }}>
                  + Add food row
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Protein (g)"
                  value={newMeal.foods[0]?.protein || ''}
                  onChange={(e) => updateFoodField(0, 'protein', e.target.value)}
                  size="small"
                  sx={{ width: 110 }}
                />
                <TextField
                  label="Carbs (g)"
                  value={newMeal.foods[0]?.carbs || ''}
                  onChange={(e) => updateFoodField(0, 'carbs', e.target.value)}
                  size="small"
                  sx={{ width: 110 }}
                />
                <TextField
                  label="Fat (g)"
                  value={newMeal.foods[0]?.fat || ''}
                  onChange={(e) => updateFoodField(0, 'fat', e.target.value)}
                  size="small"
                  sx={{ width: 110 }}
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

      {activeTab === 1 && (
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

              <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
                  Deep Insights moved
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
                  Daily insights now live in the Insights tab.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => navigateToInsights(1)}
                  sx={{ textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}
                >
                  Open Insights
                </Button>
              </Box>

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
    </Box>
  )
}

export default NutritionTracker

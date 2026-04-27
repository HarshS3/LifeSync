import ExpandableSection from './ExpandableSection'
import NutritionInsights from './NutritionInsights'
import WeeklyReview from './WeeklyReview'
import WeightTracker from './WeightTracker'
import KitchenInventory from './KitchenInventory'
import { useState, useEffect, useMemo, useRef } from 'react'
import RecipeExplorer from './RecipeExplorer'
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
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Checkbox from '@mui/material/Checkbox'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import LocalDiningIcon from '@mui/icons-material/LocalDining'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import TodayIcon from '@mui/icons-material/Today'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import InfoIcon from '@mui/icons-material/Info'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import DeleteIcon from '@mui/icons-material/Delete'
import HistoryIcon from '@mui/icons-material/History'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

const generateCGMData = (meals) => {
  const points = [];
  const baseline = 90;

  // Create 24 hours of data, 30 min intervals (48 points)
  for (let i = 0; i < 48; i++) {
    const hour = Math.floor(i / 2);
    const min = (i % 2) * 30;
    const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    points.push({ time: timeStr, minuteOfDay: i * 30, glucose: baseline });
  }

  if (!meals || meals.length === 0) return points;

  // ── Option B: Second Meal Effect via Fiber Carryover ──────────────────────
  // Sort meals chronologically so we can track cumulative fiber eaten before
  // each meal. High fiber from earlier meals improves insulin sensitivity and
  // slows gastric emptying for subsequent meals (the real biological mechanism).
  const mealsSorted = [...meals]
    .map(meal => {
      const parts = (meal.time || '').split(':').map(Number);
      const mealMinute = (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
        ? parts[0] * 60 + parts[1]
        : null;
      return { meal, mealMinute };
    })
    .filter(m => m.mealMinute !== null)
    .sort((a, b) => a.mealMinute - b.mealMinute);

  let cumulativeFiberEaten = 0; // Running total of fiber from all prior meals

  mealsSorted.forEach(({ meal, mealMinute }) => {
    let totalCarbs = 0, totalFiber = 0, totalProtein = 0, totalFat = 0;

    meal.foods?.forEach(f => {
      totalCarbs   += f.carbs   || 0;
      totalFiber   += f.fiber   || 0;
      totalProtein += f.protein || 0;
      totalFat     += f.fat     || 0;
    });

    if (totalCarbs === 0) {
      // No carbs → no spike, but fiber still accumulates for future meals
      cumulativeFiberEaten += totalFiber;
      return;
    }

    // ── Second Meal Effect ─────────────────────────────────────────────────
    // Each gram of fiber eaten before this meal reduces its glycemic pressure
    // by 1.5%, capped at a 40% total reduction.
    // Science: SCFAs from fiber fermentation slow gastric emptying and improve
    // beta-cell sensitivity for subsequent meals across the day.
    const fiberCarryoverBonus = Math.min(cumulativeFiberEaten * 0.015, 0.40);
    const adjustedGP = (totalCarbs / (totalFiber + totalProtein + 1)) * (1 - fiberCarryoverBonus);

    const baseAmp    = Math.min(totalCarbs, 80);        // cap raw amplitude
    const multiplier = Math.min(adjustedGP / 5, 2.5);  // scale with adjusted GP
    const peakAmp    = baseAmp * multiplier;

    // Buffer widens the curve (more buffer = slower, flatter digestion)
    const buffer = totalFiber + (totalFat * 0.5) + (totalProtein * 0.2);
    const timeConstant = 45 + Math.min(buffer * 3, 90);

    // Impulse-response curve anchored at meal time
    points.forEach(pt => {
      if (pt.minuteOfDay < mealMinute) return;
      const t = pt.minuteOfDay - mealMinute;
      const response = Math.max(0, (t / timeConstant) * Math.exp(1 - (t / timeConstant)));
      pt.glucose += peakAmp * response;
    });

    // Update cumulative fiber AFTER this meal's calculation so only PRIOR
    // meals' fiber counts toward the discount (not the current meal's own fiber).
    cumulativeFiberEaten += totalFiber;
  });

  // Clamp and round all points
  points.forEach(pt => {
    pt.glucose = Math.max(75, Math.round(pt.glucose));
  });

  return points;
};


const MEAL_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'pre-workout',
  'post-workout',
]

const TARGET_KEY_TO_TOTAL_KEY = {
  calories: 'calories',
  protein: 'protein',
  fat: 'fat',
  carbs: 'carbs',
  fiber: 'fiber',
  sugar: 'sugar',
  saturatedFat: 'saturatedFat',
  monounsaturatedFat: 'monounsaturatedFat',
  polyunsaturatedFat: 'polyunsaturatedFat',
  cholesterol: 'cholesterol',
  sodium: 'sodium',
  potassium: 'potassium',
  iron: 'iron',
  calcium: 'calcium',
  vitaminB12: 'vitaminB12',
  vitaminD: 'vitaminD',
  vitaminC: 'vitaminC',
  vitaminA: 'vitaminA',
  folate: 'folate',
  zinc: 'zinc',
  magnesium: 'magnesium',
  phosphorus: 'phosphorus',
  copper: 'copper',
  manganese: 'manganese',
  selenium: 'selenium',
  vitaminE: 'vitaminE',
  omega3: 'omega3',
  cholesterol: 'cholesterol',
}

const MICRO_TO_TARGET_KEY = {
  sodium: 'sodium',
  potassium: 'potassium',
  calcium: 'calcium',
  magnesium: 'magnesium',
  phosphorus: 'phosphorus',
  iron: 'iron',
  zinc: 'zinc',
  copper: 'copper',
  manganese: 'manganese',
  selenium: 'selenium',
  vitaminA: 'vitaminA',
  vitaminB: 'vitaminB12',
  vitaminB12: 'vitaminB12',
  folate: 'folate',
  vitaminC: 'vitaminC',
  vitaminD: 'vitaminD',
  vitaminE: 'vitaminE',
  cholesterol: 'cholesterol',
  saturatedFat: 'saturatedFat',
}
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
  vitaminB12: 0,
  magnesium: 0,
  zinc: 0,
  vitaminC: 0,
  omega3: 0,
  saturatedFat: 0,
  monounsaturatedFat: 0,
  polyunsaturatedFat: 0,
  cholesterol: 0,
  phosphorus: 0,
  copper: 0,
  selenium: 0,
  manganese: 0,
  vitaminA: 0,
  vitaminE: 0,
  vitaminD: 0,
  folate: 0,
}

const FOOD_NUTRIENT_FIELDS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'sodium',
  'potassium',
  'iron',
  'calcium',
  'vitaminB',
  'vitaminB12',
  'magnesium',
  'zinc',
  'vitaminC',
  'omega3',
  'saturatedFat',
  'monounsaturatedFat',
  'polyunsaturatedFat',
  'cholesterol',
  'phosphorus',
  'copper',
  'selenium',
  'manganese',
  'vitaminA',
  'vitaminE',
  'vitaminD',
  'folate',
]

const MACRO_FIELD_META = [
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'omega3', label: 'Omega-3', unit: 'mg' },
  { key: 'saturatedFat', label: 'Sat. fat', unit: 'g' },
  { key: 'monounsaturatedFat', label: 'MUFA', unit: 'g' },
  { key: 'polyunsaturatedFat', label: 'PUFA', unit: 'g' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
]

const MINERAL_FIELD_META = [
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
  { key: 'zinc', label: 'Zinc', unit: 'mg' },
  { key: 'copper', label: 'Copper', unit: 'mg' },
  { key: 'manganese', label: 'Manganese', unit: 'mg' },
  { key: 'selenium', label: 'Selenium', unit: 'ug' },
]

const VITAMIN_FIELD_META = [
  { key: 'vitaminA', label: 'Vitamin A', unit: 'ug' },
  { key: 'vitaminB', label: 'Vitamin B', unit: 'mg' },
  { key: 'vitaminB12', label: 'Vitamin B12', unit: 'ug' },
  { key: 'folate', label: 'Folate', unit: 'ug' },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'ug' },
  { key: 'vitaminE', label: 'Vitamin E', unit: 'mg' },
]

const SUMMARY_MICRO_META = [
  ...MINERAL_FIELD_META,
  ...VITAMIN_FIELD_META,
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
]

const createEmptyFoodRow = () => ({
  name: '',
  quantity: '',
  unit: 'g',
  baseServingQty: '',
  baseServingUnit: 'g',
  servingLabel: '',
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
  vitaminB12: '',
  magnesium: '',
  zinc: '',
  vitaminC: '',
  omega3: '',
  saturatedFat: '',
  monounsaturatedFat: '',
  polyunsaturatedFat: '',
  cholesterol: '',
  phosphorus: '',
  copper: '',
  selenium: '',
  manganese: '',
  vitaminA: '',
  vitaminE: '',
  vitaminD: '',
  folate: '',
})

const hydrateFoodsForEditing = (foodsArray) => {
  if (!foodsArray || foodsArray.length === 0) return [createEmptyFoodRow()]
  return JSON.parse(JSON.stringify(foodsArray)).map(food => {
    delete food._id
    delete food.id
    
    if (food.baseServingQty === undefined || food.baseServingQty === null || food.baseServingQty === '') {
      food.baseServingQty = food.quantity || 1
      food.baseServingUnit = food.unit || ''
      FOOD_NUTRIENT_FIELDS.forEach(field => {
        if (food[field] !== undefined && food[field] !== null && food[field] !== '') {
          food[`${field}_base`] = food[field]
        }
      })
    }
    return food
  })
}

const roundNutrient = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 100) / 100
}

const formatServingLabel = (qty, unit) => {
  const safeQty = Number(qty)
  const safeUnit = String(unit || '').trim()
  if (Number.isFinite(safeQty) && safeUnit) return `${safeQty} ${safeUnit}`
  if (Number.isFinite(safeQty)) return String(safeQty)
  return safeUnit
}

const formatServingDisplay = (label, servingWeightG) => {
  const safeLabel = String(label || '').trim()
  const safeWeight = Number(servingWeightG)
  if (safeLabel && Number.isFinite(safeWeight) && safeWeight > 0) {
    return `${safeLabel} (~${safeWeight} g)`
  }
  return safeLabel
}

const renderNutrientInputs = ({ food, index, fields, updateFoodField }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
    {fields.map(({ key, label, unit }) => (
      <TextField
        key={`${index}-${key}`}
        label={`${label} (${unit})`}
        value={food?.[key] ?? ''}
        onChange={(e) => updateFoodField(index, key, e.target.value)}
        size="small"
        sx={{ width: 110 }}
      />
    ))}
  </Box>
)

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
  const [timingAlerts, setTimingAlerts] = useState([])

  const [nutritionInsight, setNutritionInsight] = useState(null)
  const [nutritionInsightGenerating, setNutritionInsightGenerating] = useState(false)

  const [mealSuggestions, setMealSuggestions] = useState('')
  const [mealSuggestionsGenerating, setMealSuggestionsGenerating] = useState(false)

  const [foodSearchQuery, setFoodSearchQuery] = useState('')
  const [foodResults, setFoodResults] = useState([])
  const [foodSearchLoading, setFoodSearchLoading] = useState(false)
  const [foodSearchAttempted, setFoodSearchAttempted] = useState(false)

  const [selectedFoodForAnalysis, setSelectedFoodForAnalysis] = useState('')
  const [foodAnalysis, setFoodAnalysis] = useState(null)
  const [foodAnalysisLoading, setFoodAnalysisLoading] = useState(false)
  const [foodAnalysisError, setFoodAnalysisError] = useState('')
  const [nutritionStats, setNutritionStats] = useState(null)
  const [nutritionStatsLoading, setNutritionStatsLoading] = useState(false)
  const [rangeDaysLogged, setRangeDaysLogged] = useState(null)
  const [periodSummaryLoading, setPeriodSummaryLoading] = useState(false)
  const [weeklyTotals, setWeeklyTotals] = useState({ ...EMPTY_TOTALS })
  const [monthlyTotals, setMonthlyTotals] = useState({ ...EMPTY_TOTALS })
  const [clinicalTargets, setClinicalTargets] = useState(null)
  const [clinicalTargetsRequiresSetup, setClinicalTargetsRequiresSetup] = useState(false)
  const [clinicalTargetsMissingFields, setClinicalTargetsMissingFields] = useState([])
  const [clinicalTargetsError, setClinicalTargetsError] = useState(null)
  const [dynamicTargets, setDynamicTargets] = useState({})

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

  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false)
  const [barcodeLookupError, setBarcodeLookupError] = useState('')
  const [barcodeProduct, setBarcodeProduct] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanBusy, setScanBusy] = useState(false)
  const [supportsBarcodeDetector, setSupportsBarcodeDetector] = useState(false)
  const [uploadedBarcodePreview, setUploadedBarcodePreview] = useState('')
  const scanVideoRef = useRef(null)
  const scanStreamRef = useRef(null)

  const foodPipelineRunIdRef = useRef(0)

  const [savedTemplates, setSavedTemplates] = useState([])
  const [savedTemplatesLoading, setSavedTemplatesLoading] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [frequentMeals, setFrequentMeals] = useState([])
  const [frequentMealsLoading, setFrequentMealsLoading] = useState(false)

  const [newMeal, setNewMeal] = useState({
    name: '',
    mealType: 'breakfast',
    time: '',
    foods: [
      createEmptyFoodRow(),
    ],
    notes: '',
  })

  const calorieTarget = clinicalTargets?.targets?.calories || user?.dailyCalorieTarget || null
  const proteinTarget = clinicalTargets?.targets?.protein || user?.dailyProteinTarget || null

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
    loadClinicalTargets()
    if (activeTab === 3) {
      loadSummaryStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab])

  useEffect(() => {
    if (!token) return
    if (activeTab !== 2) return
    loadWeightDayAndRange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab, selectedDate, weightRangeMode])

  useEffect(() => {
    if (!token) return
    if (activeTab !== 4) return
    loadPeriodSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab])

  useEffect(() => {
    setSupportsBarcodeDetector(typeof window !== 'undefined' && 'BarcodeDetector' in window)
  }, [])

  const stopBarcodeScanner = () => {
    if (scanStreamRef.current) {
      scanStreamRef.current.getTracks().forEach((track) => track.stop())
      scanStreamRef.current = null
    }
    setScannerOpen(false)
  }

  useEffect(() => {
    return () => {
      stopBarcodeScanner()
      if (uploadedBarcodePreview) {
        URL.revokeObjectURL(uploadedBarcodePreview)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedBarcodePreview])

  useEffect(() => {
    if (token) {
      loadSavedTemplates()
      loadFrequentMeals()
    }
  }, [token])

  const getAuthHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {})

  const safeReadJson = async (res) => {
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  const lookupBarcode = async (rawCode) => {
    const code = String(rawCode || '').replace(/\D/g, '')
    if (!code) {
      setBarcodeLookupError('Enter a valid barcode number.')
      return
    }

    try {
      setBarcodeLookupLoading(true)
      setBarcodeLookupError('')
      const res = await fetch(`${API_BASE}/api/nutrition/barcode/${encodeURIComponent(code)}`, {
        headers: getAuthHeaders(),
      })
      const data = await safeReadJson(res)
      if (!res.ok) {
        setBarcodeProduct(null)
        setBarcodeLookupError(data?.error || 'Barcode lookup failed.')
        return
      }
      setBarcodeProduct(data)
      setBarcodeInput(code)
    } catch (err) {
      console.error('Barcode lookup failed:', err)
      setBarcodeLookupError('Failed to lookup barcode.')
      setBarcodeProduct(null)
    } finally {
      setBarcodeLookupLoading(false)
    }
  }

  const startBarcodeScanner = async () => {
    if (!supportsBarcodeDetector) {
      setBarcodeLookupError('Barcode scanning is not supported in this browser. Use manual code entry.')
      return
    }

    try {
      setBarcodeLookupError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      scanStreamRef.current = stream
      setScannerOpen(true)

      if (scanVideoRef.current) {
        scanVideoRef.current.srcObject = stream
        await scanVideoRef.current.play()
      }
    } catch (err) {
      console.error('Failed to start barcode scanner:', err)
      setBarcodeLookupError('Could not open camera for barcode scan.')
      stopBarcodeScanner()
    }
  }

  const scanBarcodeFrame = async () => {
    if (!scanVideoRef.current || !supportsBarcodeDetector || scanBusy) return
    try {
      setScanBusy(true)
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
      })
      const barcodes = await detector.detect(scanVideoRef.current)
      const firstCode = barcodes?.[0]?.rawValue
      if (!firstCode) {
        setBarcodeLookupError('No barcode detected in frame. Try again with better lighting.')
        return
      }
      setBarcodeInput(String(firstCode))
      stopBarcodeScanner()
      await lookupBarcode(firstCode)
    } catch (err) {
      console.error('Barcode detect failed:', err)
      setBarcodeLookupError('Barcode scan failed. Try manual lookup.')
    } finally {
      setScanBusy(false)
    }
  }

  const scanUploadedBarcodeImage = async (file) => {
    if (!file) return
    if (!supportsBarcodeDetector) {
      setBarcodeLookupError('Image barcode scan is not supported in this browser. Use manual lookup.')
      return
    }

    try {
      setScanBusy(true)
      setBarcodeLookupError('')
      if (uploadedBarcodePreview) {
        URL.revokeObjectURL(uploadedBarcodePreview)
      }
      const previewUrl = URL.createObjectURL(file)
      setUploadedBarcodePreview(previewUrl)

      const bitmap = await createImageBitmap(file)
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
      })
      const barcodes = await detector.detect(bitmap)
      const firstCode = barcodes?.[0]?.rawValue
      if (!firstCode) {
        setBarcodeLookupError('No barcode detected in uploaded image. Try a clearer crop around the barcode.')
        return
      }

      setBarcodeInput(String(firstCode))
      await lookupBarcode(firstCode)
    } catch (err) {
      console.error('Uploaded barcode scan failed:', err)
      setBarcodeLookupError('Could not scan barcode from image.')
    } finally {
      setScanBusy(false)
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

  const loadClinicalTargets = async () => {
    try {
      setClinicalTargetsError(null)
      const headers = getAuthHeaders()
      const res = await fetch(`${API_BASE}/api/nutrition/clinical-targets`, { headers })
      if (!res.ok) {
        const errData = await safeReadJson(res)
        setClinicalTargets(null)
        setClinicalTargetsRequiresSetup(false)
        setClinicalTargetsError(errData?.error || `Server error: ${res.status}`)
        return
      }
      const data = await safeReadJson(res)
      if (data?.requiresSetup || !data?.targets) {
        setClinicalTargets(null)
        setClinicalTargetsRequiresSetup(true)
        setClinicalTargetsMissingFields(Array.isArray(data?.missingRequiredFields) ? data.missingRequiredFields : [])
        return
      }
      setClinicalTargets(data)
      setClinicalTargetsRequiresSetup(false)
      setClinicalTargetsMissingFields([])
    } catch (err) {
      console.error('Failed to load clinical targets:', err)
      setClinicalTargets(null)
      setClinicalTargetsRequiresSetup(false)
      setClinicalTargetsError(err.message)
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
        const data = await safeReadJson(rangeRes.value)
        const logs = data?.logs || []
        setRangeDaysLogged(Array.isArray(logs) ? logs.length : null)
        if (data?.dynamicTargets) {
          setDynamicTargets(prev => ({ ...prev, ...data.dynamicTargets }))
        }
      }
    } catch (err) {
      console.error('Failed to load nutrition summary stats:', err)
    } finally {
      setNutritionStatsLoading(false)
    }
  }

  const loadSavedTemplates = async () => {
    if (!token) return
    setSavedTemplatesLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/saved-templates`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setSavedTemplates(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load templates:', err)
    } finally {
      setSavedTemplatesLoading(false)
    }
  }

  const saveAsTemplate = async () => {
    if (!token) return
    if (!templateName.trim()) return
    setSavingTemplate(true)
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/saved-templates`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          mealType: newMeal.mealType,
          foods: newMeal.foods,
          notes: newMeal.notes
        }),
      })
      if (res.ok) {
        const data = await safeReadJson(res)
        setSavedTemplates(prev => [data, ...prev])
        setTemplateName('')
      }
    } catch (err) {
      console.error('Failed to save template:', err)
    } finally {
      setSavingTemplate(false)
    }
  }

  const deleteTemplate = async (id) => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/saved-templates/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        setSavedTemplates(prev => prev.filter(t => t._id !== id))
      }
    } catch (err) {
      console.error('Failed to delete template:', err)
    }
  }

  const loadFrequentMeals = async () => {
    if (!token) return
    setFrequentMealsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/meal-templates`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setFrequentMeals(Array.isArray(data.templates) ? data.templates : [])
      }
    } catch (err) {
      console.error('Failed to load frequent meals:', err)
    } finally {
      setFrequentMealsLoading(false)
    }
  }

  const useTemplate = (tpl) => {
    // Check if it's a frequent meal (t.mealName) or saved template (t.name)
    const name = tpl.mealName || tpl.name
    const foods = hydrateFoodsForEditing(tpl.foods)
    
    setNewMeal({
      name: name || '',
      mealType: tpl.mealType || 'snack',
      time: new Date().toTimeString().slice(0, 5),
      foods,
      notes: tpl.notes || ''
    })
  }

  const aggregateTotalsFromLogs = (logs) => {
    const out = { ...EMPTY_TOTALS }
    ;(logs || []).forEach((logItem) => {
      const d = logItem?.dailyTotals || {}
      Object.keys(out).forEach((k) => {
        out[k] += Number(d[k] || 0)
      })
    })
    return out
  }

  const loadPeriodSummary = async () => {
    setPeriodSummaryLoading(true)
    try {
      const headers = getAuthHeaders()
      const end = new Date()
      end.setHours(23, 59, 59, 999)

      const weekStart = new Date(end)
      weekStart.setDate(weekStart.getDate() - 6)
      weekStart.setHours(0, 0, 0, 0)

      const monthStart = new Date(end)
      monthStart.setDate(monthStart.getDate() - 29)
      monthStart.setHours(0, 0, 0, 0)

      const [weekRes, monthRes] = await Promise.all([
        fetch(`${API_BASE}/api/nutrition/logs/range/${encodeURIComponent(weekStart.toISOString())}/${encodeURIComponent(end.toISOString())}`, { headers }),
        fetch(`${API_BASE}/api/nutrition/logs/range/${encodeURIComponent(monthStart.toISOString())}/${encodeURIComponent(end.toISOString())}`, { headers }),
      ])

      const weekData = weekRes.ok ? await safeReadJson(weekRes) : { logs: [], dynamicTargets: {} }
      const monthData = monthRes.ok ? await safeReadJson(monthRes) : { logs: [], dynamicTargets: {} }

      const weekLogs = weekData.logs || []
      const monthLogs = monthData.logs || []
      
      if (weekData.dynamicTargets || monthData.dynamicTargets) {
        setDynamicTargets(prev => ({ 
          ...prev, 
          ...(weekData.dynamicTargets || {}), 
          ...(monthData.dynamicTargets || {}) 
        }))
      }

      setWeeklyTotals(aggregateTotalsFromLogs(weekLogs))
      setMonthlyTotals(aggregateTotalsFromLogs(monthLogs))
    } catch (err) {
      console.error('Failed to load period summary:', err)
      setWeeklyTotals({ ...EMPTY_TOTALS })
      setMonthlyTotals({ ...EMPTY_TOTALS })
    } finally {
      setPeriodSummaryLoading(false)
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
          supplements: data.supplements || [],
          waterIntake: data.waterIntake || 0,
          dailyTotals: data.dailyTotals || { ...EMPTY_TOTALS },
          notes: data.notes || '',
          _id: data._id,
        })
      } else {
        setLog({ meals: [], supplements: [], waterIntake: 0, dailyTotals: { ...EMPTY_TOTALS }, notes: '' })
      }

      // Fetch Meal Timing Intelligence
      const timingRes = await fetch(`${API_BASE}/api/nutrition/timing-analysis/${encodeURIComponent(dateStr)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (timingRes.ok) {
        const timingData = await timingRes.json()
        setTimingAlerts(timingData.alerts || [])
      } else {
        setTimingAlerts([])
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

  // Lightweight Frontend Interaction Engine for Real-time Feedback
  const frontendEvaluateInteractions = (foods) => {
    const totals = {}
    const foodNames = []
    
    foods.filter(f => f.name?.trim()).forEach(food => {
      foodNames.push(food.name.toLowerCase())
      FOOD_NUTRIENT_FIELDS.forEach(field => {
        const val = Number(food[field]) || 0
        totals[field] = (totals[field] || 0) + val
      })
    })

    const hasFlag = (flags) => {
      if (!flags || flags.length === 0) return false
      return foodNames.some(name => flags.some(flag => {
        try {
          const regex = new RegExp(`\\b${flag.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
          return regex.test(name)
        } catch (e) {
          return name.toLowerCase().includes(flag.toLowerCase())
        }
      }))
    }

    const synergies = []
    const antagonisms = []

    const ironVal = totals.iron || 0
    const vitCVal = totals.vitaminC || 0
    const fatVal = totals.fat || 0
    const calVal = totals.calcium || 0
    const fibreVal = totals.fiber || 0

    // SYNERGIES (Full mirror of backend clinical rules)
    if (ironVal >= 0.5 && vitCVal >= 10) {
      synergies.push({ 
        title: 'Iron + Vitamin C Synergy', 
        effect: '2x to 3x increase', 
        description: 'Vitamin C reduces Fe3+ to Fe2+ (absorbable form) and forms an iron-ascorbate complex that resists blocking.' 
      })
    }
    if ((totals.vitaminD || 0) >= 0.5 && fatVal >= 5) {
      synergies.push({ 
        title: 'Vitamin D + Fat Synergy', 
        effect: 'Requires fat for absorption', 
        description: 'Vitamin D is fat-soluble. Consuming it without fat results in near-zero absorption.' 
      })
    }
    if ((totals.vitaminA || 0) >= 10 && fatVal >= 5) {
      synergies.push({ 
        title: 'Vitamin A + Fat Synergy', 
        effect: 'Required for absorption', 
        description: 'Retinoids and carotenoids require dietary lipid for micellar solubilization.' 
      })
    }
    if (hasFlag(['turmeric', 'haldi']) && hasFlag(['pepper'])) {
      synergies.push({ 
        title: 'Turmeric + Black Pepper', 
        effect: '2000% boost in bioavailability', 
        description: 'Piperine in pepper inhibits the metabolic pathway that eliminates curcumin.' 
      })
    }
    if (hasFlag(['green tea']) && vitCVal >= 5) {
      synergies.push({ 
        title: 'Green Tea + Vit C', 
        effect: 'Catechin stability', 
        description: 'Vitamin C protects epigallocatechin gallate (EGCG) from degrading in the alkaline environment of the small intestine.' 
      })
    }
    if ((totals.vitaminE || 0) >= 1 && vitCVal >= 10) {
      synergies.push({ 
        title: 'Vitamin E + Vitamin C Synergy', 
        effect: 'Antioxidant regeneration', 
        description: 'Vitamin C regenerates oxidized Vitamin E back to its active form, providing broader antioxidant coverage.' 
      })
    }

    // ANTAGONISMS (Full mirror of backend clinical rules)
    if (ironVal >= 0.5 && hasFlag(['tea', 'coffee', 'chai', 'green tea'])) {
      antagonisms.push({ 
        title: 'Iron blocked by Tannins', 
        effect: '40-60% reduction', 
        description: 'Tannins in tea and coffee bind iron to form an insoluble complex. The #1 cause of iron deficiency in India.', 
        fix: 'Have tea/coffee 1 hour before or after an iron-rich meal.' 
      })
    }
    if (ironVal >= 0.5 && calVal >= 150) {
      antagonisms.push({ 
        title: 'Iron blocked by Calcium', 
        effect: 'Competing absorption', 
        description: 'Calcium and iron compete for the same intestinal transporter.', 
        fix: 'Separate iron-rich and calcium-rich meals by 2 hours.' 
      })
    }
    if (((totals.zinc || 0) >= 0.5 || ironVal >= 0.5) && (totals.fiber || 0) >= 10) {
      antagonisms.push({ 
        title: 'Minerals blocked by Phytates', 
        effect: 'Insoluble complex', 
        description: 'Phytic acid in whole grains and raw legumes binds iron and zinc.', 
        fix: 'Soaking, sprouting, or fermenting breaks phytates and greatly improves absorption.' 
      })
    }
    if (hasFlag(['alcohol', 'wine', 'beer', 'whiskey', 'rum', 'vodka']) && (totals.vitaminB || totals.vitaminB12 || totals.folate)) {
      antagonisms.push({ 
        title: 'Alcohol vs B-Vitamins', 
        effect: 'Severe depletion', 
        description: 'Alcohol inhibits the absorption of thiamine (B1), B12, and folate, while increasing their excretion.', 
        fix: 'Avoid alcohol during vitamin-rich meals or supplement B-Complex separately.' 
      })
    }
    if ((totals.vitaminA || 0) >= 100 && fatVal < 1 && (hasFlag(['carrot', 'spinach', 'leafy', 'mango']))) {
      antagonisms.push({ 
        title: 'Vit A blocked by Low Fat', 
        effect: 'Minimal absorption', 
        description: 'Plant-based Vitamin A (beta-carotene) needs dietary fat to be solubilized for absorption.', 
        fix: 'Add oil, nuts, or seeds to your salad or juice.' 
      })
    }
    
    return { synergies, antagonisms }
  }

  const liveInsights = useMemo(() => frontendEvaluateInteractions(newMeal.foods), [newMeal.foods])

  // Helper: scale nutrients based on user quantity vs base serving
  const scaleNutrients = (food, newQty) => {
    const baseQty = Number(food.baseServingQty) || 1
    const userQty = Number(newQty)
    if (!Number.isFinite(baseQty) || baseQty <= 0 || !Number.isFinite(userQty) || userQty <= 0) {
      return { ...food, quantity: newQty }
    }

    const ratio = userQty / baseQty
    const scaled = { ...food, quantity: newQty }

    FOOD_NUTRIENT_FIELDS.forEach(field => {
      if (food[field + '_base'] !== undefined && food[field + '_base'] !== '') {
        scaled[field] = roundNutrient(Number(food[field + '_base']) * ratio)
      }
    })

    return scaled
  }

  const handleSearchResultSelect = (foodResult) => {
    let targetIndex = newMeal.foods.length - 1;
    if (targetIndex < 0) {
      addFoodRow();
      targetIndex = 0;
    }

    const lastFood = newMeal.foods[0];
    if (lastFood && lastFood.name && lastFood.name.trim() !== '') {
      // First row is filled, add a new one at the top and target it
      const newFoods = [createEmptyFoodRow(), ...newMeal.foods];
      setNewMeal(prev => ({ ...prev, foods: newFoods }));
      targetIndex = 0;
    } else {
      targetIndex = 0;
    }

    applyFoodResultToRow(foodResult, targetIndex);
    setSelectedFoodForAnalysis(String(foodResult.name || ''));
  };

  const applyFoodResultToRow = (foodResult, index) => {
    const baseServingQty = Number(foodResult?.servingQty) > 0 ? Number(foodResult.servingQty) : 1
    const baseServingUnit = String(foodResult?.servingUnit || 'serving').trim() || 'serving'
    const servingLabel =
      String(foodResult?.servingLabel || '').trim() || formatServingLabel(baseServingQty, baseServingUnit)

    setNewMeal((prev) => {
      const foods = prev.foods.map((food, i) => {
        if (i !== index) return food

        const nextFood = {
          ...food,
          name: foodResult?.name || food.name,
          quantity: String(baseServingQty),
          unit: baseServingUnit,
          baseServingQty,
          baseServingUnit,
          servingLabel,
          servingWeightG: foodResult?.servingWeightG ?? food.servingWeightG ?? null,
          sourceFoodId: foodResult?.id || food.sourceFoodId || '',
          sourceKind: foodResult?._local?.kind || food.sourceKind || '',
        }

        FOOD_NUTRIENT_FIELDS.forEach((field) => {
          const value = roundNutrient(foodResult?.[field] ?? 0)
          nextFood[field] = value
          nextFood[`${field}_base`] = value
        })

        return nextFood
      })

      return { ...prev, foods }
    })
  }

  // When quantity changes, auto-scale nutrients
  const updateFoodField = (index, field, value) => {
    setNewMeal(prev => {
      const updated = { ...prev }
      updated.foods = prev.foods.map((f, i) => {
        if (i !== index) return f
        if (field === 'quantity') {
          return scaleNutrients(f, value)
        }
        return { ...f, [field]: value }
      })
      return updated
    })
  }

  const addFoodRow = () => {
    setNewMeal(prev => ({
      ...prev,
      foods: [
        createEmptyFoodRow(),
        ...prev.foods,
      ],
    }))
  }

  const removeFoodRow = (index) => {
    setNewMeal(prev => ({
      ...prev,
      foods: prev.foods.filter((_, i) => i !== index),
    }))
  }



  const searchFoods = async (queryOverride) => {
    const q = (queryOverride || foodSearchQuery || '').trim()
    if (!q) return
    try {
      setFoodSearchAttempted(false)
      setFoodSearchLoading(true)
      setFoodResults([])
      setSelectedFoodForAnalysis('')
      setFoodAnalysis(null)
      setFoodAnalysisError('')
      const params = new URLSearchParams({ q })
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
      setFoodSearchAttempted(true)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (foodSearchQuery.trim().length > 0) {
        searchFoods(foodSearchQuery);
      } else {
        setFoodResults([]);
        setFoodSearchAttempted(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [foodSearchQuery]);

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
      foods: [createEmptyFoodRow()],
      notes: '',
    })
  }

  const addMealToDay = () => {
    if (!newMeal.name.trim()) return

    const foods = newMeal.foods.map(f => ({
      ...f,
      quantity: Number(f.quantity) || 0,
      baseServingQty: Number(f.baseServingQty) || 0,
      baseServingUnit: String(f.baseServingUnit || f.unit || '').trim(),
      servingLabel: String(f.servingLabel || '').trim(),
      ...Object.fromEntries(FOOD_NUTRIENT_FIELDS.map((field) => [field, Number(f[field]) || 0])),
    }))

    const meal = {
      name: newMeal.name.trim(),
      mealType: newMeal.mealType,
      time: newMeal.time,
      foods,
      notes: newMeal.notes,
    }

    let updatedLog = null
    setLog(prev => {
      updatedLog = {
        ...prev,
        meals: [meal, ...(prev.meals || [])],
      }
      return updatedLog
    })

    resetNewMeal()
    if (updatedLog) autoSaveLog(updatedLog)
  }

  const removeMealFromDay = (indexToRemove) => {
    let updatedLog = null
    setLog(prev => {
      if (!prev.meals) return prev
      updatedLog = {
        ...prev,
        meals: prev.meals.filter((_, i) => i !== indexToRemove),
      }
      return updatedLog
    })
    if (updatedLog) autoSaveLog(updatedLog)
  }

  const editMealFromDay = (indexToEdit) => {
    const mealToEdit = log.meals[indexToEdit]
    if (!mealToEdit) return
    
    setNewMeal({
      name: mealToEdit.name || '',
      mealType: mealToEdit.mealType || 'breakfast',
      time: mealToEdit.time || '',
      foods: hydrateFoodsForEditing(mealToEdit.foods),
      notes: mealToEdit.notes || '',
    })

    removeMealFromDay(indexToEdit)
    setActiveTab(1)
  }

  const handleWaterChange = (delta) => {
    let updatedLog = null
    setLog(prev => {
      updatedLog = {
        ...prev,
        waterIntake: Math.max(0, (prev.waterIntake || 0) + delta),
      }
      return updatedLog
    })
    if (updatedLog) autoSaveLog(updatedLog)
  }

  const autoSaveLog = async (dataToSave) => {
    if (!token) return
    try {
      const payload = {
        date: selectedDate.toISOString(),
        meals: dataToSave.meals,
        supplements: dataToSave.supplements,
        waterIntake: dataToSave.waterIntake || 0,
        notes: dataToSave.notes,
      }
      const res = await fetch(`${API_BASE}/api/nutrition/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const saved = await res.json()
        setLog(prev => ({
          ...prev,
          _id: saved._id,
          meals: saved.meals || prev.meals,
          supplements: saved.supplements || prev.supplements,
          dailyTotals: saved.dailyTotals || { ...EMPTY_TOTALS },
        }))
      }
    } catch (e) {
      console.error('Auto-save failed:', e)
    }
  }

  const saveDay = async () => {
    try {
      const payload = {
        date: selectedDate.toISOString(),
        meals: log.meals,
        supplements: log.supplements,
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
    // Compute from in-memory meals so newly added nutrient fields always render correctly,
    // even for older logs whose persisted dailyTotals omitted those fields.
    const t = { ...EMPTY_TOTALS }
    log.meals?.forEach(meal => {
      meal.foods?.forEach(food => {
        FOOD_NUTRIENT_FIELDS.forEach((field) => {
          t[field] = (t[field] || 0) + (Number(food?.[field]) || 0)
        })
      })
    })

    // If there are no meals loaded, fall back to server dailyTotals.
    let finalTotals = { ...t }
    if ((!log.meals || log.meals.length === 0) && log.dailyTotals && Object.keys(log.dailyTotals).length) {
      finalTotals = { ...t, ...log.dailyTotals }
    }

    // Normalize precision everywhere to avoid floating point artifacts (e.g. 27.560000000000002)
    Object.keys(finalTotals).forEach(key => {
      if (typeof finalTotals[key] === 'number') {
        finalTotals[key] = Math.round(finalTotals[key] * 10) / 10
      }
    })

    return finalTotals
  })()

  const macroCalories = {
    protein: totals.protein * 4,
    carbs: totals.carbs * 4,
    fat: totals.fat * 9,
  }
  const totalMacroCalories = macroCalories.protein + macroCalories.carbs + macroCalories.fat || 1

  const clinicalTargetRows = useMemo(() => {
    const targets = clinicalTargets?.targets
    const micros = targets?.micronutrients || {}
    if (!targets) return []

    const getTarget = (key) => {
      if (key in targets) return targets[key]
      if (key in micros) return micros[key]
      return null
    }

    return Object.entries(TARGET_KEY_TO_TOTAL_KEY)
      .map(([targetKey, totalKey]) => {
        const targetValue = getTarget(targetKey)
        if (targetValue == null) return null

        const unit =
          targetKey === 'calories' ? 'kcal' :
          targetKey === 'omega3' ? 'mg' :
          ['vitaminD', 'vitaminA', 'folate', 'selenium', 'vitaminB12'].includes(targetKey) ? 'ug' :
          ['protein', 'fat', 'carbs', 'fiber', 'sugar'].includes(targetKey) ? 'g' : 'mg'

        const currentValue = Number(totals?.[totalKey] || 0)
        return {
          key: targetKey,
          label: targetKey.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
          currentValue,
          targetValue: Number(targetValue),
          unit,
        }
      })
      .filter(Boolean)
  }, [clinicalTargets, totals])

  const microTargetLookup = useMemo(() => {
    const t = clinicalTargets?.targets || {}
    const micros = t.micronutrients || {}
    return { ...t, ...micros }
  }, [clinicalTargets])

  const percent = (value, target) => {
    if (!target) return 0
    return Math.min(100, Math.round((value / target) * 100))
  }

  const fmt = (value, decimals = 1) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return '0'
    return String(Number(n.toFixed(decimals)))
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
        `calories: ${fmt(totals.calories, 0)} kcal`,
        `protein: ${fmt(totals.protein)} g`,
        `carbs: ${fmt(totals.carbs)} g`,
        `fat: ${fmt(totals.fat)} g`,
        `fiber: ${fmt(totals.fiber)} g`,
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

      {clinicalTargetsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading nutrition targets: {clinicalTargetsError}. 
          Calculations may be inaccurate.
        </Alert>
      )}

      {clinicalTargetsRequiresSetup && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Daily targets are disabled because your clinical profile is incomplete. 
          Missing fields: {clinicalTargetsMissingFields?.length > 0 ? clinicalTargetsMissingFields.join(', ') : 'none specified'}. 
          Please update your profile in the Profile tab.
        </Alert>
      )}

      {!clinicalTargetsRequiresSetup && !clinicalTargets?.targets && !clinicalTargetsError && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Initialising nutrition engine... If this persists, please ensure your profile is completed.
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, color: '#6b7280', '&.Mui-selected': { color: '#171717' } }, '& .MuiTabs-indicator': { bgcolor: '#171717' } }}
      >
        <Tab label="Today" />
        <Tab label="Log Meal" />
        <Tab label="Weight" />
        <Tab label="Today's Details" />
        <Tab label="Summary" />
        <Tab label="Scan Product" />
        <Tab label="Insights" />
        <Tab label="Recipes" />
        <Tab label="Kitchen" />
        <Tab label="Review" />
      </Tabs>

      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Meals list */}
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Meals
              </Typography>
              <Chip
                icon={<RestaurantIcon sx={{ fontSize: 16 }} />}
                label={`${fmt(totals.calories, 0)} kcal`}
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
              {(log.meals || [])
                .map((meal, originalIdx) => ({ meal, originalIdx }))
                .map(({ meal, originalIdx }) => {
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
                    key={originalIdx}
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
                              {(() => {
                                const [h, m] = meal.time.split(':');
                                const hours = parseInt(h);
                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                const h12 = hours % 12 || 12;
                                return `${h12}:${m} ${ampm}`;
                              })()}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {fmt(mealTotals.calories, 0)} kcal
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => editMealFromDay(originalIdx)}
                            sx={{ p: 0.25, color: '#3b82f6', '&:hover': { bgcolor: '#eff6ff' } }}
                            title="Edit meal"
                          >
                            <EditIcon sx={{ fontSize: '1.1rem' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => removeMealFromDay(originalIdx)}
                            sx={{ p: 0.25, color: '#ef4444', '&:hover': { bgcolor: '#fee2e2' } }}
                            title="Delete meal"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          P {fmt(mealTotals.protein)}g · C {fmt(mealTotals.carbs)}g · F {fmt(mealTotals.fat)}g
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

                    {meal.insights && (meal.insights.synergies?.length > 0 || meal.insights.antagonisms?.length > 0) && (
                      <Box sx={{ mt: 1.5 }}>
                        <ExpandableSection 
                          title="Nutrient Interactions & Bioavailability" 
                          defaultOpen={false}
                        >
                          <Box sx={{ p: 1.5, bgcolor: '#fff', borderRadius: 1.5, border: '1px dashed #d1d5db' }}>
                            {meal.insights.synergies?.map((syn, i) => (
                              <Box key={`syn-${i}`} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'start' }}>
                                <Box sx={{ mt: 0.25, width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', flexShrink: 0 }} />
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#065f46', display: 'block' }}>{syn.title} ({syn.effect})</Typography>
                                  <Typography variant="caption" sx={{ color: '#047857', display: 'block', lineHeight: 1.3 }}>{syn.description}</Typography>
                                </Box>
                              </Box>
                            ))}
                            {meal.insights.antagonisms?.map((ant, i) => (
                              <Box key={`ant-${i}`} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'start' }}>
                                <Box sx={{ mt: 0.25, width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b', flexShrink: 0 }} />
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#b45309', display: 'block' }}>{ant.title} ({ant.effect})</Typography>
                                  <Typography variant="caption" sx={{ color: '#92400e', display: 'block', lineHeight: 1.3 }}>{ant.description}</Typography>
                                  {ant.fix && <Typography variant="caption" sx={{ color: '#78350f', fontWeight: 600, display: 'block', mt: 0.25 }}>Fix: {ant.fix}</Typography>}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </ExpandableSection>
                      </Box>
                    )}

                    {meal.notes && (
                      <Typography variant="caption" sx={{ color: '#9ca3af', mt: 1.5, display: 'block' }}>
                        {meal.notes}
                      </Typography>
                    )}
                    {/* Bioavailability Results */}
                    {meal.bioavailability?.results && Object.keys(meal.bioavailability.results).length > 0 && (
                      <Box sx={{ mt: 1.5 }}>
                        <ExpandableSection
                          title={`Absorption Analysis (${meal.bioavailability.overallConfidence || 'medium'} confidence)`}
                          defaultOpen={false}
                        >
                          <Box sx={{ p: 1.5, bgcolor: '#fff', borderRadius: 1.5, border: '1px dashed #c7d2fe' }}>
                            {meal.bioavailability.narratives?.length > 0 && (
                              <Box sx={{ mb: 1.5, p: 1, bgcolor: '#f0f9ff', borderRadius: 1, border: '1px solid #bae6fd' }}>
                                {meal.bioavailability.narratives.map((n, i) => (
                                  <Typography key={i} variant="caption" sx={{ display: 'block', color: '#0369a1', lineHeight: 1.5 }}>{n}</Typography>
                                ))}
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                              {Object.entries(meal.bioavailability.results).map(([nutrient, data]) => {
                                const pctAbsorbed = Math.round(data.multiplier * 100)
                                const isLow = data.multiplier < 0.5
                                const isMedium = data.multiplier >= 0.5 && data.multiplier < 0.8
                                const barColor = isLow ? '#ef4444' : isMedium ? '#f59e0b' : '#10b981'
                                const label = nutrient.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
                                return (
                                  <Box key={nutrient}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#374151' }}>{label}</Typography>
                                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}>
                                        <Typography variant="caption" sx={{ color: '#9ca3af', textDecoration: 'line-through' }}>
                                          {data.consumed_amount}{data.unit}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: barColor }}>
                                          ~{data.effective_amount}{data.unit} absorbed ({pctAbsorbed}%)
                                        </Typography>
                                      </Box>
                                    </Box>
                                    <Box sx={{ position: 'relative', height: 6, bgcolor: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                                      {/* Ghost bar = consumed */}
                                      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', bgcolor: '#e5e7eb', borderRadius: 99 }} />
                                      {/* Filled bar = effective */}
                                      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(pctAbsorbed, 100)}%`, bgcolor: barColor, borderRadius: 99, transition: 'width 0.5s' }} />
                                    </Box>
                                    {data.interactions?.length > 0 && (
                                      <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.25, lineHeight: 1.3 }}>
                                        {data.interactions.filter(i => i.type !== 'neutral').map(i => `${i.agent.replace(/_/g,' ')}: ${i.effect}`).join(' · ')}
                                      </Typography>
                                    )}
                                  </Box>
                                )
                              })}
                            </Box>
                          </Box>
                        </ExpandableSection>
                      </Box>
                    )}

                  </Box>
                )
              })}
            </Box>
          </Box>


          {/* ── macro summary strip ── */}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
            {[
              { label: 'Calories', val: fmt(totals.calories, 0), unit: 'kcal', pct: percent(totals.calories, calorieTarget), color: '#16a34a' },
              { label: 'Protein',  val: fmt(totals.protein),     unit: 'g',    pct: percent(totals.protein, proteinTarget),   color: '#2563eb' },
              { label: 'Carbs',    val: fmt(totals.carbs),       unit: 'g',    pct: null, color: '#d97706' },
              { label: 'Fat',      val: fmt(totals.fat),         unit: 'g',    pct: null, color: '#dc2626' },
            ].map((m) => (
              <Box key={m.label} sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.25 }}>{m.label}</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                  {m.val} <span style={{ fontWeight: 400, fontSize: '0.8em', color: '#9ca3af' }}>{m.unit}</span>
                </Typography>
                {m.pct != null && (
                  <LinearProgress variant="determinate" value={m.pct} sx={{ mt: 1, height: 4, borderRadius: 99, bgcolor: '#f3f4f6', '& .MuiLinearProgress-bar': { bgcolor: m.color } }} />
                )}
              </Box>
            ))}
          </Box>

          {/* ── Daily Warnings & Insights ── */}
          {(() => {
            const alerts = [];
            // SFA Alert
            if (totals.saturatedFat > 30) {
              alerts.push({ type: 'warning', text: `High Saturated Fat (${fmt(totals.saturatedFat)}g): Keeping saturated fat <20-30g protects your heart health over the long term.` });
            }
            // Cholesterol Alert
            if (totals.cholesterol > 300) {
              alerts.push({ type: 'warning', text: `High Cholesterol (${fmt(totals.cholesterol)}mg): Consider balancing this with high-fiber foods (oats, beans, leafy greens) which help clear excess cholesterol from your system.` });
            }
            // Sodium Alert
            if (totals.sodium > 3000) {
              alerts.push({ type: 'warning', text: `High Sodium Detected (${fmt(totals.sodium)}mg): Hydrate extra today or expect 1-2lbs of water retention on the scale tomorrow. This is not fat gain.` });
            }
            // Protein Distribution Alert
            if (totals.protein > 50 && log.meals) {
              const spikeMeal = log.meals.find(meal => {
                const p = meal.foods?.reduce((acc, f) => acc + (f.protein || 0), 0) || 0;
                return p > 50 && p > (totals.protein * 0.5);
              });
              if (spikeMeal) {
                alerts.push({ type: 'info', text: `Lopsided Protein Loading: More than 50% of your daily protein is in "${spikeMeal.name}". Your body maximizes muscle synthesis at ~30-40g per meal. Spread it out for better gains.` });
              }
            }

            // Meal Timing Intelligence (Workout/Sleep)
            timingAlerts.forEach(t => {
              alerts.push({ 
                type: t.type === 'timing_warning' ? 'warning' : 'info', 
                text: `${t.title}: ${t.text}` 
              });
            });

            if (alerts.length === 0) return null;

            return (
              <Box sx={{ p: 2.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#111827' }}>
                  Daily Medical Alerts & Insights
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {alerts.map((alert, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: alert.type === 'warning' ? '#fef2f2' : '#eff6ff', borderRadius: 1.5, border: `1px solid ${alert.type === 'warning' ? '#fecaca' : '#bfdbfe'}` }}>
                      <Typography sx={{ fontSize: '1.2rem' }}>{alert.type === 'warning' ? '🚨' : '💡'}</Typography>
                      <Typography variant="caption" sx={{ color: alert.type === 'warning' ? '#991b1b' : '#1e3a8a', lineHeight: 1.4, fontWeight: 500 }}>
                        {alert.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })()}

          {/* ── Effective Daily Absorption Summary ── */}
          {log.effectiveNutrientTotals && Object.keys(log.effectiveNutrientTotals).length > 0 && (
            <Box sx={{ p: 2.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <ExpandableSection title="Daily Effective Absorption Summary" defaultOpen={false}>
                <Box sx={{ pt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
                  {Object.entries(log.effectiveNutrientTotals).map(([nutrient, data]) => {
                    const pct = Math.round((data.multiplier || 1) * 100)
                    const isLow = pct < 50
                    const isMed = pct >= 50 && pct < 80
                    const color = isLow ? '#ef4444' : isMed ? '#f59e0b' : '#10b981'
                    const label = nutrient.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
                    return (
                      <Box key={nutrient} sx={{ p: 1.5, bgcolor: '#f9fafb', borderRadius: 1.5, border: '1px solid #f3f4f6' }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.65rem' }}>{label}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color, display: 'block' }}>
                          ~{data.effective}{data.unit}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', fontSize: '0.65rem' }}>
                          of {data.consumed}{data.unit} ({pct}% absorbed)
                        </Typography>
                        <Box sx={{ mt: 0.75, height: 4, bgcolor: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${Math.min(pct, 100)}%`, bgcolor: color, borderRadius: 99, transition: 'width 0.5s' }} />
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              </ExpandableSection>
            </Box>
          )}

          {/* ── Simulated CGM Graph ── */}
          <Box sx={{ p: 2.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Simulated Glucose Response</Typography>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>Based on meal Glycemic Pressure & macro buffering.</Typography>
              </Box>
              <Chip label="Simulation" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600 }} />
            </Box>
            <Box sx={{ height: 250, width: '100%', mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generateCGMData(log.meals)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>       {/* Spike (red) */}
                      <stop offset="35%" stopColor="#f59e0b" stopOpacity={0.6}/>      {/* Moderate (yellow) */}
                      <stop offset="65%" stopColor="#10b981" stopOpacity={0.4}/>      {/* Baseline (green) */}
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="time" minTickGap={30} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[70, 180]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: 13, fontWeight: 700 }}
                    labelStyle={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}
                  />
                  <Area type="monotone" dataKey="glucose" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#glucoseGradient)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>


          {/* ── AI insight + hydration ── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>AI Insight</Typography>
              {insightMatchesSelectedDay && nutritionInsight?.text ? (
                <>
                  <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{nutritionInsight.text}</Typography>
                  {nutritionInsight?.createdAt && (
                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 1 }}>
                      Updated {new Date(nutritionInsight.createdAt).toLocaleString()}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>Generate an insight for today.</Typography>
              )}
              {mealSuggestions && (
                <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7, mt: 2, pt: 2, borderTop: '1px solid #f3f4f6' }}>{mealSuggestions}</Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" size="small" onClick={generateNutritionInsight} disabled={nutritionInsightGenerating} sx={{ textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}>
                  {nutritionInsightGenerating ? 'Generatingâ€¦' : 'Generate Insight'}
                </Button>
                <Button variant="outlined" size="small" onClick={generateMealSuggestions} disabled={mealSuggestionsGenerating} sx={{ textTransform: 'none', borderColor: '#e5e7eb', color: '#374151' }}>
                  {mealSuggestionsGenerating ? 'Thinkingâ€¦' : 'Suggest Meals'}
                </Button>
              </Box>
            </Box>

            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Hydration</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <WaterDropIcon sx={{ color: '#0ea5e9', fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{Math.round((log.waterIntake || 0) / 250)} glasses</Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    {log.waterIntake || 0} / {timingAlerts?.hydrationGoalMl || 2500} ml total
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" onClick={() => handleWaterChange(250)} startIcon={<WaterDropIcon sx={{ fontSize: 15 }} />} fullWidth>+250 ml</Button>
                <Button size="small" variant="outlined" onClick={() => handleWaterChange(500)} startIcon={<WaterDropIcon sx={{ fontSize: 15 }} />} fullWidth>+500 ml</Button>
              </Box>
              <Button size="small" onClick={() => handleWaterChange(-250)} sx={{ mt: 1, color: '#9ca3af', textTransform: 'none', fontSize: '0.75rem' }}>− Remove 250 ml</Button>
            </Box>
            
            <SupplementSection 
              log={log} 
              onUpdate={async (newSupps) => {
                const updatedLog = { ...log, supplements: newSupps };
                setLog(updatedLog);
                await autoSaveLog(updatedLog);
              }} 
            />
          </Box>

          {/* â”€â”€ CTA to Log Meal tab â”€â”€ */}
          <Box sx={{ p: 2.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#166534' }}>Ready to log a meal?</Typography>
              <Typography variant="caption" sx={{ color: '#15803d' }}>Search the food database, set your portion, and add it to today.</Typography>
            </Box>
            <Button variant="contained" size="small" onClick={() => setActiveTab(1)} sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, color: '#fff', fontWeight: 700 }}>
              + Log Meal
            </Button>
          </Box>
        </Box>
      )}

      {/* â”€â”€â”€ TAB 1: LOG MEAL â”€â”€â”€ */}
      {activeTab === 1 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.25fr' }, gap: 3, alignItems: 'start' }}>

          {/* LEFT: Search + Deep Analysis */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Search Food Database</Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>Find any dish or ingredient to auto-fill nutrition data.</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <TextField
                  placeholder="e.g. paneer tikka, dal, rice, tea"
                  value={foodSearchQuery}
                  onChange={(e) => {
                    setFoodSearchQuery(e.target.value)
                  }}
                  size="small"
                  fullWidth
                  InputProps={{
                    endAdornment: foodSearchLoading ? <Typography variant="caption" sx={{ color: '#6b7280' }}>Searching...</Typography> : null
                  }}
                />
              </Box>

              {!foodSearchLoading && foodSearchAttempted && foodResults.length === 0 && (
                <Typography variant="body2" sx={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', py: 2 }}>No item found</Typography>
              )}

              {foodResults.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, maxHeight: 300, overflow: 'auto', borderRadius: 1.5, border: '1px solid #e5e7eb', p: 0.75 }}>
                  {foodResults.map((f, idx) => (
                    <Box
                      key={f.id || idx}
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 1.25, borderRadius: 1.5, cursor: 'pointer', transition: 'background 0.1s', '&:hover': { bgcolor: '#f0fdf4' } }}
                      onClick={() => {
                        handleSearchResultSelect(f)
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                          {f.name}
                          {f.brand && (
                            <Typography component="span" variant="caption" sx={{ color: '#059669', bgcolor: '#d1fae5', px: 0.6, py: 0.2, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700 }}>
                              {f.brand}
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {formatServingDisplay(f.servingLabel || `${f.servingQty} ${f.servingUnit}`, f.servingWeightG)} · {Math.round(f.calories)} kcal
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', ml: 1, flexShrink: 0 }}>
                        <Typography variant="caption" sx={{ color: '#374151', display: 'block' }}>P {Math.round(f.protein)}g</Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>C {Math.round(f.carbs)}g · F {Math.round(f.fat)}g</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Deep Food Analysis</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  placeholder="Enter food name to analyze"
                  value={selectedFoodForAnalysis}
                  onChange={(e) => setSelectedFoodForAnalysis(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Button size="small" variant="contained" onClick={() => analyzeSelectedFood({ includeLLM: false })} disabled={foodAnalysisLoading} sx={{ whiteSpace: 'nowrap' }}>
                  {foodAnalysisLoading ? 'â€¦' : 'Analyze'}
                </Button>
                <Button size="small" variant="outlined" onClick={() => analyzeSelectedFood({ includeLLM: true })} disabled={foodAnalysisLoading} sx={{ whiteSpace: 'nowrap' }}>
                  + LLM
                </Button>
              </Box>
              {foodAnalysisError && <Typography variant="caption" sx={{ color: '#b91c1c', display: 'block', mb: 1 }}>{foodAnalysisError}</Typography>}
              {foodAnalysis && (
                <Box sx={{ borderRadius: 1.5, border: '1px solid #e5e7eb', bgcolor: '#f9fafb', p: 1.5, mt: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                    {foodAnalysis.canonical_id || '-'} · {Math.round((foodAnalysis.resolver?.confidence || 0) * 100)}% confidence
                  </Typography>
                  {!!foodAnalysis.derived_metrics && (
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
                      <Chip size="small" label={`Glycemic: ${foodAnalysis.derived_metrics.glycemic_pressure?.label || '-'}`} sx={{ fontSize: '0.7rem' }} />
                      <Chip size="small" label={`Satiety: ${foodAnalysis.derived_metrics.satiety_index?.label || '-'}`} sx={{ fontSize: '0.7rem' }} />
                      <Chip size="small" label={`Inflam: ${foodAnalysis.derived_metrics.inflammatory_potential?.label || '-'}`} sx={{ fontSize: '0.7rem' }} />
                    </Box>
                  )}
                  {foodAnalysis.explanation?.narrative && (
                    <Typography variant="caption" sx={{ display: 'block', color: '#374151', lineHeight: 1.6 }}>{foodAnalysis.explanation.narrative}</Typography>
                  )}
                  {foodAnalysis.llm?.narrative && (
                    <Typography variant="caption" sx={{ display: 'block', color: '#374151', lineHeight: 1.6, mt: 0.5 }}>{foodAnalysis.llm.narrative}</Typography>
                  )}
                </Box>
              )}
            </Box>

            {/* SAVED TEMPLATES SECTION */}
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BookmarkIcon sx={{ color: '#6366f1' }} />
                Saved Templates
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>Quickly load your favorite meal combinations.</Typography>
              
              {savedTemplatesLoading ? (
                <LinearProgress />
              ) : savedTemplates.length === 0 ? (
                <Typography variant="caption" sx={{ color: '#9ca3af', fontStyle: 'italic' }}>No templates saved yet.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflow: 'auto', pr: 0.5 }}>
                  {savedTemplates.map((tpl) => (
                    <Box 
                      key={tpl._id} 
                      sx={{ 
                        p: 1.5, 
                        borderRadius: 1.5, 
                        border: '1px solid #e5e7eb', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: '#f5f3ff', borderColor: '#c4b5fd' }
                      }}
                      onClick={() => useTemplate(tpl)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#4338ca' }}>{tpl.name}</Typography>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl._id); }}>
                          <DeleteIcon sx={{ fontSize: '0.9rem', color: '#9ca3af' }} />
                        </IconButton>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                        {tpl.foods.length} items · {Math.round(tpl.foods.reduce((s, f) => s + (f.calories || 0), 0))} kcal
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {/* FREQUENT MEALS (AUTO-CALCULATED) */}
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon sx={{ color: '#10b981' }} />
                Frequent Meals
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>Auto-calculated from your last 60 days of logs.</Typography>
              
              {frequentMealsLoading ? (
                <LinearProgress />
              ) : frequentMeals.length === 0 ? (
                <Typography variant="caption" sx={{ color: '#9ca3af', fontStyle: 'italic' }}>Keep logging to see your trends here.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 300, overflow: 'auto', pr: 0.5 }}>
                  {frequentMeals.map((tpl, idx) => (
                    <Box 
                      key={`freq-${idx}`} 
                      sx={{ 
                        p: 1.5, 
                        borderRadius: 1.5, 
                        border: '1px solid #e5e7eb', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: '#f0fdf4', borderColor: '#86efac' }
                      }}
                      onClick={() => useTemplate(tpl)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#059669' }}>{tpl.mealName}</Typography>
                        <Chip label={`${tpl.frequency}Ã—`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#d1fae5', color: '#065f46', fontWeight: 700 }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                        {tpl.foods?.length || 0} items · {Math.round(tpl.totalCalories || 0)} kcal
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* RIGHT: Meal Builder */}
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            {/* Removed 'Build Your Meal' and instructional text as requested */}

            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Meal name"
                value={newMeal.name}
                onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                size="small"
                sx={{ flex: 1, minWidth: 160 }}
                placeholder="e.g. Breakfast, Lunchâ€¦"
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
                {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </TextField>
              <TextField
                label="Time"
                type="time"
                value={newMeal.time}
                onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
                size="small"
                sx={{ width: 140 }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }} // 5 min steps
              />
            </Box>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280', mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Foods</Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              {newMeal.foods.map((food, idx) => (
                <Box key={idx} sx={{ borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden', position: 'relative' }}>
                  <IconButton
                    size="small"
                    onClick={() => removeFoodRow(idx)}
                    sx={{ position: 'absolute', top: 4, right: 4, zIndex: 10, bgcolor: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                  {!!food.servingLabel && (
                    <Box sx={{ px: 1.5, py: 0.75, bgcolor: '#eff6ff', borderBottom: '1px solid #e0eaff' }}>
                      <Typography variant="caption" sx={{ color: '#1d4ed8' }}>
                        Base serving: {formatServingDisplay(food.servingLabel, food.servingWeightG)}
                        {food.baseServingQty && food.quantity && Number(food.quantity) !== Number(food.baseServingQty) && (
                          <> · You entered {food.quantity} {food.baseServingUnit} ({((Number(food.quantity) / Number(food.baseServingQty)) || 1).toFixed(2)}x serving)</>
                        )}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ p: 1.5, bgcolor: '#f9fafb', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <TextField
                      label="Food name"
                      value={food.name}
                      onChange={(e) => updateFoodField(idx, 'name', e.target.value)}
                      size="small"
                      sx={{ flex: 1, minWidth: 120 }}
                    />
                    <TextField
                      label={food.baseServingQty ? `Amount (${food.baseServingUnit || ''})` : 'Amount'}
                      value={food.quantity}
                      onChange={(e) => updateFoodField(idx, 'quantity', e.target.value)}
                      size="small"
                      sx={{ width: 90 }}
                      inputProps={{ inputMode: 'decimal' }}
                    />
                    <TextField
                      label="Unit"
                      value={food.baseServingUnit || food.unit || ''}
                      size="small"
                      sx={{ width: 100, bgcolor: '#f3f4f6', fontWeight: 600, color: '#222', borderRadius: 1 }}
                      InputProps={{ readOnly: true }}
                      inputProps={{ style: { textAlign: 'center', fontWeight: 600, color: '#222' } }}
                    />
                    <TextField
                      label="Total g"
                      value={food.baseServingQty && food.servingWeightG && food.quantity ?
                        ((Number(food.quantity) / Number(food.baseServingQty)) * Number(food.servingWeightG)).toFixed(0) : ''}
                      size="small"
                      sx={{ width: 80, bgcolor: '#f3f4f6', fontWeight: 600, color: '#222', borderRadius: 1 }}
                      InputProps={{ readOnly: true }}
                      inputProps={{ style: { textAlign: 'center', fontWeight: 700, color: '#374151' } }}
                    />
                    <TextField
                      label="kcal"
                      value={food.calories}
                      onChange={(e) => updateFoodField(idx, 'calories', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
                    <ExpandableSection title="Macros & fats" defaultOpen={false}>
                      {renderNutrientInputs({ food, index: idx, fields: MACRO_FIELD_META, updateFoodField })}
                    </ExpandableSection>
                    <ExpandableSection title="Minerals" defaultOpen={false}>
                      {renderNutrientInputs({ food, index: idx, fields: MINERAL_FIELD_META, updateFoodField })}
                    </ExpandableSection>
                    <ExpandableSection title="Vitamins" defaultOpen={false}>
                      {renderNutrientInputs({ food, index: idx, fields: VITAMIN_FIELD_META, updateFoodField })}
                    </ExpandableSection>
                  </Box>
                </Box>
              ))}
            </Box>

            <Button size="small" onClick={addFoodRow} sx={{ textTransform: 'none', mb: 2 }}>+ Add another food</Button>

            <TextField
              label="Meal notes (optional)"
              value={newMeal.notes}
              onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
              multiline
              minRows={2}
              fullWidth
              size="small"
              sx={{ mb: 2.5 }}
            />

            {/* LIVE INTERACTION FEEDBACK */}
            {(liveInsights.synergies.length > 0 || liveInsights.antagonisms.length > 0) && (
              <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon sx={{ fontSize: '1.1rem', color: '#3b82f6' }} />
                  Real-time Meal Analysis
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {liveInsights.synergies.map((syn, i) => (
                    <Box key={`live-syn-${i}`} sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', display: 'block' }}>✨ {syn.title} ({syn.effect})</Typography>
                      <Typography variant="caption" sx={{ color: '#15803d', display: 'block' }}>{syn.description}</Typography>
                    </Box>
                  ))}
                  {liveInsights.antagonisms.map((ant, i) => (
                    <Box key={`live-ant-${i}`} sx={{ p: 1.5, bgcolor: '#fff7ed', borderRadius: 1.5, border: '1px solid #fed7aa' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#9a3412', display: 'block' }}>⚠️ {ant.title} ({ant.effect})</Typography>
                      <Typography variant="caption" sx={{ color: '#c2410c', display: 'block', mb: 0.5 }}>{ant.description}</Typography>
                      {ant.fix && <Typography variant="caption" sx={{ fontWeight: 700, color: '#7c2d12', display: 'block', bgcolor: '#ffedd5', p: 0.5, borderRadius: 0.5 }}>Fix: {ant.fix}</Typography>}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* SAVE AS TEMPLATE BAR */}
            <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: '#f5f3ff', border: '1px solid #ddd6fe', display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                placeholder="Template name..."
                size="small"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                sx={{ bgcolor: '#fff', flex: 1 }}
              />
              <Button 
                variant="contained" 
                size="small" 
                onClick={saveAsTemplate}
                disabled={savingTemplate || !templateName.trim() || newMeal.foods.length === 0}
                sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' }, whiteSpace: 'nowrap', color: '#fff', fontWeight: 600, textTransform: 'none' }}
              >
                {savingTemplate ? 'Saving...' : 'Save as Template'}
              </Button>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button variant="outlined" size="small" onClick={resetNewMeal} sx={{ borderColor: '#e5e7eb', color: '#6b7280' }}>Clear</Button>
              <Button
                variant="contained"
                onClick={() => { addMealToDay(); setActiveTab(0); }}
                disabled={!newMeal.name.trim()}
                sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 700 }}
              >
                Add to {formatDate(selectedDate)}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {activeTab === 2 && (
        <WeightTracker selectedDate={selectedDate} />
      )}

      {activeTab === 3 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 3 }}>
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Today's Details
            </Typography>

              {(!log?.meals || log.meals.length === 0) && (
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
                  No meals logged for this selected date yet.
                </Typography>
              )}

              {clinicalTargetsRequiresSetup && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#92400e' }}>
                    Clinical targets need setup. Complete Body + Clinical Profile to unlock personalized targets.
                  </Typography>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    sx={{ mt: 1, textTransform: 'none', borderColor: '#f59e0b', color: '#92400e' }}
                    onClick={() => {
                       // Assuming there is a window event or a prop to switch to profile
                       window.dispatchEvent(new CustomEvent('lifesync:navigate', { detail: { tab: 'Profile' } }));
                    }}
                  >
                    Set up Clinical Profile
                  </Button>
                  {clinicalTargetsMissingFields.length > 0 && (
                    <Typography variant="caption" sx={{ color: '#b45309', display: 'block', mt: 0.5 }}>
                      Debug missing fields: {clinicalTargetsMissingFields.join(', ')}
                    </Typography>
                  )}
                </Box>
              )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: '#374151' }}>
                    Calories
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {fmt(totals.calories, 0)} / {calorieTarget ? fmt(calorieTarget, 0) : '—'} kcal
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
                    {fmt(totals.protein)} / {proteinTarget ? fmt(proteinTarget) : '—'} g
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
                    {fmt(totals.carbs)} g
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    Fat
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {fmt(totals.fat)} g
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    Fiber
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {fmt(totals.fiber)} g
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Micros
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                {SUMMARY_MICRO_META.map(({ key, label, unit }) => (
                  <Box key={key}>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {Number(totals?.[key] || 0).toFixed(unit === 'ug' ? 0 : 1)} {unit}
                    </Typography>
                    {(() => {
                      const targetKey = MICRO_TO_TARGET_KEY[key]
                      const target = targetKey ? Number(microTargetLookup?.[targetKey]) : NaN
                      const hasTarget = Number.isFinite(target) && target > 0
                      return (
                        <>
                          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.25 }}>
                            {hasTarget
                              ? `Target ${target.toFixed(unit === 'ug' ? 0 : 1)} ${unit}`
                              : 'Target unavailable'}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={hasTarget ? percent(Number(totals?.[key] || 0), target) : 0}
                            sx={{
                              mt: 0.5,
                              height: 5,
                              borderRadius: 99,
                              bgcolor: '#f3f4f6',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: hasTarget ? '#10b981' : '#d1d5db',
                              },
                            }}
                          />
                        </>
                      )
                    })()}
                  </Box>
                ))}
              </Box>

              {clinicalTargetRows.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Clinical Targets
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    {clinicalTargetRows.map((row) => (
                      <Box key={row.key}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>{row.label}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {Number(row.currentValue || 0).toFixed(row.unit === 'kcal' ? 0 : 1)} / {Number(row.targetValue || 0).toFixed(row.unit === 'kcal' ? 0 : 1)} {row.unit}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percent(row.currentValue, row.targetValue)}
                          sx={{ height: 6, borderRadius: 99, bgcolor: '#f3f4f6' }}
                        />
                      </Box>
                    ))}
                  </Box>
                </>
              )}

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
              onChange={(e) => {
                let updatedLog = null
                setLog(prev => {
                  updatedLog = {
                    ...prev,
                    notes: e.target.value
                  }
                  return updatedLog
                })
                if (updatedLog) autoSaveLog(updatedLog)
              }}
              fullWidth
            />
          </Box>
        </Box>
      )}

      {activeTab === 4 && (
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Nutrition Summary</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
            Weekly and monthly nutrient consumption vs total required amount for each period.
          </Typography>

          {periodSummaryLoading && <LinearProgress sx={{ mb: 2 }} />}

          {['Weekly', 'Monthly'].map((period) => {
            const totalsForPeriod = period === 'Weekly' ? weeklyTotals : monthlyTotals
            const days = period === 'Weekly' ? 7 : 30
            
            // Calculate actual dates for this period to lookup dynamic targets
            const pEnd = new Date()
            pEnd.setHours(23, 59, 59, 999)
            const pStart = new Date(pEnd)
            pStart.setDate(pStart.getDate() - (days - 1))
            pStart.setHours(0, 0, 0, 0)

            const rowMap = new Map()

              const getRequiredForPeriod = (targetKey) => {
                if (!targetKey) return 0
                let total = 0
                const staticTargets = clinicalTargets?.targets || {}
                const staticMicros = staticTargets.micronutrients || {}
                let staticVal = (targetKey in staticTargets) ? staticTargets[targetKey] : staticMicros[targetKey]

                // Fallback to user-level targets if clinical targets are missing (e.g. before profile setup)
                if (staticVal == null || staticVal === 0) {
                  if (targetKey === 'calories') staticVal = user?.dailyCalorieTarget
                  if (targetKey === 'protein') staticVal = user?.dailyProteinTarget
                  // If we still have nothing for primary macros, use reasonable defaults consistent with backend
                  if (!staticVal) {
                    if (targetKey === 'calories') staticVal = 2100
                    if (targetKey === 'protein') staticVal = 150
                    if (targetKey === 'carbs') staticVal = 250
                    if (targetKey === 'fat') staticVal = 70
                    if (targetKey === 'saturatedFat') staticVal = 22
                    if (targetKey === 'monounsaturatedFat') staticVal = 30
                    if (targetKey === 'polyunsaturatedFat') staticVal = 15
                    if (targetKey === 'cholesterol') staticVal = 300
                  }
                }

                for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
                  const dateKey = d.toISOString().split('T')[0]
                  const dyn = dynamicTargets[dateKey]
                  if (dyn) {
                    const actualDyn = dyn.targets || {}
                    const dynMicros = actualDyn.micronutrients || {}
                    const val = (targetKey in actualDyn) ? actualDyn[targetKey] : dynMicros[targetKey]
                    total += Number(val || 0)
                  } else {
                    total += Number(staticVal || 0)
                  }
                }
                return total
              }

              Object.entries(TARGET_KEY_TO_TOTAL_KEY).forEach(([targetKey, totalKey]) => {
                const required = getRequiredForPeriod(targetKey)
                const consumed = Number(totalsForPeriod?.[totalKey] || 0)
                const unit =
                  targetKey === 'calories' ? 'kcal' :
                  targetKey === 'omega3' || targetKey === 'cholesterol' ? 'mg' :
                  ['vitaminD', 'vitaminA', 'folate', 'selenium'].includes(targetKey) ? 'ug' :
                  ['protein', 'fat', 'carbs', 'fiber', 'sugar', 'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat'].includes(targetKey) ? 'g' : 'mg'
              const label = targetKey.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
              rowMap.set(totalKey, {
                key: `${period}-${targetKey}`,
                label,
                consumed,
                required: Number.isFinite(required) && required > 0 ? required : null,
                unit,
              })
            })

            SUMMARY_MICRO_META.forEach(({ key, label, unit }) => {
              if (rowMap.has(key)) return
              const targetKey = MICRO_TO_TARGET_KEY[key]
              const required = getRequiredForPeriod(targetKey)
              const consumed = Number(totalsForPeriod?.[key] || 0)
              rowMap.set(key, {
                key: `${period}-micro-${key}`,
                label,
                consumed,
                required: Number.isFinite(required) && required > 0 ? required : null,
                unit,
              })
            })

            const rows = Array.from(rowMap.values())

            return (
              <Box key={period} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{period}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  {rows.map((row) => (
                    <Box key={row.key}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>{row.label}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {fmt(row.consumed, row.unit === 'kcal' ? 0 : 1)} / {row.required == null ? '—' : fmt(row.required, row.unit === 'kcal' ? 0 : 1)} {row.unit}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={row.required == null ? 0 : percent(row.consumed, row.required)}
                        sx={{
                          height: 6,
                          borderRadius: 99,
                          bgcolor: '#f3f4f6',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: row.required == null ? '#d1d5db' : '#2563eb',
                          },
                        }}
                      />
                      {row.required == null && (
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>Target unavailable</Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )
          })}

          {!clinicalTargets?.targets && (
            <Typography variant="body2" sx={{ color: '#92400e' }}>
              Clinical targets are required to compute weekly/monthly requirement bars.
            </Typography>
          )}
        </Box>
      )}

      {activeTab === 5 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, gap: 3 }}>
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Scan Product Barcode</Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
              Scan with camera or enter barcode manually to fetch product details and nutrient values.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <TextField
                label="Barcode"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                size="small"
                sx={{ minWidth: 220, flex: 1 }}
                placeholder="e.g. 8901030865432"
              />
              <Button
                variant="contained"
                onClick={() => lookupBarcode(barcodeInput)}
                disabled={barcodeLookupLoading}
              >
                {barcodeLookupLoading ? 'Looking up...' : 'Lookup'}
              </Button>
              <Button
                variant="outlined"
                onClick={startBarcodeScanner}
                disabled={!supportsBarcodeDetector || scannerOpen}
              >
                Open Camera
              </Button>
              <Button
                variant="outlined"
                component="label"
                disabled={!supportsBarcodeDetector || scanBusy}
              >
                Upload Barcode Image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) scanUploadedBarcodeImage(file)
                    e.target.value = ''
                  }}
                />
              </Button>
            </Box>

            {scannerOpen && (
              <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 1.5, mb: 2 }}>
                <Box
                  component="video"
                  ref={scanVideoRef}
                  muted
                  playsInline
                  sx={{ width: '100%', maxHeight: 320, borderRadius: 1, bgcolor: '#111827' }}
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button variant="contained" onClick={scanBarcodeFrame} disabled={scanBusy}>
                    {scanBusy ? 'Scanning...' : 'Scan Frame'}
                  </Button>
                  <Button variant="outlined" onClick={stopBarcodeScanner}>Close Camera</Button>
                </Box>
              </Box>
            )}

            {!!uploadedBarcodePreview && (
              <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 1.5, mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
                  Uploaded image preview
                </Typography>
                <Box
                  component="img"
                  src={uploadedBarcodePreview}
                  alt="Uploaded barcode"
                  sx={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 1, bgcolor: '#f9fafb' }}
                />
              </Box>
            )}

            {barcodeLookupError && (
              <Typography variant="body2" sx={{ color: '#b91c1c' }}>{barcodeLookupError}</Typography>
            )}

            {!supportsBarcodeDetector && (
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                Camera scanning is unavailable in this browser. Manual barcode lookup still works.
              </Typography>
            )}
          </Box>

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Product Details</Typography>

            {!barcodeProduct && (
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Lookup a barcode to view product info and nutrients per 100 g.
              </Typography>
            )}

            {barcodeProduct && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {barcodeProduct?.imageUrl && (
                  <Box
                    component="img"
                    src={barcodeProduct.imageUrl}
                    alt={barcodeProduct.name || 'Product image'}
                    sx={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 1, border: '1px solid #e5e7eb', bgcolor: '#fff' }}
                  />
                )}
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{barcodeProduct.name}</Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  Brand: {barcodeProduct.brand || '—'} · Barcode: {barcodeProduct.barcode || '—'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  Qty: {barcodeProduct.quantityLabel || '—'} · Serving: {barcodeProduct.servingSize || '—'}
                </Typography>

                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 700, letterSpacing: '0.03em' }}>
                  Nutrients (per 100 g)
                </Typography>
                
                {barcodeProduct?._estimatedFields && barcodeProduct._estimatedFields.length > 0 && (
                  <Typography variant="caption" sx={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, bgcolor: '#fef3c7', p: 1, borderRadius: 1 }}>
                    <InfoIcon sx={{ fontSize: '1rem' }} />
                    Fields marked with * are AI-estimated because the manufacturer did not provide them.
                  </Typography>
                )}

                {[
                  ['Calories', 'caloriesKcal', `${Number(barcodeProduct?.nutrimentsPer100g?.caloriesKcal || 0).toFixed(0)} kcal`],
                  ['Protein', 'proteinG', `${Number(barcodeProduct?.nutrimentsPer100g?.proteinG || 0).toFixed(1)} g`],
                  ['Carbs', 'carbsG', `${Number(barcodeProduct?.nutrimentsPer100g?.carbsG || 0).toFixed(1)} g`],
                  ['Fat', 'fatG', `${Number(barcodeProduct?.nutrimentsPer100g?.fatG || 0).toFixed(1)} g`],
                  ['Fiber', 'fiberG', `${Number(barcodeProduct?.nutrimentsPer100g?.fiberG || 0).toFixed(1)} g`],
                  ['Sugar', 'sugarG', `${Number(barcodeProduct?.nutrimentsPer100g?.sugarG || 0).toFixed(1)} g`],
                  ['Sodium', 'sodiumMg', `${Number(barcodeProduct?.nutrimentsPer100g?.sodiumMg || 0).toFixed(0)} mg`],
                  ['Potassium', 'potassiumMg', `${Number(barcodeProduct?.nutrimentsPer100g?.potassiumMg || 0).toFixed(0)} mg`],
                  ['Calcium', 'calciumMg', `${Number(barcodeProduct?.nutrimentsPer100g?.calciumMg || 0).toFixed(0)} mg`],
                  ['Iron', 'ironMg', `${Number(barcodeProduct?.nutrimentsPer100g?.ironMg || 0).toFixed(2)} mg`],
                  ['Vitamin C', 'vitaminCMg', `${Number(barcodeProduct?.nutrimentsPer100g?.vitaminCMg || 0).toFixed(2)} mg`],
                  ['Vitamin B12', 'vitaminB12Ug', `${Number(barcodeProduct?.nutrimentsPer100g?.vitaminB12Ug || 0).toFixed(2)} ug`],
                  ['Vitamin D', 'vitaminDUg', `${Number(barcodeProduct?.nutrimentsPer100g?.vitaminDUg || 0).toFixed(2)} ug`],
                  ['Omega-3', 'omega3G', `${Number(barcodeProduct?.nutrimentsPer100g?.omega3G || 0).toFixed(3)} g`],
                ].map(([label, key, value]) => {
                  const isEstimated = barcodeProduct?._estimatedFields?.includes(key);
                  return (
                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', py: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#374151' }}>
                        {label}
                        {isEstimated && <span style={{ color: '#d97706', marginLeft: 4, fontWeight: 'bold' }} title="Estimated using AI based on product type">*</span>}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: isEstimated ? 500 : 600, color: isEstimated ? '#b45309' : 'inherit' }}>{value}</Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {activeTab === 2 && (
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

      {activeTab === 6 && (
        <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <NutritionInsights selectedDate={selectedDate} />
        </Box>
      )}
      {activeTab === 7 && (
        <RecipeExplorer token={token} />
      )}
      {activeTab === 8 && (
        <KitchenInventory />
      )}

      {activeTab === 9 && (
        <WeeklyReview weekKey={(() => {
          const d = new Date(selectedDate);
          const istDateStr = d.toLocaleString('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).substring(0, 10).replace(/\//g, '-');
          const [y, m, dDay] = istDateStr.split('-').map(Number);
          const dUTC = new Date(Date.UTC(y, m - 1, dDay, 0, 0, 0));
          const dayNum = dUTC.getUTCDay();
          dUTC.setUTCDate(dUTC.getUTCDate() - dayNum);
          const yearStart = new Date(Date.UTC(dUTC.getUTCFullYear(), 0, 1));
          const yearStartDay = yearStart.getUTCDay();
          yearStart.setUTCDate(yearStart.getUTCDate() - yearStartDay);
          const weekNum = Math.floor(((dUTC - yearStart) / 86400000) / 7) + 1;
          return `${dUTC.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        })()} />
      )}
    </Box>
  )
}



function SupplementSection({ log, onUpdate }) {
  const [selectedSupp, setSelectedSupp] = useState('');
  const [loading, setLoading] = useState(false);

  const SUPPLEMENT_PRESETS = [
    'Whey Protein (1 Scoop)',
    'Creatine Monohydrate (5g)',
    'Multivitamin (Standard)',
    'Omega-3 Fish Oil (1000mg)',
    'Vitamin D3 (2000IU)',
    'Magnesium Glycinate (200mg)',
    'Zinc Gluconate (30mg)',
    'B-Complex (High Dose)'
  ];

  const SUPPLEMENT_DATA = {
    'Whey Protein (1 Scoop)': { calories: 120, protein: 25, carbs: 3, fat: 1.5, calcium: 150 },
    'Creatine Monohydrate (5g)': { protein: 0 },
    'Multivitamin (Standard)': { vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminB12: 2.4, folate: 400, iron: 18, zinc: 11, selenium: 55, magnesium: 100 },
    'Omega-3 Fish Oil (1000mg)': { fat: 1, omega3: 300 },
    'Vitamin D3 (2000IU)': { vitaminD: 50 },
    'Magnesium Glycinate (200mg)': { magnesium: 200 },
    'Zinc Gluconate (30mg)': { zinc: 30 },
    'B-Complex (High Dose)': { vitaminB1: 50, vitaminB2: 50, vitaminB3: 50, vitaminB6: 50, vitaminB12: 100, folate: 400 }
  };

  const addSupplement = async () => {
    if (!selectedSupp) return;
    setLoading(true);
    const nutriments = SUPPLEMENT_DATA[selectedSupp];
    const newSupp = { 
      name: selectedSupp, 
      nutriments, 
      takenAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    
    const updatedSupps = [...(log.supplements || []), newSupp];
    await onUpdate(updatedSupps);
    setSelectedSupp('');
    setLoading(false);
  };

  const removeSupp = async (idx) => {
    const updatedSupps = log.supplements.filter((_, i) => i !== idx);
    await onUpdate(updatedSupps);
  };

  return (
    <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        💊 Supplement Stack
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
        {(log.supplements || []).map((s, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: '#f9fafb', borderRadius: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{s.name}</Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                {Object.keys(s.nutriments || {}).length} nutrients · {s.takenAt}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => removeSupp(i)}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
          </Box>
        ))}
        {(!log.supplements || log.supplements.length === 0) && (
          <Typography variant="caption" sx={{ color: '#9ca3af' }}>No supplements logged for today.</Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Add Supplement</InputLabel>
          <Select
            value={selectedSupp}
            onChange={(e) => setSelectedSupp(e.target.value)}
            label="Add Supplement"
          >
            {SUPPLEMENT_PRESETS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={addSupplement} disabled={!selectedSupp || loading}>Add</Button>
      </Box>
    </Box>
  );
}

export default NutritionTracker;

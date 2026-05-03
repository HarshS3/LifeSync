import ExpandableSection from './ExpandableSection'
import NutritionInsights from './NutritionInsights'
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
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import LocalDiningIcon from '@mui/icons-material/LocalDining'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import TodayIcon from '@mui/icons-material/Today'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import InfoIcon from '@mui/icons-material/Info'
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

const TARGET_KEY_TO_TOTAL_KEY = {
  calories: 'calories',
  protein: 'protein',
  fat: 'fat',
  carbs: 'carbs',
  fiber: 'fiber',
  sugar: 'sugar',
  saturatedFat: 'saturatedFat',
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
  { key: 'omega3', label: 'Omega-3', unit: 'g' },
  { key: 'saturatedFat', label: 'Sat. fat', unit: 'mg' },
  { key: 'monounsaturatedFat', label: 'MUFA', unit: 'mg' },
  { key: 'polyunsaturatedFat', label: 'PUFA', unit: 'mg' },
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
  
  if (!safeLabel && Number.isFinite(safeWeight) && safeWeight > 0) return `${safeWeight}g`
  if (!Number.isFinite(safeWeight) || safeWeight <= 0) return safeLabel

  // If the label already contains the weight (e.g. "41 grams" or "130 gram"), don't add redundant (41g)
  // We use a global match to find ANY weight in the label
  const weightMatches = safeLabel.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|gm|ml)s?/gi)
  if (weightMatches) {
    for (const match of weightMatches) {
      const extracted = parseFloat(match.replace(/[^\d.]/g, ''))
      if (Math.abs(extracted - safeWeight) < 1) {
        return safeLabel // Already in label, no need for extra weight info
      }
    }
  }

  // Otherwise show as "1 serving (75g)"
  return `${safeLabel} (${Math.round(safeWeight)}g)`
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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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
  const [foodSearchAttempted, setFoodSearchAttempted] = useState(false)
  const [selectedFoodForAnalysis, setSelectedFoodForAnalysis] = useState('')



  const [mfpSearchQuery, setMfpSearchQuery] = useState('')
  const [mfpResults, setMfpResults] = useState([])
  const [mfpLoading, setMfpLoading] = useState(false)
  const [addingMfpFoodId, setAddingMfpFoodId] = useState(null)

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
  const [clinicalTargetsDebug, setClinicalTargetsDebug] = useState(null)

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
  const [hypotheses, setHypotheses] = useState([])
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
    if (activeTab !== 0 && activeTab !== 3 && activeTab !== 4) return
    loadClinicalTargets()
    if (activeTab === 3 || activeTab === 4) {
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
      const headers = getAuthHeaders()
      const res = await fetch(`${API_BASE}/api/nutrition/clinical-targets`, { headers })
      if (!res.ok) {
        setClinicalTargets(null)
        setClinicalTargetsRequiresSetup(false)
        setClinicalTargetsMissingFields([])
        setClinicalTargetsDebug({ httpStatus: res.status, error: 'clinical-targets request failed' })
        console.warn('[ClinicalTargets Debug] non-200 response:', res.status)
        return
      }
      const data = await safeReadJson(res)
      console.info('[ClinicalTargets Debug] response payload:', data)
      if (data?.requiresSetup || !data?.targets) {
        let profileData = null
        try {
          const profileRes = await fetch(`${API_BASE}/api/users/profile`, { headers })
          if (profileRes.ok) {
            profileData = await safeReadJson(profileRes)
          }
        } catch {
          // ignore profile fetch failure; we still show server missing fields
        }

        const toNum = (v) => {
          const n = Number(v)
          return Number.isFinite(n) ? n : undefined
        }

        const rawSex = profileData?.biologicalProfile?.biologicalSex || profileData?.gender
        const biologicalSex =
          rawSex === 'male' || rawSex === 'female'
            ? rawSex
            : undefined
        const heightCm = toNum(profileData?.biologicalProfile?.heightCm) ?? toNum(profileData?.height)
        const weightKg = toNum(profileData?.biologicalProfile?.weightKg) ?? toNum(profileData?.weight)

        const clientMissingFields = []
        if (!biologicalSex) clientMissingFields.push('biologicalSex')
        if (!(Number(heightCm) > 0)) clientMissingFields.push('heightCm')
        if (!(Number(weightKg) > 0)) clientMissingFields.push('weightKg')

        const debugSnapshot = {
          serverMissingFields: Array.isArray(data?.missingRequiredFields) ? data.missingRequiredFields : [],
          clientMissingFields,
          effectiveProfile: {
            biologicalSex: biologicalSex || null,
            heightCm: Number(heightCm) > 0 ? heightCm : null,
            weightKg: Number(weightKg) > 0 ? weightKg : null,
          },
          rawProfileValues: {
            gender: profileData?.gender ?? null,
            biologicalSex: profileData?.biologicalProfile?.biologicalSex ?? null,
            height: profileData?.height ?? null,
            weight: profileData?.weight ?? null,
            bioHeightCm: profileData?.biologicalProfile?.heightCm ?? null,
            bioWeightKg: profileData?.biologicalProfile?.weightKg ?? null,
          },
        }

        setClinicalTargets(null)
        setClinicalTargetsRequiresSetup(true)
        setClinicalTargetsMissingFields(Array.isArray(data?.missingRequiredFields) ? data.missingRequiredFields : [])
        setClinicalTargetsDebug(debugSnapshot)
        console.warn('[ClinicalTargets Debug] setup required:', debugSnapshot)
        return
      }
      setClinicalTargets(data)
      setClinicalTargetsRequiresSetup(false)
      setClinicalTargetsMissingFields([])
      setClinicalTargetsDebug(null)
    } catch (err) {
      console.error('Failed to load clinical targets:', err)
      setClinicalTargets(null)
      setClinicalTargetsRequiresSetup(false)
      setClinicalTargetsMissingFields([])
      setClinicalTargetsDebug({ error: err?.message || 'unknown error' })
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

  const aggregateTotalsFromLogs = (logs) => {
    const out = { ...EMPTY_TOTALS, waterIntake: 0 }
    ;(logs || []).forEach((logItem) => {
      const d = logItem?.dailyTotals || {}
      Object.keys(out).forEach((k) => {
        if (k === 'waterIntake') {
          out[k] += Number(logItem?.waterIntake || 0)
        } else {
          out[k] += Number(d[k] || 0)
        }
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

      const weekLogs = weekRes.ok ? await safeReadJson(weekRes) : []
      const monthLogs = monthRes.ok ? await safeReadJson(monthRes) : []

      setWeeklyTotals(aggregateTotalsFromLogs(Array.isArray(weekLogs) ? weekLogs : []))
      setMonthlyTotals(aggregateTotalsFromLogs(Array.isArray(monthLogs) ? monthLogs : []))
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

  const applyFoodResultToRow = (foodResult, index) => {
    const baseServingQty = Number(foodResult?.servingQty) > 0 ? Number(foodResult.servingQty) : 1
    const baseServingUnit = String(foodResult?.servingUnit || 'serving').trim() || 'serving'
    const servingLabel =
      String(foodResult?.servingLabel || '').trim() || formatServingLabel(baseServingQty, baseServingUnit)

    // Attempt to extract weight from unit/label if it's explicitly mentioned (e.g. "130 gram")
    // This handles cases where the API returns a generic 100g weight but the label is more specific.
    let weightG = foodResult?.servingWeightG ?? null
    const weightInUnit = baseServingUnit.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|gm|ml)/i)
    const weightInLabel = servingLabel.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|gm|ml)/i)
    const extractedWeight = weightInUnit ? parseFloat(weightInUnit[1]) : (weightInLabel ? parseFloat(weightInLabel[1]) : null)
    
    if (extractedWeight && extractedWeight > 0) {
      weightG = extractedWeight
    }

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
          servingWeightG: weightG,
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

  const addFoodFromSearch = (foodResult) => {
    const baseServingQty = Number(foodResult?.servingQty) > 0 ? Number(foodResult.servingQty) : 1
    const baseServingUnit = String(foodResult?.servingUnit || 'serving').trim() || 'serving'
    const servingLabel = String(foodResult?.servingLabel || '').trim() || formatServingLabel(baseServingQty, baseServingUnit)

    let weightG = foodResult?.servingWeightG ?? null
    const weightInUnit = baseServingUnit.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|gm|ml)/i)
    const weightInLabel = servingLabel.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|gm|ml)/i)
    const extractedWeight = weightInUnit ? parseFloat(weightInUnit[1]) : (weightInLabel ? parseFloat(weightInLabel[1]) : null)
    if (extractedWeight && extractedWeight > 0) weightG = extractedWeight

    const newFood = {
      ...createEmptyFoodRow(),
      name: foodResult?.name || '',
      quantity: String(baseServingQty),
      unit: baseServingUnit,
      baseServingQty,
      baseServingUnit,
      servingLabel,
      servingWeightG: weightG,
      sourceFoodId: foodResult?.id || '',
      sourceKind: foodResult?._local?.kind || '',
    }

    FOOD_NUTRIENT_FIELDS.forEach((field) => {
      const value = roundNutrient(foodResult?.[field] ?? 0)
      newFood[field] = value
      newFood[`${field}_base`] = value
    })

    setNewMeal(prev => {
      // Remove any trailing empty rows and prepend the new food
      const existing = prev.foods.filter(f => f.name.trim() !== '')
      return {
        ...prev,
        foods: [newFood, ...existing]
      }
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
        ...prev.foods,
        createEmptyFoodRow(),
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
        setHypotheses(Array.isArray(hypos) ? hypos : [])
        setHypothesesCount(Array.isArray(hypos) ? hypos.length : null)
      } else {
        setHypotheses([])
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
        meals: [...(prev.meals || []), meal],
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
      foods: mealToEdit.foods && mealToEdit.foods.length > 0 ? JSON.parse(JSON.stringify(mealToEdit.foods)) : [createEmptyFoodRow()],
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
    const micros = clinicalTargets?.targets?.micronutrients || {}
    return micros
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

  const handleMfpSearch = async () => {
    if (!mfpSearchQuery.trim()) return
    setMfpLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/mfp/search?q=${encodeURIComponent(mfpSearchQuery)}`, {
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error('MFP search failed')
      const data = await res.json()
      setMfpResults(data)
    } catch (err) {
      console.error(err)
      alert('Failed to search MyFitnessPal. Try again.')
    } finally {
      setMfpLoading(false)
    }
  }

  const handleAddMfpFoodToDb = async (food) => {
    setAddingMfpFoodId(food.id)
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/mfp/add`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ food })
      })
      if (!res.ok) throw new Error('Failed to add food')
      alert(`Successfully added "${food.displayName}" to local database! It will now appear in your regular searches.`)
    } catch (err) {
      console.error(err)
      alert('Failed to add food to database.')
    } finally {
      setAddingMfpFoodId(null)
    }
  }

  return (
    <Box sx={{ minWidth: 0, overflowX: 'hidden' }}>
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-start' }, gap: 2, mb: { xs: 2, sm: 3 } }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
            Nutrition
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
            Log meals, macros, and hydration
          </Typography>
        </Box>
      </Box>

      {/* Date controls */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          mb: { xs: 2, sm: 3 },
          p: { xs: 1.5, sm: 2.5 },
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid #e5e7eb',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <IconButton 
            size="small" 
            onClick={() => changeDay(-1)}
            sx={{ 
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: 'action.selected' },
              '&:active': { transform: 'scale(0.95)' },
              '&:focus': { outline: '2px solid #1f2937' }
            }}
          >
            <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {selectedDate.toDateString() === new Date().toDateString() ? 'Today' : 'Selected day'}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {formatDate(selectedDate)}
            </Typography>
          </Box>
          <IconButton 
            size="small" 
            onClick={() => changeDay(1)}
            sx={{ 
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: 'action.selected' },
              '&:active': { transform: 'scale(0.95)' },
              '&:focus': { outline: '2px solid #1f2937' }
            }}
          >
            <ArrowForwardIosIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Button
            size="small"
            startIcon={<TodayIcon sx={{ fontSize: 16 }} />}
            onClick={goToday}
            sx={{ 
              ml: 1, 
              textTransform: 'none',
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: 'action.selected', transform: 'translateY(-1px)' },
              '&:active': { transform: 'translateY(0px)' },
              '&:focus': { outline: '2px solid #1f2937' }
            }}
          >
            Today
          </Button>
        </Box>
        <Button
          variant="contained"
          onClick={saveDay}
          disabled={loading}
          fullWidth={isMobile}
          sx={{ 
            width: { xs: 'calc(100vw - 32px)', sm: 'auto' },
            maxWidth: '100%',
            position: { xs: 'fixed', sm: 'static' },
            bottom: { xs: 16, sm: 'auto' },
            left: { xs: 16, sm: 'auto' },
            zIndex: { xs: 1100, sm: 'auto' },
            borderRadius: { xs: 8, sm: 1 },
            py: { xs: 1.5, sm: 1 },
            fontSize: { xs: '1.1rem', sm: '0.875rem' },
            fontWeight: { xs: 700, sm: 600 },
            transition: 'all 0.2s ease',
            bgcolor: 'text.primary',
            color: 'background.paper',
            boxShadow: { xs: '0 8px 16px rgba(0,0,0,0.2)', sm: 'none' },
            '&:hover': { 
              bgcolor: '#1f2937',
              transform: { xs: 'none', sm: 'translateY(-2px)' },
              boxShadow: { xs: '0 8px 16px rgba(0,0,0,0.2)', sm: '0 4px 12px rgba(0,0,0,0.15)' }
            },
            '&:active': { 
              transform: 'translateY(0px)',
              boxShadow: { xs: '0 4px 8px rgba(0,0,0,0.15)', sm: '0 2px 4px rgba(0,0,0,0.1)' }
            },
            '&:disabled': { 
              opacity: 0.5,
              cursor: 'not-allowed',
              transform: 'none'
            },
            '&:focus': { outline: '2px solid #3b82f6', outlineOffset: 2 }
          }}
        >
          Save Day
        </Button>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ 
          mb: { xs: 2, sm: 3 },
          minHeight: { xs: 48, sm: 40 },
          maxWidth: { xs: 'calc(100vw - 32px)', md: '100%' },
          '& .MuiTabs-flexContainer': { gap: 1, px: { xs: 1, sm: 0 }, pb: { xs: 1, sm: 0 } },
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': { 
            textTransform: 'none', 
            fontWeight: 600, 
            minHeight: { xs: 48, sm: 40 },
            padding: '8px 16px',
            borderRadius: '20px',
            color: 'text.secondary',
            bgcolor: 'background.paper',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s ease',
            '&:hover': { color: '#1f2937', bgcolor: '#f3f4f6' },
            '&:active': { opacity: 0.7 },
            '&.Mui-selected': { color: 'background.paper', bgcolor: 'text.primary', borderColor: 'text.primary' }
          }
        }}
      >
        <Tab label="Today" />
        <Tab label="Log Meal" />
        <Tab label="Weight" />
        <Tab label="Today's Details" />
        <Tab label="Summary" />
        <Tab label="Scan Product" />
        <Tab label="Insights" />
        <Tab label="Add Food to DB" />
      </Tabs>

      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Meals list */}
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
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
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', mb: 1, gap: 1 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {meal.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip
                            label={meal.mealType}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'divider' }}
                          />
                          {meal.time && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {(() => {
                                const [h, m] = meal.time.split(':');
                                if (h === undefined || m === undefined) return meal.time;
                                let hour = parseInt(h, 10);
                                const min = m;
                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                hour = hour % 12;
                                if (hour === 0) hour = 12;
                                return `${hour}:${min} ${ampm}`;
                              })()}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {fmt(mealTotals.calories, 0)} kcal
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => editMealFromDay(idx)}
                            sx={{ p: 0.25, color: '#3b82f6', '&:hover': { bgcolor: '#eff6ff' } }}
                            title="Edit meal"
                          >
                            <EditIcon sx={{ fontSize: '1.1rem' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => removeMealFromDay(idx)}
                            sx={{ p: 0.25, color: '#ef4444', '&:hover': { bgcolor: '#fee2e2' } }}
                            title="Delete meal"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          P {fmt(mealTotals.protein)}g · C {fmt(mealTotals.carbs)}g · F {fmt(mealTotals.fat)}g
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {meal.foods?.map((food, i) => (
                        <Typography key={i} variant="caption" sx={{ color: 'text.secondary' }}>
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


          {/* ── macro summary strip ── */}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
            {[
              { label: 'Calories', val: fmt(totals.calories, 0), unit: 'kcal', pct: percent(totals.calories, calorieTarget), color: '#16a34a' },
              { label: 'Protein',  val: fmt(totals.protein),     unit: 'g',    pct: percent(totals.protein, proteinTarget),   color: '#2563eb' },
              { label: 'Carbs',    val: fmt(totals.carbs),       unit: 'g',    pct: null, color: '#d97706' },
              { label: 'Fat',      val: fmt(totals.fat),         unit: 'g',    pct: null, color: '#dc2626' },
            ].map((m) => (
              <Box key={m.label} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>{m.label}</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                  {m.val} <span style={{ fontWeight: 400, fontSize: '0.8em', color: '#9ca3af' }}>{m.unit}</span>
                </Typography>
                {m.pct != null && (
                  <LinearProgress variant="determinate" value={m.pct} sx={{ mt: 1, height: 4, borderRadius: 99, bgcolor: 'action.selected', '& .MuiLinearProgress-bar': { bgcolor: m.color } }} />
                )}
              </Box>
            ))}
          </Box>

          {/* â”€â”€ AI insight + hydration â”€â”€ */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>AI Insight</Typography>
              {insightMatchesSelectedDay && nutritionInsight?.text ? (
                <>
                  <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{nutritionInsight.text}</Typography>
                  {nutritionInsight?.createdAt && (
                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 1 }}>
                      Updated {new Date(nutritionInsight.createdAt).toLocaleString()}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Generate an insight for today.</Typography>
              )}
              {mealSuggestions && (
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', lineHeight: 1.7, mt: 2, pt: 2, borderTop: '1px solid #f3f4f6' }}>{mealSuggestions}</Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" size="small" onClick={generateNutritionInsight} disabled={nutritionInsightGenerating} sx={{ textTransform: 'none', borderColor: 'divider', color: 'text.secondary' }}>
                  {nutritionInsightGenerating ? 'Generating...' : 'Generate Insight'}
                </Button>
                <Button variant="outlined" size="small" onClick={generateMealSuggestions} disabled={mealSuggestionsGenerating} sx={{ textTransform: 'none', borderColor: 'divider', color: 'text.secondary' }}>
                  {mealSuggestionsGenerating ? 'Thinking...' : 'Suggest Meals'}
                </Button>
              </Box>
            </Box>

            <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Hydration</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <WaterDropIcon sx={{ color: '#0ea5e9', fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{Math.round((log.waterIntake || 0) / 250)} glasses</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{log.waterIntake || 0} ml total</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" onClick={() => handleWaterChange(250)} sx={{ flex: 1, py: 1.5, borderRadius: 2 }} startIcon={<WaterDropIcon sx={{ fontSize: 15 }} />}>+250 ml</Button>
                <Button size="small" variant="outlined" onClick={() => handleWaterChange(500)} sx={{ flex: 1, py: 1.5, borderRadius: 2 }} startIcon={<WaterDropIcon sx={{ fontSize: 15 }} />}>+500 ml</Button>
              </Box>
              <Button size="small" onClick={() => handleWaterChange(-250)} sx={{ mt: 1, color: '#9ca3af', textTransform: 'none', fontSize: '0.75rem' }}>- Remove 250 ml</Button>
            </Box>
          </Box>

          {/* â”€â”€ CTA to Log Meal tab â”€â”€ */}
          <Box sx={{ p: 2.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#166534' }}>Ready to log a meal?</Typography>
              <Typography variant="caption" sx={{ color: '#15803d' }}>Search the food database, set your portion, and add it to today.</Typography>
            </Box>
            <Button variant="contained" size="small" onClick={() => setActiveTab(1)} sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, color: 'background.paper', fontWeight: 700 }}>
              + Log Meal
            </Button>
          </Box>
        </Box>
      )}

      {/* â”€â”€â”€ TAB 1: LOG MEAL â”€â”€â”€ */}
      {activeTab === 1 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.25fr' }, gap: 3, alignItems: 'start' }}>

          {/* LEFT: Search + Deep Analysis */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Search Food Database</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Find any dish or ingredient to auto-fill nutrition data.</Typography>
              {isMobile && (
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>
                  Tip: tap a search result to instantly fill the last food row.
                </Typography>
              )}
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
                    endAdornment: foodSearchLoading ? <Typography variant="caption" sx={{ color: 'text.secondary' }}>Searching...</Typography> : null
                  }}
                />
              </Box>

              {!foodSearchLoading && foodSearchAttempted && foodResults.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', textAlign: 'center', py: 2 }}>No item found</Typography>
              )}

              {foodResults.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, maxHeight: { xs: 220, sm: 300 }, overflow: 'auto', borderRadius: 1.5, border: '1px solid #e5e7eb', p: 0.75 }}>
                  {foodResults.map((f, idx) => (
                    <Box
                      key={f.id || idx}
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: { xs: 1.25, sm: 1 }, px: 1.25, borderRadius: 1.5, cursor: 'pointer', transition: 'background 0.1s', '&:hover': { bgcolor: '#f0fdf4' } }}
                      onClick={() => {
                        addFoodFromSearch(f)
                        setSelectedFoodForAnalysis(String(f.name || ''))
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
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatServingDisplay(f.servingLabel || `${f.servingQty} ${f.servingUnit}`, f.servingWeightG)} · {Math.round(f.calories)} kcal
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', ml: 1, flexShrink: 0 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>P {Math.round(f.protein)}g</Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>C {Math.round(f.carbs)}g · F {Math.round(f.fat)}g</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Deep Food Analysis</Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, mb: 1 }}>
                <TextField
                  placeholder="Enter food name to analyze"
                  value={selectedFoodForAnalysis}
                  onChange={(e) => setSelectedFoodForAnalysis(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" onClick={() => analyzeSelectedFood({ includeLLM: false })} disabled={foodAnalysisLoading} sx={{ whiteSpace: 'nowrap', flex: 1 }}>
                    {foodAnalysisLoading ? 'â€¦' : 'Analyze'}
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => analyzeSelectedFood({ includeLLM: true })} disabled={foodAnalysisLoading} sx={{ whiteSpace: 'nowrap', flex: 1 }}>
                    + LLM
                  </Button>
                </Box>
              </Box>
              {foodAnalysisError && <Typography variant="caption" sx={{ color: '#b91c1c', display: 'block', mb: 1 }}>{foodAnalysisError}</Typography>}
              {foodAnalysis && (
                <Box sx={{ borderRadius: 1.5, border: '1px solid #e5e7eb', bgcolor: 'action.hover', p: 1.5, mt: 1 }}>
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
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.6 }}>{foodAnalysis.explanation.narrative}</Typography>
                  )}
                  {foodAnalysis.llm?.narrative && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.6, mt: 0.5 }}>{foodAnalysis.llm.narrative}</Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>

          {/* RIGHT: Meal Builder */}
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            {/* Removed 'Build Your Meal' and instructional text as requested */}

            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Meal name"
                value={newMeal.name}
                onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                size="small"
                sx={{ 
                  flex: 1, 
                  minWidth: { xs: '100%', sm: 160 },
                  '& .MuiOutlinedInput-root': {
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: '#1f2937' },
                    '&:focus-within': { borderColor: '#1f2937', boxShadow: '0 0 0 2px rgba(31, 41, 55, 0.1)' }
                  }
                }}
                placeholder="e.g. Breakfast, Lunchâ€¦"
              />
              <TextField
                select
                label="Type"
                value={newMeal.mealType}
                onChange={(e) => setNewMeal({ ...newMeal, mealType: e.target.value })}
                size="small"
                SelectProps={{ native: true }}
                sx={{ 
                  minWidth: { xs: '100%', sm: 130 },
                  '& .MuiOutlinedInput-root': {
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: '#1f2937' },
                    '&:focus-within': { borderColor: '#1f2937', boxShadow: '0 0 0 2px rgba(31, 41, 55, 0.1)' }
                  }
                }}
              >
                {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </TextField>
              <TextField
                label="Time"
                type="time"
                value={newMeal.time}
                onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
                size="small"
                sx={{ 
                  width: { xs: '100%', sm: 140 },
                  '& .MuiOutlinedInput-root': {
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: '#1f2937' },
                    '&:focus-within': { borderColor: '#1f2937', boxShadow: '0 0 0 2px rgba(31, 41, 55, 0.1)' }
                  }
                }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }} // 5 min steps
              />
            </Box>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Foods</Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              {newMeal.foods.map((food, idx) => (
                <Box key={idx} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden', position: 'relative' }}>
                  <IconButton
                    size="small"
                    onClick={() => removeFoodRow(idx)}
                    sx={{ 
                      position: 'absolute', 
                      top: 4, 
                      right: 4, 
                      zIndex: 10, 
                      bgcolor: 'rgba(255,255,255,0.7)',
                      transition: 'all 0.2s ease',
                      '&:hover': { 
                        bgcolor: 'rgba(220, 38, 38, 0.15)',
                        color: '#dc2626',
                        transform: 'scale(1.1)'
                      },
                      '&:active': { 
                        transform: 'scale(0.95)'
                      }
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                  {!!food.servingLabel && (
                    <Box sx={{ px: 1.5, py: 0.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        Reference: {food.servingLabel} {food.servingWeightG ? `(${food.servingWeightG}g)` : ''}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField
                      label="Food Item"
                      placeholder="e.g. Chicken Breast"
                      value={food.name}
                      onChange={(e) => updateFoodField(idx, 'name', e.target.value)}
                      size="small"
                      sx={{ width: '100%' }}
                    />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
                      <TextField
                        label="Qty"
                        value={food.quantity}
                        onChange={(e) => updateFoodField(idx, 'quantity', e.target.value)}
                        size="small"
                        inputProps={{ inputMode: 'decimal', style: { textAlign: 'center' } }}
                      />
                      <TextField
                        label="Unit"
                        value={food.baseServingUnit || food.unit || 'serving'}
                        size="small"
                        sx={{ bgcolor: 'action.selected', '& .MuiOutlinedInput-input': { color: 'text.secondary' } }}
                        InputProps={{ readOnly: true }}
                      />
                      <TextField
                        label="Weight (g)"
                        type="number"
                        value={food.baseServingQty && food.servingWeightG && food.quantity ?
                          Math.round((Number(food.quantity) / Number(food.baseServingQty)) * Number(food.servingWeightG)) : ''}
                        onChange={(e) => {
                          const newWeight = Number(e.target.value)
                          if (!newWeight || !food.servingWeightG || !food.baseServingQty) return
                          const impliedQty = (newWeight * Number(food.baseServingQty)) / Number(food.servingWeightG)
                          updateFoodField(idx, 'quantity', impliedQty.toFixed(2))
                        }}
                        size="small"
                        inputProps={{ style: { fontWeight: 600 } }}
                      />
                      <TextField
                        label="Calories"
                        value={food.calories}
                        onChange={(e) => updateFoodField(idx, 'calories', e.target.value)}
                        size="small"
                        InputProps={{ 
                          endAdornment: <Typography variant="caption" sx={{ ml: 0.5, opacity: 0.5 }}>kcal</Typography>
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
                    <ExpandableSection title="Macros and Fats" defaultOpen={false}>
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

            <Button 
              size="small" 
              onClick={addFoodRow} 
              sx={{ 
                textTransform: 'none', 
                mb: 2,
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: 'action.selected', color: '#1f2937' },
                '&:active': { opacity: 0.7 },
                '&:focus': { outline: '2px solid #1f2937' }
              }}
            >
              + Add another food
            </Button>

            <TextField
              label="Meal notes (optional)"
              value={newMeal.notes}
              onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
              multiline
              minRows={2}
              fullWidth
              size="small"
              sx={{ 
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: '#1f2937' },
                  '&:focus-within': { borderColor: '#1f2937', boxShadow: '0 0 0 2px rgba(31, 41, 55, 0.1)' }
                }
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={resetNewMeal} 
              sx={{ 
                borderColor: 'divider', 
                color: 'text.secondary',
                transition: 'all 0.2s ease',
                '&:hover': { 
                  borderColor: '#1f2937',
                  color: '#1f2937',
                  bgcolor: 'action.selected'
                },
                '&:active': { opacity: 0.7 }
              }}
            >
              Clear
            </Button>
              <Button
                variant="contained"
                onClick={() => { addMealToDay(); setActiveTab(0); }}
                disabled={!newMeal.name.trim()}
                fullWidth={isMobile}
                sx={{ 
                  bgcolor: '#16a34a',
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    bgcolor: '#15803d',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                  },
                  '&:active': { 
                    transform: 'translateY(0px)',
                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                  },
                  '&:disabled': {
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    transform: 'none'
                  },
                  '&:focus': { outline: '2px solid #3b82f6', outlineOffset: 2 },
                  fontWeight: 700
                }}
              >
                Add to {formatDate(selectedDate)}
              </Button>
            </Box>

            {isMobile && (
              <Box
                sx={{
                  position: 'sticky',
                  bottom: 8,
                  mt: 2,
                  p: 1,
                  borderRadius: 2,
                  border: '1px solid #bbf7d0',
                  bgcolor: 'rgba(240, 253, 244, 0.96)',
                  zIndex: 20,
                }}
              >
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => { addMealToDay(); setActiveTab(0); }}
                  disabled={!newMeal.name.trim()}
                  sx={{ 
                    bgcolor: '#16a34a',
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      bgcolor: '#15803d',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                    },
                    '&:active': { 
                      transform: 'translateY(0px)',
                      boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                    },
                    '&:disabled': {
                      opacity: 0.5,
                      cursor: 'not-allowed',
                      transform: 'none'
                    },
                    '&:focus': { outline: '2px solid #3b82f6', outlineOffset: 2 },
                    fontWeight: 700
                  }}
                >
                  Add Meal To Today
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {activeTab === 3 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 3 }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Today's Details
            </Typography>

              {(!log?.meals || log.meals.length === 0) && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  No meals logged for this selected date yet.
                </Typography>
              )}

              {clinicalTargetsRequiresSetup && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#92400e' }}>
                    Clinical targets need setup. Complete Body + Clinical Profile to unlock personalized targets.
                  </Typography>
                  {clinicalTargetsMissingFields.length > 0 && (
                    <Typography variant="caption" sx={{ color: '#b45309', display: 'block', mt: 0.5 }}>
                      Debug missing fields: {clinicalTargetsMissingFields.join(', ')}
                    </Typography>
                  )}
                  {clinicalTargetsDebug && (
                    <Typography
                      variant="caption"
                      component="pre"
                      sx={{
                        color: '#7c2d12',
                        bgcolor: '#fff7ed',
                        border: '1px solid #fed7aa',
                        borderRadius: 1,
                        p: 1,
                        mt: 1,
                        display: 'block',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      }}
                    >
                      {JSON.stringify(clinicalTargetsDebug, null, 2)}
                    </Typography>
                  )}
                </Box>
              )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
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
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
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
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Carbs
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {fmt(totals.carbs)} g
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Fat
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {fmt(totals.fat)} g
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
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
                              bgcolor: 'action.selected',
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
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{row.label}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {Number(row.currentValue || 0).toFixed(row.unit === 'kcal' ? 0 : 1)} / {Number(row.targetValue || 0).toFixed(row.unit === 'kcal' ? 0 : 1)} {row.unit}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percent(row.currentValue, row.targetValue)}
                          sx={{ height: 6, borderRadius: 99, bgcolor: 'action.selected' }}
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

              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                7d avg: {nutritionStats?.weeklyAvg?.calories ?? '—'} kcal · P {nutritionStats?.weeklyAvg?.protein ?? '—'}g · Water {nutritionStats?.weeklyAvg?.water ?? '—'} ml
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                30d avg: {nutritionStats?.monthlyAvg?.calories ?? '—'} kcal · P {nutritionStats?.monthlyAvg?.protein ?? '—'}g · Water {nutritionStats?.monthlyAvg?.water ?? '—'} ml
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.5 }}>
                Days logged: 7d {nutritionStats?.weeklyAvg?.daysLogged ?? '—'} · 30d {nutritionStats?.monthlyAvg?.daysLogged ?? '—'} · 30d range {rangeDaysLogged ?? '—'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
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
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Nutrition Summary</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Weekly and monthly nutrient consumption vs total required amount for each period.
          </Typography>

          {periodSummaryLoading && <LinearProgress sx={{ mb: 2 }} />}

          {['Weekly', 'Monthly'].map((period) => {
            const totalsForPeriod = period === 'Weekly' ? weeklyTotals : monthlyTotals
            const days = period === 'Weekly' ? 7 : 30
            const fallbackTargets = {
              calories: user?.dailyCalorieTarget,
              protein: user?.dailyProteinTarget,
            }
            const targets = clinicalTargets?.targets || fallbackTargets
            const micros = targets?.micronutrients || {}

            const rowMap = new Map()

            // Add water consumption first
            const waterConsumed = Number(totalsForPeriod?.waterIntake || 0)
            const waterRequired = Number(user?.hydrationGoal || 0) * days
            rowMap.set('waterIntake', {
              key: `${period}-water`,
              label: 'Water',
              consumed: waterConsumed,
              required: Number.isFinite(waterRequired) && waterRequired > 0 ? waterRequired : null,
              unit: 'ml',
            })

            Object.entries(TARGET_KEY_TO_TOTAL_KEY).forEach(([targetKey, totalKey]) => {
              const perDay = (targetKey in targets) ? targets[targetKey] : micros[targetKey]
              const required = Number(perDay) * days
              const consumed = Number(totalsForPeriod?.[totalKey] || 0)
              const unit =
                targetKey === 'calories' ? 'kcal' :
                targetKey === 'omega3' ? 'mg' :
                ['vitaminD', 'vitaminA', 'folate', 'selenium'].includes(targetKey) ? 'ug' :
                ['protein', 'fat', 'carbs', 'fiber', 'sugar'].includes(targetKey) ? 'g' : 'mg'
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
              const perDay = targetKey ? micros[targetKey] : null
              const required = Number(perDay) * days
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
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{row.label}</Typography>
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
                          bgcolor: 'action.selected',
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
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Scan Product Barcode</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
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
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                  Uploaded image preview
                </Typography>
                <Box
                  component="img"
                  src={uploadedBarcodePreview}
                  alt="Uploaded barcode"
                  sx={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 1, bgcolor: 'action.hover' }}
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

          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Product Details</Typography>

            {!barcodeProduct && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
                    sx={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 1, border: '1px solid #e5e7eb', bgcolor: 'background.paper' }}
                  />
                )}
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{barcodeProduct.name}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Brand: {barcodeProduct.brand || '—'} · Barcode: {barcodeProduct.barcode || '—'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Qty: {barcodeProduct.quantityLabel || '—'} · Serving: {barcodeProduct.servingSize || '—'}
                </Typography>

                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.03em' }}>
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
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Daily weight
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
                  <Box sx={{ width: '100%' }}>
                    <Box
                      component="svg"
                      viewBox="0 0 560 200"
                      role="img"
                      aria-label="Weight chart"
                      sx={{ width: '100%', maxWidth: 560, height: 'auto' }}
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
                                <polyline fill="none" stroke="#16a34a" strokeWidth="2" points={chart.points} />
                              ) : null}
                            </>
                          )
                        })()}
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    {chart.points ? 'Showing logged days only (gaps are days without entries).' : 'No weight entries yet for this range.'}
                  </Typography>
                </Box>
              )
            })()
          )}
        </Box>
      )}

      {activeTab === 6 && (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <NutritionInsights selectedDate={selectedDate} />
        </Box>
      )}

      {activeTab === 7 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Search & Import from MyFitnessPal
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Find any dish or ingredient globally. Items you add will be saved to your local database for future searches.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="Search Food Name"
                placeholder="e.g. Homemade Paneer Butter Masala"
                value={mfpSearchQuery}
                onChange={(e) => setMfpSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleMfpSearch()}
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleMfpSearch}
                disabled={mfpLoading}
                sx={{ px: 4 }}
              >
                {mfpLoading ? 'Searching...' : 'Search'}
              </Button>
            </Box>

            {mfpResults.length > 0 && (
              <Stack spacing={2} sx={{ mt: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Top Search Results
                </Typography>
                {mfpResults.map((res) => (
                  <Box
                    key={res.id}
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      bgcolor: 'action.hover',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }
                    }}
                  >
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>{res.displayName}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {res.brand && `${res.brand} · `} {res.calories} kcal · {res.servingQty} {res.servingUnit}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip label={`P: ${res.protein}g`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        <Chip label={`C: ${res.carbs}g`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        <Chip label={`F: ${res.fat}g`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </Box>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      color="primary"
                      onClick={() => handleAddMfpFoodToDb(res)}
                      disabled={addingMfpFoodId === res.id}
                      startIcon={addingMfpFoodId === res.id ? null : <RestaurantIcon sx={{ fontSize: 14 }} />}
                    >
                      {addingMfpFoodId === res.id ? 'Adding...' : 'Add to DB'}
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}

            {mfpResults.length === 0 && !mfpLoading && mfpSearchQuery && (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Search for a food item above to start importing.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default NutritionTracker

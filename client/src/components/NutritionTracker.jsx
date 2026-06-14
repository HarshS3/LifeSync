import ExpandableSection from './ExpandableSection'
import WeightTracker from './WeightTracker'
import NutritionInsights from './NutritionInsights'
import DailyLogTab from './Nutrition/DailyLogTab'
import LogMealTab from './Nutrition/LogMealTab'
import DetailsTab from './Nutrition/DetailsTab'
import SummaryTab from './Nutrition/SummaryTab'
import ScanProductTab from './Nutrition/ScanProductTab'
import SupplementSection from './Nutrition/SupplementSection'
import RecipeExplorer from './RecipeExplorer'
import WeeklyReview from './WeeklyReview'
import { useState, useEffect, useMemo, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
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
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'
import { generateCGMData, frontendEvaluateInteractions } from '../lib/nutritionHelpers'

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  if (h === undefined || m === undefined) return timeStr;
  let hour = parseInt(h, 10);
  const min = m;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${ampm}`;
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
  const [log, setLog] = useState({ meals: [], supplements: [], waterIntake: 0, dailyTotals: EMPTY_TOTALS, notes: '' })
  const [loading, setLoading] = useState(false)

  const [nutritionInsight, setNutritionInsight] = useState(null)
  const [nutritionInsightGenerating, setNutritionInsightGenerating] = useState(false)

  const [mealSuggestions, setMealSuggestions] = useState('')
  const [mealSuggestionsGenerating, setMealSuggestionsGenerating] = useState(false)
  const [timingAlerts, setTimingAlerts] = useState([])

  const [foodSearchQuery, setFoodSearchQuery] = useState('')
  const [foodResults, setFoodResults] = useState([])
  const [foodSearchLoading, setFoodSearchLoading] = useState(false)
  const [foodSearchAttempted, setFoodSearchAttempted] = useState(false)
  const [selectedFoodForAnalysis, setSelectedFoodForAnalysis] = useState('')



  const [externalSearchQuery, setExternalSearchQuery] = useState('')
  const [externalResults, setExternalResults] = useState([])
  const [externalLoading, setExternalLoading] = useState(false)
  const [addingExternalFoodId, setAddingExternalFoodId] = useState(null)
  const [selectedExternalFoodForDetails, setSelectedExternalFoodForDetails] = useState(null)

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
  const [priorityGaps, setPriorityGaps] = useState([])
  const [priorityGapsLoading, setPriorityGapsLoading] = useState(false)
  const [tdeeSource, setTdeeSource] = useState(null)
  const [adaptiveTdeeValue, setAdaptiveTdeeValue] = useState(null)
  const [savedTemplates, setSavedTemplates] = useState([])
  const [savedTemplatesLoading, setSavedTemplatesLoading] = useState(false)
  const [frequentMeals, setFrequentMeals] = useState([])
  const [frequentMealsLoading, setFrequentMealsLoading] = useState(false)

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')

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
    const handler = (e) => {
      const tabLabel = e?.detail?.tab
      if (!tabLabel) return

      const tabLabels = [
        'Today', 'Log Meal', 'Weight', 'Details',
        'Deep Analysis', 'Food Library'
      ]
      
      const idx = tabLabels.findIndex(l => l.toLowerCase() === tabLabel.toLowerCase())
      if (idx !== -1) {
        setActiveTab(idx)
      }
    }
    window.addEventListener('lifesync:nutrition:tab', handler)
    return () => window.removeEventListener('lifesync:nutrition:tab', handler)
  }, [])

  useEffect(() => {
    if (!token) return
    loadAllNutritionData()
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
    if (activeTab === 3) {
      loadPriorityGaps()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab])

  useEffect(() => {
    if (!token) return
    if (activeTab !== 4) return
    loadPeriodSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab])

  useEffect(() => {
    if (!token) return
    if (activeTab === 1) {
      loadSavedTemplates()
      loadFrequentMeals()
    }
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

  const loadPriorityGaps = async () => {
    setPriorityGapsLoading(true)
    try {
      const headers = getAuthHeaders()
      const res = await fetch(`${API_BASE}/api/nutrition/priority-gaps`, { headers })
      if (res.ok) {
        const data = await res.json()
        setPriorityGaps(data.gaps || [])
      }
    } catch (_) {}
    finally { setPriorityGapsLoading(false) }
  }

  const loadClinicalTargets = async () => {
    try {
      const headers = getAuthHeaders()
      const res = await fetch(`${API_BASE}/api/nutrition/clinical-targets`, { headers })

      if (res.status === 200) {
        const data = await res.json()
        setClinicalTargets(data)
        if (data.tdeeSource) setTdeeSource(data.tdeeSource)
        if (data.adaptiveTdee) setAdaptiveTdeeValue(data.adaptiveTdee)
        setClinicalTargetsRequiresSetup(false)
        setClinicalTargetsMissingFields([])
        setClinicalTargetsDebug(null)
      } else if (res.status === 400 || res.status === 404) {
        const data = await res.json()
        
        let profileData = null
        try {
          const profileRes = await fetch(`${API_BASE}/api/users/profile`, { headers })
          if (profileRes.ok) profileData = await profileRes.json()
        } catch (e) { /* ignore */ }

        const toNum = (v) => {
          const n = Number(v)
          return Number.isFinite(n) ? n : undefined
        }

        const rawSex = profileData?.biologicalProfile?.biologicalSex || profileData?.gender
        const biologicalSex = (rawSex === 'male' || rawSex === 'female') ? rawSex : undefined
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
          }
        }

        setClinicalTargets(null)
        setClinicalTargetsRequiresSetup(true)
        setClinicalTargetsMissingFields(debugSnapshot.serverMissingFields)
        setClinicalTargetsDebug(debugSnapshot)
      } else {
        setClinicalTargets(null)
        setClinicalTargetsRequiresSetup(false)
        setClinicalTargetsMissingFields([])
        setClinicalTargetsDebug({ httpStatus: res.status, error: 'clinical-targets request failed' })
      }
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
          const val = logItem?.totalWaterOverride != null ? logItem.totalWaterOverride : (logItem?.waterIntake || 0)
          out[k] += Number(val)
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

      const weekData = weekRes.ok ? await safeReadJson(weekRes) : { logs: [] }
      const monthData = monthRes.ok ? await safeReadJson(monthRes) : { logs: [] }

      const weekLogs = Array.isArray(weekData.logs) ? weekData.logs : (Array.isArray(weekData) ? weekData : [])
      const monthLogs = Array.isArray(monthData.logs) ? monthData.logs : (Array.isArray(monthData) ? monthData : [])

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


  const toDateKey = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const fetchTimingAnalysis = async (date) => {
    if (!token) return
    try {
      const dateStr = toDateKey(date)
      const res = await fetch(`${API_BASE}/api/nutrition/timing-analysis/${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTimingAlerts(data.alerts || [])
      }
    } catch (err) {
      console.error('Failed to fetch timing analysis:', err)
    }
  }

  const loadAllNutritionData = async () => {
    setLoading(true)
    try {
      const dateStr = toDateKey(selectedDate)
      fetchTimingAnalysis(selectedDate)
      
      const res = await fetch(`${API_BASE}/api/nutrition/daily-summary/${encodeURIComponent(dateStr)}`, {
        headers: getAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        
        // 1. Handle Log
        if (data.log) {
          setLog({
            meals: data.log.meals || [],
            supplements: data.log.supplements || [],
            waterIntake: data.log.waterIntake || 0,
            totalWaterOverride: data.log.totalWaterOverride || null,
            dailyTotals: data.log.dailyTotals || { ...EMPTY_TOTALS },
            notes: data.log.notes || '',
            _id: data.log._id,
          })
        } else {
          setLog({ meals: [], supplements: [], waterIntake: 0, totalWaterOverride: null, dailyTotals: { ...EMPTY_TOTALS }, notes: '' })
        }

        // 2. Handle Clinical Targets
        if (data.targets) {
          setClinicalTargets(data.targets)
          setClinicalTargetsRequiresSetup(false)
        }

        // 3. Handle Meal Templates
        setSavedTemplates(data.templates || [])

        // 4. Handle Stats
        if (data.stats) {
          setNutritionStats(data.stats)
        }
      }
    } catch (err) {
      console.error('Failed to load nutrition summary data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDay = async () => {
    setLoading(true)
    try {
      const dateStr = toDateKey(selectedDate)
      fetchTimingAnalysis(selectedDate)
      if (!user || !user._id) {
        setLog({ meals: [], waterIntake: 0, totalWaterOverride: null, dailyTotals: { ...EMPTY_TOTALS }, notes: '' })
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
          totalWaterOverride: data.totalWaterOverride || null,
          dailyTotals: data.dailyTotals || { ...EMPTY_TOTALS },
          notes: data.notes || '',
          _id: data._id,
        })
      } else {
        setLog({ meals: [], supplements: [], waterIntake: 0, totalWaterOverride: null, dailyTotals: { ...EMPTY_TOTALS }, notes: '' })
      }
    } catch (err) {
      console.error('Failed to load nutrition log:', err)
      setLog({ meals: [], waterIntake: 0, totalWaterOverride: null, dailyTotals: { ...EMPTY_TOTALS }, notes: '' })
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
        setFoodResults(Array.isArray(data) ? data : [])
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

  const generateHypothesis = async (foodName) => {
    if (!token || !foodName) return
    try {
      setHypothesesLoading(true)
      const res = await fetch(`${API_BASE}/api/nutrition/hypotheses/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ foodName, includeLLM: true }),
      })
      if (res.ok) {
        toast.success('New hypothesis generated!')
        // Refresh hypotheses
        const hRes = await fetch(`${API_BASE}/api/nutrition/hypotheses`, { headers: getAuthHeaders() })
        if (hRes.ok) {
          const data = await hRes.json()
          setHypotheses(data)
          setHypothesesCount(data.length)
        }
      }
    } catch (err) {
      console.error('Failed to generate hypothesis:', err)
      toast.error('Generation failed')
    } finally {
      setHypothesesLoading(false)
    }
  }

  const feedbackHypothesis = async (id, isPositive) => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/hypotheses/${id}/feedback`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isPositive }),
      })
      if (res.ok) {
        toast.success('Feedback saved')
        setHypotheses(prev => prev.map(h => h._id === id ? { ...h, feedback: isPositive ? 1 : -1 } : h))
      }
    } catch (err) {
      console.error('Failed to save feedback:', err)
    }
  }

  const loadSavedTemplates = async () => {
    if (!token) return
    try {
      setSavedTemplatesLoading(true)
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

  const loadFrequentMeals = async () => {
    if (!token) return
    try {
      setFrequentMealsLoading(true)
      const res = await fetch(`${API_BASE}/api/nutrition/frequent-meals`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setFrequentMeals(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load frequent meals:', err)
    } finally {
      setFrequentMealsLoading(false)
    }
  }

  const useTemplate = (tpl) => {
    if (!tpl || !tpl.foods) return
    setNewMeal({
      name: tpl.name || tpl.mealName || '',
      mealType: tpl.mealType || 'breakfast',
      time: tpl.time || '',
      foods: JSON.parse(JSON.stringify(tpl.foods)),
      notes: tpl.notes || '',
    })
  }

  const deleteTemplate = async (id) => {
    if (!token || !window.confirm('Are you sure you want to delete this template?')) return
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
    const finalName = newMeal.name.trim() || (newMeal.mealType.charAt(0).toUpperCase() + newMeal.mealType.slice(1))

    const foods = newMeal.foods.map(f => ({
      ...f,
      quantity: Number(f.quantity) || 0,
      baseServingQty: Number(f.baseServingQty) || 0,
      baseServingUnit: String(f.baseServingUnit || f.unit || '').trim(),
      servingLabel: String(f.servingLabel || '').trim(),
      ...Object.fromEntries(FOOD_NUTRIENT_FIELDS.map((field) => [field, Number(f[field]) || 0])),
    }))

    const defaultTime = user?.mealSchedule?.[newMeal.mealType] || ''
    const now = new Date()
    const loggedAtTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const meal = {
      name: finalName,
      mealType: newMeal.mealType,
      time: newMeal.time.trim() || defaultTime,
      loggedAt: loggedAtTime,
      foods,
      notes: newMeal.notes,
    }

    const updatedLog = {
      ...log,
      meals: [...(log.meals || []), meal],
    }
    setLog(updatedLog)
    resetNewMeal()
    autoSaveLog(updatedLog)
    setActiveTab(0) // Redirect to Today tab
  }

  const removeMealFromDay = (indexToRemove) => {
    if (!log.meals) return
    const updatedLog = {
      ...log,
      meals: log.meals.filter((_, i) => i !== indexToRemove),
    }
    setLog(updatedLog)
    autoSaveLog(updatedLog)
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
    const updatedLog = {
      ...log,
      waterIntake: Math.max(0, (log.waterIntake || 0) + delta),
    }
    setLog(updatedLog)
    autoSaveLog(updatedLog)
  }

  const handleTotalWaterChange = (val) => {
    const updatedLog = {
      ...log,
      totalWaterOverride: val === '' ? null : Number(val),
    }
    setLog(updatedLog)
    autoSaveLog(updatedLog)
  }

  const handleSupplementUpdate = (updatedSupps) => {
    const updatedLog = {
      ...log,
      supplements: updatedSupps
    }
    setLog(updatedLog)
    autoSaveLog(updatedLog)
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please provide a name for the template.')
      return
    }
    if (!newMeal.foods.length) {
      alert('Please add at least one food to the template.')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/nutrition/saved-templates`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName.trim(),
          mealType: newMeal.mealType,
          foods: newMeal.foods,
          notes: newMeal.notes
        }),
      })

      if (res.ok) {
        alert('Template saved successfully!')
        setTemplateDialogOpen(false)
        setTemplateName('')
      } else {
        const err = await res.json()
        alert(`Failed to save template: ${err.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Save template error:', err)
      alert('Error saving template.')
    }
  }

  const autoSaveLog = async (dataToSave) => {
    if (!token) return
    try {
      const payload = {
        date: toDateKey(selectedDate),
        meals: dataToSave.meals,
        supplements: dataToSave.supplements || [],
        waterIntake: dataToSave.waterIntake || 0,
        totalWaterOverride: dataToSave.totalWaterOverride,
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
          ...saved,
        }))
      }
    } catch (e) {
      console.error('Auto-save failed:', e)
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
          targetKey === 'omega3' || targetKey === 'cholesterol' ? 'mg' :
          ['vitaminD', 'vitaminA', 'folate', 'selenium', 'vitaminB12'].includes(targetKey) ? 'ug' :
          ['protein', 'fat', 'carbs', 'fiber', 'sugar', 'saturatedFat'].includes(targetKey) ? 'g' : 'mg'

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

  const liveInsights = useMemo(() => {
    return frontendEvaluateInteractions(newMeal.foods)
  }, [newMeal.foods])

  const formatDate = (d) =>
    d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })

  const effectiveWater = log?.totalWaterOverride != null ? log.totalWaterOverride : (log?.waterIntake || 0)

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
      (effectiveWater > 0) ||
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
        `water: ${effectiveWater} ml`,
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
      (effectiveWater > 0)

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
        `- water so far: ${Math.round(effectiveWater)} ml`,
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

  const handleExternalSearch = async () => {
    if (!externalSearchQuery.trim()) return
    setExternalLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/external/search?q=${encodeURIComponent(externalSearchQuery)}`, {
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error('External search failed')
      const data = await res.json()
      setExternalResults(data)
    } catch (err) {
      console.error(err)
      alert('Failed to search external databases. Try again.')
    } finally {
      setExternalLoading(false)
    }
  }

  const handleAddExternalFoodToDb = async (food) => {
    setAddingExternalFoodId(food.id)
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/external/add`, {
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
      setAddingExternalFoodId(null)
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
        <Tab label="Details" />
        <Tab label="Deep Analysis" />
        <Tab label="Food Library" />
      </Tabs>

      {activeTab === 0 && (
        <DailyLogTab
          log={log}
          totals={totals}
          fmt={fmt}
          formatTime={formatTime}
          editMealFromDay={editMealFromDay}
          removeMealFromDay={removeMealFromDay}
          percent={percent}
          calorieTarget={calorieTarget}
          proteinTarget={proteinTarget}
          clinicalTargets={clinicalTargets}
          timingAlerts={timingAlerts}
          generateCGMData={generateCGMData}
          insightMatchesSelectedDay={insightMatchesSelectedDay}
          nutritionInsight={nutritionInsight}
          generateNutritionInsight={generateNutritionInsight}
          nutritionInsightGenerating={nutritionInsightGenerating}
          mealSuggestions={mealSuggestions}
          generateMealSuggestions={generateMealSuggestions}
          mealSuggestionsGenerating={mealSuggestionsGenerating}
          handleWaterChange={handleWaterChange}
          setActiveTab={setActiveTab}
          SupplementSection={SupplementSection}
          onSupplementUpdate={handleSupplementUpdate}
          autoSaveLog={autoSaveLog}
          getAuthHeaders={getAuthHeaders}
        />
      )}
      {/* ─── TAB 1: LOG MEAL ─── */}
      {activeTab === 1 && (
        <LogMealTab
          newMeal={newMeal}
          setNewMeal={setNewMeal}
          foodSearchQuery={foodSearchQuery}
          setFoodSearchQuery={setFoodSearchQuery}
          foodResults={foodResults}
          foodSearchLoading={foodSearchLoading}
          foodSearchAttempted={foodSearchAttempted}
          handleSearchResultSelect={addFoodFromSearch}
          selectedFoodForAnalysis={selectedFoodForAnalysis}
          setSelectedFoodForAnalysis={setSelectedFoodForAnalysis}
          analyzeSelectedFood={analyzeSelectedFood}
          foodAnalysis={foodAnalysis}
          foodAnalysisLoading={foodAnalysisLoading}
          foodAnalysisError={foodAnalysisError}
          savedTemplates={savedTemplates}
          savedTemplatesLoading={savedTemplatesLoading}
          useTemplate={useTemplate}
          deleteTemplate={deleteTemplate}
          frequentMeals={frequentMeals}
          frequentMealsLoading={frequentMealsLoading}
          templateName={templateName}
          setTemplateName={setTemplateName}
          saveAsTemplate={handleSaveTemplate}
          savingTemplate={loading}
          addFoodRow={addFoodRow}
          removeFoodRow={removeFoodRow}
          updateFoodField={updateFoodField}
          addMealToDay={addMealToDay}
          liveInsights={liveInsights}
          log={log}
          handleWaterChange={handleWaterChange}
          handleTotalWaterChange={handleTotalWaterChange}
          barcodeInput={barcodeInput}
          setBarcodeInput={setBarcodeInput}
          lookupBarcode={lookupBarcode}
          barcodeLookupLoading={barcodeLookupLoading}
          startBarcodeScanner={startBarcodeScanner}
          supportsBarcodeDetector={supportsBarcodeDetector}
          scannerOpen={scannerOpen}
          scanBusy={scanBusy}
          stopBarcodeScanner={stopBarcodeScanner}
          scanVideoRef={scanVideoRef}
        />
      )}

      {/* ─── TAB 3: DETAILS ─── */}
      {activeTab === 3 && (
        <DetailsTab
          log={log}
          setLog={setLog}
          totals={totals}
          calorieTarget={calorieTarget}
          proteinTarget={proteinTarget}
          clinicalTargets={clinicalTargets}
          clinicalTargetsRequiresSetup={clinicalTargetsRequiresSetup}
          clinicalTargetsMissingFields={clinicalTargetsMissingFields}
          microTargetLookup={microTargetLookup}
          clinicalTargetRows={clinicalTargetRows}
          macroCalories={macroCalories}
          totalMacroCalories={totalMacroCalories}
          nutritionStats={nutritionStats}
          nutritionStatsLoading={nutritionStatsLoading}
          rangeDaysLogged={rangeDaysLogged}
          autoSaveLog={autoSaveLog}
          formatDate={(d) => d.toISOString().split('T')[0]}
          selectedDate={selectedDate}
          priorityGaps={priorityGaps}
          priorityGapsLoading={priorityGapsLoading}
          tdeeSource={tdeeSource}
          adaptiveTdee={adaptiveTdeeValue}
        />
      )}

      {/* ─── TAB 2: WEIGHT ─── */}
      {activeTab === 2 && (
        <WeightTracker selectedDate={selectedDate} />
      )}

      {/* ─── TAB 4: DEEP ANALYSIS ─── */}
      {/* Merges old Insights (6) + Summary (4) + Review (8). */}
      {/* Scan Product (5) and Recipes (7) accessible from Log Meal tab. */}
      {activeTab === 4 && (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <NutritionInsights
            selectedDate={selectedDate}
            clinicalTargets={clinicalTargets}
            weeklyTotals={weeklyTotals}
            monthlyTotals={monthlyTotals}
            user={user}
            dynamicTargets={{}}
          />
        </Box>
      )}

      {/* ─── TAB 5: FOOD LIBRARY (formerly Add Food to DB) ─── */}
      {activeTab === 5 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Global Food Search & Import
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Generate precise nutritional profiles using Gemini AI or search Open Food Facts. Items you add will be saved to your local database.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="Search Food Name"
                placeholder="e.g. Homemade Paneer Butter Masala"
                value={externalSearchQuery}
                onChange={(e) => setExternalSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleExternalSearch()}
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleExternalSearch}
                disabled={externalLoading}
                sx={{ px: 4 }}
              >
                {externalLoading ? 'Searching...' : 'Search'}
              </Button>
            </Box>

            {externalResults.length > 0 && (
              <Stack spacing={2} sx={{ mt: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Top Search Results (AI + OpenFoodFacts)
                </Typography>
                {externalResults.map((res) => (
                  <Box
                    key={res.id}
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      bgcolor: 'action.hover',
                      transition: 'all 0.2s ease',
                      gap: 2,
                      '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>{res.displayName}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {res.brand && `${res.brand} · `} {res.source && `${res.source} · `} {res.calories} kcal · {res.servingQty} {res.servingUnit}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip label={`P: ${res.protein}g`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        <Chip label={`C: ${res.carbs}g`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        <Chip label={`F: ${res.fat}g`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setSelectedExternalFoodForDetails(res)}
                        sx={{ flex: { xs: 1, sm: 'none' } }}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={() => handleAddExternalFoodToDb(res)}
                        disabled={addingExternalFoodId === res.id}
                        startIcon={addingExternalFoodId === res.id ? null : <RestaurantIcon sx={{ fontSize: 14 }} />}
                        sx={{ flex: { xs: 1, sm: 'none' } }}
                      >
                        {addingExternalFoodId === res.id ? 'Adding...' : 'Add to DB'}
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}

            {externalResults.length === 0 && !externalLoading && externalSearchQuery && (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No results found. Try a different search term.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* External Food Details Dialog */}
      <Dialog 
        open={!!selectedExternalFoodForDetails} 
        onClose={() => setSelectedExternalFoodForDetails(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {selectedExternalFoodForDetails?.displayName}
        </DialogTitle>
        <DialogContent dividers>
          {selectedExternalFoodForDetails && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Base Macros (per {selectedExternalFoodForDetails.servingQty}{selectedExternalFoodForDetails.servingUnit})</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                  {[
                    { label: 'Calories', val: selectedExternalFoodForDetails.calories, unit: 'kcal' },
                    { label: 'Protein', val: selectedExternalFoodForDetails.protein, unit: 'g' },
                    { label: 'Carbs', val: selectedExternalFoodForDetails.carbs, unit: 'g' },
                    { label: 'Fat', val: selectedExternalFoodForDetails.fat, unit: 'g' },
                  ].map(m => (
                    <Box key={m.label} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{m.label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{m.val}{m.unit}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Full Nutrient Profile</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: x => 1 }}>
                  {Object.entries(selectedExternalFoodForDetails.nutrients || {}).map(([key, val]) => {
                    if (val === 0 || val === null || val === undefined) return null;
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return (
                      <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed', borderColor: 'divider', py: 0.5, px: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{val}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
              
              <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 1 }}>
                Source: {selectedExternalFoodForDetails.source}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedExternalFoodForDetails(null)}>Close</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              handleAddExternalFoodToDb(selectedExternalFoodForDetails);
              setSelectedExternalFoodForDetails(null);
            }}
          >
            Add to Database
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default NutritionTracker

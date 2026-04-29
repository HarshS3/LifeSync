import ExpandableSection from './ExpandableSection'
import NutritionInsights from './NutritionInsights'
import WeeklyReview from './WeeklyReview'
import WeightTracker from './WeightTracker'
import KitchenInventory from './KitchenInventory'
import { useState, useEffect, useMemo, useRef } from 'react'
import RecipeExplorer from './RecipeExplorer'
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Divider,
  Alert,
  Stack,
  Grid,
  FormControl,
  FormControlLabel,
  Switch,
  Checkbox,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import CloseIcon from '@mui/icons-material/Close'
import InfoIcon from '@mui/icons-material/Info'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

import { 
  MEAL_TYPES, 
  EMPTY_TOTALS, 
  FOOD_NUTRIENT_FIELDS,
  hydrateFoodsForEditing,
  createEmptyFoodRow,
  generateCGMData,
  fmt,
  percent,
  TARGET_KEY_TO_TOTAL_KEY,
  MICRO_TO_TARGET_KEY,
  SUMMARY_MICRO_META,
  frontendEvaluateInteractions,
  MACRO_FIELD_META,
  MINERAL_FIELD_META,
  VITAMIN_FIELD_META
} from '../lib/nutritionHelpers'

import DailyLogTab from './Nutrition/DailyLogTab'
import LogMealTab from './Nutrition/LogMealTab'
import SummaryTab from './Nutrition/SummaryTab'
import ScanProductTab from './Nutrition/ScanProductTab'
import SupplementSection from './Nutrition/SupplementSection'
import DetailsTab from './Nutrition/DetailsTab'

// Global cache to prevent re-fetching on tab switch
let nutritionCache = {
  logs: {}, // dateStr -> data
  templates: null,
  frequentMeals: null,
  clinicalTargets: null,
  stats: null,
  token: null
}

function NutritionTracker() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [log, setLog] = useState(() => {
    const dStr = selectedDate.toISOString()
    return nutritionCache.logs[dStr] || { meals: [], waterIntake: 0, dailyTotals: EMPTY_TOTALS, notes: '' }
  })
  const [loading, setLoading] = useState(() => {
    const dStr = selectedDate.toISOString()
    return !nutritionCache.logs[dStr]
  })
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
    if (nutritionCache.token !== token) {
      nutritionCache = {
        logs: {},
        templates: null,
        frequentMeals: null,
        clinicalTargets: null,
        stats: null,
        token: token
      }
    }
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

  const loadClinicalTargets = async () => {
    if (nutritionCache.token === token && nutritionCache.clinicalTargets) {
      const data = nutritionCache.clinicalTargets
      if (data.requiresSetup) {
        setClinicalTargets(null)
        setClinicalTargetsRequiresSetup(true)
        setClinicalTargetsMissingFields(data.missingRequiredFields || [])
      } else {
        setClinicalTargets(data)
        setClinicalTargetsRequiresSetup(false)
      }
    }

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
      nutritionCache.clinicalTargets = data
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
      if (!nutritionCache.clinicalTargets) {
        setClinicalTargets(null)
        setClinicalTargetsRequiresSetup(false)
        setClinicalTargetsError(err.message)
      }
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
    if (nutritionCache.token === token && nutritionCache.templates) {
      setSavedTemplates(nutritionCache.templates)
    } else {
      setSavedTemplatesLoading(true)
    }

    try {
      const res = await fetch(`${API_BASE}/api/nutrition/saved-templates`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        const arr = Array.isArray(data) ? data : []
        setSavedTemplates(arr)
        nutritionCache.templates = arr
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
    if (nutritionCache.token === token && nutritionCache.frequentMeals) {
      setFrequentMeals(nutritionCache.frequentMeals)
    } else {
      setFrequentMealsLoading(true)
    }

    try {
      const res = await fetch(`${API_BASE}/api/nutrition/meal-templates`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        const arr = Array.isArray(data.templates) ? data.templates : []
        setFrequentMeals(arr)
        nutritionCache.frequentMeals = arr
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
    const dateStr = selectedDate.toISOString()
    if (nutritionCache.token === token && nutritionCache.logs[dateStr]) {
      setLog(nutritionCache.logs[dateStr])
      setLoading(false)
    } else {
      setLoading(true)
    }

    try {
      if (!user || !user._id) {
        setLog({ meals: [], waterIntake: 0, dailyTotals: { ...EMPTY_TOTALS }, notes: '' })
        return
      }
      const res = await fetch(`${API_BASE}/api/nutrition/logs/date/${encodeURIComponent(dateStr)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        const newLog = {
          meals: data.meals || [],
          supplements: data.supplements || [],
          waterIntake: data.waterIntake || 0,
          dailyTotals: data.dailyTotals || { ...EMPTY_TOTALS },
          notes: data.notes || '',
          _id: data._id,
        }
        setLog(newLog)
        nutritionCache.logs[dateStr] = newLog
        nutritionCache.token = token
      } else {
        const emptyLog = { meals: [], supplements: [], waterIntake: 0, dailyTotals: { ...EMPTY_TOTALS }, notes: '' }
        setLog(emptyLog)
        nutritionCache.logs[dateStr] = emptyLog
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
      if (!nutritionCache.logs[dateStr]) {
        setLog({ meals: [], waterIntake: 0, dailyTotals: { ...EMPTY_TOTALS }, notes: '' })
      }
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

      {!loading && activeTab === 0 && (
        <DailyLogTab
          log={log}
          totals={totals}
          calorieTarget={calorieTarget}
          proteinTarget={proteinTarget}
          editMealFromDay={editMealFromDay}
          removeMealFromDay={removeMealFromDay}
          generateNutritionInsight={generateNutritionInsight}
          generateMealSuggestions={generateMealSuggestions}
          nutritionInsight={nutritionInsight}
          nutritionInsightGenerating={nutritionInsightGenerating}
          mealSuggestions={mealSuggestions}
          mealSuggestionsGenerating={mealSuggestionsGenerating}
          handleWaterChange={handleWaterChange}
          timingAlerts={timingAlerts}
          insightMatchesSelectedDay={insightMatchesSelectedDay}
          setActiveTab={setActiveTab}
          SupplementSection={() => (
            <SupplementSection 
              log={log} 
              onUpdate={async (supps) => {
                const updatedLog = { ...log, supplements: supps }
                setLog(updatedLog)
                await autoSaveLog(updatedLog)
              }} 
            />
          )}
        />
      )}

      {activeTab === 1 && (
        <LogMealTab
          newMeal={newMeal}
          setNewMeal={setNewMeal}
          addFoodRow={() => {
            setNewMeal(prev => ({
              ...prev,
              foods: [createEmptyFoodRow(), ...prev.foods],
            }))
          }}
          removeFoodRow={(index) => {
            setNewMeal(prev => ({
              ...prev,
              foods: prev.foods.filter((_, i) => i !== index),
            }))
          }}
          updateFoodField={(index, field, value) => {
            setNewMeal(prev => {
              const foods = prev.foods.map((f, i) => {
                if (i !== index) return f
                if (field === 'quantity') {
                  const baseQty = Number(f.baseServingQty) || 1
                  const userQty = Number(value)
                  if (!Number.isFinite(baseQty) || baseQty <= 0 || !Number.isFinite(userQty) || userQty <= 0) {
                    return { ...f, quantity: value }
                  }
                  const ratio = userQty / baseQty
                  const scaled = { ...f, quantity: value }
                  FOOD_NUTRIENT_FIELDS.forEach(nField => {
                    if (f[nField + '_base'] !== undefined && f[nField + '_base'] !== '') {
                      scaled[nField] = Math.round(Number(f[nField + '_base']) * ratio * 100) / 100
                    }
                  })
                  return scaled
                }
                return { ...f, [field]: value }
              })
              return { ...prev, foods }
            })
          }}
          addMealToDay={addMealToDay}
          foodSearchQuery={foodSearchQuery}
          setFoodSearchQuery={setFoodSearchQuery}
          foodResults={foodResults}
          foodSearchLoading={foodSearchLoading}
          foodSearchAttempted={foodSearchAttempted}
          handleSearchResultSelect={handleSearchResultSelect}
          selectedFoodForAnalysis={selectedFoodForAnalysis}
          setSelectedFoodForAnalysis={setSelectedFoodForAnalysis}
          analyzeSelectedFood={analyzeSelectedFood}
          foodAnalysis={foodAnalysis}
          foodAnalysisLoading={foodAnalysisLoading}
          foodAnalysisError={foodAnalysisError}
          savedTemplates={savedTemplates}
          savedTemplatesLoading={savedTemplatesLoading}
          useTemplate={(tpl) => {
            const name = tpl.mealName || tpl.name
            const foods = hydrateFoodsForEditing(tpl.foods)
            setNewMeal({
              name: name || '',
              mealType: tpl.mealType || 'snack',
              time: new Date().toTimeString().slice(0, 5),
              foods,
              notes: tpl.notes || ''
            })
          }}
          deleteTemplate={deleteTemplate}
          frequentMeals={frequentMeals}
          frequentMealsLoading={frequentMealsLoading}
          templateName={templateName}
          setTemplateName={setTemplateName}
          saveAsTemplate={saveAsTemplate}
          savingTemplate={savingTemplate}
          liveInsights={liveInsights}
        />
      )}

      {activeTab === 2 && (
        <WeightTracker selectedDate={selectedDate} />
      )}

      {activeTab === 3 && (
        <DetailsTab
          log={log}
          setLog={setLog}
          totals={totals}
          calorieTarget={calorieTarget}
          proteinTarget={proteinTarget}
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
          formatDate={formatDate}
          selectedDate={selectedDate}
        />
      )}

      {activeTab === 4 && (
        <SummaryTab
          periodSummaryLoading={periodSummaryLoading}
          weeklyTotals={weeklyTotals}
          monthlyTotals={monthlyTotals}
          clinicalTargets={clinicalTargets}
          dynamicTargets={dynamicTargets}
          user={user}
        />
      )}

      {activeTab === 5 && (
        <ScanProductTab
          barcodeInput={barcodeInput}
          setBarcodeInput={setBarcodeInput}
          lookupBarcode={lookupBarcode}
          barcodeLookupLoading={barcodeLookupLoading}
          barcodeLookupError={barcodeLookupError}
          barcodeProduct={barcodeProduct}
          supportsBarcodeDetector={supportsBarcodeDetector}
          scannerOpen={scannerOpen}
          startBarcodeScanner={startBarcodeScanner}
          stopBarcodeScanner={stopBarcodeScanner}
          scanVideoRef={scanVideoRef}
          scanBarcodeFrame={scanBarcodeFrame}
          scanBusy={scanBusy}
          uploadedBarcodePreview={uploadedBarcodePreview}
          scanUploadedBarcodeImage={scanUploadedBarcodeImage}
        />
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




export default NutritionTracker;

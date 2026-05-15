import { useState, useEffect, useRef, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import Slider from '@mui/material/Slider'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'
import ChipListInput from './ChipListInput'
import BodyCompositionTab from './Profile/BodyCompositionTab'

const emptySegmental = () => ({
  rightArm: '',
  leftArm: '',
  trunk: '',
  rightLeg: '',
  leftLeg: '',
})

const createEmptyBodyComposition = () => ({
  date: '',
  bmi: '',
  bodyFatPercent: '',
  fatMassKg: '',
  smmKg: '',
  proteinKg: '',
  mineralKg: '',
  tbwKg: '',
  bmrKcal: '',
  metabolicAge: '',
  visceralFatLevel: '',
  segmentalFatKg: emptySegmental(),
  segmentalFatPercent: emptySegmental(),
  segmentalMuscleKg: emptySegmental(),
  updatedAt: '',
  source: 'manual',
})

const compositionEntryHasData = (c) => {
  if (!c || typeof c !== 'object') return false
  const top = ['date', 'bmi', 'bodyFatPercent', 'fatMassKg', 'smmKg', 'proteinKg', 'mineralKg', 'tbwKg', 'bmrKcal', 'metabolicAge', 'visceralFatLevel']
  if (top.some((k) => c[k] != null && c[k] !== '')) return true
  const segHas = (s) => s && typeof s === 'object' && Object.values(s).some((v) => v != null && v !== '')
  return segHas(c.segmentalFatKg) || segHas(c.segmentalFatPercent) || segHas(c.segmentalMuscleKg)
}

const hydrateCompositionFromServer = (raw) => {
  const empty = createEmptyBodyComposition()
  if (!raw || typeof raw !== 'object') return { ...empty }
  return {
    ...empty,
    ...raw,
    date: raw.date ? String(raw.date).split('T')[0] : '',
    segmentalFatKg: { ...empty.segmentalFatKg, ...(raw.segmentalFatKg || {}) },
    segmentalFatPercent: { ...empty.segmentalFatPercent, ...(raw.segmentalFatPercent || {}) },
    segmentalMuscleKg: { ...empty.segmentalMuscleKg, ...(raw.segmentalMuscleKg || {}) },
  }
}

const mergeCompositionStateFromApi = (data) => {
  let logs = []
  if (Array.isArray(data.bodyCompositionLogs) && data.bodyCompositionLogs.length > 0) {
    logs = data.bodyCompositionLogs.map(hydrateCompositionFromServer)
    logs.sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(a.updatedAt || 0)
      const db = b.date ? new Date(b.date) : new Date(b.updatedAt || 0)
      return da - db
    })
  } else if (compositionEntryHasData(data.bodyComposition)) {
    logs = [hydrateCompositionFromServer(data.bodyComposition)]
  }
  const active = logs.length > 0 ? hydrateCompositionFromServer(logs[logs.length - 1]) : createEmptyBodyComposition()
  return { bodyCompositionLogs: logs, bodyComposition: active }
}

/** Persist helpers + full profile save (same rules as handleSave for these fields). */
function normalizeMeasurementsForSave(m) {
  if (m == null || typeof m !== 'object') return undefined
  const toNum = (v) => {
    if (v == null || v === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  const numeric = {
    waistCm: toNum(m?.waistCm),
    hipCm: toNum(m?.hipCm),
    chestCm: toNum(m?.chestCm),
    neckCm: toNum(m?.neckCm),
    wristCm: toNum(m?.wristCm),
    bicepCm: toNum(m?.bicepCm),
    thighCm: toNum(m?.thighCm),
  }
  const hasAnyNumeric = Object.values(numeric).some((v) => v !== undefined)
  const base = {
    source: m?.source || 'manual',
    updatedAt: m?.updatedAt ? new Date(m.updatedAt) : new Date(),
  }
  if (!hasAnyNumeric) {
    if (!m?.updatedAt) return undefined
    return base
  }
  const out = { ...base, ...numeric }
  const pruned = {}
  for (const [k, v] of Object.entries(out)) {
    if (v !== undefined) pruned[k] = v
  }
  return pruned
}

function normalizeMeasurementLogsForSave(logs) {
  if (!Array.isArray(logs)) return []
  return logs.map((m) => normalizeMeasurementsForSave(m)).filter(Boolean)
}

function normalizeBodyCompositionForSave(c) {
  if (c == null || typeof c !== 'object') return undefined
  const toNum = (v) => {
    if (v == null || v === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  const seg = (o) => {
    const out = {
      rightArm: toNum(o?.rightArm),
      leftArm: toNum(o?.leftArm),
      trunk: toNum(o?.trunk),
      rightLeg: toNum(o?.rightLeg),
      leftLeg: toNum(o?.leftLeg),
    }
    const hasAny = Object.values(out).some((v) => v !== undefined)
    return hasAny ? out : undefined
  }
  const numeric = {
    bmi: toNum(c?.bmi),
    bodyFatPercent: toNum(c?.bodyFatPercent),
    fatMassKg: toNum(c?.fatMassKg),
    smmKg: toNum(c?.smmKg),
    proteinKg: toNum(c?.proteinKg),
    mineralKg: toNum(c?.mineralKg),
    tbwKg: toNum(c?.tbwKg),
    bmrKcal: toNum(c?.bmrKcal),
    metabolicAge: toNum(c?.metabolicAge),
    visceralFatLevel: toNum(c?.visceralFatLevel),
  }
  const segmentalFatKg = seg(c?.segmentalFatKg)
  const segmentalFatPercent = seg(c?.segmentalFatPercent)
  const segmentalMuscleKg = seg(c?.segmentalMuscleKg)
  const hasAnyNumeric = Object.values(numeric).some((v) => v !== undefined)
  const hasAnySegmental = !!segmentalFatKg || !!segmentalFatPercent || !!segmentalMuscleKg
  const hasDate = c?.date && String(c.date).trim() !== ''
  if (!hasAnyNumeric && !hasAnySegmental && !hasDate) {
    return undefined
  }
  const out = {
    ...numeric,
    ...(segmentalFatKg ? { segmentalFatKg } : {}),
    ...(segmentalFatPercent ? { segmentalFatPercent } : {}),
    ...(segmentalMuscleKg ? { segmentalMuscleKg } : {}),
    source: c?.source || 'manual',
    date: c?.date ? new Date(c.date) : undefined,
    updatedAt: c?.updatedAt ? new Date(c.updatedAt) : new Date(),
  }
  const pruned = {}
  for (const [k, v] of Object.entries(out)) {
    if (v !== undefined) pruned[k] = v
  }
  return pruned
}

function normalizeBodyCompositionLogsForSave(logs) {
  if (!Array.isArray(logs)) return []
  return logs.map((c) => normalizeBodyCompositionForSave(c)).filter(Boolean)
}

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'divider' },
    '&:hover fieldset': { borderColor: '#d1d5db' },
    '&.Mui-focused fieldset': { borderColor: 'text.primary' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: 'text.primary' },
}

const SectionTitle = ({ children, sx }) => (
  <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5, ...sx }}>
    {children}
  </Typography>
)

function ProfilePanel() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', schedule: '' })
  const [ocrFile, setOcrFile] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [bodyCompOcrFile, setBodyCompOcrFile] = useState(null)
  const [bodyCompOcrLoading, setBodyCompOcrLoading] = useState(false)
  const [bodyCompOcrError, setBodyCompOcrError] = useState('')
  const [selectedMeasurementLogIndex, setSelectedMeasurementLogIndex] = useState(0)
  const [selectedCompositionLogIndex, setSelectedCompositionLogIndex] = useState(0)
  const [lastSaved, setLastSaved] = useState(null)
  
  const [activeMeasurementLog, setActiveMeasurementLog] = useState(null)
  const [activeCompositionLog, setActiveCompositionLog] = useState(null)

  const [profile, setProfile] = useState({
    // Basic Info
    name: '',
    email: '',
    age: '',
    gender: '',
    dob: '',
    education: '',
    profession: '',
    skills: [],
    
    // Body Stats
    height: '',
    weight: '',
    bodyFat: '',
    restingHeartRate: '',
    bloodType: '',

    // Measurements
    bodyMeasurements: {
      waistCm: '',
      hipCm: '',
      chestCm: '',
      neckCm: '',
      wristCm: '',
      bicepCm: '',
      thighCm: '',
      updatedAt: '',
      source: 'manual',
    },
    bodyMeasurementLogs: [],

    // Body composition (manual entry or OCR import)
    bodyComposition: {
      date: '',
      bmi: '',
      bodyFatPercent: '',
      fatMassKg: '',
      smmKg: '',
      proteinKg: '',
      mineralKg: '',
      tbwKg: '',
      bmrKcal: '',
      metabolicAge: '',
      visceralFatLevel: '',
      segmentalFatKg: {
        rightArm: '',
        leftArm: '',
        trunk: '',
        rightLeg: '',
        leftLeg: '',
      },
      segmentalMuscleKg: {
        rightArm: '',
        leftArm: '',
        trunk: '',
        rightLeg: '',
        leftLeg: '',
      },
      updatedAt: '',
      source: 'manual',
    },
    bodyCompositionLogs: [],
    
    // Health Conditions
    conditions: [],
    allergies: [],
    injuries: [],
    
    // Medicines
    medications: [],
    supplements: [],

    // Key Lab Markers
    labMarkers: {
      hemoglobin: { value: '', unit: '' },
      ferritin: { value: '', unit: '' },
      iron: { value: '', unit: '' },
      vitaminB12: { value: '', unit: '' },
      vitaminD: { value: '', unit: '' },
      tsh: { value: '', unit: '' },
      crp: { value: '', unit: '' },
      fastingGlucose: { value: '', unit: '' },
      hba1c: { value: '', unit: '' },
      lipids: {
        totalCholesterol: { value: '', unit: '' },
        ldl: { value: '', unit: '' },
        hdl: { value: '', unit: '' },
        triglycerides: { value: '', unit: '' },
      },
      updatedAt: '',
      source: 'manual',
    },
    
    // Diet Preferences
    dietType: 'omnivore',
    mealsPerDay: 3,
    fastingWindow: '',
    avoidFoods: [],
    favoriteFoods: [],
    dailyCalorieTarget: '',
    dailyProteinTarget: '',
    hydrationGoal: 8,
    mealSchedule: {
      breakfast: '08:00',
      lunch: '13:00',
      dinner: '20:00',
      snack: '16:00',
    },
    
    // Workout Preferences
    trainingExperience: 'intermediate',
    preferredWorkouts: [],
    workoutFrequency: 4,
    workoutDuration: 60,
    gymAccess: true,
    homeEquipment: [],
    trainingGoals: [],
    
    // Mental & Energy Patterns
    chronotype: 'neutral',
    averageSleep: 7,
    defaultSleepTime: '22:30',
    stressTriggers: [],
    motivators: [],
    energyPeakTime: 'morning',
    focusChallenges: [],
    
    // Style Preferences
    stylePreference: 'casual',
    favoriteColors: [],
    avoidColors: [],
    bodyConfidence: 5,
    styleGoals: [],

    // Personality
    personality: {
      introversion: 5,
      bigFive: {
        openness: 5,
        conscientiousness: 5,
        extraversion: 5,
        agreeableness: 5,
        neuroticism: 5,
      },
      decisionStyle: '',
      updatedAt: '',
    },
  })

  const profileRef = useRef(profile)
  const persistMeasTimerRef = useRef(null)
  const persistCompTimerRef = useRef(null)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    return () => {
      if (persistMeasTimerRef.current) clearTimeout(persistMeasTimerRef.current)
      if (persistCompTimerRef.current) clearTimeout(persistCompTimerRef.current)
    }
  }, [])

  const persistBodyMeasurements = useCallback(async (p) => {
    if (!token) return false
    const bodyMeasurementLogsPayload = normalizeMeasurementLogsForSave(p.bodyMeasurementLogs)
    const bodyMeasurementsPayload = normalizeMeasurementsForSave(p.bodyMeasurements)
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bodyMeasurementLogs: bodyMeasurementLogsPayload,
          ...(bodyMeasurementsPayload ? { bodyMeasurements: bodyMeasurementsPayload } : {}),
        }),
      })
      if (res.ok) {
        setLastSaved(new Date())
        return true
      }
      return false
    } catch {
      return false
    } finally {
      setSaving(false)
    }
  }, [token])

  const persistBodyComposition = useCallback(async (p) => {
    if (!token) return false
    const bodyCompositionLogsPayload = normalizeBodyCompositionLogsForSave(p.bodyCompositionLogs)
    const newest =
      Array.isArray(p.bodyCompositionLogs) && p.bodyCompositionLogs.length > 0 ? p.bodyCompositionLogs[0] : p.bodyComposition
    const bodyCompositionPayload = normalizeBodyCompositionForSave(newest)
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bodyCompositionLogs: bodyCompositionLogsPayload,
          ...(bodyCompositionPayload ? { bodyComposition: bodyCompositionPayload } : {}),
        }),
      })
      if (res.ok) {
        setLastSaved(new Date())
        return true
      }
      return false
    } catch {
      return false
    } finally {
      setSaving(false)
    }
  }, [token])

  const schedulePersistMeasurements = useCallback(() => {
    if (persistMeasTimerRef.current) clearTimeout(persistMeasTimerRef.current)
    persistMeasTimerRef.current = setTimeout(() => {
      persistMeasTimerRef.current = null
      persistBodyMeasurements(profileRef.current)
    }, 500)
  }, [persistBodyMeasurements])

  const schedulePersistComposition = useCallback(() => {
    if (persistCompTimerRef.current) clearTimeout(persistCompTimerRef.current)
    persistCompTimerRef.current = setTimeout(() => {
      persistCompTimerRef.current = null
      persistBodyComposition(profileRef.current)
    }, 500)
  }, [persistBodyComposition])

  useEffect(() => {
    loadProfile()
  }, [token])

  const loadProfile = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(prev => {
          const merged = {
            ...prev,
            ...data,
            gender: data.gender || data.biologicalProfile?.biologicalSex || prev.gender,
            height: data.height || data.biologicalProfile?.heightCm || prev.height,
            weight: data.weight || data.biologicalProfile?.weightKg || prev.weight,
            bodyFat: data.bodyFat || data.biologicalProfile?.bodyFatPercentage || prev.bodyFat,
            dob: data.biologicalProfile?.dob ? data.biologicalProfile.dob.split('T')[0] : (data.dob ? data.dob.split('T')[0] : prev.dob),
            defaultSleepTime: data.biologicalProfile?.defaultSleepTime || prev.defaultSleepTime,
            conditions: data.conditions || [],
            allergies: data.allergies || [],
            injuries: data.injuries || [],
            medications: data.medications || [],
            supplements: data.supplements || [],
            skills: data.skills || [],
            avoidFoods: data.avoidFoods || [],
            favoriteFoods: data.favoriteFoods || [],
            mealSchedule: {
              ...prev.mealSchedule,
              ...(data.mealSchedule || {}),
            },
            preferredWorkouts: data.preferredWorkouts || [],
            homeEquipment: data.homeEquipment || [],
            trainingGoals: data.trainingGoals || [],
            stressTriggers: data.stressTriggers || [],
            motivators: data.motivators || [],
            focusChallenges: data.focusChallenges || [],
            favoriteColors: data.favoriteColors || [],
            avoidColors: data.avoidColors || [],
            styleGoals: data.styleGoals || [],
            bodyMeasurementLogs: Array.isArray(data.bodyMeasurementLogs) && data.bodyMeasurementLogs.length > 0
              ? data.bodyMeasurementLogs
              : (data.bodyMeasurements ? [data.bodyMeasurements] : []),
            personality: {
              ...prev.personality,
              ...(data.personality || {}),
              bigFive: {
                ...prev.personality.bigFive,
                ...(data.personality?.bigFive || {}),
              },
            },
            labMarkers: {
              ...prev.labMarkers,
              ...(data.labMarkers || {}),
              hemoglobin: { ...prev.labMarkers.hemoglobin, ...(data.labMarkers?.hemoglobin || {}) },
              ferritin: { ...prev.labMarkers.ferritin, ...(data.labMarkers?.ferritin || {}) },
              iron: { ...prev.labMarkers.iron, ...(data.labMarkers?.iron || {}) },
              vitaminB12: { ...prev.labMarkers.vitaminB12, ...(data.labMarkers?.vitaminB12 || {}) },
              vitaminD: { ...prev.labMarkers.vitaminD, ...(data.labMarkers?.vitaminD || {}) },
              tsh: { ...prev.labMarkers.tsh, ...(data.labMarkers?.tsh || {}) },
              crp: { ...prev.labMarkers.crp, ...(data.labMarkers?.crp || {}) },
              fastingGlucose: { ...prev.labMarkers.fastingGlucose, ...(data.labMarkers?.fastingGlucose || {}) },
              hba1c: { ...prev.labMarkers.hba1c, ...(data.labMarkers?.hba1c || {}) },
              lipids: {
                ...prev.labMarkers.lipids,
                ...(data.labMarkers?.lipids || {}),
                totalCholesterol: {
                  ...prev.labMarkers.lipids.totalCholesterol,
                  ...(data.labMarkers?.lipids?.totalCholesterol || {}),
                },
                ldl: { ...prev.labMarkers.lipids.ldl, ...(data.labMarkers?.lipids?.ldl || {}) },
                hdl: { ...prev.labMarkers.lipids.hdl, ...(data.labMarkers?.lipids?.hdl || {}) },
                triglycerides: {
                  ...prev.labMarkers.lipids.triglycerides,
                  ...(data.labMarkers?.lipids?.triglycerides || {}),
                },
              },
            },
            bodyMeasurements: {
              ...prev.bodyMeasurements,
              ...(data.bodyMeasurements || {}),
            },
            ...mergeCompositionStateFromApi(data),
          }

          if (merged.bodyMeasurementLogs && merged.bodyMeasurementLogs.length > 0) {
            setActiveMeasurementLog({ ...merged.bodyMeasurementLogs[0] })
          } else {
            setActiveMeasurementLog(null)
          }

          if (merged.bodyCompositionLogs && merged.bodyCompositionLogs.length > 0) {
            setActiveCompositionLog({ ...merged.bodyCompositionLogs[merged.bodyCompositionLogs.length - 1] })
            setSelectedCompositionLogIndex(merged.bodyCompositionLogs.length - 1)
          } else {
            setActiveCompositionLog(null)
            setSelectedCompositionLogIndex(0)
          }

          return merged
        })
        setSelectedMeasurementLogIndex(0)
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)

    const normalizeLabMarkersForSave = (labMarkers) => {
      const normalizeValue = (obj) => {
        if (!obj || obj.value === '' || obj.value == null) return undefined
        const n = Number(obj.value)
        if (!Number.isFinite(n)) return undefined
        return { value: n, unit: obj.unit ? String(obj.unit) : '' }
      }

      const lipids = labMarkers?.lipids || {}
      const normalized = {
        hemoglobin: normalizeValue(labMarkers?.hemoglobin),
        ferritin: normalizeValue(labMarkers?.ferritin),
        iron: normalizeValue(labMarkers?.iron),
        vitaminB12: normalizeValue(labMarkers?.vitaminB12),
        vitaminD: normalizeValue(labMarkers?.vitaminD),
        tsh: normalizeValue(labMarkers?.tsh),
        crp: normalizeValue(labMarkers?.crp),
        fastingGlucose: normalizeValue(labMarkers?.fastingGlucose),
        hba1c: normalizeValue(labMarkers?.hba1c),
        lipids: {
          totalCholesterol: normalizeValue(lipids?.totalCholesterol),
          ldl: normalizeValue(lipids?.ldl),
          hdl: normalizeValue(lipids?.hdl),
          triglycerides: normalizeValue(lipids?.triglycerides),
        },
        source: labMarkers?.source || 'manual',
        updatedAt: labMarkers?.updatedAt ? new Date(labMarkers.updatedAt) : undefined,
      }

      const pruneUndefined = (o) => {
        if (!o || typeof o !== 'object') return o
        const out = Array.isArray(o) ? [] : {}
        for (const [k, v] of Object.entries(o)) {
          if (v === undefined) continue
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            const child = pruneUndefined(v)
            if (child && typeof child === 'object' && Object.keys(child).length === 0) continue
            out[k] = child
          } else {
            out[k] = v
          }
        }
        return out
      }

      return pruneUndefined(normalized)
    }

    try {
      const bodyMeasurementsPayload = normalizeMeasurementsForSave(profile.bodyMeasurements)
      const bodyMeasurementLogsPayload = normalizeMeasurementLogsForSave(profile.bodyMeasurementLogs)
      const bodyCompositionLogsPayload = normalizeBodyCompositionLogsForSave(profile.bodyCompositionLogs)
      const newestComposition =
        Array.isArray(profile.bodyCompositionLogs) && profile.bodyCompositionLogs.length > 0
          ? profile.bodyCompositionLogs[0]
          : profile.bodyComposition
      const bodyCompositionPayload = normalizeBodyCompositionForSave(newestComposition)
      const toNumOrUndefined = (v) => {
        if (v == null || v === '') return undefined
        const n = Number(v)
        return Number.isFinite(n) ? n : undefined
      }

      const mergedBiologicalProfile = {
        ...(profile.biologicalProfile || {}),
        biologicalSex:
          (profile.biologicalProfile?.biologicalSex === 'male' || profile.biologicalProfile?.biologicalSex === 'female')
            ? profile.biologicalProfile.biologicalSex
            : (profile.gender === 'male' || profile.gender === 'female' ? profile.gender : undefined),
        heightCm: toNumOrUndefined(profile.height) ?? profile.biologicalProfile?.heightCm,
        weightKg: toNumOrUndefined(profile.weight) ?? profile.biologicalProfile?.weightKg,
        bodyFatPercentage: toNumOrUndefined(profile.bodyFat) ?? profile.biologicalProfile?.bodyFatPercentage,
      }

      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...profile,
          biologicalProfile: mergedBiologicalProfile,
          labMarkers: normalizeLabMarkersForSave(profile.labMarkers),
          bodyMeasurementLogs: bodyMeasurementLogsPayload,
          bodyCompositionLogs: bodyCompositionLogsPayload,
          ...(bodyMeasurementsPayload ? { bodyMeasurements: bodyMeasurementsPayload } : {}),
          ...(bodyCompositionPayload ? { bodyComposition: bodyCompositionPayload } : {}),
        }),
      })
      if (res.ok) {
        toast.success('Profile saved securely.')
      } else {
        toast.error('Failed to save profile.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field, value) => {
    setProfile(prev => {
      const next = { ...prev, [field]: value }
      const bp = {
        ...(prev.biologicalProfile || {
          biologicalSex: 'male',
          activityLevel: 'sedentary',
          metabolicGoal: 'maintenance',
          pregnancyStatus: 'none',
          dietaryPreference: 'omnivore',
          hypertension: false,
          insulinSensitivity: 'normal',
        }),
      }

      if (field === 'height') bp.heightCm = value === '' ? undefined : Number(value)
      if (field === 'weight') bp.weightKg = value === '' ? undefined : Number(value)
      if (field === 'bodyFat') bp.bodyFatPercentage = value === '' ? undefined : Number(value)
      if (field === 'gender' && (value === 'male' || value === 'female')) bp.biologicalSex = value
      if (field === 'dob') bp.dob = value
      if (field === 'defaultSleepTime') bp.defaultSleepTime = value

      next.biologicalProfile = bp
      return next
    })
  }

  const updateBiologicalProfileField = (field, value) => {
    setProfile(prev => ({
      ...prev,
      ...(field === 'biologicalSex' ? { gender: value } : {}),
      biologicalProfile: {
        ...(prev.biologicalProfile || {
          biologicalSex: 'male',
          activityLevel: 'sedentary',
          metabolicGoal: 'maintenance',
          pregnancyStatus: 'none',
          dietaryPreference: 'omnivore',
          hypertension: false,
          insulinSensitivity: 'normal',
        }),
        [field]: value
      }
    }))
  }

  const updatePersonalityField = (field, value) => {
    setProfile(prev => ({
      ...prev,
      personality: {
        ...(prev.personality || {}),
        [field]: value,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const updateBigFiveField = (field, value) => {
    setProfile(prev => ({
      ...prev,
      personality: {
        ...(prev.personality || {}),
        bigFive: {
          ...(prev.personality?.bigFive || {}),
          [field]: value,
        },
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const updateMeasurementField = (field, value) => {
    setProfile(prev => ({
      ...prev,
      bodyMeasurements: {
        ...(prev.bodyMeasurements || {}),
        [field]: value,
        source: 'manual',
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const addMeasurementLog = () => {
    setProfile((prev) => {
      const logs = Array.isArray(prev.bodyMeasurementLogs) ? [...prev.bodyMeasurementLogs] : []
      const newLog = {
        waistCm: '',
        hipCm: '',
        chestCm: '',
        neckCm: '',
        wristCm: '',
        bicepCm: '',
        thighCm: '',
        source: 'manual',
        updatedAt: new Date().toISOString(),
      }
      logs.unshift(newLog)
      const next = {
        ...prev,
        bodyMeasurementLogs: logs,
        bodyMeasurements: newLog,
      }
      setActiveMeasurementLog({ ...newLog })
      Promise.resolve().then(() => persistBodyMeasurements(next))
      return next
    })
    setSelectedMeasurementLogIndex(0)
  }

  const selectMeasurementLog = (idx) => {
    setSelectedMeasurementLogIndex(idx)
    setProfile(prev => {
      const logs = Array.isArray(prev.bodyMeasurementLogs) ? prev.bodyMeasurementLogs : []
      const selected = logs[idx] || null
      if (!selected) return prev
      setActiveMeasurementLog({ ...selected })
      return {
        ...prev,
        bodyMeasurements: { ...selected },
      }
    })
  }

  const updateMeasurementLogField = (field, value) => {
    setActiveMeasurementLog(prev => ({
      ...prev,
      [field]: value,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    }))
    setProfile((prev) => {
      const logs = Array.isArray(prev.bodyMeasurementLogs) ? [...prev.bodyMeasurementLogs] : []
      if (!logs[selectedMeasurementLogIndex]) {
        logs[selectedMeasurementLogIndex] = {
          source: 'manual',
          updatedAt: new Date().toISOString(),
        }
      }
      logs[selectedMeasurementLogIndex] = {
        ...logs[selectedMeasurementLogIndex],
        [field]: value,
        source: 'manual',
        updatedAt: new Date().toISOString(),
      }
      return {
        ...prev,
        bodyMeasurementLogs: logs,
        bodyMeasurements: { ...logs[selectedMeasurementLogIndex] },
      }
    })
    schedulePersistMeasurements()
  }

  const removeMeasurementLog = (index) => {
    setProfile(prev => {
      const logs = (prev.bodyMeasurementLogs || []).filter((_, i) => i !== index)
      const next = { ...prev, bodyMeasurementLogs: logs }
      if (logs.length > 0) {
        const nextIdx = Math.max(0, index - 1)
        setSelectedMeasurementLogIndex(nextIdx)
        setActiveMeasurementLog({ ...logs[nextIdx] })
      } else {
        setSelectedMeasurementLogIndex(0)
        setActiveMeasurementLog(null)
      }
      Promise.resolve().then(() => persistBodyMeasurements(next))
      return next
    })
  }

  const getMeasurementLogLabel = (entry, idx) => {
    const dt = entry?.updatedAt ? new Date(entry.updatedAt) : null
    const fallback = `Entry ${idx + 1}`
    if (!dt || Number.isNaN(dt.getTime())) return fallback
    return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getCompositionLogLabel = (entry, idx) => {
    const fallback = `Scan ${idx + 1}`
    if (entry?.date && /^\d{4}-\d{2}-\d{2}$/.test(String(entry.date))) {
      const [y, mo, d] = String(entry.date).split('-').map(Number)
      const local = new Date(y, mo - 1, d)
      if (!Number.isNaN(local.getTime())) {
        return local.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      }
    }
    // If manual entry and no scan date, show 'New Entry' instead of defaulting to updatedAt (today)
    if (entry?.source === 'manual' && !entry?.date) {
      return 'New Entry'
    }
    const dt = entry?.updatedAt ? new Date(entry.updatedAt) : null
    if (!dt || Number.isNaN(dt.getTime())) return fallback
    return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const addCompositionLog = () => {
    setProfile((prev) => {
      const logs = Array.isArray(prev.bodyCompositionLogs) ? [...prev.bodyCompositionLogs] : []
      const newLog = {
        ...createEmptyBodyComposition(),
        source: 'manual',
        updatedAt: new Date().toISOString(),
      }
      logs.push(newLog)
      // Sort ascending
      logs.sort((a, b) => {
        const da = a.date ? new Date(a.date) : new Date(a.updatedAt || 0)
        const db = b.date ? new Date(b.date) : new Date(b.updatedAt || 0)
        return da - db
      })
      const nextIdx = logs.findIndex(l => l === newLog)
      setSelectedCompositionLogIndex(nextIdx >= 0 ? nextIdx : logs.length - 1)
      setActiveCompositionLog({ ...newLog })
      return {
        ...prev,
        bodyCompositionLogs: logs,
        bodyComposition: newLog,
      }
    })
  }

  const selectCompositionLog = (idx) => {
    setSelectedCompositionLogIndex(idx)
    setProfile((prev) => {
      const logs = Array.isArray(prev.bodyCompositionLogs) ? [...prev.bodyCompositionLogs] : []
      const selected = logs[idx]
      if (!selected) return prev
      setActiveCompositionLog({ ...selected })
      return {
        ...prev,
        bodyComposition: { ...selected },
      }
    })
  }

  const updateBodyCompositionField = (field, value) => {
    setActiveCompositionLog(prev => ({
      ...prev,
      [field]: value,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    }))
    setProfile((prev) => {
      const logs = Array.isArray(prev.bodyCompositionLogs) ? [...prev.bodyCompositionLogs] : []
      const idx = selectedCompositionLogIndex
      if (!logs[idx]) {
        logs[idx] = {
          ...createEmptyBodyComposition(),
          source: 'manual',
          updatedAt: new Date().toISOString(),
        }
      }
      logs[idx] = {
        ...logs[idx],
        [field]: value,
        source: 'manual',
        updatedAt: new Date().toISOString(),
      }
      if (field === 'date') {
        const currentLog = logs[idx]
        logs.sort((a, b) => {
          const da = a.date ? new Date(a.date) : new Date(a.updatedAt || 0)
          const db = b.date ? new Date(b.date) : new Date(b.updatedAt || 0)
          return da - db
        })
        const nextIdx = logs.findIndex(l => l === currentLog)
        setSelectedCompositionLogIndex(nextIdx >= 0 ? nextIdx : idx)
      }
      return {
        ...prev,
        bodyCompositionLogs: logs,
        bodyComposition: { ...logs[idx] },
      }
    })
    schedulePersistComposition()
  }

  const updateBodyCompositionSegmental = (group, key, value) => {
    setActiveCompositionLog(prev => ({
      ...prev,
      [group]: {
        ...(prev[group] || {}),
        [key]: value
      },
      source: 'manual',
      updatedAt: new Date().toISOString(),
    }))
    setProfile((prev) => {
      const logs = Array.isArray(prev.bodyCompositionLogs) ? [...prev.bodyCompositionLogs] : []
      const idx = selectedCompositionLogIndex
      if (!logs[idx]) {
        logs[idx] = {
          ...createEmptyBodyComposition(),
          source: 'manual',
          updatedAt: new Date().toISOString(),
        }
      }
      logs[idx] = {
        ...logs[idx],
        [group]: {
          ...((logs[idx][group] || createEmptyBodyComposition()[group]) || {}),
          [key]: value,
        },
        source: 'manual',
        updatedAt: new Date().toISOString(),
      }
      return {
        ...prev,
        bodyCompositionLogs: logs,
        bodyComposition: { ...logs[idx] },
      }
    })
    schedulePersistComposition()
  }

  const removeCompositionLog = (index) => {
    if (!window.confirm('Are you sure you want to delete this body composition entry? This cannot be undone.')) return
    
    setProfile(prev => {
      const logs = (prev.bodyCompositionLogs || []).filter((_, i) => i !== index)
      const next = { ...prev, bodyCompositionLogs: logs }
      if (logs.length > 0) {
        const nextIdx = Math.max(0, index - 1)
        setSelectedCompositionLogIndex(nextIdx)
        setActiveCompositionLog({ ...logs[nextIdx] })
      } else {
        setSelectedCompositionLogIndex(0)
        setActiveCompositionLog(null)
      }
      Promise.resolve().then(() => persistBodyComposition(next))
      toast.success('Log entry deleted')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return next
    })
  }

  const parseBodyCompositionFromOcrText = (rawText) => {
    const text = String(rawText || '')
      .replace(/\r/g, '\n')
      .replace(/[\t\u00A0]+/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Strip arrow/dagger noise symbols that ACCUNIQ / InBody print after values
    const flat = text
      .replace(/[↑↓†‡⇑⇓▲▼]/g, '')
      .replace(/\s+/g, ' ')

    const toNum = (s) => {
      if (s == null) return null
      const n = Number(String(s).replace(',', '.'))
      return Number.isFinite(n) ? n : null
    }

    const pick = (re, from = flat) => {
      const m = re.exec(from)
      return m ? toNum(m[1]) : null
    }

    const pickAfterLabel = (labelRe) => {
      const m = labelRe.exec(flat)
      if (!m) return null
      const after = flat.slice(m.index + m[0].length, m.index + m[0].length + 100)
      const n = after.match(/(-?\d+(?:[.,]\d+)?)/)
      return n ? toNum(n[1]) : null
    }

    const extractDate = () => {
      // Common date labels in body scan reports
      const dateLabels = /(?:test\s*date|measurement\s*date|scan\s*date|date\s*of\s*test|registration\s*date|result\s*date|date|dated|test\s*d\.)/i;
      
      // 1. Try to find a date immediately following a known label
      const labelMatch = dateLabels.exec(flat);
      if (labelMatch) {
        const after = flat.slice(labelMatch.index + labelMatch[0].length, labelMatch.index + labelMatch[0].length + 60);
        // Look for YYYY.MM.DD, DD.MM.YYYY, DD.MM.YY, etc.
        const m = after.match(/(\d{4}[\s.\/\-]+\d{1,2}[\s.\/\-]+\d{1,2})/) ||
                  after.match(/(\d{1,2}[\s.\/\-]+\d{1,2}[\s.\/\-]+\d{2,4})/) ||
                  after.match(/(\d{1,2}[\s.\/\-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s.\/\-]+\d{2,4})/i);
        if (m) return m[1];
      }

      // 2. Fallback: Search for any standalone date-like patterns in the text
      const anyDate = flat.match(/(\d{4}[\s.\/\-]+\d{1,2}[\s.\/\-]+\d{1,2})/) ||
                      flat.match(/(\d{1,2}[\s.\/\-]+\d{1,2}[\s.\/\-]+\d{4})/) ||
                      flat.match(/(\d{1,2}[\s.\/\-]+\d{1,2}[\s.\/\-]+\d{2})/) || // standalone DD.MM.YY
                      flat.match(/(\d{1,2}[\s.\/\-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s.\/\-]+\d{2,4})/i);
      
      return anyDate ? anyDate[1] : null;
    };

    const testDateRaw = extractDate();

    let testDate = null;
    if (testDateRaw) {
      // Clean up separators and handle common OCR character swaps (O -> 0, I -> 1)
      const sanitized = testDateRaw
        .replace(/[OI]/g, (m) => (m === 'O' ? '0' : '1'))
        .replace(/[\s.\/]/g, '-');
      
      const parts = sanitized.split('-').filter(Boolean);
      
      let d = new Date(NaN);
      if (parts.length === 3) {
        let y = parseInt(parts[0], 10);
        let m = parts[1];
        let day = parseInt(parts[2], 10);

        if (parts[0].length === 4) {
          // YYYY-MM-DD
          d = new Date(`${y}-${m.padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        } else if (parts[2].length >= 2) {
          // DD-MM-YYYY or DD-MM-YY
          y = parseInt(parts[2], 10);
          if (y < 100) y += 2000;
          
          const p1IsMonth = /^[a-z]{3,9}$/i.test(parts[1]);
          if (p1IsMonth) {
            d = new Date(`${parts[0]} ${parts[1]} ${y}`);
          } else {
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            // Prioritize DD-MM-YYYY as requested by user
            if (p1 <= 12) {
              // Assume p1 is month, p0 is day
              d = new Date(`${y}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`);
            } else if (p0 <= 12) {
              // Fallback to MM-DD-YYYY if p1 is not a valid month but p0 is
              d = new Date(`${y}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`);
            }
          }
        }
      }

      if (!Number.isNaN(d.getTime())) {
        // Ensure the date is not in the distant future (OCR error)
        const now = new Date();
        const futureLimit = new Date();
        futureLimit.setFullYear(now.getFullYear() + 1);
        
        if (d < futureLimit) {
          testDate = d.toISOString().split('T')[0];
        }
      }
    }

    const heightCm =
      pick(/\bheight\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*cm\b/i) ||
      pick(/\bheight\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
      pickAfterLabel(/\bheight\b/i)

    const weightKg =
      pick(/\bweight\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
      pick(/\bweight\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
      pickAfterLabel(/\bweight\b/i)

    const bmi =
      pick(/\bBMI\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,]\d+)?)/i) ||
      pick(/body\s*mass\s*index\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,]\d+)?)/i) ||
      pickAfterLabel(/\bBMI\b/i)

    const bodyFatPercent =
      pick(/\bPBF\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,]\d+)?)\s*%/i) ||
      pick(/percentage\s*of\s*body\s*fat\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,]\d+)?)/i) ||
      pick(/body\s*fat\s*(?:%|percentage)\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,]\d+)?)/i) ||
      pick(/percent\s*body\s*fat\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,]\d+)?)/i) ||
      pickAfterLabel(/percentage\s*of\s*body\s*fat\b/i)

    const fatMassKg =
      pick(/\bbody\s*fat\s*mass\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,]\d+)?)\s*(?:kg|kgs)\b/i) ||
      pick(/\bfat\s*mass\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,]\d+)?)\s*(?:kg|kgs)\b/i) ||
      pickAfterLabel(/\bfat\s*mass\b/i)

    const smmKg =
      pick(/\bSMM\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,]\d+)?)\s*(?:kg|kgs)\b/i) ||
      pick(/skeletal\s*muscle\s*mass\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,]\d+)?)\s*(?:kg|kgs)\b/i) ||
      pickAfterLabel(/\bSMM\b/i) ||
      pickAfterLabel(/skeletal\s*muscle\s*mass\b/i)

    const proteinKg =
      pick(/\bproteins?\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
      pickAfterLabel(/\bproteins?\b/i)

    const mineralKg =
      pick(/\bminerals?\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
      pick(/bone\s*mineral\s*content\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
      pickAfterLabel(/\bminerals?\b/i)

    const tbwKg =
      pick(/\bTBW\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs|l)\b/i) ||
      pick(/total\s*body\s*water\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs|l)\b/i) ||
      pickAfterLabel(/\bTBW\b/i)

    const bmrKcal =
      pick(/\bBMR\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kcal|kcals)?\b/i) ||
      pick(/basal\s*metabolic\s*rate\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
      pickAfterLabel(/\bBMR\b/i)

    const metabolicAge =
      pick(/(?:metabolic|biological)\s*age\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
      pickAfterLabel(/(?:metabolic|biological)\s*age\b/i)

    const visceralFatLevel =
      pick(/visceral\s*fat\s*(?:level|rating)?\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
      pick(/\bVFL\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
      pickAfterLabel(/visceral\s*fat\s*level\b/i)

    const segmentalFromBlock = (headerRegex) => {
      const m = text.match(headerRegex)
      if (!m || m.index == null) return null
      const startIdx = m.index
      const slice = text.slice(startIdx, startIdx + 900)
      // Stop before the next major section
      const endIdx = slice.search(/\n\s*(?:TBW\b|Proteins?\b|Minerals?\b|Body\s*Composition\b|InBody\b|Weight\b|BMR\b|Body\s*Type\b|Biological\s*Age\b|Basal\s*Metabolic\b|Segmental\s*Fat\b|Segmental\s*Muscle\b)/i)
      const block = (endIdx > 30 ? slice.slice(0, endIdx) : slice)
        .replace(/[↑↓†‡⇑⇓▲▼]/g, '') // strip noise arrows

      const nums = Array.from(block.matchAll(/(-?\d+(?:[\.,]\d+)?)/g))
        .map((mm) => toNum(mm[1]))
        .filter((v) => typeof v === 'number' && Number.isFinite(v))

      const pcts = Array.from(block.matchAll(/(-?\d+(?:[\.,]\d+)?)\s*%/g))
        .map((mm) => toNum(mm[1]))
        .filter((v) => typeof v === 'number' && Number.isFinite(v))

      const map5 = (vals) => {
        if (!Array.isArray(vals) || vals.length < 5) return null
        const candidates = vals.slice(0, 12)
          .map((v, idx) => ({ v, idx }))

        const trunk = candidates.reduce((a, b) => (b.v > a.v ? b : a), candidates[0])
        const rest = candidates.filter((x) => x.idx !== trunk.idx)
        // legs tend to be larger than arms
        const legsSorted = [...rest].sort((a, b) => b.v - a.v).slice(0, 2).sort((a, b) => a.idx - b.idx)
        const armsSorted = rest
          .filter((x) => !legsSorted.some((l) => l.idx === x.idx))
          .sort((a, b) => a.idx - b.idx)
          .slice(0, 2)

        if (armsSorted.length < 2 || legsSorted.length < 2) return null

        return {
          leftArm: armsSorted[0].v,
          rightArm: armsSorted[1].v,
          trunk: trunk.v,
          leftLeg: legsSorted[0].v,
          rightLeg: legsSorted[1].v,
        }
      }

      return {
        kg: map5(nums),
        pct: map5(pcts),
      }
    }

    const segFat = segmentalFromBlock(/segmental\s*fat\s*mass/i)
    const segMuscle = segmentalFromBlock(/segmental\s*muscle\s*mass/i)

    const hasSegFatKg = Object.values(segFat?.kg || {}).some((v) => v != null)
    const hasSegFatPct = Object.values(segFat?.pct || {}).some((v) => v != null)
    const hasSegMuscleKg = Object.values(segMuscle?.kg || {}).some((v) => v != null)

    const out = {
      date: testDate,
      heightCm,
      weightKg,
      bmi,
      bodyFatPercent,
      fatMassKg,
      smmKg,
      proteinKg,
      mineralKg,
      tbwKg,
      bmrKcal,
      metabolicAge,
      visceralFatLevel,
      ...(hasSegFatKg ? { segmentalFatKg: segFat.kg } : {}),
      ...(hasSegFatPct ? { segmentalFatPercent: segFat.pct } : {}),
      ...(hasSegMuscleKg ? { segmentalMuscleKg: segMuscle.kg } : {}),
    }

    return out
  }

  const importBodyCompositionFromOcr = async () => {
    if (!bodyCompOcrFile || !token) return
    setBodyCompOcrError('')
    setBodyCompOcrLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', bodyCompOcrFile)

      const res = await fetch(`${API_BASE}/api/labs/ocr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'OCR failed')

      const extracted = parseBodyCompositionFromOcrText(payload?.text || '')

      setProfile((prev) => {
        const logs = [...(prev.bodyCompositionLogs || [])]
        const idx = selectedCompositionLogIndex
        
        // Use the existing log at selected index, or create a fresh one if none exists
        const baseComp = logs[idx] || {}
        
        const updatedComp = {
          ...baseComp,
          ...(extracted || {}),
          source: 'ocr',
          updatedAt: new Date().toISOString(),
        }

        if (logs[idx]) {
          logs[idx] = updatedComp
        } else {
          logs.unshift(updatedComp)
        }

        // Sort ascending
        logs.sort((a, b) => {
          const da = a.date ? new Date(a.date) : new Date(a.updatedAt || 0)
          const db = b.date ? new Date(b.date) : new Date(b.updatedAt || 0)
          return da - db
        })
        const nextIdx = logs.findIndex(l => l === updatedComp)
        setSelectedCompositionLogIndex(nextIdx >= 0 ? nextIdx : idx)
        setActiveCompositionLog({ ...updatedComp })

        const next = {
          ...prev,
          height: extracted?.heightCm == null ? prev.height : String(Math.round(extracted.heightCm)),
          weight: extracted?.weightKg == null ? prev.weight : String(extracted.weightKg),
          bodyComposition: updatedComp,
          bodyCompositionLogs: logs.slice(0, 100),
        }
        Promise.resolve().then(() => persistBodyComposition(next))
        return next
      })
    } catch (e) {
      setBodyCompOcrError(e?.message || 'OCR failed')
    } finally {
      setBodyCompOcrLoading(false)
    }
  }

  const updateLabMarker = (key, value) => {
    setProfile(prev => ({
      ...prev,
      labMarkers: {
        ...prev.labMarkers,
        [key]: { ...(prev.labMarkers?.[key] || {}), value },
        source: 'manual',
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const updateLipidMarker = (key, value) => {
    setProfile(prev => ({
      ...prev,
      labMarkers: {
        ...prev.labMarkers,
        lipids: {
          ...(prev.labMarkers?.lipids || {}),
          [key]: { ...((prev.labMarkers?.lipids || {})[key] || {}), value },
        },
        source: 'manual',
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const parseMarkersFromOcrText = (rawText) => {
    const text = String(rawText || '')
      .replace(/\r/g, '\n')
      .replace(/[\t\u00A0]+/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const lines = text
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean)

    const parseNumberFromString = (s) => {
      const m = String(s || '').match(/(-?\d+(?:[\.,]\d+)?)/)
      if (!m) return null
      const n = Number(String(m[1]).replace(',', '.'))
      return Number.isFinite(n) ? n : null
    }

    const findNumberAfterMatch = (s, matchIndex, matchText) => {
      const start = Math.max(0, (matchIndex || 0) + String(matchText || '').length)
      const window = String(s || '').slice(start, start + 140)
      return parseNumberFromString(window)
    }

    // Prefer a line-based parse (common for PDFs / tables). If the line has no number, look at the next line.
    const findNumberFor = (labelRegexes) => {
      // 1) Try per-line: extract number AFTER the label match on that line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        for (const re of labelRegexes) {
          const m = re.exec(line)
          if (!m) continue
          const sameLineAfter = findNumberAfterMatch(line, m.index, m[0])
          if (sameLineAfter != null) return sameLineAfter

          const next = lines[i + 1] || ''
          const nextLineAny = parseNumberFromString(next)
          if (nextLineAny != null) return nextLineAny
        }
      }

      // 2) Fallback: search whole text and extract number AFTER label match
      for (const re of labelRegexes) {
        const m = re.exec(text)
        if (!m) continue
        const after = findNumberAfterMatch(text, m.index, m[0])
        if (after != null) return after
      }

      return null
    }

    return {
      hemoglobin: findNumberFor([/hemoglobin/i]),
      ferritin: findNumberFor([/ferritin/i]),
      iron: findNumberFor([/serum\s*iron/i, /\biron/i]),
      vitaminB12: findNumberFor([/vitamin\s*b\s*12/i, /\bb\s*12/i, /cobalamin/i]),
      vitaminD: findNumberFor([
        /vitamin\s*d/i,
        /25\s*\(?oh\)?\s*d/i,
        /25\s*[-\s]*hydroxy(?:vitamin)?\s*d/i,
      ]),
      tsh: findNumberFor([/\btsh/i, /thyroid\s*stimulating\s*hormone/i]),
      crp: findNumberFor([/\bcrp/i, /c\s*-?reactive\s*protein/i]),
      fastingGlucose: findNumberFor([/fasting\s*glucose/i, /glucose\s*\(\s*fasting\s*\)/i]),
      hba1c: findNumberFor([/hba1c/i, /\ba1c/i, /glycated\s*hemoglobin/i]),
      lipids: {
        totalCholesterol: findNumberFor([/total\s*cholesterol/i]),
        ldl: findNumberFor([/\bldl/i, /low\s*density\s*lipoprotein/i]),
        hdl: findNumberFor([/\bhdl/i, /high\s*density\s*lipoprotein/i]),
        triglycerides: findNumberFor([/triglycerides?/i, /\btg/i]),
      },
    }
  }

  const importLabMarkersFromOcr = async () => {
    if (!ocrFile || !token) return
    setOcrError('')
    setOcrLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', ocrFile)

      const res = await fetch(`${API_BASE}/api/labs/ocr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'OCR failed')
      }

      const rawText = payload?.text || ''
      console.log('[Lab OCR] Extracted text:\n' + rawText)

      const extracted = parseMarkersFromOcrText(rawText)
      console.log('[Profile Lab Markers] extracted', extracted)
      setProfile(prev => ({
        ...prev,
        labMarkers: {
          ...(prev.labMarkers || {}),
          hemoglobin:
            extracted.hemoglobin == null
              ? prev.labMarkers?.hemoglobin
              : { ...(prev.labMarkers?.hemoglobin || {}), value: String(extracted.hemoglobin) },
          ferritin:
            extracted.ferritin == null
              ? prev.labMarkers?.ferritin
              : { ...(prev.labMarkers?.ferritin || {}), value: String(extracted.ferritin) },
          iron:
            extracted.iron == null
              ? prev.labMarkers?.iron
              : { ...(prev.labMarkers?.iron || {}), value: String(extracted.iron) },
          vitaminB12:
            extracted.vitaminB12 == null
              ? prev.labMarkers?.vitaminB12
              : { ...(prev.labMarkers?.vitaminB12 || {}), value: String(extracted.vitaminB12) },
          vitaminD:
            extracted.vitaminD == null
              ? prev.labMarkers?.vitaminD
              : { ...(prev.labMarkers?.vitaminD || {}), value: String(extracted.vitaminD) },
          tsh:
            extracted.tsh == null
              ? prev.labMarkers?.tsh
              : { ...(prev.labMarkers?.tsh || {}), value: String(extracted.tsh) },
          crp:
            extracted.crp == null
              ? prev.labMarkers?.crp
              : { ...(prev.labMarkers?.crp || {}), value: String(extracted.crp) },
          fastingGlucose:
            extracted.fastingGlucose == null
              ? prev.labMarkers?.fastingGlucose
              : { ...(prev.labMarkers?.fastingGlucose || {}), value: String(extracted.fastingGlucose) },
          hba1c:
            extracted.hba1c == null
              ? prev.labMarkers?.hba1c
              : { ...(prev.labMarkers?.hba1c || {}), value: String(extracted.hba1c) },
          lipids: {
            ...(prev.labMarkers?.lipids || {}),
            totalCholesterol:
              extracted.lipids.totalCholesterol == null
                ? prev.labMarkers?.lipids?.totalCholesterol
                : { ...(prev.labMarkers?.lipids?.totalCholesterol || {}), value: String(extracted.lipids.totalCholesterol) },
            ldl:
              extracted.lipids.ldl == null
                ? prev.labMarkers?.lipids?.ldl
                : { ...(prev.labMarkers?.lipids?.ldl || {}), value: String(extracted.lipids.ldl) },
            hdl:
              extracted.lipids.hdl == null
                ? prev.labMarkers?.lipids?.hdl
                : { ...(prev.labMarkers?.lipids?.hdl || {}), value: String(extracted.lipids.hdl) },
            triglycerides:
              extracted.lipids.triglycerides == null
                ? prev.labMarkers?.lipids?.triglycerides
                : { ...(prev.labMarkers?.lipids?.triglycerides || {}), value: String(extracted.lipids.triglycerides) },
          },
          source: 'ocr',
          updatedAt: new Date().toISOString(),
        },
      }))
    } catch (e) {
      setOcrError(e?.message || 'OCR failed')
    } finally {
      setOcrLoading(false)
    }
  }

  const addMedication = () => {
    if (!newMedication.name.trim()) return
    setProfile(prev => ({
      ...prev,
      medications: [...prev.medications, { ...newMedication }]
    }))
    setNewMedication({ name: '', dosage: '', schedule: '' })
  }

  const removeMedication = (index) => {
    setProfile(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }))
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'text.primary' }} />
      </Box>
    )
  }

  const tabs = ['Basic', 'Body', 'Health', 'Clinical & Diet', 'Training', 'Mind', 'Measurements', 'Composition']

  return (
    <Box sx={{ minWidth: 0, overflowX: 'hidden' }}>
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 2, sm: 3 } }}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 600, color: 'text.primary' }}>
            Your Profile
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            The more you share, the smarter your recommendations become
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {lastSaved && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Last saved: {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          )}
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
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
              bgcolor: 'text.primary',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              boxShadow: { xs: '0 8px 16px rgba(0,0,0,0.2)', sm: 'none' },
              '&:hover': { bgcolor: 'text.secondary', boxShadow: { xs: '0 8px 16px rgba(0,0,0,0.2)', sm: 'none' } },
            }}
          >
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 40,
            maxWidth: { xs: 'calc(100vw - 32px)', md: '100%' },
            '& .MuiTabs-flexContainer': { gap: 1, px: { xs: 1, sm: 0 }, pb: { xs: 1, sm: 0 } },
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 40,
              padding: '8px 16px',
              borderRadius: '20px',
              color: 'text.secondary',
              bgcolor: 'background.paper',
              border: '1px solid #e5e7eb',
              transition: 'all 0.2s ease',
              '&:hover': { color: '#1f2937', bgcolor: '#f3f4f6' },
              '&:active': { opacity: 0.7 },
              '&.Mui-selected': { color: 'background.paper', bgcolor: 'text.primary', borderColor: 'text.primary' }
            },
          }}
        >
          {tabs.map((tab) => (
            <Tab key={tab} label={tab} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ maxWidth: 600 }}>
        {/* Tab 0: Basic Info */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: 'text.primary', fontSize: 28 }}>
                {profile.name?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{profile.name || 'Your Name'}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{profile.email}</Typography>
              </Box>
            </Box>

            <TextField
              label="Full Name"
              value={profile.name}
              onChange={(e) => updateField('name', e.target.value)}
              sx={inputSx}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Age"
                type="number"
                value={profile.age}
                onChange={(e) => updateField('age', e.target.value)}
                sx={{ ...inputSx, flex: 1 }}
              />
              <TextField
                label="Gender"
                select
                SelectProps={{ native: true }}
                value={profile.gender || ''}
                onChange={(e) => updateField('gender', e.target.value)}
                sx={{ ...inputSx, flex: 1 }}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </TextField>
            </Box>

            <TextField
              label="Date of Birth"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={profile.dob}
              onChange={(e) => updateField('dob', e.target.value)}
              sx={inputSx}
            />
          </Box>
        )}

        {/* Tab 1: Body Stats */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <SectionTitle>Measurements</SectionTitle>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Height (cm)"
                type="number"
                value={profile.height}
                onChange={(e) => updateField('height', e.target.value)}
                sx={{ ...inputSx, flex: 1 }}
              />
              <TextField
                label="Weight (kg)"
                type="number"
                value={profile.weight}
                onChange={(e) => updateField('weight', e.target.value)}
                sx={{ ...inputSx, flex: 1 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Body Fat %"
                type="number"
                value={profile.bodyFat}
                onChange={(e) => updateField('bodyFat', e.target.value)}
                sx={{ ...inputSx, flex: 1 }}
              />
              <TextField
                label="Resting Heart Rate (Optional)"
                type="number"
                value={profile.restingHeartRate}
                onChange={(e) => updateField('restingHeartRate', e.target.value)}
                sx={{ ...inputSx, flex: 1 }}
              />
            </Box>
          </Box>
        )}

        {/* Tab 2: Health */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
              <SectionTitle>Health Conditions</SectionTitle>
              <ChipListInput
                items={profile.conditions}
                onChange={(items) => updateField('conditions', items)}
                placeholder="Add condition (e.g., Asthma, Diabetes)"
              />
            </Box>

            <Box>
              <SectionTitle>Allergies</SectionTitle>
              <ChipListInput
                items={profile.allergies}
                onChange={(items) => updateField('allergies', items)}
                placeholder="Add allergy"
              />
            </Box>

            <Box>
              <SectionTitle>Injuries / Physical Limitations</SectionTitle>
              <ChipListInput
                items={profile.injuries}
                onChange={(items) => updateField('injuries', items)}
                placeholder="Add injury (e.g., Lower back pain)"
              />
            </Box>

            <Box>
              <SectionTitle>Current Medications</SectionTitle>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Medicine name"
                  value={newMedication.name}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, name: e.target.value }))}
                  sx={{ ...inputSx, flex: 2 }}
                />
                <TextField
                  size="small"
                  placeholder="Dosage"
                  value={newMedication.dosage}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
                  sx={{ ...inputSx, flex: 1 }}
                />
                <TextField
                  size="small"
                  placeholder="Schedule"
                  value={newMedication.schedule}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, schedule: e.target.value }))}
                  sx={{ ...inputSx, flex: 1 }}
                />
                <IconButton onClick={addMedication} sx={{ bgcolor: 'action.selected' }}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
              {profile.medications.map((med, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ flex: 2, fontWeight: 500 }}>{med.name}</Typography>
                  <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary' }}>{med.dosage}</Typography>
                  <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary' }}>{med.schedule}</Typography>
                  <IconButton size="small" onClick={() => removeMedication(idx)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <Box>
              <SectionTitle>Supplements</SectionTitle>
              <ChipListInput
                items={profile.supplements}
                onChange={(items) => updateField('supplements', items)}
                placeholder="Add supplement (e.g., Vitamin D, Creatine)"
              />
            </Box>

            <Box>
              <SectionTitle>Key Lab Markers</SectionTitle>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Track a small set of labs that explain most fatigue, mood, recovery, and metabolic stability signals.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Hemoglobin"
                    type="number"
                    value={profile.labMarkers?.hemoglobin?.value ?? ''}
                    onChange={(e) => updateLabMarker('hemoglobin', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                  <TextField
                    label="Ferritin"
                    type="number"
                    value={profile.labMarkers?.ferritin?.value ?? ''}
                    onChange={(e) => updateLabMarker('ferritin', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Iron"
                    type="number"
                    value={profile.labMarkers?.iron?.value ?? ''}
                    onChange={(e) => updateLabMarker('iron', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                  <TextField
                    label="Vitamin B12"
                    type="number"
                    value={profile.labMarkers?.vitaminB12?.value ?? ''}
                    onChange={(e) => updateLabMarker('vitaminB12', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Vitamin D"
                    type="number"
                    value={profile.labMarkers?.vitaminD?.value ?? ''}
                    onChange={(e) => updateLabMarker('vitaminD', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                  <TextField
                    label="TSH"
                    type="number"
                    value={profile.labMarkers?.tsh?.value ?? ''}
                    onChange={(e) => updateLabMarker('tsh', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="CRP (optional)"
                    type="number"
                    value={profile.labMarkers?.crp?.value ?? ''}
                    onChange={(e) => updateLabMarker('crp', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                  <TextField
                    label="Fasting Glucose"
                    type="number"
                    value={profile.labMarkers?.fastingGlucose?.value ?? ''}
                    onChange={(e) => updateLabMarker('fastingGlucose', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="HbA1c"
                    type="number"
                    value={profile.labMarkers?.hba1c?.value ?? ''}
                    onChange={(e) => updateLabMarker('hba1c', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                  <TextField
                    label="Total Cholesterol"
                    type="number"
                    value={profile.labMarkers?.lipids?.totalCholesterol?.value ?? ''}
                    onChange={(e) => updateLipidMarker('totalCholesterol', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="LDL"
                    type="number"
                    value={profile.labMarkers?.lipids?.ldl?.value ?? ''}
                    onChange={(e) => updateLipidMarker('ldl', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                  <TextField
                    label="HDL"
                    type="number"
                    value={profile.labMarkers?.lipids?.hdl?.value ?? ''}
                    onChange={(e) => updateLipidMarker('hdl', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Triglycerides"
                    type="number"
                    value={profile.labMarkers?.lipids?.triglycerides?.value ?? ''}
                    onChange={(e) => updateLipidMarker('triglycerides', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                  <Box sx={{ flex: 1 }} />
                </Box>

                <Box sx={{ mt: 1, p: 2, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
                    Update from Lab Report (OCR)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
                    />
                    <Button
                      variant="outlined"
                      disabled={!ocrFile || ocrLoading}
                      onClick={importLabMarkersFromOcr}
                      sx={{ textTransform: 'none', borderColor: 'text.primary', color: 'text.primary', '&:hover': { borderColor: 'text.secondary' } }}
                    >
                      {ocrLoading ? 'Reading...' : 'Import from Image'}
                    </Button>
                    {ocrError ? (
                      <Typography variant="body2" sx={{ color: '#b91c1c' }}>
                        {ocrError}
                      </Typography>
                    ) : null}
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    This will auto-fill the fields above; click “Save All” to persist.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* Tab 3: Clinical & Diet */}
        {activeTab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Metabolic & Dietary Engine Profile</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                We use the scientific Mifflin-St Jeor / Katch-McArdle formulas to compute highly personalized clinical 
                caloric and deep micronutrient targets (NIH DRIs) based on these precise biological metrics.
              </Typography>

              {(() => {
                const missing = [];
                if (!profile.dob) missing.push('Date of Birth');
                if (!profile.height) missing.push('Height');
                if (!profile.weight) missing.push('Weight');
                if (!(profile.biologicalProfile?.biologicalSex || profile.gender)) missing.push('Biological Sex');
                
                if (missing.length > 0) {
                  return (
                    <Box sx={{ 
                      mb: 3, 
                      p: 2, 
                      bgcolor: '#fffbeb', 
                      border: '1px solid #fcd34d', 
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}>
                      <Box sx={{ color: '#d97706' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#92400e', fontWeight: 700 }}>
                          Missing Information for Clinical Targets
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b45309' }}>
                          Please provide: {missing.join(', ')} to calculate your personalized nutrition targets.
                        </Typography>
                      </Box>
                    </Box>
                  );
                }
                return null;
              })()}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
              <Box>
                <SectionTitle>Date of Birth</SectionTitle>
                <TextField
                  fullWidth
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={profile.dob || ''}
                  onChange={(e) => updateField('dob', e.target.value)}
                  size="small"
                  sx={inputSx}
                />
              </Box>

              <Box>
                <SectionTitle>Height (cm)</SectionTitle>
                <TextField
                  fullWidth
                  type="number"
                  value={profile.height || ''}
                  onChange={(e) => updateField('height', e.target.value)}
                  size="small"
                  sx={inputSx}
                />
              </Box>

              <Box>
                <SectionTitle>Weight (kg)</SectionTitle>
                <TextField
                  fullWidth
                  type="number"
                  value={profile.weight || ''}
                  onChange={(e) => updateField('weight', e.target.value)}
                  size="small"
                  sx={inputSx}
                />
              </Box>

              <Box>
                <SectionTitle>Body Fat %</SectionTitle>
                <TextField
                  fullWidth
                  type="number"
                  value={profile.bodyFat || ''}
                  onChange={(e) => updateField('bodyFat', e.target.value)}
                  size="small"
                  sx={inputSx}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
              <Box>
                <SectionTitle>Biological Sex</SectionTitle>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {['male', 'female'].map((val) => (
                    <Chip
                      key={val}
                      label={val.charAt(0).toUpperCase() + val.slice(1)}
                      onClick={() => {
                        updateBiologicalProfileField('biologicalSex', val)
                        if (val === 'male') {
                          updateBiologicalProfileField('pregnancyStatus', 'none')
                        }
                      }}
                      sx={{
                        flex: 1,
                        bgcolor: (profile.biologicalProfile?.biologicalSex || profile.gender) === val ? 'text.primary' : 'action.selected',
                        color: (profile.biologicalProfile?.biologicalSex || profile.gender) === val ? 'background.paper' : 'text.secondary',
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {profile.biologicalProfile?.biologicalSex === 'female' && (
              <Box>
                <SectionTitle>Pregnancy Status</SectionTitle>
                <TextField
                  fullWidth
                  select
                  SelectProps={{ native: true }}
                  value={profile.biologicalProfile?.pregnancyStatus || 'none'}
                  onChange={(e) => updateBiologicalProfileField('pregnancyStatus', e.target.value)}
                  size="small"
                >
                  <option value="none">Not Pregnant</option>
                  <option value="pregnant_trimester_1">Pregnant (1st Trimester)</option>
                  <option value="pregnant_trimester_2">Pregnant (2nd Trimester)</option>
                  <option value="pregnant_trimester_3">Pregnant (3rd Trimester)</option>
                  <option value="lactating">Lactating</option>
                </TextField>
              </Box>
              )}

              <Box>
                <SectionTitle>Hypertension History</SectionTitle>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[true, false].map((val) => (
                    <Chip
                      key={val.toString()}
                      label={val ? 'Yes (Limits Sodium)' : 'No'}
                      onClick={() => updateBiologicalProfileField('hypertension', val)}
                      sx={{
                        flex: 1,
                        bgcolor: profile.biologicalProfile?.hypertension === val ? 'text.primary' : 'action.selected',
                        color: profile.biologicalProfile?.hypertension === val ? 'background.paper' : 'text.secondary',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>

            <Box>
              <SectionTitle>Activity Level (PAL Multiplier)</SectionTitle>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  { id: 'sedentary', label: 'Sedentary (Office/No Ex.)' },
                  { id: 'lightly_active', label: 'Lightly Active (1-3 days)' },
                  { id: 'moderately_active', label: 'Moderately Active' },
                  { id: 'very_active', label: 'Very Active (Hard Ex.)' },
                  { id: 'extra_active', label: 'Extra Active (Athlete)' }
                ].map((act) => (
                  <Chip
                    key={act.id}
                    label={act.label}
                    onClick={() => updateBiologicalProfileField('activityLevel', act.id)}
                    sx={{
                      bgcolor: profile.biologicalProfile?.activityLevel === act.id ? 'text.primary' : 'action.selected',
                      color: profile.biologicalProfile?.activityLevel === act.id ? 'background.paper' : 'text.secondary',
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <SectionTitle>Metabolic Goal</SectionTitle>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  { id: 'aggressive_loss', label: 'Aggressive Loss (-1kg/wk)' },
                  { id: 'mild_loss', label: 'Mild Loss (-0.5kg/wk)' },
                  { id: 'maintenance', label: 'Maintenance' },
                  { id: 'lean_gain', label: 'Lean Muscle Gain' },
                  { id: 'aggressive_gain', label: 'Aggressive Gain (Bulking)' }
                ].map((goal) => (
                  <Chip
                    key={goal.id}
                    label={goal.label}
                    onClick={() => updateBiologicalProfileField('metabolicGoal', goal.id)}
                    sx={{
                      bgcolor: profile.biologicalProfile?.metabolicGoal === goal.id ? 'text.primary' : 'action.selected',
                      color: profile.biologicalProfile?.metabolicGoal === goal.id ? 'background.paper' : 'text.secondary',
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <SectionTitle>Dietary Preference</SectionTitle>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['omnivore', 'pescatarian', 'vegetarian', 'vegan', 'keto', 'paleo', 'jain', 'halal', 'kosher'].map((diet) => (
                  <Chip
                    key={diet}
                    label={diet.charAt(0).toUpperCase() + diet.slice(1)}        
                    onClick={() => updateBiologicalProfileField('dietaryPreference', diet)}
                    sx={{
                      bgcolor: profile.biologicalProfile?.dietaryPreference === diet ? 'text.primary' : 'action.selected',
                      color: profile.biologicalProfile?.dietaryPreference === diet ? 'background.paper' : 'text.secondary',    
                      '&:hover': { bgcolor: profile.biologicalProfile?.dietaryPreference === diet ? 'text.primary' : 'divider' },
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Meals Per Day: {profile.mealsPerDay || 3}
              </Typography>
              <Slider
                value={profile.mealsPerDay || 3}
                onChange={(e, v) => updateField('mealsPerDay', v)}
                min={1}
                max={6}
                step={1}
                sx={{ color: 'text.primary' }}
              />
            </Box>

            <Box>
              <SectionTitle>Typical Meal Schedule</SectionTitle>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Used by the Nutrition Agent to automatically assign meal times if you don't mention a specific time in your log.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                <TextField
                  label="Breakfast"
                  type="time"
                  InputLabelProps={{ shrink: true }}
                  value={profile.mealSchedule?.breakfast || '08:00'}
                  onChange={(e) => setProfile(prev => ({ ...prev, mealSchedule: { ...prev.mealSchedule, breakfast: e.target.value } }))}
                  sx={inputSx}
                  size="small"
                />
                <TextField
                  label="Lunch"
                  type="time"
                  InputLabelProps={{ shrink: true }}
                  value={profile.mealSchedule?.lunch || '13:00'}
                  onChange={(e) => setProfile(prev => ({ ...prev, mealSchedule: { ...prev.mealSchedule, lunch: e.target.value } }))}
                  sx={inputSx}
                  size="small"
                />
                <TextField
                  label="Dinner"
                  type="time"
                  InputLabelProps={{ shrink: true }}
                  value={profile.mealSchedule?.dinner || '20:00'}
                  onChange={(e) => setProfile(prev => ({ ...prev, mealSchedule: { ...prev.mealSchedule, dinner: e.target.value } }))}
                  sx={inputSx}
                  size="small"
                />
                <TextField
                  label="Snack"
                  type="time"
                  InputLabelProps={{ shrink: true }}
                  value={profile.mealSchedule?.snack || '16:00'}
                  onChange={(e) => setProfile(prev => ({ ...prev, mealSchedule: { ...prev.mealSchedule, snack: e.target.value } }))}
                  sx={inputSx}
                  size="small"
                />
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>      
                Hydration Goal: {profile.hydrationGoal} glasses/day
              </Typography>
              <Slider
                value={profile.hydrationGoal}
                onChange={(e, v) => updateField('hydrationGoal', v)}
                min={4}
                max={16}
                sx={{ color: 'text.primary' }}
              />
            </Box>

            <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', mt: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#166534', fontWeight: 700 }}>Note on DRIs</Typography>
              <Typography variant="body2" sx={{ color: '#166534', mt: 0.5 }}>
                Targets act autonomously based on these selections. Vegans will automatically see a 1.8x bump in Iron targets (due to non-heme bioavailability differences). To update BMR precisely, ensure your DOB, Height, Weight, and Body Fat% are up to date in the "Body" tab.
              </Typography>
            </Box>

            <Box>
              <SectionTitle>Foods to Avoid</SectionTitle>
              <ChipListInput
                items={profile.avoidFoods}
                onChange={(items) => updateField('avoidFoods', items)}
                placeholder="Add food to avoid"
              />
            </Box>

            <Box>
              <SectionTitle>Favorite Foods</SectionTitle>
              <ChipListInput
                items={profile.favoriteFoods}
                onChange={(items) => updateField('favoriteFoods', items)}
                placeholder="Add favorite food"
              />
            </Box>
          </Box>
        )}

        {/* Tab 4: Training */}
        {activeTab === 4 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
              <SectionTitle>Experience Level</SectionTitle>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['beginner', 'intermediate', 'advanced', 'athlete'].map((level) => (
                  <Chip
                    key={level}
                    label={level.charAt(0).toUpperCase() + level.slice(1)}
                    onClick={() => updateField('trainingExperience', level)}
                    sx={{
                      bgcolor: profile.trainingExperience === level ? 'text.primary' : 'action.selected',
                      color: profile.trainingExperience === level ? 'background.paper' : 'text.secondary',
                      '&:hover': { bgcolor: profile.trainingExperience === level ? 'text.primary' : 'divider' },
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Workouts per Week: {profile.workoutFrequency}
              </Typography>
              <Slider
                value={profile.workoutFrequency}
                onChange={(e, v) => updateField('workoutFrequency', v)}
                min={1}
                max={7}
                marks
                sx={{ color: 'text.primary' }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Typical Workout Duration: {profile.workoutDuration} min
              </Typography>
              <Slider
                value={profile.workoutDuration}
                onChange={(e, v) => updateField('workoutDuration', v)}
                min={15}
                max={120}
                step={15}
                sx={{ color: 'text.primary' }}
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={profile.gymAccess}
                  onChange={(e) => updateField('gymAccess', e.target.checked)}
                  sx={{ '& .Mui-checked': { color: 'text.primary' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: 'text.primary' } }}
                />
              }
              label="I have gym access"
            />

            <Box>
              <SectionTitle>Preferred Workouts</SectionTitle>
              <ChipListInput
                items={profile.preferredWorkouts}
                onChange={(items) => updateField('preferredWorkouts', items)}
                placeholder="Add workout type (e.g., Strength, HIIT, Yoga)"
              />
            </Box>

            <Box>
              <SectionTitle>Home Equipment</SectionTitle>
              <ChipListInput
                items={profile.homeEquipment}
                onChange={(items) => updateField('homeEquipment', items)}
                placeholder="Add equipment (e.g., Dumbbells, Pull-up bar)"
              />
            </Box>

            <Box>
              <SectionTitle>Training Goals</SectionTitle>
              <ChipListInput
                items={profile.trainingGoals}
                onChange={(items) => updateField('trainingGoals', items)}
                placeholder="Add goal (e.g., Build muscle, Lose fat)"
              />
            </Box>
          </Box>
        )}

        {/* Tab 5: Mind */}
        {activeTab === 5 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
              <SectionTitle>Chronotype (Sleep Pattern)</SectionTitle>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['early-bird', 'neutral', 'night-owl'].map((type) => (
                  <Chip
                    key={type}
                    label={type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    onClick={() => updateField('chronotype', type)}
                    sx={{
                      bgcolor: profile.chronotype === type ? 'text.primary' : 'action.selected',
                      color: profile.chronotype === type ? 'background.paper' : 'text.secondary',
                      '&:hover': { bgcolor: profile.chronotype === type ? 'text.primary' : 'divider' },
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Average Sleep: {profile.averageSleep} hours
              </Typography>
              <Slider
                value={profile.averageSleep}
                onChange={(e, v) => updateField('averageSleep', v)}
                min={4}
                max={12}
                step={0.5}
                sx={{ color: 'text.primary' }}
              />
            </Box>

            <Box>
              <SectionTitle>Default Sleep Time</SectionTitle>
              <TextField
                type="time"
                InputLabelProps={{ shrink: true }}
                value={profile.defaultSleepTime || '22:30'}
                onChange={(e) => updateField('defaultSleepTime', e.target.value)}
                sx={inputSx}
                fullWidth
              />
            </Box>

            <Box>
              <SectionTitle>Peak Energy Time</SectionTitle>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['early-morning', 'morning', 'afternoon', 'evening', 'night'].map((time) => (
                  <Chip
                    key={time}
                    label={time.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    onClick={() => updateField('energyPeakTime', time)}
                    sx={{
                      bgcolor: profile.energyPeakTime === time ? 'text.primary' : 'action.selected',
                      color: profile.energyPeakTime === time ? 'background.paper' : 'text.secondary',
                      '&:hover': { bgcolor: profile.energyPeakTime === time ? 'text.primary' : 'divider' },
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <SectionTitle>Stress Triggers</SectionTitle>
              <ChipListInput
                items={profile.stressTriggers}
                onChange={(items) => updateField('stressTriggers', items)}
                placeholder="Add trigger (e.g., Work deadlines, Poor sleep)"
              />
            </Box>

            <Box>
              <SectionTitle>What Motivates You</SectionTitle>
              <ChipListInput
                items={profile.motivators}
                onChange={(items) => updateField('motivators', items)}
                placeholder="Add motivator (e.g., Progress photos, Competitions)"
              />
            </Box>

            <Box>
              <SectionTitle>Focus Challenges</SectionTitle>
              <ChipListInput
                items={profile.focusChallenges}
                onChange={(items) => updateField('focusChallenges', items)}
                placeholder="Add challenge (e.g., Phone distractions)"
              />
            </Box>
          </Box>
        )}

        {/* Tab 6: Measurements */}
        {activeTab === 6 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(profile.bodyMeasurementLogs || []).length === 0 ? (
              <Box
                sx={{
                  py: 5,
                  px: 3,
                  textAlign: 'center',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No entries yet
                </Typography>
                <Button
                  variant="contained"
                  size="medium"
                  onClick={addMeasurementLog}
                  sx={{ textTransform: 'none', bgcolor: 'text.primary', color: 'background.paper' }}
                >
                  Add measurement
                </Button>
              </Box>
            ) : (
              <>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Entries save automatically. Expand to edit circumferences; use Composition for scans and BMI.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <SectionTitle sx={{ mb: 0 }}>Measurement log</SectionTitle>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={addMeasurementLog}
                    sx={{ textTransform: 'none', borderColor: 'text.primary', color: 'text.primary' }}
                  >
                    Add measurement
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {(profile.bodyMeasurementLogs || []).map((entry, idx) => (
                    <Chip
                      key={`${entry?.updatedAt || 'entry'}-${idx}`}
                      label={getMeasurementLogLabel(entry, idx)}
                      onClick={() => selectMeasurementLog(idx)}
                      sx={{
                        bgcolor: idx === selectedMeasurementLogIndex ? 'text.primary' : 'action.selected',
                        color: idx === selectedMeasurementLogIndex ? 'background.paper' : 'text.secondary',
                      }}
                    />
                  ))}
                </Box>

                <Accordion
                  defaultExpanded={true}
                  elevation={0}
                  sx={{ border: '1px solid #e5e7eb', borderRadius: 1, '&:before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Circumferences
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="Waist (cm)"
                        type="number"
                        value={activeMeasurementLog?.waistCm ?? ''}
                        onChange={(e) => updateMeasurementLogField('waistCm', e.target.value)}
                        sx={{ ...inputSx, flex: 1 }}
                      />
                      <TextField
                        label="Hip (cm)"
                        type="number"
                        value={activeMeasurementLog?.hipCm ?? ''}
                        onChange={(e) => updateMeasurementLogField('hipCm', e.target.value)}
                        sx={{ ...inputSx, flex: 1 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="Chest (cm)"
                        type="number"
                        value={activeMeasurementLog?.chestCm ?? ''}
                        onChange={(e) => updateMeasurementLogField('chestCm', e.target.value)}
                        sx={{ ...inputSx, flex: 1 }}
                      />
                      <TextField
                        label="Neck (cm)"
                        type="number"
                        value={activeMeasurementLog?.neckCm ?? ''}
                        onChange={(e) => updateMeasurementLogField('neckCm', e.target.value)}
                        sx={{ ...inputSx, flex: 1 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="Wrist (cm)"
                        type="number"
                        value={activeMeasurementLog?.wristCm ?? ''}
                        onChange={(e) => updateMeasurementLogField('wristCm', e.target.value)}
                        sx={{ ...inputSx, flex: 1 }}
                      />
                      <TextField
                        label="Bicep (cm)"
                        type="number"
                        value={activeMeasurementLog?.bicepCm ?? ''}
                        onChange={(e) => updateMeasurementLogField('bicepCm', e.target.value)}
                        sx={{ ...inputSx, flex: 1 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TextField
                        label="Thigh (cm)"
                        type="number"
                        value={activeMeasurementLog?.thighCm ?? ''}
                        onChange={(e) => updateMeasurementLogField('thighCm', e.target.value)}
                        sx={{ ...inputSx, flex: 1, maxWidth: { xs: '100%', sm: 'calc(50% - 8px)' } }}
                      />
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => removeMeasurementLog(selectedMeasurementLogIndex)}
                        startIcon={<DeleteOutlineIcon />}
                        sx={{ textTransform: 'none', ml: 'auto' }}
                      >
                        Delete Log
                      </Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </>
            )}
          </Box>
        )}

        {/* Tab 7: Composition */}
        {activeTab === 7 && (
          <BodyCompositionTab
            profile={profile}
            selectedCompositionLogIndex={selectedCompositionLogIndex}
            activeCompositionLog={activeCompositionLog}
            addCompositionLog={addCompositionLog}
            selectCompositionLog={selectCompositionLog}
            removeCompositionLog={removeCompositionLog}
            getCompositionLogLabel={getCompositionLogLabel}
            bodyCompOcrFile={bodyCompOcrFile}
            setBodyCompOcrFile={setBodyCompOcrFile}
            bodyCompOcrLoading={bodyCompOcrLoading}
            importBodyCompositionFromOcr={importBodyCompositionFromOcr}
            bodyCompOcrError={bodyCompOcrError}
            updateBodyCompositionField={updateBodyCompositionField}
            updateBodyCompositionSegmental={updateBodyCompositionSegmental}
          />
        )}

        {/* Tab 8: Personality */}
        {activeTab === 8 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
              <SectionTitle>Introvert / Extrovert</SectionTitle>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                {profile.personality?.introversion ?? 5}/10
              </Typography>
              <Slider
                value={Number(profile.personality?.introversion ?? 5)}
                onChange={(e, v) => updatePersonalityField('introversion', v)}
                min={1}
                max={10}
                sx={{ color: 'text.primary' }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>More introvert</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>More extrovert</Typography>
              </Box>
            </Box>

            <Box>
              <SectionTitle>Big Five traits (optional)</SectionTitle>
              {([
                ['openness', 'Openness'],
                ['conscientiousness', 'Conscientiousness'],
                ['extraversion', 'Extraversion'],
                ['agreeableness', 'Agreeableness'],
                ['neuroticism', 'Neuroticism'],
              ]).map(([key, label]) => (
                <Box key={key} sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
                    {label}: {Number(profile.personality?.bigFive?.[key] ?? 5)}/10
                  </Typography>
                  <Slider
                    value={Number(profile.personality?.bigFive?.[key] ?? 5)}
                    onChange={(e, v) => updateBigFiveField(key, v)}
                    min={1}
                    max={10}
                    sx={{ color: 'text.primary' }}
                  />
                </Box>
              ))}
            </Box>

            <Box>
              <SectionTitle>Decision-making style</SectionTitle>
              <TextField
                label="Decision-making style"
                value={profile.personality?.decisionStyle ?? ''}
                onChange={(e) => updatePersonalityField('decisionStyle', e.target.value)}
                placeholder="e.g., Analytical, Intuitive, Fast-iterative, Consensus-driven"
                sx={inputSx}
              />
            </Box>
          </Box>
        )}

      </Box>
    </Box>
  )
}

export default ProfilePanel

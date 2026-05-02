import { useState, useEffect } from 'react'
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
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'
import ChipListInput from './ChipListInput'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'divider' },
    '&:hover fieldset': { borderColor: '#d1d5db' },
    '&.Mui-focused fieldset': { borderColor: 'text.primary' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: 'text.primary' },
}

const SectionTitle = ({ children }) => (
  <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
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
      bmi: '',
      updatedAt: '',
      source: 'manual',
    },
    bodyMeasurementLogs: [],

    // Body Composition (OCR / manual)
    bodyComposition: {
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
      segmentalFatPercent: {
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
        // Merge loaded data with defaults
        setProfile(prev => ({
          ...prev,
          ...data,
          gender: data.gender || data.biologicalProfile?.biologicalSex || prev.gender,
          height: data.height || data.biologicalProfile?.heightCm || prev.height,
          weight: data.weight || data.biologicalProfile?.weightKg || prev.weight,
          bodyFat: data.bodyFat || data.biologicalProfile?.bodyFatPercentage || prev.bodyFat,
          dob: data.biologicalProfile?.dob ? data.biologicalProfile.dob.split('T')[0] : (data.dob ? data.dob.split('T')[0] : prev.dob),
          defaultSleepTime: data.biologicalProfile?.defaultSleepTime || prev.defaultSleepTime,
          // Ensure arrays are arrays
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

          bodyComposition: {
            ...prev.bodyComposition,
            ...(data.bodyComposition || {}),
            segmentalFatKg: {
              ...prev.bodyComposition.segmentalFatKg,
              ...(data.bodyComposition?.segmentalFatKg || {}),
            },
            segmentalFatPercent: {
              ...prev.bodyComposition.segmentalFatPercent,
              ...(data.bodyComposition?.segmentalFatPercent || {}),
            },
            segmentalMuscleKg: {
              ...prev.bodyComposition.segmentalMuscleKg,
              ...(data.bodyComposition?.segmentalMuscleKg || {}),
            },
          },
        }))
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

    const normalizeMeasurementsForSave = (m) => {
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
        bmi: toNum(m?.bmi),
      }

      const hasAnyNumeric = Object.values(numeric).some((v) => v !== undefined)
      if (!hasAnyNumeric) return undefined

      const out = {
        ...numeric,
        source: m?.source || 'manual',
        updatedAt: m?.updatedAt ? new Date(m.updatedAt) : new Date(),
      }

      const pruned = {}
      for (const [k, v] of Object.entries(out)) {
        if (v !== undefined) pruned[k] = v
      }
      return pruned
    }

    const normalizeMeasurementLogsForSave = (logs) => {
      if (!Array.isArray(logs)) return []
      return logs
        .map((m) => normalizeMeasurementsForSave(m))
        .filter(Boolean)
    }

    const normalizeBodyCompositionForSave = (c) => {
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
      if (!hasAnyNumeric && !hasAnySegmental) return undefined

      const out = {
        ...numeric,
        ...(segmentalFatKg ? { segmentalFatKg } : {}),
        ...(segmentalFatPercent ? { segmentalFatPercent } : {}),
        ...(segmentalMuscleKg ? { segmentalMuscleKg } : {}),
        source: c?.source || 'manual',
        updatedAt: c?.updatedAt ? new Date(c.updatedAt) : new Date(),
      }

      const pruned = {}
      for (const [k, v] of Object.entries(out)) {
        if (v !== undefined) pruned[k] = v
      }
      return pruned
    }

    try {
      const bodyMeasurementsPayload = normalizeMeasurementsForSave(profile.bodyMeasurements)
      const bodyMeasurementLogsPayload = normalizeMeasurementLogsForSave(profile.bodyMeasurementLogs)
      const bodyCompositionPayload = normalizeBodyCompositionForSave(profile.bodyComposition)
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
    setProfile(prev => {
      const logs = Array.isArray(prev.bodyMeasurementLogs) ? [...prev.bodyMeasurementLogs] : []
      const newLog = {
        waistCm: '',
        hipCm: '',
        chestCm: '',
        neckCm: '',
        wristCm: '',
        bicepCm: '',
        thighCm: '',
        bmi: '',
        source: 'manual',
        updatedAt: new Date().toISOString(),
      }
      logs.unshift(newLog)
      return {
        ...prev,
        bodyMeasurementLogs: logs,
        bodyMeasurements: newLog,
      }
    })
    setSelectedMeasurementLogIndex(0)
  }

  const selectMeasurementLog = (idx) => {
    setSelectedMeasurementLogIndex(idx)
    setProfile(prev => {
      const logs = Array.isArray(prev.bodyMeasurementLogs) ? prev.bodyMeasurementLogs : []
      const selected = logs[idx] || null
      if (!selected) return prev
      return {
        ...prev,
        bodyMeasurements: { ...selected },
      }
    })
  }

  const updateMeasurementLogField = (field, value) => {
    setProfile(prev => {
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
  }

  const getMeasurementLogLabel = (entry, idx) => {
    const dt = entry?.updatedAt ? new Date(entry.updatedAt) : null
    const fallback = `Entry ${idx + 1}`
    if (!dt || Number.isNaN(dt.getTime())) return fallback
    return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const updateBodyCompositionField = (field, value) => {
    setProfile(prev => ({
      ...prev,
      bodyComposition: {
        ...(prev.bodyComposition || {}),
        [field]: value,
        source: 'manual',
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const updateBodyCompositionSegmental = (group, key, value) => {
    setProfile(prev => ({
      ...prev,
      bodyComposition: {
        ...(prev.bodyComposition || {}),
        [group]: {
          ...((prev.bodyComposition || {})[group] || {}),
          [key]: value,
        },
        source: 'manual',
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const parseBodyCompositionFromOcrText = (rawText) => {
    const text = String(rawText || '')
      .replace(/\r/g, '\n')
      .replace(/[\t\u00A0]+/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const flat = text.replace(/\s+/g, ' ')

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
      const after = flat.slice(m.index + m[0].length, m.index + m[0].length + 80)
      const n = after.match(/(-?\d+(?:[\.,]\d+)?)/)
      return n ? toNum(n[1]) : null
    }

    const heightCm =
      pick(/\bheight\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*cm\b/i, flat) ||
      pick(/\bheight\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i, flat)

    const weightKg =
      pick(/\bweight\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i, flat) ||
      pick(/\bweight\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i, flat)

    const bmi = pick(/\bBMI\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i)
    const bodyFatPercent =
      pick(/\bPBF\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*%/i) ||
      pick(/percent\s*body\s*fat\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*%?/i) ||
      pick(/body\s*fat\s*(?:%|percentage)\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i)

    const fatMassKg =
      pick(/\bbody\s*fat\s*mass\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
      pick(/\bfat\s*mass\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
      pick(/\bbody\s*fat\s*mass\b\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i)

    const smmKg =
      pick(/\bSMM\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
      pick(/skeletal\s*muscle\s*mass\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i)

    const proteinKg = pick(/\bprotein\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i)
    const mineralKg =
      pick(/\bminerals?\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
      pick(/\bbone\s*mineral\s*content\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i)

    const tbwKg =
      pick(/\bTBW\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
      pick(/\bTBW\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:l|liters?)\b/i) ||
      pick(/total\s*body\s*water\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs|l)\b/i)

    const bmrKcal =
      pick(/\bBMR\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kcal|kcals)?\b/i) ||
      pick(/basal\s*metabolic\s*rate\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i)

    const metabolicAge =
      pick(/metabolic\s*age\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i) ||
      pick(/\bage\b\s*\(\s*metabolic\s*\)\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i)

    const visceralFatLevel =
      pick(/visceral\s*fat\s*(?:level|rating)?\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i) ||
      pick(/\bVFL\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i)

    const segmentalFromBlock = (headerRegex) => {
      const m = text.match(headerRegex)
      if (!m || m.index == null) return null
      const startIdx = m.index
      const slice = text.slice(startIdx, startIdx + 900)
      const endIdx = slice.search(/\n\s*(TBW\b|Body\s*Composition|InBody\b|Weight\b|BMR\b)\s*/i)
      const block = (endIdx > 30 ? slice.slice(0, endIdx) : slice)

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
          rightArm: armsSorted[0].v,
          leftArm: armsSorted[1].v,
          trunk: trunk.v,
          rightLeg: legsSorted[0].v,
          leftLeg: legsSorted[1].v,
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

      setProfile(prev => ({
        ...prev,
        height: extracted?.heightCm == null ? prev.height : String(Math.round(extracted.heightCm)),
        weight: extracted?.weightKg == null ? prev.weight : String(extracted.weightKg),
        bodyComposition: {
          ...(prev.bodyComposition || {}),
          ...(extracted || {}),
          segmentalFatKg: {
            ...(prev.bodyComposition?.segmentalFatKg || {}),
            ...(extracted?.segmentalFatKg || {}),
          },
          segmentalFatPercent: {
            ...(prev.bodyComposition?.segmentalFatPercent || {}),
            ...(extracted?.segmentalFatPercent || {}),
          },
          segmentalMuscleKg: {
            ...(prev.bodyComposition?.segmentalMuscleKg || {}),
            ...(extracted?.segmentalMuscleKg || {}),
          },
          source: 'ocr',
          updatedAt: new Date().toISOString(),
        },
      }))
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

  const tabs = ['Basic', 'Body', 'Health', 'Clinical & Diet', 'Training', 'Mind', 'Measurements', 'Personality']

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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Log measurements by date. Add a new entry, then click any previous date to view or edit all fields.
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <SectionTitle>Measurement Log</SectionTitle>
              <Button
                variant="outlined"
                size="small"
                onClick={addMeasurementLog}
                sx={{ textTransform: 'none', borderColor: 'text.primary', color: 'text.primary' }}
              >
                + Add Measurement
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

            {(profile.bodyMeasurementLogs || []).length === 0 && (
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                No measurements logged yet. Click "Add Measurement" to create your first entry.
              </Typography>
            )}

            {(profile.bodyMeasurementLogs || []).length > 0 && (
              <>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Waist (cm)"
                    type="number"
                    value={profile.bodyMeasurements?.waistCm ?? ''}
                    onChange={(e) => updateMeasurementLogField('waistCm', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                  <TextField
                    label="Hip (cm)"
                    type="number"
                    value={profile.bodyMeasurements?.hipCm ?? ''}
                    onChange={(e) => updateMeasurementLogField('hipCm', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Chest (cm)"
                    type="number"
                    value={profile.bodyMeasurements?.chestCm ?? ''}
                    onChange={(e) => updateMeasurementLogField('chestCm', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                  <TextField
                    label="Neck (cm)"
                    type="number"
                    value={profile.bodyMeasurements?.neckCm ?? ''}
                    onChange={(e) => updateMeasurementLogField('neckCm', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Wrist (cm)"
                    type="number"
                    value={profile.bodyMeasurements?.wristCm ?? ''}
                    onChange={(e) => updateMeasurementLogField('wristCm', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                  <TextField
                    label="Bicep (cm)"
                    type="number"
                    value={profile.bodyMeasurements?.bicepCm ?? ''}
                    onChange={(e) => updateMeasurementLogField('bicepCm', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Thigh (cm)"
                    type="number"
                    value={profile.bodyMeasurements?.thighCm ?? ''}
                    onChange={(e) => updateMeasurementLogField('thighCm', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                  <TextField
                    label="BMI"
                    type="number"
                    value={profile.bodyMeasurements?.bmi ?? ''}
                    onChange={(e) => updateMeasurementLogField('bmi', e.target.value)}
                    sx={{ ...inputSx, flex: 1 }}
                  />
                </Box>
              </>
            )}

            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
                Body Composition (OCR)
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Upload an InBody/Tanita/ACCUNIQ-style report (image or PDF). This fills Protein, SMM, Visceral Fat, Segmental Fat, etc.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setBodyCompOcrFile(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outlined"
                  disabled={!bodyCompOcrFile || bodyCompOcrLoading}
                  onClick={importBodyCompositionFromOcr}
                  sx={{ textTransform: 'none', borderColor: 'text.primary', color: 'text.primary', '&:hover': { borderColor: 'text.secondary' } }}
                >
                  {bodyCompOcrLoading ? 'Reading…' : 'Import Body Scan'}
                </Button>
                {bodyCompOcrError ? (
                  <Typography variant="body2" sx={{ color: '#b91c1c' }}>
                    {bodyCompOcrError}
                  </Typography>
                ) : null}
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Protein (kg)"
                  type="number"
                  value={profile.bodyComposition?.proteinKg ?? ''}
                  onChange={(e) => updateBodyCompositionField('proteinKg', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="SMM (kg)"
                  type="number"
                  value={profile.bodyComposition?.smmKg ?? ''}
                  onChange={(e) => updateBodyCompositionField('smmKg', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Body Fat (%)"
                  type="number"
                  value={profile.bodyComposition?.bodyFatPercent ?? ''}
                  onChange={(e) => updateBodyCompositionField('bodyFatPercent', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Fat Mass (kg)"
                  type="number"
                  value={profile.bodyComposition?.fatMassKg ?? ''}
                  onChange={(e) => updateBodyCompositionField('fatMassKg', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Visceral Fat"
                  type="number"
                  value={profile.bodyComposition?.visceralFatLevel ?? ''}
                  onChange={(e) => updateBodyCompositionField('visceralFatLevel', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="TBW (kg)"
                  type="number"
                  value={profile.bodyComposition?.tbwKg ?? ''}
                  onChange={(e) => updateBodyCompositionField('tbwKg', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Mineral (kg)"
                  type="number"
                  value={profile.bodyComposition?.mineralKg ?? ''}
                  onChange={(e) => updateBodyCompositionField('mineralKg', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="BMR (kcal)"
                  type="number"
                  value={profile.bodyComposition?.bmrKcal ?? ''}
                  onChange={(e) => updateBodyCompositionField('bmrKcal', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Metabolic Age"
                  type="number"
                  value={profile.bodyComposition?.metabolicAge ?? ''}
                  onChange={(e) => updateBodyCompositionField('metabolicAge', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="BMI"
                  type="number"
                  value={profile.bodyComposition?.bmi ?? ''}
                  onChange={(e) => updateBodyCompositionField('bmi', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
                Segmental Fat
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Right Arm (kg)"
                  type="number"
                  value={profile.bodyComposition?.segmentalFatKg?.rightArm ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'rightArm', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Left Arm (kg)"
                  type="number"
                  value={profile.bodyComposition?.segmentalFatKg?.leftArm ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'leftArm', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Trunk (kg)"
                  type="number"
                  value={profile.bodyComposition?.segmentalFatKg?.trunk ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'trunk', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Right Leg (kg)"
                  type="number"
                  value={profile.bodyComposition?.segmentalFatKg?.rightLeg ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'rightLeg', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Left Leg (kg)"
                  type="number"
                  value={profile.bodyComposition?.segmentalFatKg?.leftLeg ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'leftLeg', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                <TextField
                  label="Right Arm (%)"
                  type="number"
                  value={profile.bodyComposition?.segmentalFatPercent?.rightArm ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalFatPercent', 'rightArm', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Left Arm (%)"
                  type="number"
                  value={profile.bodyComposition?.segmentalFatPercent?.leftArm ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalFatPercent', 'leftArm', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Trunk (%)"
                  type="number"
                  value={profile.bodyComposition?.segmentalFatPercent?.trunk ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalFatPercent', 'trunk', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Right Leg (%)"
                  type="number"
                  value={profile.bodyComposition?.segmentalFatPercent?.rightLeg ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalFatPercent', 'rightLeg', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Left Leg (%)"
                  type="number"
                  value={profile.bodyComposition?.segmentalFatPercent?.leftLeg ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalFatPercent', 'leftLeg', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
                Segmental Muscle (kg)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Right Arm (kg)"
                  type="number"
                  value={profile.bodyComposition?.segmentalMuscleKg?.rightArm ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'rightArm', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Left Arm (kg)"
                  type="number"
                  value={profile.bodyComposition?.segmentalMuscleKg?.leftArm ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'leftArm', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Trunk (kg)"
                  type="number"
                  value={profile.bodyComposition?.segmentalMuscleKg?.trunk ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'trunk', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Right Leg (kg)"
                  type="number"
                  value={profile.bodyComposition?.segmentalMuscleKg?.rightLeg ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'rightLeg', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
                <TextField
                  label="Left Leg (kg)"
                  type="number"
                  value={profile.bodyComposition?.segmentalMuscleKg?.leftLeg ?? ''}
                  onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'leftLeg', e.target.value)}
                  sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                />
              </Box>

              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
                Click “Save All” to persist.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Tab 7: Personality */}
        {activeTab === 7 && (
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

        {/* Tab 8 removed entirely */}
      </Box>
    </Box>
  )
}

export default ProfilePanel

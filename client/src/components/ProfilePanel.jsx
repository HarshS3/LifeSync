import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

// Sub-components
import BasicInfoTab from './Profile/BasicInfoTab'
import BodyStatsTab from './Profile/BodyStatsTab'
import HealthTab from './Profile/HealthTab'
import ClinicalDietTab from './Profile/ClinicalDietTab'
import TrainingTab from './Profile/TrainingTab'
import MindTab from './Profile/MindTab'
import MeasurementsTab from './Profile/MeasurementsTab'
import PersonalityTab from './Profile/PersonalityTab'

// Helpers
import { parseMarkersFromOcrText, parseBodyCompositionFromOcrText } from '../lib/profileHelpers'

// Global cache to prevent re-fetching on tab switch
let profileCache = {
  data: null,
  token: null
}

function ProfilePanel() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    bodyFat: '',
    restingHeartRate: '',
    dob: '',
    mealsPerDay: 3,
    hydrationGoal: 8,
    conditions: [],
    allergies: [],
    injuries: [],
    medications: [],
    supplements: [],
    avoidFoods: [],
    favoriteFoods: [],
    trainingExperience: 'beginner',
    workoutFrequency: 3,
    workoutDuration: 60,
    gymAccess: true,
    preferredWorkouts: [],
    homeEquipment: [],
    trainingGoals: [],
    chronotype: 'neutral',
    averageSleep: 7,
    defaultSleepTime: '22:30',
    energyPeakTime: 'morning',
    stressTriggers: [],
    motivators: [],
    focusChallenges: [],
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
    },
    biologicalProfile: {
      biologicalSex: '',
      pregnancyStatus: 'none',
      hypertension: false,
      activityLevel: 'moderately_active',
      metabolicGoal: 'maintenance',
      dietaryPreference: 'omnivore',
    },
    mealSchedule: {
      breakfast: '08:00',
      lunch: '13:00',
      dinner: '20:00',
      snack: '16:00',
    },
    labMarkers: {
      hemoglobin: { value: '', unit: 'g/dL' },
      ferritin: { value: '', unit: 'ng/mL' },
      iron: { value: '', unit: 'µg/dL' },
      vitaminB12: { value: '', unit: 'pg/mL' },
      vitaminD: { value: '', unit: 'ng/mL' },
      tsh: { value: '', unit: 'mIU/L' },
      crp: { value: '', unit: 'mg/L' },
      fastingGlucose: { value: '', unit: 'mg/dL' },
      hba1c: { value: '', unit: '%' },
      lipids: {
        totalCholesterol: { value: '', unit: 'mg/dL' },
        ldl: { value: '', unit: 'mg/dL' },
        hdl: { value: '', unit: 'mg/dL' },
        triglycerides: { value: '', unit: 'mg/dL' },
      },
      source: 'manual',
      updatedAt: null,
    },
    bodyMeasurements: {
      waistCm: '',
      hipCm: '',
      chestCm: '',
      neckCm: '',
      wristCm: '',
      bicepCm: '',
      thighCm: '',
      bmi: '',
      source: 'manual',
      updatedAt: null,
    },
    bodyMeasurementLogs: [],
    bodyComposition: {
      proteinKg: '',
      smmKg: '',
      bodyFatPercent: '',
      fatMassKg: '',
      visceralFatLevel: '',
      tbwKg: '',
      mineralKg: '',
      bmrKcal: '',
      metabolicAge: '',
      bmi: '',
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
      source: 'manual',
      updatedAt: null,
    },
  })

  // Local state for forms and OCR
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '', schedule: '' })
  const [ocrFile, setOcrFile] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [bodyCompOcrFile, setBodyCompOcrFile] = useState(null)
  const [bodyCompOcrLoading, setBodyCompOcrLoading] = useState(false)
  const [bodyCompOcrError, setBodyCompOcrError] = useState('')
  const [selectedMeasurementLogIndex, setSelectedMeasurementLogIndex] = useState(0)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return

      // Check cache first
      if (profileCache.data && profileCache.token === token) {
        setProfile(profileCache.data)
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
            const merged = { ...prev, ...data }
            // Update cache
            profileCache.data = merged
            profileCache.token = token
            return merged
          })
          // If logs exist, select the first one (most recent usually)
          if (data.bodyMeasurementLogs?.length > 0) {
            setSelectedMeasurementLogIndex(0)
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [token])

  const updateField = (field, value) => {
    setProfile(prev => {
      const updated = { ...prev, [field]: value }
      // Optimistic cache update
      profileCache.data = updated
      return updated
    })
  }

  const updateBiologicalProfileField = (field, value) => {
    setProfile(prev => ({
      ...prev,
      biologicalProfile: {
        ...(prev.biologicalProfile || {}),
        [field]: value
      }
    }))
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

  const updatePersonalityField = (field, value) => {
    setProfile(prev => ({
      ...prev,
      personality: {
        ...(prev.personality || {}),
        [field]: value
      }
    }))
  }

  const updateBigFiveField = (trait, value) => {
    setProfile(prev => ({
      ...prev,
      personality: {
        ...(prev.personality || {}),
        bigFive: {
          ...(prev.personality?.bigFive || {}),
          [trait]: value
        }
      }
    }))
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

  const addMeasurementLog = () => {
    setProfile(prev => {
      const newEntry = {
        ...prev.bodyMeasurements,
        updatedAt: new Date().toISOString(),
        source: 'manual'
      }
      const newLogs = [newEntry, ...(prev.bodyMeasurementLogs || [])]
      return {
        ...prev,
        bodyMeasurementLogs: newLogs,
      }
    })
    setSelectedMeasurementLogIndex(0)
    toast.success('New measurement entry created')
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
      if (!res.ok) throw new Error(payload?.error || 'OCR failed')

      const extracted = parseMarkersFromOcrText(payload?.text || '')
      setProfile(prev => ({
        ...prev,
        labMarkers: {
          ...(prev.labMarkers || {}),
          hemoglobin: extracted.hemoglobin == null ? prev.labMarkers?.hemoglobin : { ...(prev.labMarkers?.hemoglobin || {}), value: String(extracted.hemoglobin) },
          ferritin: extracted.ferritin == null ? prev.labMarkers?.ferritin : { ...(prev.labMarkers?.ferritin || {}), value: String(extracted.ferritin) },
          iron: extracted.iron == null ? prev.labMarkers?.iron : { ...(prev.labMarkers?.iron || {}), value: String(extracted.iron) },
          vitaminB12: extracted.vitaminB12 == null ? prev.labMarkers?.vitaminB12 : { ...(prev.labMarkers?.vitaminB12 || {}), value: String(extracted.vitaminB12) },
          vitaminD: extracted.vitaminD == null ? prev.labMarkers?.vitaminD : { ...(prev.labMarkers?.vitaminD || {}), value: String(extracted.vitaminD) },
          tsh: extracted.tsh == null ? prev.labMarkers?.tsh : { ...(prev.labMarkers?.tsh || {}), value: String(extracted.tsh) },
          crp: extracted.crp == null ? prev.labMarkers?.crp : { ...(prev.labMarkers?.crp || {}), value: String(extracted.crp) },
          fastingGlucose: extracted.fastingGlucose == null ? prev.labMarkers?.fastingGlucose : { ...(prev.labMarkers?.fastingGlucose || {}), value: String(extracted.fastingGlucose) },
          hba1c: extracted.hba1c == null ? prev.labMarkers?.hba1c : { ...(prev.labMarkers?.hba1c || {}), value: String(extracted.hba1c) },
          lipids: {
            ...(prev.labMarkers?.lipids || {}),
            totalCholesterol: extracted.lipids.totalCholesterol == null ? prev.labMarkers?.lipids?.totalCholesterol : { ...(prev.labMarkers?.lipids?.totalCholesterol || {}), value: String(extracted.lipids.totalCholesterol) },
            ldl: extracted.lipids.ldl == null ? prev.labMarkers?.lipids?.ldl : { ...(prev.labMarkers?.lipids?.ldl || {}), value: String(extracted.lipids.ldl) },
            hdl: extracted.lipids.hdl == null ? prev.labMarkers?.lipids?.hdl : { ...(prev.labMarkers?.lipids?.hdl || {}), value: String(extracted.lipids.hdl) },
            triglycerides: extracted.lipids.triglycerides == null ? prev.labMarkers?.lipids?.triglycerides : { ...(prev.labMarkers?.lipids?.triglycerides || {}), value: String(extracted.lipids.triglycerides) },
          },
          source: 'ocr',
          updatedAt: new Date().toISOString(),
        },
      }))
      toast.success('Lab markers imported from report')
    } catch (e) {
      setOcrError(e?.message || 'OCR failed')
    } finally {
      setOcrLoading(false)
    }
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
          segmentalFatKg: { ...(prev.bodyComposition?.segmentalFatKg || {}), ...(extracted?.segmentalFatKg || {}) },
          segmentalFatPercent: { ...(prev.bodyComposition?.segmentalFatPercent || {}), ...(extracted?.segmentalFatPercent || {}) },
          segmentalMuscleKg: { ...(prev.bodyComposition?.segmentalMuscleKg || {}), ...(extracted?.segmentalMuscleKg || {}) },
          source: 'ocr',
          updatedAt: new Date().toISOString(),
        },
      }))
      toast.success('Body composition data imported')
    } catch (e) {
      setBodyCompOcrError(e?.message || 'OCR failed')
    } finally {
      setBodyCompOcrLoading(false)
    }
  }

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      })
      if (res.ok) {
        toast.success('Profile updated successfully')
        // Update cache
        profileCache.data = profile
        profileCache.token = token
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update profile')
      }
    } catch (err) {
      toast.error('Connection error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#171717' }} />
      </Box>
    )
  }

  const tabs = ['Basic', 'Body', 'Health', 'Clinical & Diet', 'Training', 'Mind', 'Measurements', 'Personality']

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 600, color: '#171717' }}>
            Your Profile
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            The more you share, the smarter your recommendations become
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{
            bgcolor: '#171717',
            color: '#fff',
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            '&:hover': { bgcolor: '#374151' },
          }}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, minWidth: 100, color: '#6b7280' },
            '& .Mui-selected': { color: '#171717 !important' },
            '& .MuiTabs-indicator': { bgcolor: '#171717' },
          }}
        >
          {tabs.map((label, idx) => (
            <Tab key={idx} label={label} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ minHeight: 400 }}>
        {activeTab === 0 && <BasicInfoTab profile={profile} updateField={updateField} />}
        {activeTab === 1 && <BodyStatsTab profile={profile} updateField={updateField} />}
        {activeTab === 2 && (
          <HealthTab
            profile={profile}
            updateField={updateField}
            newMedication={newMedication}
            setNewMedication={setNewMedication}
            addMedication={addMedication}
            removeMedication={removeMedication}
            updateLabMarker={updateLabMarker}
            updateLipidMarker={updateLipidMarker}
            ocrFile={ocrFile}
            setOcrFile={setOcrFile}
            ocrLoading={ocrLoading}
            ocrError={ocrError}
            importLabMarkersFromOcr={importLabMarkersFromOcr}
          />
        )}
        {activeTab === 3 && (
          <ClinicalDietTab
            profile={profile}
            updateField={updateField}
            updateBiologicalProfileField={updateBiologicalProfileField}
            setProfile={setProfile}
          />
        )}
        {activeTab === 4 && <TrainingTab profile={profile} updateField={updateField} />}
        {activeTab === 5 && <MindTab profile={profile} updateField={updateField} />}
        {activeTab === 6 && (
          <MeasurementsTab
            profile={profile}
            addMeasurementLog={addMeasurementLog}
            getMeasurementLogLabel={getMeasurementLogLabel}
            selectMeasurementLog={selectMeasurementLog}
            selectedMeasurementLogIndex={selectedMeasurementLogIndex}
            updateMeasurementLogField={updateMeasurementLogField}
            bodyCompOcrFile={bodyCompOcrFile}
            setBodyCompOcrFile={setBodyCompOcrFile}
            bodyCompOcrLoading={bodyCompOcrLoading}
            importBodyCompositionFromOcr={importBodyCompositionFromOcr}
            bodyCompOcrError={bodyCompOcrError}
            updateBodyCompositionField={updateBodyCompositionField}
            updateBodyCompositionSegmental={updateBodyCompositionSegmental}
          />
        )}
        {activeTab === 7 && (
          <PersonalityTab
            profile={profile}
            updatePersonalityField={updatePersonalityField}
            updateBigFiveField={updateBigFiveField}
          />
        )}
      </Box>
    </Box>
  )
}

export default ProfilePanel

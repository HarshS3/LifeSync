import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Slider from '@mui/material/Slider'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MedicationIcon from '@mui/icons-material/Medication'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'
import JournalPanel from './JournalPanel'

function DailyLogPanel() {
  const { user, token } = useAuth()
  const [mentalData, setMentalData] = useState({
    mood: 5,
    energy: 5,
    bodyFeel: 5,
    stress: 5,
    sleep: 7,
    sleepQuality: 7,
    restingHeartRate: 65,
    notes: '',
    medsTaken: [],
    bloating: 0,
    digestionQuality: 5,
  })
  const [journal, setJournal] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const [checkinLoaded, setCheckinLoaded] = useState(false)

  // Get user's medications from profile
  const userMedications = user?.medications || []

  const toggleMedTaken = (medName) => {
    setMentalData(prev => ({
      ...prev,
      medsTaken: prev.medsTaken.includes(medName)
        ? prev.medsTaken.filter(m => m !== medName)
        : [...prev.medsTaken, medName]
    }))
  }

  const applyMentalLogToForm = (log) => {
    if (!log) return
    setMentalData(prev => ({
      ...prev,
      mood: Number(log.moodScore ?? log.mood ?? prev.mood) || prev.mood,
      energy: Number(log.energyLevel ?? prev.energy) || prev.energy,
      bodyFeel: Number(log.bodyFeel ?? prev.bodyFeel) || prev.bodyFeel,
      stress: Number(log.stressLevel ?? prev.stress) || prev.stress,
      sleep: Number(log.sleepHours ?? prev.sleep) || prev.sleep,
      sleepQuality: Number(log.sleepQuality ?? prev.sleepQuality) || prev.sleepQuality,
      restingHeartRate: Number(log.restingHeartRate ?? prev.restingHeartRate) || prev.restingHeartRate,
      notes: typeof log.notes === 'string' ? log.notes : prev.notes,
      medsTaken: Array.isArray(log.medsTaken) ? log.medsTaken : prev.medsTaken,
      bloating: Number(log.bloating ?? prev.bloating) || prev.bloating,
      digestionQuality: Number(log.digestionQuality ?? prev.digestionQuality) || prev.digestionQuality,
    }))
  }

  const loadTodayCheckIn = async () => {
    if (!token) {
      setCheckinLoaded(true)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/logs/mental`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const logs = await res.json().catch(() => [])
      if (!Array.isArray(logs) || logs.length === 0) return

      const todayKey = new Date().toDateString()
      const todayLog = logs.find(l => new Date(l.date).toDateString() === todayKey)
      if (todayLog) applyMentalLogToForm(todayLog)
    } catch (err) {
      console.error(err)
    } finally {
      setCheckinLoaded(true)
    }
  }

  const handleSubmit = async () => {
    if (!token) {
      alert('Please log in to submit a check-in.')
      return
    }
    const endpoint = `${API_BASE}/api/logs/mental`
    const body = {
      moodScore: mentalData.mood,
      energyLevel: mentalData.energy,
      stressLevel: mentalData.stress,
      bodyFeel: mentalData.bodyFeel,
      sleepHours: mentalData.sleep,
      sleepQuality: mentalData.sleepQuality,
      restingHeartRate: mentalData.restingHeartRate,
      medsTaken: mentalData.medsTaken,
      notes: mentalData.notes,
    }

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      // Also log gut symptoms to SymptomLog API
      if (mentalData.bloating > 0) {
        await fetch(`${API_BASE}/api/symptoms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            symptomName: 'Bloating',
            severity: mentalData.bloating,
            notes: 'Logged via Daily Check-in'
          }),
        })
      }

      if (mentalData.digestionQuality < 4) {
        await fetch(`${API_BASE}/api/symptoms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            symptomName: 'Digestive Discomfort',
            severity: 10 - mentalData.digestionQuality,
            notes: 'Logged via Daily Check-in'
          }),
        })
      }

      if (res.ok) {
        const saved = await res.json().catch(() => null)
        applyMentalLogToForm(saved)
        window.dispatchEvent(new CustomEvent('lifesync:mental:updated', { detail: { log: saved } }))
        alert('Logged successfully!')
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    setCheckinLoaded(false)
    loadTodayCheckIn()
  }, [token])

  useEffect(() => {
    const handler = (e) => {
      const log = e?.detail?.log
      applyMentalLogToForm(log)
    }
    window.addEventListener('lifesync:mental:updated', handler)
    return () => window.removeEventListener('lifesync:mental:updated', handler)
  }, [])

  // Fetch today's journal entry on mount
  useEffect(() => {
    const fetchJournal = async () => {
      if (!user || !token) return
      const res = await fetch(`${API_BASE}/api/journal`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const entries = await res.json()
        const today = new Date().toDateString()
        const todayEntry = entries.find(e => new Date(e.date).toDateString() === today)
        if (todayEntry) setJournal(todayEntry.text)
      }
    }
    fetchJournal()
  }, [user, token])

  // Save journal entry to backend
  const handleSaveJournal = async (text) => {
    if (!user || !token) return
    const res = await fetch(`${API_BASE}/api/journal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      setJournalSaved(true)
      setTimeout(() => setJournalSaved(false), 2000)
      setJournal(text)
    }
  }

  const openInsights = () => {
    try {
      localStorage.setItem('lifesync:insights:activeTab', '2')
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('lifesync:navigate', { detail: { section: 'trends' } }))
  }

  const stressColor = (value) => {
    const v = Math.max(1, Math.min(10, Number(value) || 1))
    const t = (v - 1) / 9
    const hue = (1 - t) * 120 // 120=green -> 0=red
    return `hsl(${hue}, 72%, 40%)`
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
        Wellness Check-in
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        Track your mood, energy, body feel, stress, sleep, and medications for today
      </Typography>
      {!checkinLoaded && token && (
        <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
          Loading today's check-in…
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Synced block (Dashboard + Wellness) */}
        <Box
          sx={{
            p: 2.5,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid #e5e7eb',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
            Today’s State
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                Mood: {mentalData.mood}/10
              </Typography>
              <Slider
                value={mentalData.mood}
                onChange={(e, v) => setMentalData({ ...mentalData, mood: v })}
                min={1}
                max={10}
                sx={{
                  color: 'text.primary',
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                Energy: {mentalData.energy}/10
              </Typography>
              <Slider
                value={mentalData.energy}
                onChange={(e, v) => setMentalData({ ...mentalData, energy: v })}
                min={1}
                max={10}
                sx={{
                  color: 'text.primary',
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                Body Feel: {mentalData.bodyFeel}/10
              </Typography>
              <Slider
                value={mentalData.bodyFeel}
                onChange={(e, v) => setMentalData({ ...mentalData, bodyFeel: v })}
                min={1}
                max={10}
                sx={{
                  color: 'text.primary',
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                Sleep: {mentalData.sleep} hrs
              </Typography>
              <Slider
                value={mentalData.sleep}
                onChange={(e, v) => setMentalData({ ...mentalData, sleep: v })}
                min={0}
                max={12}
                step={0.5}
                sx={{
                  color: 'text.primary',
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                Sleep Quality: {mentalData.sleepQuality}/10
              </Typography>
              <Slider
                value={mentalData.sleepQuality}
                onChange={(e, v) => setMentalData({ ...mentalData, sleepQuality: v })}
                min={1}
                max={10}
                sx={{
                  color: 'text.primary',
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                Resting Heart Rate (RHR): {mentalData.restingHeartRate} bpm
              </Typography>
              <Slider
                value={mentalData.restingHeartRate}
                onChange={(e, v) => setMentalData({ ...mentalData, restingHeartRate: v })}
                min={40}
                max={100}
                sx={{
                  color: 'text.primary',
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Gut Health block */}
        <Box
          sx={{
            p: 2.5,
            bgcolor: '#f0f9ff',
            borderRadius: 2,
            border: '1px solid #bae6fd',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0369a1', mb: 2 }}>
            Gut Health
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#0c4a6e' }}>
              Bloating: {mentalData.bloating}/10
            </Typography>
            <Slider
              value={mentalData.bloating}
              onChange={(e, v) => setMentalData({ ...mentalData, bloating: v })}
              min={0}
              max={10}
              sx={{
                color: '#0ea5e9',
                '& .MuiSlider-thumb': { width: 16, height: 16 },
              }}
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#0c4a6e' }}>
              Digestion Quality: {mentalData.digestionQuality}/10
            </Typography>
            <Slider
              value={mentalData.digestionQuality}
              onChange={(e, v) => setMentalData({ ...mentalData, digestionQuality: v })}
              min={1}
              max={10}
              sx={{
                color: '#0ea5e9',
                '& .MuiSlider-thumb': { width: 16, height: 16 },
              }}
            />
          </Box>
        </Box>

        {/* Stress block */}
        <Box
          sx={{
            p: 2.5,
            bgcolor: '#fff7ed',
            borderRadius: 2,
            border: '1px solid #fed7aa',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
            Stress
          </Typography>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#7c2d12' }}>
              Stress: {mentalData.stress}/10
            </Typography>
            <Slider
              value={mentalData.stress}
              onChange={(e, v) => setMentalData({ ...mentalData, stress: v })}
              min={1}
              max={10}
              sx={{
                color: stressColor(mentalData.stress),
                '& .MuiSlider-thumb': { width: 16, height: 16 },
              }}
            />
          </Box>
        </Box>

          {/* Medications Taken Section */}
          {userMedications.length > 0 && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 2,
                border: '1px solid #e5e7eb',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <MedicationIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Medications Taken Today
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {userMedications.map((med, idx) => (
                  <FormControlLabel
                    key={idx}
                    control={
                      <Checkbox
                        checked={mentalData.medsTaken.includes(med.name)}
                        onChange={() => toggleMedTaken(med.name)}
                        sx={{
                          color: '#d1d5db',
                          '&.Mui-checked': { color: '#15803d' },
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {med.name}
                        </Typography>
                        {(med.dosage || med.schedule) && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {[med.dosage, med.schedule].filter(Boolean).join(' • ')}
                          </Typography>
                        )}
                      </Box>
                    }
                    sx={{ ml: 0, alignItems: 'flex-start' }}
                  />
                ))}
              </Box>
              {mentalData.medsTaken.length > 0 && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#15803d' }}>
                  ✓ {mentalData.medsTaken.length} of {userMedications.length} medications taken
                </Typography>
              )}
            </Box>
          )}

          {userMedications.length === 0 && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 2,
                border: '1px dashed #d1d5db',
                textAlign: 'center',
              }}
            >
              <MedicationIcon sx={{ fontSize: 24, color: '#9ca3af', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No medications added yet
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                Add medications in your Profile → Health tab
              </Typography>
            </Box>
          )}

          <TextField
            label="Notes"
            multiline
            rows={2}
            value={mentalData.notes}
            onChange={(e) => setMentalData({ ...mentalData, notes: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: '#d1d5db' },
                '&.Mui-focused fieldset': { borderColor: 'text.primary' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: 'text.primary' },
            }}
          />
        </Box>

      <Button
        fullWidth
        variant="contained"
        onClick={handleSubmit}
        sx={{
          mt: 4,
          py: 1.5,
          bgcolor: 'text.primary',
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 2,
          boxShadow: 'none',
          '&:hover': { bgcolor: 'text.secondary', boxShadow: 'none' },
        }}
      >
        Save Entry
      </Button>

      {/* Journal Section */}
      <JournalPanel onSave={handleSaveJournal} initialValue={journal} />
      <Button variant="outlined" onClick={openInsights} sx={{ mb: 2 }}>
        Open Insights
      </Button>
    </Box>
  )
}

export default DailyLogPanel

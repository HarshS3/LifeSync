import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Slider from '@mui/material/Slider'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MedicationIcon from '@mui/icons-material/Medication'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'
import JournalPanel from './JournalPanel'

function DailyLogPanel() {
  const { user, token } = useAuth()
  const [readiness, setReadiness] = useState(7)
  const [followupOpen, setFollowupOpen] = useState(false)
  const [todayState, setTodayState] = useState({
    energy: 5, mood: 5, bodyFeel: 5, stress: 5, sleep: 7,
    sleepQuality: 7, restingHeartRate: 65, bloating: 0, digestionQuality: 5,
  })
  const [medsTaken, setMedsTaken] = useState([])
  const [notes, setNotes] = useState('')
  const [journal, setJournal] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [checkinLoaded, setCheckinLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const userMedications = user?.medications || []

  const toggleMedTaken = (medName) => {
    setMedsTaken(prev =>
      prev.includes(medName) ? prev.filter(m => m !== medName) : [...prev, medName]
    )
  }

  const applyLogToForm = (log) => {
    if (!log) return
    const avg = [log.energyLevel, log.moodScore, log.bodyFeel].filter(v => typeof v === 'number')
    if (avg.length) setReadiness(Math.round(avg.reduce((a, b) => a + b, 0) / avg.length))
    setTodayState(prev => ({
      ...prev,
      mood: Number(log.moodScore ?? log.mood ?? prev.mood) || prev.mood,
      energy: Number(log.energyLevel ?? prev.energy) || prev.energy,
      bodyFeel: Number(log.bodyFeel ?? prev.bodyFeel) || prev.bodyFeel,
      stress: Number(log.stressLevel ?? prev.stress) || prev.stress,
      sleep: Number(log.sleepHours ?? prev.sleep) || prev.sleep,
      sleepQuality: Number(log.sleepQuality ?? prev.sleepQuality) || prev.sleepQuality,
      restingHeartRate: Number(log.restingHeartRate ?? prev.restingHeartRate) || prev.restingHeartRate,
      bloating: Number(log.bloating ?? prev.bloating) ?? prev.bloating,
      digestionQuality: Number(log.digestionQuality ?? prev.digestionQuality) || prev.digestionQuality,
    }))
    if (Array.isArray(log.medsTaken)) setMedsTaken(log.medsTaken)
    if (typeof log.notes === 'string') setNotes(log.notes)
    setHasCheckedIn(true)
  }

  const loadTodayCheckIn = async () => {
    if (!token) { setCheckinLoaded(true); return }
    try {
      const res = await fetch(`${API_BASE}/api/logs/mental`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const logs = await res.json().catch(() => [])
      if (!Array.isArray(logs) || logs.length === 0) return
      const todayKey = new Date().toDateString()
      const todayLog = logs.find(l => new Date(l.date).toDateString() === todayKey)
      if (todayLog) applyLogToForm(todayLog)
    } catch (err) {
      console.error(err)
    } finally {
      setCheckinLoaded(true)
    }
  }

  const handleSubmit = async () => {
    if (!token) { alert('Please log in to submit a check-in.'); return }
    setSubmitting(true)
    const payload = followupOpen
      ? {
          moodScore: todayState.mood,
          energyLevel: todayState.energy,
          stressLevel: todayState.stress,
          bodyFeel: todayState.bodyFeel,
          sleepHours: todayState.sleep,
          sleepQuality: todayState.sleepQuality,
          restingHeartRate: todayState.restingHeartRate,
          medsTaken,
          notes,
        }
      : {
          moodScore: readiness,
          energyLevel: readiness,
          stressLevel: Math.max(1, 11 - readiness),
          bodyFeel: readiness,
          notes,
        }

    try {
      const res = await fetch(`${API_BASE}/api/logs/mental`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      if (followupOpen && todayState.bloating > 0) {
        await fetch(`${API_BASE}/api/symptoms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ symptomName: 'Bloating', severity: todayState.bloating, notes: 'Logged via Daily Check-in' }),
        })
      }
      if (followupOpen && todayState.digestionQuality < 4) {
        await fetch(`${API_BASE}/api/symptoms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ symptomName: 'Digestive Discomfort', severity: 10 - todayState.digestionQuality, notes: 'Logged via Daily Check-in' }),
        })
      }

      if (res.ok) {
        const saved = await res.json().catch(() => null)
        applyLogToForm(saved)
        window.dispatchEvent(new CustomEvent('lifesync:mental:updated', { detail: { log: saved } }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => { setCheckinLoaded(false); loadTodayCheckIn() }, [token])

  useEffect(() => {
    const handler = (e) => applyLogToForm(e?.detail?.log)
    window.addEventListener('lifesync:mental:updated', handler)
    return () => window.removeEventListener('lifesync:mental:updated', handler)
  }, [])

  useEffect(() => {
    const fetchJournal = async () => {
      if (!user || !token) return
      const res = await fetch(`${API_BASE}/api/journal`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const entries = await res.json()
        const today = new Date().toDateString()
        const todayEntry = entries.find(e => new Date(e.date).toDateString() === today)
        if (todayEntry) setJournal(todayEntry.text)
      }
    }
    fetchJournal()
  }, [user, token])

  const handleSaveJournal = async (text) => {
    if (!user || !token) return
    const res = await fetch(`${API_BASE}/api/journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      setJournalSaved(true)
      setTimeout(() => setJournalSaved(false), 2000)
      setJournal(text)
    }
  }

  const openInsights = () => {
    try { localStorage.setItem('lifesync:insights:activeTab', '2') } catch {}
    window.dispatchEvent(new CustomEvent('lifesync:navigate', { detail: { section: 'trends' } }))
  }

  const readinessColor = (v) => {
    const t = (Math.max(1, Math.min(10, v)) - 1) / 9
    return `hsl(${Math.round(t * 120)}, 72%, 40%)`
  }

  const sliderSx = { '& .MuiSlider-thumb': { width: 16, height: 16 } }

  if (!checkinLoaded && token) {
    return (
      <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
        Loading today's check-in…
      </Typography>
    )
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 600, color: 'text.primary' }}>
        Wellness Check-in
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        How's your readiness today?
      </Typography>

      <Box sx={{ p: 2.5, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb', mb: 2 }}>
        {hasCheckedIn && (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 1.5,
            px: 1.5, py: 0.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700 }}>✓ Checked in</Typography>
          </Box>
        )}

        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
          {hasCheckedIn ? "Today's readiness" : "Readiness"}: {readiness}/10
        </Typography>
        <Slider
          value={readiness}
          disabled={hasCheckedIn}
          onChange={(e, v) => {
            setReadiness(v)
            if (v < 5 && !followupOpen) setFollowupOpen(true)
          }}
          min={1} max={10}
          sx={{ ...sliderSx, color: readinessColor(readiness) }}
        />

        {!hasCheckedIn && (
          <Button
            size="small"
            variant="text"
            onClick={() => setFollowupOpen(o => !o)}
            endIcon={followupOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            sx={{ mt: 1, textTransform: 'none', color: 'text.secondary', fontWeight: 500, px: 0 }}
          >
            {followupOpen ? 'Hide details' : '+ Add details (mood, sleep, stress…)'}
          </Button>
        )}
      </Box>

      {(followupOpen || hasCheckedIn) && (
        <>
          {/* Today's State */}
          <Box sx={{ p: 2.5, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Today's State</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {[
                { key: 'mood', label: 'Mood', icon: '😊' },
                { key: 'energy', label: 'Energy', icon: '⚡' },
                { key: 'bodyFeel', label: 'Body Feel', icon: '💪' },
              ].map(({ key, label, icon }) => (
                <Box key={key}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                    {icon} {label}: {todayState[key]}/10
                  </Typography>
                  <Slider
                    value={todayState[key]}
                    disabled={hasCheckedIn}
                    onChange={(e, v) => setTodayState(p => ({ ...p, [key]: v }))}
                    min={1} max={10} sx={sliderSx}
                  />
                </Box>
              ))}
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                  🌙 Sleep: {todayState.sleep} hrs
                </Typography>
                <Slider
                  value={todayState.sleep}
                  disabled={hasCheckedIn}
                  onChange={(e, v) => setTodayState(p => ({ ...p, sleep: v }))}
                  min={0} max={12} step={0.5} sx={sliderSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                  😴 Sleep Quality: {todayState.sleepQuality}/10
                </Typography>
                <Slider
                  value={todayState.sleepQuality}
                  disabled={hasCheckedIn}
                  onChange={(e, v) => setTodayState(p => ({ ...p, sleepQuality: v }))}
                  min={1} max={10} sx={sliderSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                  ❤️ Resting Heart Rate: {todayState.restingHeartRate} bpm
                </Typography>
                <Slider
                  value={todayState.restingHeartRate}
                  disabled={hasCheckedIn}
                  onChange={(e, v) => setTodayState(p => ({ ...p, restingHeartRate: v }))}
                  min={40} max={100} sx={sliderSx}
                />
              </Box>
            </Box>
          </Box>

          {/* Stress */}
          <Box sx={{ p: 2.5, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #fed7aa', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Stress</Typography>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#7c2d12' }}>
              😤 Stress: {todayState.stress}/10
            </Typography>
            <Slider
              value={todayState.stress}
              disabled={hasCheckedIn}
              onChange={(e, v) => setTodayState(p => ({ ...p, stress: v }))}
              min={1} max={10}
              sx={{ ...sliderSx, color: `hsl(${Math.round((1 - (todayState.stress - 1) / 9) * 120)}, 72%, 40%)` }}
            />
          </Box>

          {/* Gut Health */}
          <Box sx={{ p: 2.5, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0369a1', mb: 2 }}>Gut Health</Typography>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#0c4a6e' }}>
                🫀 Bloating: {todayState.bloating}/10
              </Typography>
              <Slider
                value={todayState.bloating}
                disabled={hasCheckedIn}
                onChange={(e, v) => setTodayState(p => ({ ...p, bloating: v }))}
                min={0} max={10} sx={{ ...sliderSx, color: '#0ea5e9' }}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#0c4a6e' }}>
                🌿 Digestion Quality: {todayState.digestionQuality}/10
              </Typography>
              <Slider
                value={todayState.digestionQuality}
                disabled={hasCheckedIn}
                onChange={(e, v) => setTodayState(p => ({ ...p, digestionQuality: v }))}
                min={1} max={10} sx={{ ...sliderSx, color: '#0ea5e9' }}
              />
            </Box>
          </Box>

          {/* Medications */}
          {userMedications.length > 0 && (
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid #e5e7eb', mb: 2 }}>
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
                        checked={medsTaken.includes(med.name)}
                        onChange={() => toggleMedTaken(med.name)}
                        disabled={hasCheckedIn}
                        sx={{ color: '#d1d5db', '&.Mui-checked': { color: '#15803d' } }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{med.name}</Typography>
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
              {medsTaken.length > 0 && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#15803d' }}>
                  ✓ {medsTaken.length} of {userMedications.length} medications taken
                </Typography>
              )}
            </Box>
          )}
        </>
      )}

      {/* Notes always visible */}
      <TextField
        label="Notes"
        multiline
        rows={2}
        value={notes}
        disabled={hasCheckedIn}
        onChange={(e) => setNotes(e.target.value)}
        sx={{
          mb: 2, width: '100%',
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'divider' },
            '&:hover fieldset': { borderColor: '#d1d5db' },
            '&.Mui-focused fieldset': { borderColor: 'text.primary' },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: 'text.primary' },
        }}
      />

      {!hasCheckedIn && (
        <Button
          fullWidth variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{
            mb: 3, py: 1.5,
            bgcolor: 'text.primary', textTransform: 'none',
            fontWeight: 600, borderRadius: 2, boxShadow: 'none',
            '&:hover': { bgcolor: 'text.secondary', boxShadow: 'none' },
          }}
        >
          {submitting ? 'Saving…' : 'Check In'}
        </Button>
      )}

      <JournalPanel onSave={handleSaveJournal} initialValue={journal} />
      <Button variant="outlined" onClick={openInsights} sx={{ mb: 2 }}>
        Open Insights
      </Button>
    </Box>
  )
}

export default DailyLogPanel

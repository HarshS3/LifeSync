import { useState } from 'react'
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

function DailyLogPanel() {
  const { user, token } = useAuth()
  const [mentalData, setMentalData] = useState({
    mood: 5,
    energy: 5,
    stress: 5,
    sleep: 7,
    notes: '',
    medsTaken: [], // Track which medications were taken
  })

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

  const handleSubmit = async () => {
    if (!user || !user._id) {
      alert('User not found!')
      return
    }
    const endpoint = `${API_BASE}/api/logs/mental/${user._id}`
    const body = {
      moodScore: mentalData.mood,
      energyLevel: mentalData.energy,
      stressLevel: mentalData.stress,
      sleepHours: mentalData.sleep,
      medsTaken: mentalData.medsTaken,
      notes: mentalData.notes,
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        alert('Logged successfully!')
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: '#171717' }}>
        Wellness Check-in
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: '#6b7280' }}>
        Track your mood, energy, stress, sleep, and medications for today
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#374151' }}>
              Mood: {mentalData.mood}/10
            </Typography>
            <Slider
              value={mentalData.mood}
              onChange={(e, v) => setMentalData({ ...mentalData, mood: v })}
              min={1}
              max={10}
              sx={{
                color: '#171717',
                '& .MuiSlider-thumb': { width: 16, height: 16 },
              }}
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#374151' }}>
              Energy: {mentalData.energy}/10
            </Typography>
            <Slider
              value={mentalData.energy}
              onChange={(e, v) => setMentalData({ ...mentalData, energy: v })}
              min={1}
              max={10}
              sx={{
                color: '#171717',
                '& .MuiSlider-thumb': { width: 16, height: 16 },
              }}
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#374151' }}>
              Stress: {mentalData.stress}/10
            </Typography>
            <Slider
              value={mentalData.stress}
              onChange={(e, v) => setMentalData({ ...mentalData, stress: v })}
              min={1}
              max={10}
              sx={{
                color: '#171717',
                '& .MuiSlider-thumb': { width: 16, height: 16 },
              }}
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#374151' }}>
              Sleep: {mentalData.sleep} hrs
            </Typography>
            <Slider
              value={mentalData.sleep}
              onChange={(e, v) => setMentalData({ ...mentalData, sleep: v })}
              min={0}
              max={12}
              step={0.5}
              sx={{
                color: '#171717',
                '& .MuiSlider-thumb': { width: 16, height: 16 },
              }}
            />
          </Box>

          {/* Medications Taken Section */}
          {userMedications.length > 0 && (
            <Box
              sx={{
                p: 2,
                bgcolor: '#f9fafb',
                borderRadius: 2,
                border: '1px solid #e5e7eb',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <MedicationIcon sx={{ fontSize: 20, color: '#6b7280' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
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
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717' }}>
                          {med.name}
                        </Typography>
                        {(med.dosage || med.schedule) && (
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
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
                bgcolor: '#f9fafb',
                borderRadius: 2,
                border: '1px dashed #d1d5db',
                textAlign: 'center',
              }}
            >
              <MedicationIcon sx={{ fontSize: 24, color: '#9ca3af', mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
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
                '& fieldset': { borderColor: '#e5e7eb' },
                '&:hover fieldset': { borderColor: '#d1d5db' },
                '&.Mui-focused fieldset': { borderColor: '#171717' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#171717' },
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
          bgcolor: '#171717',
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 2,
          boxShadow: 'none',
          '&:hover': { bgcolor: '#374151', boxShadow: 'none' },
        }}
      >
        Save Entry
      </Button>
    </Box>
  )
}

export default DailyLogPanel

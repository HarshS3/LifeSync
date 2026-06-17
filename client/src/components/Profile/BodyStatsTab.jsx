import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'

const SectionTitle = ({ children }) => {
  return (
    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
      {children}
    </Typography>
  )
}

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'divider' },
    '&:hover fieldset': { borderColor: '#d1d5db' },
    '&.Mui-focused fieldset': { borderColor: 'text.primary' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: 'text.primary' },
}

export default function BodyStatsTab({ profile, updateField }) {
  return (
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
          label="Body Fat % (Optional)"
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
  )
}

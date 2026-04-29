import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Slider from '@mui/material/Slider'
import ChipListInput from '../ChipListInput'

const SectionTitle = ({ children }) => {
  return (
    <Typography variant="subtitle2" sx={{ mb: 2, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
      {children}
    </Typography>
  )
}

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: '#e5e7eb' },
    '&:hover fieldset': { borderColor: '#d1d5db' },
    '&.Mui-focused fieldset': { borderColor: '#171717' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#171717' },
}

export default function MindTab({ profile, updateField }) {
  return (
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
                bgcolor: profile.chronotype === type ? '#171717' : '#f3f4f6',
                color: profile.chronotype === type ? '#fff' : '#374151',
                '&:hover': { bgcolor: profile.chronotype === type ? '#171717' : '#e5e7eb' },
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
          sx={{ color: '#171717' }}
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
                bgcolor: profile.energyPeakTime === time ? '#171717' : '#f3f4f6',
                color: profile.energyPeakTime === time ? '#fff' : '#374151',
                '&:hover': { bgcolor: profile.energyPeakTime === time ? '#171717' : '#e5e7eb' },
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
  )
}

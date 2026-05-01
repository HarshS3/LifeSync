import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Slider from '@mui/material/Slider'

const SectionTitle = ({ children }) => {
  return (
    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
      {children}
    </Typography>
  )
}

export default function PersonalityTab({ profile, updatePersonalityField, updateBigFiveField }) {
  return (
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
          <Box key={key} sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              {label}: {profile.personality?.bigFive?.[key] ?? 5}/10
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
        <SectionTitle>Decision Making Style</SectionTitle>
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="e.g., Logic-driven, emotional, collaborative..."
          value={profile.personality?.decisionStyle || ''}
          onChange={(e) => updatePersonalityField('decisionStyle', e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'divider' },
              '&:hover fieldset': { borderColor: '#d1d5db' },
              '&.Mui-focused fieldset': { borderColor: 'text.primary' },
            }
          }}
        />
      </Box>
    </Box>
  )
}

import TextField from '@mui/material/TextField'

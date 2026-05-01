import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Avatar from '@mui/material/Avatar'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'divider' },
    '&:hover fieldset': { borderColor: '#d1d5db' },
    '&.Mui-focused fieldset': { borderColor: 'text.primary' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: 'text.primary' },
}

export default function BasicInfoTab({ profile, updateField, updateBiologicalProfileField }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Avatar sx={{ width: 64, height: 64, bgcolor: 'text.primary', fontSize: '1.5rem' }}>
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
        value={profile.biologicalProfile?.dob ? profile.biologicalProfile.dob.substring(0, 10) : ''}
        onChange={(e) => updateBiologicalProfileField('dob', e.target.value)}
        sx={inputSx}
      />
    </Box>
  )
}

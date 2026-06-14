import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Slider from '@mui/material/Slider'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import ChipListInput from '../ChipListInput'

const SectionTitle = ({ children }) => {
  return (
    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
      {children}
    </Typography>
  )
}

const TRAINING_PHASES = [
  { value: 'bulk',        label: 'Bulk',    caption: 'Building muscle — calorie surplus applied to nutrition targets.' },
  { value: 'cut',         label: 'Cut',     caption: 'Losing fat — calorie deficit applied to nutrition targets.' },
  { value: 'maintenance', label: 'Maintain', caption: 'Maintaining weight — targets set to TDEE calories.' },
  { value: 'recomp',      label: 'Recomp',  caption: 'Body recomposition — simultaneous fat loss and muscle gain.' },
]

export default function TrainingTab({ profile, updateField }) {
  const currentPhase = profile.biologicalProfile?.trainingPhase || 'maintenance'
  const sessionDuration = profile.biologicalProfile?.sessionDurationMinutes || 60
  const activePhase = TRAINING_PHASES.find((p) => p.value === currentPhase)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <SectionTitle>Training Phase</SectionTitle>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {TRAINING_PHASES.map((phase) => (
            <Chip
              key={phase.value}
              label={phase.label}
              onClick={() => {
                updateField('biologicalProfile.trainingPhase', phase.value)
                updateField('biologicalProfile.trainingPhaseStartDate', new Date().toISOString())
              }}
              sx={{
                bgcolor: currentPhase === phase.value ? 'text.primary' : 'action.selected',
                color: currentPhase === phase.value ? 'background.paper' : 'text.secondary',
                '&:hover': { bgcolor: currentPhase === phase.value ? 'text.primary' : 'divider' },
              }}
            />
          ))}
        </Box>
        {activePhase && (
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
            {activePhase.caption}
          </Typography>
        )}
      </Box>

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

      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          AI Session Length: {sessionDuration} min
        </Typography>
        <Slider
          value={sessionDuration}
          onChange={(e, v) => updateField('biologicalProfile.sessionDurationMinutes', v)}
          min={20}
          max={120}
          step={5}
          sx={{ color: 'text.primary' }}
        />
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}>
          Workout suggestions will be scaled to this length
        </Typography>
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
  )
}

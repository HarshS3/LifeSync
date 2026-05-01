import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Slider from '@mui/material/Slider'
import ChipListInput from '../ChipListInput'

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

export default function ClinicalDietTab({ profile, updateField, updateBiologicalProfileField, setProfile }) {
  const missing = [];
  if (!profile.dob) missing.push('Date of Birth');
  if (!profile.height) missing.push('Height');
  if (!profile.weight) missing.push('Weight');
  if (!(profile.biologicalProfile?.biologicalSex || profile.gender)) missing.push('Biological Sex');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Metabolic & Dietary Engine Profile</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          We use the scientific Mifflin-St Jeor / Katch-McArdle formulas to compute highly personalized clinical 
          caloric and deep micronutrient targets (NIH DRIs) based on these precise biological metrics.
        </Typography>

        {missing.length > 0 && (
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
        )}
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

        {(profile.biologicalProfile?.biologicalSex || profile.gender) === 'female' && (
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
          {['omnivore', 'pescatarian', 'vegetarian', 'vegan', 'keto', 'paleo'].map((diet) => (
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
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
          {['breakfast', 'lunch', 'dinner', 'snack'].map((meal) => (
            <TextField
              key={meal}
              label={meal.charAt(0).toUpperCase() + meal.slice(1)}
              type="time"
              InputLabelProps={{ shrink: true }}
              value={profile.mealSchedule?.[meal] || (meal === 'breakfast' ? '08:00' : meal === 'lunch' ? '13:00' : meal === 'dinner' ? '20:00' : '16:00')}
              onChange={(e) => setProfile(prev => ({ ...prev, mealSchedule: { ...prev.mealSchedule, [meal]: e.target.value } }))}
              sx={inputSx}
              size="small"
            />
          ))}
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
          Targets act autonomously based on these selections. Vegans will automatically see a 1.8x bump in Iron targets.
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
  )
}

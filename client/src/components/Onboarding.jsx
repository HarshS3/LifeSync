import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Slider from '@mui/material/Slider'
import LinearProgress from '@mui/material/LinearProgress'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Fade from '@mui/material/Fade'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import SpaIcon from '@mui/icons-material/Spa'
import FlagIcon from '@mui/icons-material/Flag'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useAuth } from '../context/AuthContext'

const GOALS = [
  { id: 'lose-weight', label: 'Lose Weight', icon: '🏃' },
  { id: 'build-muscle', label: 'Build Muscle', icon: '💪' },
  { id: 'eat-healthier', label: 'Eat Healthier', icon: '🥗' },
  { id: 'sleep-better', label: 'Sleep Better', icon: '😴' },
  { id: 'reduce-stress', label: 'Reduce Stress', icon: '🧘' },
  { id: 'build-habits', label: 'Build Habits', icon: '📈' },
  { id: 'more-energy', label: 'More Energy', icon: '⚡' },
  { id: 'mental-clarity', label: 'Mental Clarity', icon: '🧠' },
]

const DIET_TYPES = [
  { value: 'omnivore', label: 'Omnivore (Eat Everything)' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'jain', label: 'Jain' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
]

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner (0-1 years)' },
  { value: 'intermediate', label: 'Intermediate (1-3 years)' },
  { value: 'advanced', label: 'Advanced (3+ years)' },
]

const CHRONOTYPES = [
  { value: 'early-bird', label: '🌅 Early Bird - Most productive in morning' },
  { value: 'night-owl', label: '🦉 Night Owl - Most productive at night' },
  { value: 'neutral', label: '☀️ Flexible - Adaptable schedule' },
]

function Onboarding({ onComplete }) {
  const { token, refreshUser } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    // Step 1: Goals
    selectedGoals: [],
    // Step 2: Basic Info
    age: '',
    gender: '',
    height: '',
    weight: '',
    // Step 3: Fitness
    trainingExperience: 'intermediate',
    workoutFrequency: 4,
    preferredWorkouts: [],
    // Step 4: Nutrition
    dietType: 'omnivore',
    mealsPerDay: 3,
    dailyCalorieTarget: '',
    // Step 5: Lifestyle
    chronotype: 'neutral',
    averageSleep: 7,
    stressTriggers: [],
    // Step 6: Final
    biggestChallenges: '',
    longTermVision: '',
  })

  const WORKOUTS = ['Gym/Weights', 'Running', 'Yoga', 'Swimming', 'Cycling', 'HIIT', 'Sports', 'Home Workouts', 'Walking', 'Dance']
  const STRESS_TRIGGERS = ['Work', 'Relationships', 'Health', 'Money', 'Sleep', 'Social', 'News', 'Family']

  const steps = [
    { title: 'Your Goals', subtitle: 'What do you want to achieve?', icon: <FlagIcon /> },
    { title: 'About You', subtitle: 'Basic information to personalize your experience', icon: <CheckCircleIcon /> },
    { title: 'Fitness', subtitle: 'Tell us about your training', icon: <FitnessCenterIcon /> },
    { title: 'Nutrition', subtitle: 'Your eating preferences', icon: <RestaurantIcon /> },
    { title: 'Lifestyle', subtitle: 'Sleep and stress patterns', icon: <SpaIcon /> },
    { title: 'Almost Done!', subtitle: 'Final touches', icon: <CheckCircleIcon /> },
  ]

  const toggleGoal = (goalId) => {
    setData(prev => ({
      ...prev,
      selectedGoals: prev.selectedGoals.includes(goalId)
        ? prev.selectedGoals.filter(g => g !== goalId)
        : [...prev.selectedGoals, goalId]
    }))
  }

  const toggleArrayItem = (field, item) => {
    setData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }))
  }

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      // Map goals to training goals
      const trainingGoals = data.selectedGoals
      
      const payload = {
        age: data.age ? parseInt(data.age) : undefined,
        gender: data.gender || undefined,
        height: data.height ? parseFloat(data.height) : undefined,
        weight: data.weight ? parseFloat(data.weight) : undefined,
        trainingExperience: data.trainingExperience,
        workoutFrequency: data.workoutFrequency,
        preferredWorkouts: data.preferredWorkouts,
        dietType: data.dietType,
        mealsPerDay: data.mealsPerDay,
        dailyCalorieTarget: data.dailyCalorieTarget ? parseInt(data.dailyCalorieTarget) : undefined,
        chronotype: data.chronotype,
        averageSleep: data.averageSleep,
        stressTriggers: data.stressTriggers,
        biggestChallenges: data.biggestChallenges,
        longTermVision: data.longTermVision,
        trainingGoals,
        onboardingCompleted: true,
      }

      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        await refreshUser()
        onComplete()
      }
    } catch (err) {
      console.error('Failed to save onboarding:', err)
    }
    setSaving(false)
  }

  const progress = ((step + 1) / steps.length) * 100

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Progress Header */}
      <Box sx={{ p: 3, bgcolor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            LifeSync
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Step {step + 1} of {steps.length}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: '#e5e7eb',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#171717',
              borderRadius: 3,
            }
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', p: 3 }}>
        <Box sx={{ maxWidth: 600, width: '100%' }}>
          <Fade in key={step}>
            <Box>
              {/* Step Header */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: '#171717',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {steps[step].icon}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {steps[step].title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  {steps[step].subtitle}
                </Typography>
              </Box>

              {/* Step 0: Goals */}
              {step === 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
                  {GOALS.map(goal => (
                    <Chip
                      key={goal.id}
                      label={`${goal.icon} ${goal.label}`}
                      onClick={() => toggleGoal(goal.id)}
                      sx={{
                        px: 2,
                        py: 3,
                        fontSize: '0.95rem',
                        borderRadius: 3,
                        border: '2px solid',
                        borderColor: data.selectedGoals.includes(goal.id) ? '#171717' : '#e5e7eb',
                        bgcolor: data.selectedGoals.includes(goal.id) ? '#171717' : '#fff',
                        color: data.selectedGoals.includes(goal.id) ? '#fff' : '#374151',
                        '&:hover': {
                          bgcolor: data.selectedGoals.includes(goal.id) ? '#374151' : '#f9fafb',
                        },
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Step 1: Basic Info */}
              {step === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Age"
                      type="number"
                      fullWidth
                      value={data.age}
                      onChange={(e) => setData({ ...data, age: e.target.value })}
                    />
                    <FormControl fullWidth>
                      <InputLabel>Gender</InputLabel>
                      <Select
                        value={data.gender}
                        label="Gender"
                        onChange={(e) => setData({ ...data, gender: e.target.value })}
                      >
                        <MenuItem value="male">Male</MenuItem>
                        <MenuItem value="female">Female</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                        <MenuItem value="prefer-not">Prefer not to say</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Height (cm)"
                      type="number"
                      fullWidth
                      value={data.height}
                      onChange={(e) => setData({ ...data, height: e.target.value })}
                    />
                    <TextField
                      label="Weight (kg)"
                      type="number"
                      fullWidth
                      value={data.weight}
                      onChange={(e) => setData({ ...data, weight: e.target.value })}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#9ca3af', textAlign: 'center' }}>
                    This helps us calculate your daily calorie needs and provide accurate recommendations.
                  </Typography>
                </Box>
              )}

              {/* Step 2: Fitness */}
              {step === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Training Experience</InputLabel>
                    <Select
                      value={data.trainingExperience}
                      label="Training Experience"
                      onChange={(e) => setData({ ...data, trainingExperience: e.target.value })}
                    >
                      {EXPERIENCE_LEVELS.map(level => (
                        <MenuItem key={level.value} value={level.value}>{level.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Workouts per week: {data.workoutFrequency}
                    </Typography>
                    <Slider
                      value={data.workoutFrequency}
                      onChange={(e, v) => setData({ ...data, workoutFrequency: v })}
                      min={1}
                      max={7}
                      marks
                      sx={{ color: '#171717' }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      Preferred Activities
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {WORKOUTS.map(workout => (
                        <Chip
                          key={workout}
                          label={workout}
                          onClick={() => toggleArrayItem('preferredWorkouts', workout)}
                          variant={data.preferredWorkouts.includes(workout) ? 'filled' : 'outlined'}
                          sx={{
                            ...(data.preferredWorkouts.includes(workout) && {
                              bgcolor: '#171717',
                              color: '#fff',
                            })
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Step 3: Nutrition */}
              {step === 3 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Diet Type</InputLabel>
                    <Select
                      value={data.dietType}
                      label="Diet Type"
                      onChange={(e) => setData({ ...data, dietType: e.target.value })}
                    >
                      {DIET_TYPES.map(diet => (
                        <MenuItem key={diet.value} value={diet.value}>{diet.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Meals per day: {data.mealsPerDay}
                    </Typography>
                    <Slider
                      value={data.mealsPerDay}
                      onChange={(e, v) => setData({ ...data, mealsPerDay: v })}
                      min={1}
                      max={6}
                      marks
                      sx={{ color: '#171717' }}
                    />
                  </Box>

                  <TextField
                    label="Daily Calorie Target (optional)"
                    type="number"
                    fullWidth
                    value={data.dailyCalorieTarget}
                    onChange={(e) => setData({ ...data, dailyCalorieTarget: e.target.value })}
                    helperText="Leave empty to let us calculate based on your goals"
                  />
                </Box>
              )}

              {/* Step 4: Lifestyle */}
              {step === 4 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Chronotype</InputLabel>
                    <Select
                      value={data.chronotype}
                      label="Chronotype"
                      onChange={(e) => setData({ ...data, chronotype: e.target.value })}
                    >
                      {CHRONOTYPES.map(type => (
                        <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Average sleep: {data.averageSleep} hours
                    </Typography>
                    <Slider
                      value={data.averageSleep}
                      onChange={(e, v) => setData({ ...data, averageSleep: v })}
                      min={4}
                      max={12}
                      step={0.5}
                      sx={{ color: '#171717' }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      Common Stress Triggers
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {STRESS_TRIGGERS.map(trigger => (
                        <Chip
                          key={trigger}
                          label={trigger}
                          onClick={() => toggleArrayItem('stressTriggers', trigger)}
                          variant={data.stressTriggers.includes(trigger) ? 'filled' : 'outlined'}
                          sx={{
                            ...(data.stressTriggers.includes(trigger) && {
                              bgcolor: '#171717',
                              color: '#fff',
                            })
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Step 5: Final */}
              {step === 5 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    label="What's your biggest wellness challenge?"
                    multiline
                    rows={3}
                    fullWidth
                    value={data.biggestChallenges}
                    onChange={(e) => setData({ ...data, biggestChallenges: e.target.value })}
                    placeholder="e.g., Staying consistent with workouts, managing stress..."
                  />
                  
                  <TextField
                    label="Where do you see yourself in 6 months?"
                    multiline
                    rows={3}
                    fullWidth
                    value={data.longTermVision}
                    onChange={(e) => setData({ ...data, longTermVision: e.target.value })}
                    placeholder="e.g., Running a 5k, feeling more energetic..."
                  />

                  <Box
                    sx={{
                      p: 3,
                      bgcolor: '#f0fdf4',
                      borderRadius: 2,
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#166534', fontWeight: 500 }}>
                      🎉 You're all set!
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#15803d' }}>
                      Click "Get Started" to begin your personalized wellness journey.
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Fade>
        </Box>
      </Box>

      {/* Navigation Footer */}
      <Box
        sx={{
          p: 3,
          bgcolor: '#fff',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button
          onClick={handleBack}
          disabled={step === 0}
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: 'none', color: '#6b7280' }}
        >
          Back
        </Button>

        {step < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={<ArrowForwardIcon />}
            disabled={step === 0 && data.selectedGoals.length === 0}
            sx={{
              bgcolor: '#171717',
              textTransform: 'none',
              px: 4,
              '&:hover': { bgcolor: '#374151' },
            }}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleComplete}
            disabled={saving}
            sx={{
              bgcolor: '#171717',
              textTransform: 'none',
              px: 4,
              '&:hover': { bgcolor: '#374151' },
            }}
          >
            {saving ? 'Saving...' : 'Get Started 🚀'}
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default Onboarding

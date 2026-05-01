import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import TimerIcon from '@mui/icons-material/Timer'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import { EXERCISE_LIBRARY } from '../../lib/gymConstants'

function ActiveWorkoutSession({
  currentWorkout,
  setCurrentWorkout,
  elapsedTime,
  formatTime,
  setTemplateName,
  setSaveRoutineDialogOpen,
  cancelWorkout,
  finishWorkout,
  removeExercise,
  updateSet,
  removeSet,
  addSet,
  setExerciseDialogOpen
}) {
  return (
    <Box sx={{ 
      p: 3, 
      mb: 3, 
      bgcolor: 'text.primary', 
      borderRadius: 2,
      color: 'background.paper',
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#9ca3af' }}>
              Workout Date
            </Typography>
            <TextField
              type="date"
              size="small"
              value={currentWorkout.date}
              onChange={(e) => {
                const newDate = e.target.value
                setCurrentWorkout(prev => {
                  const updated = { ...prev, date: newDate }
                  if (prev.name.startsWith('Workout -')) {
                    const d = new Date(newDate)
                    if (!Number.isNaN(d.getTime())) {
                      updated.name = `Workout - ${d.toLocaleDateString()}`
                    }
                  }
                  return updated
                })
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: 'background.paper',
                  fontSize: '0.875rem',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                },
                '& input': { color: 'background.paper', py: 0.5 },
              }}
            />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#9ca3af' }}>
              Elapsed Time
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TimerIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
              <Typography variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {formatTime(elapsedTime)}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setTemplateName(currentWorkout.name || '');
              setSaveRoutineDialogOpen(true);
            }}
            sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#9ca3af', textTransform: 'none' }}
          >
            Save as Routine
          </Button>
          <Button
            variant="outlined"
            onClick={cancelWorkout}
            sx={{ 
              borderColor: 'rgba(255,255,255,0.3)', 
              color: '#9ca3af',
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={finishWorkout}
            sx={{ 
              bgcolor: '#15803d', 
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#166534' },
            }}
          >
            Finish Workout
          </Button>
        </Box>
      </Box>

      {/* Exercises */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {currentWorkout.exercises.map((exercise, exIdx) => (
          <Box 
            key={exIdx}
            sx={{ 
              p: 2, 
              bgcolor: 'rgba(255,255,255,0.05)', 
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={EXERCISE_LIBRARY[exercise.muscleGroup]?.label || exercise.muscleGroup}
                  size="small"
                  sx={{
                    bgcolor: EXERCISE_LIBRARY[exercise.muscleGroup]?.color || 'text.secondary',
                    color: 'background.paper',
                    fontWeight: 600,
                  }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {exercise.name}
                </Typography>
                <Chip 
                  label="PR WATCH" 
                  size="small" 
                  sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid #f59e0b', fontWeight: 700 }}
                />
              </Box>
              <IconButton size="small" onClick={() => removeExercise(exIdx)} sx={{ color: '#ef4444' }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Sets */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 40px 40px', gap: 1, mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>Set</Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>Weight (kg)</Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>Reps</Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>RPE</Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}></Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}></Typography>
              </Box>
              {exercise.sets.map((set, setIdx) => (
                <Box key={setIdx} sx={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 40px 40px', gap: 1, mb: 1, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{setIdx + 1}</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={set.weight || ''}
                    onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: set.completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.1)',
                        color: 'background.paper',
                        '& fieldset': { borderColor: set.completed ? '#10b981' : 'rgba(255,255,255,0.2)' },
                      },
                      '& input': { color: 'background.paper', textAlign: 'center' },
                    }}
                  />
                  <TextField
                    type="number"
                    value={set.reps || ''}
                    onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: set.completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.1)',
                        color: 'background.paper',
                        '& fieldset': { borderColor: set.completed ? '#10b981' : 'rgba(255,255,255,0.2)' },
                      },
                      '& input': { color: 'background.paper', textAlign: 'center' },
                    }}
                  />
                  <TextField
                    type="number"
                    value={set.rpe || ''}
                    onChange={(e) => updateSet(exIdx, setIdx, 'rpe', e.target.value)}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: set.completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.1)',
                        color: 'background.paper',
                        '& fieldset': { borderColor: set.completed ? '#10b981' : 'rgba(255,255,255,0.2)' },
                      },
                      '& input': { color: 'background.paper', textAlign: 'center' },
                    }}
                  />
                  <IconButton 
                    size="small" 
                    onClick={() => completeSet(exIdx, setIdx)}
                    sx={{ color: set.completed ? '#10b981' : 'text.secondary' }}
                  >
                    {set.completed ? <CheckCircleIcon /> : <CheckCircleOutlineIcon />}
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => removeSet(exIdx, setIdx)}
                    disabled={exercise.sets.length <= 1}
                    sx={{ color: 'text.secondary' }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                size="small"
                onClick={() => addSet(exIdx)}
                sx={{ color: '#60a5fa', textTransform: 'none', alignSelf: 'flex-start' }}
              >
                + Add Set
              </Button>
            </Box>
          </Box>
        ))}

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setExerciseDialogOpen(true)}
          sx={{
            borderColor: 'rgba(255,255,255,0.3)',
            color: 'background.paper',
            textTransform: 'none',
            py: 1.5,
            '&:hover': { borderColor: 'background.paper', bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          Add Exercise
        </Button>
      </Box>
    </Box>
  )
}

export default ActiveWorkoutSession

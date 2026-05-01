import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import HistoryIcon from '@mui/icons-material/History'
import TimerIcon from '@mui/icons-material/Timer'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import CloseIcon from '@mui/icons-material/Close'
import { EXERCISE_LIBRARY } from '../../lib/gymConstants'

function GymHistoryTab({
  workouts,
  loading
}) {
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleWorkoutClick = (workout) => {
    setSelectedWorkout(workout)
    setDialogOpen(true)
  }

  if (loading) {
    return <Typography sx={{ p: 4, textAlign: 'center' }}>Loading history...</Typography>
  }

  if (workouts.length === 0) {
    return (
      <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2, border: '1px dashed #e5e7eb' }}>
        <HistoryIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>No workouts logged yet.</Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af' }}>Your completed workouts will appear here.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {workouts.map((workout) => (
        <Box
          key={workout._id}
          onClick={() => handleWorkoutClick(workout)}
          sx={{
            p: 3,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { borderColor: 'text.primary', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {workout.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {new Date(workout.date).toLocaleDateString(undefined, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                icon={<TimerIcon sx={{ fontSize: '14px !important' }} />}
                label={`${Math.round((workout.duration || 0) / 60)} min`} 
                size="small" 
                sx={{ height: 24, fontSize: '0.75rem', bgcolor: 'action.selected' }} 
              />
              <Chip 
                icon={<FitnessCenterIcon sx={{ fontSize: '14px !important' }} />}
                label={`${(workout.exercises?.reduce((sum, ex) => sum + (ex.sets?.reduce((s, set) => s + (set.reps * set.weight), 0) || 0), 0) / 1000).toFixed(1)}k kg`} 
                size="small" 
                sx={{ height: 24, fontSize: '0.75rem', bgcolor: '#f0fdf4', color: '#166534' }} 
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {workout.exercises?.map((ex, idx) => (
              <Chip
                key={idx}
                label={`${ex.name} (${ex.sets?.length || 0} sets)`}
                size="small"
                variant="outlined"
                sx={{ 
                  height: 22, 
                  fontSize: '0.7rem', 
                  borderColor: EXERCISE_LIBRARY[ex.muscleGroup]?.color || 'divider',
                  color: EXERCISE_LIBRARY[ex.muscleGroup]?.color || 'text.secondary',
                  bgcolor: `${EXERCISE_LIBRARY[ex.muscleGroup]?.color}05` || 'transparent'
                }}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>

    {/* Workout Details Dialog */}
    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {selectedWorkout?.name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {selectedWorkout?.date && new Date(selectedWorkout.date).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setDialogOpen(false)}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {selectedWorkout && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Workout Stats */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<TimerIcon sx={{ fontSize: '14px !important' }} />}
                label={`${Math.round((selectedWorkout.duration || 0) / 60)} min`}
                size="small"
                sx={{ height: 24, fontSize: '0.75rem', bgcolor: 'action.selected' }}
              />
              <Chip
                icon={<FitnessCenterIcon sx={{ fontSize: '14px !important' }} />}
                label={`${(selectedWorkout.exercises?.reduce((sum, ex) => sum + (ex.sets?.reduce((s, set) => s + (set.reps * set.weight), 0) || 0), 0) / 1000).toFixed(1)}k kg`}
                size="small"
                sx={{ height: 24, fontSize: '0.75rem', bgcolor: '#f0fdf4', color: '#166534' }}
              />
              <Chip
                label={`${selectedWorkout.exercises?.length || 0} exercises`}
                size="small"
                sx={{ height: 24, fontSize: '0.75rem', bgcolor: '#eff6ff', color: '#1e40af' }}
              />
            </Box>

            {/* Exercises Details */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedWorkout.exercises?.map((ex, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1.5,
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {ex.name}
                    </Typography>
                    <Chip
                      label={ex.muscleGroup}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: EXERCISE_LIBRARY[ex.muscleGroup]?.color || 'divider',
                        color: 'background.paper'
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
                    {ex.sets?.map((set, setIdx) => (
                      <Box
                        key={setIdx}
                        sx={{
                          p: 1,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Set {setIdx + 1}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {set.weight}kg × {set.reps}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Notes */}
            {selectedWorkout.notes && (
              <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 1.5, border: '1px solid #fcd34d' }}>
                <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ color: '#78350f' }}>
                  {selectedWorkout.notes}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default GymHistoryTab

import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import HistoryIcon from '@mui/icons-material/History'
import TimerIcon from '@mui/icons-material/Timer'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import { EXERCISE_LIBRARY } from '../../lib/gymConstants'

function GymHistoryTab({
  workouts,
  loading
}) {
  if (loading) {
    return <Typography sx={{ p: 4, textAlign: 'center' }}>Loading history...</Typography>
  }

  if (workouts.length === 0) {
    return (
      <Box sx={{ py: 10, textAlign: 'center', bgcolor: '#f9fafb', borderRadius: 2, border: '1px dashed #e5e7eb' }}>
        <HistoryIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
        <Typography variant="body1" sx={{ color: '#6b7280', fontWeight: 500 }}>No workouts logged yet.</Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af' }}>Your completed workouts will appear here.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {workouts.map((workout) => (
        <Box 
          key={workout._id} 
          sx={{ 
            p: 3, 
            bgcolor: '#fff', 
            borderRadius: 2, 
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#171717', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#171717' }}>
                {workout.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
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
                sx={{ height: 24, fontSize: '0.75rem', bgcolor: '#f3f4f6' }} 
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
                  borderColor: EXERCISE_LIBRARY[ex.muscleGroup]?.color || '#e5e7eb',
                  color: EXERCISE_LIBRARY[ex.muscleGroup]?.color || '#6b7280',
                  bgcolor: `${EXERCISE_LIBRARY[ex.muscleGroup]?.color}05` || 'transparent'
                }}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export default GymHistoryTab

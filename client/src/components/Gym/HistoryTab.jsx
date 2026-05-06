import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

const HistoryTab = ({
  workouts,
  handleWorkoutClick,
  editWorkout,
  deleteWorkout,
  EXERCISE_LIBRARY
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {workouts.length > 0 ? (
        workouts.map((workout, idx) => (
          <Box
            key={idx}
            onClick={() => handleWorkoutClick(workout)}
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'text.primary', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {workout.name || 'Workout'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {new Date(workout.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })} • {Math.round((workout.duration || 0) / 60)} min
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                <IconButton
                  size="small"
                  onClick={(e) => editWorkout(workout, e)}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'rgba(0,0,0,0.04)' } }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => deleteWorkout(workout._id, e)}
                  sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              {[...new Set(workout.exercises?.map(e => e.muscleGroup) || [])]?.map((muscle, i) => (
                <Chip
                  key={i}
                  label={EXERCISE_LIBRARY[muscle]?.label || muscle}
                  size="small"
                  sx={{
                    bgcolor: EXERCISE_LIBRARY[muscle]?.color || 'text.secondary',
                    color: 'background.paper',
                    fontWeight: 500,
                    fontSize: '0.7rem',
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {workout.exercises?.map((ex, i) => {
                const allExercises = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises);
                const exDef = allExercises.find(e => e.name === ex.name);
                const isCardio = exDef?.logType === 'cardio';

                return (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f3f4f6' }}>
                    <Typography variant="body2">{ex.name}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {ex.sets?.map(s => {
                        if (isCardio) {
                          return `${s.duration || 0}m` + (s.distance ? ` (${s.distance}km)` : '');
                        }
                        return `${s.weight}kg × ${s.reps}`;
                      }).join(', ')}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <FitnessCenterIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            No workouts logged yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Start your first workout to see your history
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default HistoryTab;

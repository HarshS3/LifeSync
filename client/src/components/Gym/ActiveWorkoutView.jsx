import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import TimerIcon from '@mui/icons-material/Timer';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import PlateCalculator from '../PlateCalculator';
import LastSetsReference from '../LastSetsReference';

/**
 * ActiveWorkoutView Component
 * Displays the current ongoing workout session.
 */
const ActiveWorkoutView = ({
  currentWorkout,
  elapsedTime,
  formatTime,
  handleTimerClick,
  templateName,
  setTemplateName,
  setSaveRoutineDialogOpen,
  cancelWorkout,
  handleFinishWorkout,
  removeExercise,
  removeSet,
  updateSet,
  addSet,
  setExerciseDialogOpen,
  exerciseLastSets,
  navigate,
  isMobile,
  EXERCISE_LIBRARY
}) => {
  if (!currentWorkout) return null;

  return (
    <Box sx={{ 
      p: 3, 
      pb: { xs: 12, sm: 3 }, // extra padding for fixed mobile action bar
      mb: 3, 
      bgcolor: '#111827', 
      borderRadius: 2,
      color: '#f9fafb',
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#9ca3af' }}>
            Active Workout
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontFamily: 'monospace', 
              fontWeight: 700, 
              color: '#3b82f6',
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 }
            }}
            onClick={handleTimerClick}
            title="Click to edit time"
          >
            {formatTime(elapsedTime)}
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
            Workout Time
          </Typography>
        </Box>
      </Box>

      {/* Routine Controls */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: '#9ca3af', fontStyle: 'italic' }}>
          Session in progress...
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            size="small" 
            variant="outlined" 
            color="error"
            onClick={cancelWorkout}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            size="small" 
            variant="contained" 
            onClick={() => setSaveRoutineDialogOpen(true)}
            sx={{ textTransform: 'none', bgcolor: '#3b82f6' }}
          >
            Save Routine
          </Button>
          <Button 
            size="small" 
            variant="contained" 
            onClick={handleFinishWorkout}
            sx={{ 
              textTransform: 'none', 
              bgcolor: '#10b981', 
              '&:hover': { bgcolor: '#059669' },
              fontWeight: 700
            }}
          >
            Finish Workout
          </Button>
        </Box>
      </Box>

      {/* Exercises */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {currentWorkout.exercises?.map((exercise, exIdx) => (
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
                    color: '#ffffff',
                    fontWeight: 600,
                  }}
                />
                <Typography 
                  variant="subtitle1" 
                  sx={{ fontWeight: 600, cursor: 'pointer', color: '#3b82f6', '&:hover': { textDecoration: 'underline' } }}
                  onClick={() => navigate(`/exercise-history/${encodeURIComponent(exercise.name)}`)}
                  title="View exercise history"
                >
                  {exercise.name}
                </Typography>
                <Chip 
                  label="PR WATCH" 
                  size="small" 
                  sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid #f59e0b', fontWeight: 700 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  size="small" 
                  onClick={() => navigate(`/exercise-history/${encodeURIComponent(exercise.name)}`)}
                  sx={{ textTransform: 'none', color: '#3b82f6', fontSize: '0.75rem' }}
                >
                  History
                </Button>
                <IconButton 
                  size="small" 
                  color="error" 
                  onClick={() => removeExercise(exIdx)}
                  sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {exercise.sets?.map((set, setIdx) => (
                <Box 
                  key={setIdx} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 1, sm: 2 },
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'rgba(255,255,255,0.02)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                    flexWrap: 'wrap'
                  }}
                >
                  {(() => {
                    const lastSets = exerciseLastSets[exercise.name] || [];
                    const placeholderSet = lastSets[setIdx] || lastSets[lastSets.length - 1] || {};
                    return (
                      <>
                        <Typography variant="body2" sx={{ width: 24, textAlign: 'center', color: '#9ca3af', fontWeight: 700 }}>
                          {setIdx + 1}
                        </Typography>

                        {/* Dynamic inputs based on exercise type */}
                        {(() => {
                          const allExercises = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises);
                          const exDef = allExercises.find(e => e.name.toLowerCase() === exercise.name.toLowerCase());
                          
                          if (exDef && exDef.logType === 'cardio' && exDef.logFields) {
                            return exDef.logFields.map(field => (
                              <TextField
                                key={field.key}
                                size="small"
                                label={field.label}
                                placeholder={String(placeholderSet[field.key] || '')}
                                value={set[field.key] || ''}
                                onChange={(e) => updateSet(exIdx, setIdx, field.key, e.target.value)}
                                sx={{ 
                                  width: { xs: '70px', sm: '90px' },
                                  '& .MuiOutlinedInput-root': { 
                                    color: '#ffffff', 
                                    fontSize: '0.875rem',
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                                  },
                                  '& .MuiInputBase-input': { color: '#ffffff' },
                                  '& .MuiInputLabel-root': { color: '#9ca3af', fontSize: '0.75rem' },
                                  '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
                                }}
                              />
                            ));
                          }

                          // Default Weight/Reps/RPE
                          return (
                            <>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <TextField
                                  size="small"
                                  label="kg"
                                  type="number"
                                  placeholder={String(placeholderSet.weight || '')}
                                  value={set.weight || ''}
                                  onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  sx={{ 
                                    width: { xs: '65px', sm: '80px' },
                                    '& .MuiOutlinedInput-root': { 
                                      color: '#ffffff', 
                                      fontSize: '0.875rem',
                                      bgcolor: 'rgba(255,255,255,0.05)',
                                      '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                                      '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                                    },
                                    '& .MuiInputBase-input': {
                                      color: '#ffffff',
                                      '&::placeholder': { color: 'rgba(255,255,255,0.3)', opacity: 1 },
                                    },
                                    '& .MuiInputLabel-root': { color: '#9ca3af', fontSize: '0.75rem' },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
                                  }}
                                />
                                {(() => {
                                  const allExercises = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises);
                                  const exDef = allExercises.find(e => e.name.toLowerCase() === exercise.name.toLowerCase());
                                  return exDef?.equipment === 'BB' && (
                                    <PlateCalculator 
                                      weight={Number(set.weight) || Number(placeholderSet.weight) || 0} 
                                      anchorColor="rgba(255,255,255,0.2)"
                                    />
                                  );
                                })()}
                              </Box>
                              <TextField
                                size="small"
                                label="reps"
                                type="number"
                                placeholder={String(placeholderSet.reps || '')}
                                value={set.reps || ''}
                                onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                                onFocus={(e) => e.target.select()}
                                sx={{ 
                                  width: { xs: '65px', sm: '80px' },
                                  '& .MuiOutlinedInput-root': { 
                                    color: '#ffffff', 
                                    fontSize: '0.875rem',
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                                  },
                                  '& .MuiInputBase-input': {
                                    color: '#ffffff',
                                    '&::placeholder': { color: 'rgba(255,255,255,0.3)', opacity: 1 },
                                  },
                                  '& .MuiInputLabel-root': { color: '#9ca3af', fontSize: '0.75rem' },
                                  '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
                                }}
                              />
                              <TextField
                                size="small"
                                label="RPE"
                                type="number"
                                placeholder={String(placeholderSet.rpe || '')}
                                value={set.rpe || ''}
                                onChange={(e) => updateSet(exIdx, setIdx, 'rpe', e.target.value)}
                                onFocus={(e) => e.target.select()}
                                sx={{ 
                                  width: { xs: '55px', sm: '70px' },
                                  '& .MuiOutlinedInput-root': { 
                                    color: '#ffffff', 
                                    fontSize: '0.875rem',
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                                  },
                                  '& .MuiInputBase-input': {
                                    color: '#ffffff',
                                    '&::placeholder': { color: 'rgba(255,255,255,0.3)', opacity: 1 },
                                  },
                                  '& .MuiInputLabel-root': { color: '#9ca3af', fontSize: '0.75rem' },
                                  '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
                                }}
                              />
                            </>
                          );
                        })()}
                      </>
                    );
                  })()}

                  <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                    {setIdx === exercise.sets.length - 1 && (
                      <IconButton 
                        size="small" 
                        onClick={() => addSet(exIdx)}
                        sx={{ color: '#3b82f6', bgcolor: 'rgba(59, 130, 246, 0.1)', '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.2)' } }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton 
                      size="small" 
                      onClick={() => removeSet(exIdx, setIdx)}
                      disabled={exercise.sets.length === 1}
                      sx={{ color: '#ef4444', opacity: exercise.sets.length === 1 ? 0.2 : 0.6, '&:hover': { opacity: 1 } }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}

              <LastSetsReference 
                exerciseName={exercise.name} 
                lastSets={exerciseLastSets[exercise.name]} 
                isDark={true}
              />
            </Box>
          </Box>
        ))}

        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setExerciseDialogOpen(true)}
          sx={{ 
            py: 1.5, 
            borderStyle: 'dashed', 
            borderColor: 'rgba(255,255,255,0.2)',
            color: '#9ca3af',
            '&:hover': {
              borderColor: '#3b82f6',
              color: '#3b82f6',
              bgcolor: 'rgba(59, 130, 246, 0.05)'
            }
          }}
        >
          Add Exercise
        </Button>
      </Box>
    </Box>
  );
};

export default ActiveWorkoutView;

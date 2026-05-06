import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import TimerIcon from '@mui/icons-material/Timer';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

const WorkoutDialogs = ({
  // Template Dialog
  templateDialogOpen,
  setTemplateDialogOpen,
  templates,
  useTemplate,
  deleteTemplate,
  
  // Save Routine Dialog
  saveRoutineDialogOpen,
  setSaveRoutineDialogOpen,
  templateName,
  setTemplateName,
  saveCurrentAsTemplate,
  
  // Workout Details Dialog
  workoutDialogOpen,
  setWorkoutDialogOpen,
  selectedWorkout,
  EXERCISE_LIBRARY,
  
  // Edit Timer Dialog
  editTimerOpen,
  setEditTimerOpen,
  editTimerHours,
  setEditTimerHours,
  editTimerMinutes,
  setEditTimerMinutes,
  editTimerSeconds,
  setEditTimerSeconds,
  handleTimerSave,
  
  // Add Exercise Dialog
  exerciseDialogOpen,
  setExerciseDialogOpen,
  selectedMuscle,
  setSelectedMuscle,
  selectedExercise,
  setSelectedExercise,
  customExercise,
  setCustomExercise,
  addExercise
}) => {
  return (
    <>
      {/* Routine/Template Selection Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Workout Routines</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
            Choose a saved routine to start your workout instantly.
          </Typography>
          {templates.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', bgcolor: 'background.default', borderRadius: 2, border: '1px dashed #e2e8f0' }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>You haven't saved any routines yet.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {templates.map((tpl) => (
                <Box
                  key={tpl._id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      bgcolor: '#f0f9ff',
                      borderColor: '#38bdf8',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    },
                    '&:active': {
                      transform: 'translateY(0px)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }
                  }}
                  onClick={() => { useTemplate(tpl); setTemplateDialogOpen(false); }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{tpl.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {tpl.exercises?.length || 0} exercises • {tpl.description}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => deleteTemplate(tpl._id, e)}
                      sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Save Routine Dialog */}
      <Dialog open={saveRoutineDialogOpen} onClose={() => setSaveRoutineDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Save as Routine</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Give this routine a name to reuse it later.
          </Typography>
          <TextField
            autoFocus
            label="Routine Name"
            fullWidth
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            sx={{ 
              mt: 1,
              '& .MuiOutlinedInput-root': { 
                bgcolor: 'rgba(0,0,0,0.02)',
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' }
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setSaveRoutineDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => { saveCurrentAsTemplate(templateName); setSaveRoutineDialogOpen(false); }}
            sx={{ bgcolor: 'text.primary', '&:hover': { bgcolor: 'text.secondary' } }}
            disabled={!templateName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Workout Details Dialog */}
      <Dialog open={workoutDialogOpen} onClose={() => setWorkoutDialogOpen(false)} maxWidth="md" fullWidth>
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
          <IconButton size="small" onClick={() => setWorkoutDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedWorkout && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{ex.name}</Typography>
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
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Set {setIdx + 1}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {(() => {
                              const allExercises = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises);
                              const exDef = allExercises.find(e => e.name === ex.name);
                              if (exDef?.logType === 'cardio') {
                                return `${set.duration || 0}m` + (set.distance ? ` @ ${set.distance}km` : '');
                              }
                              return `${set.weight}kg × ${set.reps}`;
                            })()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>

              {selectedWorkout.notes && (
                <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 1.5, border: '1px solid #fcd34d' }}>
                  <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600, display: 'block', mb: 0.5 }}>Notes</Typography>
                  <Typography variant="body2" sx={{ color: '#78350f' }}>{selectedWorkout.notes}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Timer Dialog */}
      <Dialog open={editTimerOpen} onClose={() => setEditTimerOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Adjust Workout Duration</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField 
              label="Hours" 
              type="number" 
              value={editTimerHours} 
              onChange={e => setEditTimerHours(e.target.value)} 
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.02)' } }}
            />
            <TextField 
              label="Minutes" 
              type="number" 
              value={editTimerMinutes} 
              onChange={e => setEditTimerMinutes(e.target.value)} 
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.02)' } }}
            />
            <TextField 
              label="Seconds" 
              type="number" 
              value={editTimerSeconds} 
              onChange={e => setEditTimerSeconds(e.target.value)} 
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.02)' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTimerOpen(false)}>Cancel</Button>
          <Button onClick={handleTimerSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Add Exercise Dialog */}
      <Dialog open={exerciseDialogOpen} onClose={() => setExerciseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Exercise</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Muscle Group"
              fullWidth
              value={selectedMuscle}
              onChange={(e) => {
                setSelectedMuscle(e.target.value);
                setSelectedExercise('');
              }}
            >
              {Object.entries(EXERCISE_LIBRARY).map(([key, group]) => (
                <MenuItem key={key} value={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: group.color }} />
                    {group.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Exercise"
              fullWidth
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              disabled={!selectedMuscle}
            >
              {selectedMuscle && EXERCISE_LIBRARY[selectedMuscle]?.exercises.map((ex) => (
                <MenuItem key={ex.name} value={ex.name}>{ex.name}</MenuItem>
              ))}
              <MenuItem value="custom">+ Custom Exercise</MenuItem>
            </TextField>

            {selectedExercise === 'custom' && (
              <TextField
                label="Exercise Name"
                fullWidth
                value={customExercise}
                onChange={(e) => setCustomExercise(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.02)' } }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExerciseDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={addExercise}
            disabled={!selectedMuscle || (!selectedExercise && !customExercise)}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WorkoutDialogs;

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

export function VoiceNutritionConfirm({ transcript, preview, onConfirm, onCancel }) {
  const [editing, setEditing] = useState(false);
  
  // Extract meals from the legacy preview format or adapted format
  // For the Agent, we typically just bypass this modal directly if the agent replies successfully,
  // but if we are migrating phase 4 exactly as spec'd:
  const initialItems = preview?.updates?.[0]?.patch?.meals?.[0]?.foods || [];
  const [editedItems, setEditedItems] = useState(initialItems);
  
  return (
    <Dialog open onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Confirm Meal Log</DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          "{transcript}"
        </Typography>
        
        {editedItems.length > 0 ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Detected Items:</Typography>
            {editedItems.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
                <TextField 
                  label="Food" 
                  value={item.name}
                  onChange={(e) => {
                     const newI = [...editedItems]; 
                     newI[idx].name = e.target.value; 
                     setEditedItems(newI);
                  }}
                  size="small"
                  disabled={!editing}
                  sx={{ flex: 2 }}
                />
                <TextField 
                  label="Qty" 
                  type="number"
                  value={item.quantity || ''}
                  onChange={(e) => {
                     const newI = [...editedItems]; 
                     newI[idx].quantity = e.target.value; 
                     setEditedItems(newI);
                  }}
                  size="small"
                  disabled={!editing}
                  sx={{ flex: 1 }}
                />
                <TextField 
                  label="Unit" 
                  value={item.unit || 'g'}
                  onChange={(e) => {
                     const newI = [...editedItems]; 
                     newI[idx].unit = e.target.value; 
                     setEditedItems(newI);
                  }}
                  size="small"
                  disabled={!editing}
                  sx={{ flex: 1 }}
                />
                <Typography variant="caption" sx={{ minWidth: 60, textAlign: 'right' }}>
                  ~{item.calories} kcal
                </Typography>
                {editing && (
                  <IconButton 
                    size="small" 
                    onClick={() => setEditedItems(editedItems.filter((_, i) => i !== idx))}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>
        ) : (
           <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic', color: '#666' }}>
             No exact nutritional items were statically extracted. The Nutrition Agent will process this directly.
           </Typography>
        )}
        
        {editedItems.length > 0 && (
           <Button 
             variant="text" 
             size="small"
             onClick={() => setEditing(!editing)}
             sx={{ mt: 1 }}
           >
             {editing ? 'Done Editing' : 'Edit Items'}
           </Button>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onCancel} color="inherit">Cancel</Button>
        <Button 
          onClick={() => onConfirm(editedItems.length > 0 ? editedItems : null)} 
          variant="contained" 
          disableElevation
          sx={{ bgcolor: 'text.primary', '&:hover': { bgcolor: '#262626' } }}
        >
          {editedItems.length > 0 ? 'Confirm & Log' : 'Let Agent Handle It'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
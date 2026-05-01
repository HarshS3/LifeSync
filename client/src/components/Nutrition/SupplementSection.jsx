import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import DeleteIcon from '@mui/icons-material/Delete'

function SupplementSection({ log, onUpdate }) {
  const [selectedSupp, setSelectedSupp] = useState('');
  const [loading, setLoading] = useState(false);

  const SUPPLEMENT_PRESETS = [
    'Whey Protein (1 Scoop)',
    'Creatine Monohydrate (5g)',
    'Multivitamin (Standard)',
    'Omega-3 Fish Oil (1000mg)',
    'Vitamin D3 (2000IU)',
    'Magnesium Glycinate (200mg)',
    'Zinc Gluconate (30mg)',
    'B-Complex (High Dose)'
  ];

  const SUPPLEMENT_DATA = {
    'Whey Protein (1 Scoop)': { calories: 120, protein: 25, carbs: 3, fat: 1.5, calcium: 150 },
    'Creatine Monohydrate (5g)': { protein: 0 },
    'Multivitamin (Standard)': { vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminB12: 2.4, folate: 400, iron: 18, zinc: 11, selenium: 55, magnesium: 100 },
    'Omega-3 Fish Oil (1000mg)': { fat: 1, omega3: 300 },
    'Vitamin D3 (2000IU)': { vitaminD: 50 },
    'Magnesium Glycinate (200mg)': { magnesium: 200 },
    'Zinc Gluconate (30mg)': { zinc: 30 },
    'B-Complex (High Dose)': { vitaminB1: 50, vitaminB2: 50, vitaminB3: 50, vitaminB6: 50, vitaminB12: 100, folate: 400 }
  };

  const addSupplement = async () => {
    if (!selectedSupp) return;
    setLoading(true);
    const nutriments = SUPPLEMENT_DATA[selectedSupp];
    const newSupp = { 
      name: selectedSupp, 
      nutriments, 
      takenAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    
    const updatedSupps = [...(log.supplements || []), newSupp];
    await onUpdate(updatedSupps);
    setSelectedSupp('');
    setLoading(false);
  };

  const removeSupp = async (idx) => {
    const updatedSupps = log.supplements.filter((_, i) => i !== idx);
    await onUpdate(updatedSupps);
  };

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        💊 Supplement Stack
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
        {(log.supplements || []).map((s, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{s.name}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {Object.keys(s.nutriments || {}).length} nutrients · {s.takenAt}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => removeSupp(i)}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
          </Box>
        ))}
        {(!log.supplements || log.supplements.length === 0) && (
          <Typography variant="caption" sx={{ color: '#9ca3af' }}>No supplements logged for today.</Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Add Supplement</InputLabel>
          <Select
            value={selectedSupp}
            onChange={(e) => setSelectedSupp(e.target.value)}
            label="Add Supplement"
          >
            {SUPPLEMENT_PRESETS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={addSupplement} disabled={!selectedSupp || loading}>Add</Button>
      </Box>
    </Box>
  );
}

export default SupplementSection

import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export default function PlateCalculator({ targetWeight = 60, barWeight = 20 }) {
  const [weight, setWeight] = useState(targetWeight);

  const platesPerSide = useMemo(() => {
    let remaining = (weight - barWeight) / 2;
    if (remaining <= 0) return [];
    
    const result = [];
    for (const plate of PLATES) {
      while (remaining >= plate) {
        result.push(plate);
        remaining -= plate;
      }
    }
    return result;
  }, [weight, barWeight]);

  return (
    <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
          Plate Calculator
        </Typography>
        <TextField
          size="small"
          type="number"
          label="Target kg"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          sx={{ 
            width: 100,
            '& .MuiOutlinedInput-root': { 
              color: '#ffffff', 
              fontSize: '0.8rem',
              bgcolor: 'rgba(255,255,255,0.05)',
              height: 32,
              '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
            },
            '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.7rem' }
          }}
        />
      </Box>

      {platesPerSide.length > 0 ? (
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
            Plates per side ({barWeight}kg bar):
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {platesPerSide.map((p, i) => (
              <Chip 
                key={i} 
                label={`${p}kg`} 
                size="small" 
                sx={{ 
                  bgcolor: p >= 20 ? '#ef4444' : p >= 10 ? '#3b82f6' : '#10b981', 
                  color: 'background.paper', 
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 20
                }} 
              />
            ))}
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
          Weight is less than or equal to bar weight.
        </Typography>
      )}
    </Box>
  );
}

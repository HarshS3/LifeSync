import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Stat Card Component for Gym Tracker
 */
function StatCard({ icon, label, value, sublabel, color }) {
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        textAlign: 'center',
      }}
    >
      <Box sx={{ color, mb: 1 }}>{icon}</Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {value}
        {sublabel && (
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary', ml: 0.5 }}>
            {sublabel}
          </Typography>
        )}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
    </Box>
  );
}

export default StatCard;

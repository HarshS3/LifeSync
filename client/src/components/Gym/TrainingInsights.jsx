import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import InsightsIcon from '@mui/icons-material/Insights'
import TimelineIcon from '@mui/icons-material/Timeline'

export default function TrainingInsights({ trainingInsights }) {
  if (!trainingInsights || trainingInsights.length === 0) return null

  return (
    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <AutoGraphIcon sx={{ color: '#38bdf8' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary' }}>
            Performance Analysis & Insights
          </Typography>
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {trainingInsights.map((insight, idx) => {
            let Icon = InsightsIcon;
            let color = '#64748b';
            let bgColor = 'background.default';
            
            if (insight.title.includes('Progression')) { Icon = TimelineIcon; color = '#10b981'; bgColor = '#ecfdf5'; }
            else if (insight.title.includes('Plateau')) { Icon = InsightsIcon; color = '#f59e0b'; bgColor = '#fffbeb'; }
            
            return (
              <Box key={idx} sx={{ 
                p: 2, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : bgColor, 
                borderRadius: 2, 
                border: `1px solid ${color}20` 
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Icon sx={{ color, fontSize: '1.2rem' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {insight.title}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                  {insight.text}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}

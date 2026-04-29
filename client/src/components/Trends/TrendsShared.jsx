import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'

export const StatCard = ({ label, value, unit, trend }) => (
  <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', flex: 1, minWidth: 160 }}>
    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>{label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827' }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: '#9ca3af' }}>{unit}</Typography>
    </Box>
    {trend && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
        {trend > 0 ? (
          <TrendingUpIcon sx={{ fontSize: 14, color: '#10b981' }} />
        ) : (
          <TrendingDownIcon sx={{ fontSize: 14, color: '#ef4444' }} />
        )}
        <Typography variant="caption" sx={{ color: trend > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
          {Math.abs(trend)}% vs last week
        </Typography>
      </Box>
    )}
  </Box>
)

export const BarChart = ({ items, maxValue, valueKey, labelKey }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 160, pt: 2 }}>
    {items.slice(-7).map((item, idx) => {
      const val = item[valueKey] || 0
      const height = Math.max(10, (val / maxValue) * 100)
      return (
        <Box key={idx} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: '100%',
              height: `${height}%`,
              bgcolor: '#171717',
              borderRadius: '4px 4px 0 0',
              opacity: 0.8,
              transition: 'height 0.3s',
            }}
          />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            {new Date(item[labelKey]).toLocaleDateString('en-US', { weekday: 'short' })}
          </Typography>
        </Box>
      )
    })}
  </Box>
)

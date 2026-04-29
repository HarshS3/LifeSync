import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import RecoveryCapacity from '../RecoveryCapacity'
import { StatCard, BarChart } from './TrendsShared'

function TrainingTab({ data, trainingInsights, calcAvg }) {
  return (
    <Box>
      <RecoveryCapacity />
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <StatCard label="Avg Duration" value={calcAvg(data.fitness, 'duration')} unit="min" trend={8} />
        <StatCard label="Avg Intensity" value={calcAvg(data.fitness, 'intensity')} unit="/10" trend={-3} />
        <StatCard label="Sessions" value={data.fitness.length} trend={12} />
      </Box>

      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
          Training Insights
        </Typography>
        {trainingInsights.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {trainingInsights.map((p, idx) => (
              <Box key={idx} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography variant="body2" sx={{ color: '#374151', fontWeight: 600, mb: 0.5 }}>
                  {p.title}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                  {p.detail}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
            Log a few workouts to surface training insights here.
          </Typography>
        )}
      </Box>

      {data.fitness.length > 0 && (
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle2" sx={{ mb: 3, color: '#6b7280' }}>
            Duration (last 7 sessions)
          </Typography>
          <BarChart items={data.fitness} maxValue={120} valueKey="duration" labelKey="date" />
        </Box>
      )}
    </Box>
  )
}

export default TrainingTab

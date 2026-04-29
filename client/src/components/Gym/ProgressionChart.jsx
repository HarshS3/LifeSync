import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ProgressionChart({ 
  allExerciseNames, 
  selectedAnalysisExercise, 
  setSelectedAnalysisExercise, 
  analysisChartMode, 
  setAnalysisChartMode, 
  exerciseProgressionData 
}) {
  return (
    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoGraphIcon sx={{ color: '#ec4899' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              Exercise Progression
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Select
              size="small"
              value={selectedAnalysisExercise}
              onChange={(e) => setSelectedAnalysisExercise(e.target.value)}
              sx={{ minWidth: 200, height: 32, fontSize: '0.8rem' }}
            >
              {allExerciseNames.map(name => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={analysisChartMode}
              onChange={(e) => setAnalysisChartMode(e.target.value)}
              sx={{ height: 32, fontSize: '0.8rem' }}
            >
              <MenuItem value="1rm">Est. 1RM</MenuItem>
              <MenuItem value="weight">Max Weight</MenuItem>
            </Select>
          </Box>
        </Box>

        {exerciseProgressionData.length > 1 ? (
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={exerciseProgressionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  unit="kg"
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey={analysisChartMode === '1rm' ? 'oneRepMax' : 'weight'} 
                  stroke="#ec4899" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name={analysisChartMode === '1rm' ? 'Est. 1RM' : 'Max Weight'}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Need at least 2 sessions with this exercise to show a trend.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

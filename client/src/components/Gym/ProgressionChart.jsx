import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import { useTheme } from '@mui/material/styles'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ProgressionChart({ 
  allExerciseNames, 
  selectedAnalysisExercise, 
  setSelectedAnalysisExercise, 
  analysisChartMode, 
  setAnalysisChartMode, 
  exerciseProgressionData 
}) {
  const theme = useTheme()

  return (
    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoGraphIcon sx={{ color: '#ec4899' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary' }}>
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: theme.palette.text.secondary }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                  unit="kg"
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary
                  }}
                  itemStyle={{ color: theme.palette.text.primary }}
                />
                <Line 
                  type="monotone" 
                  dataKey={analysisChartMode === '1rm' ? 'oneRepMax' : 'weight'} 
                  stroke="#ec4899" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: theme.palette.background.paper }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name={analysisChartMode === '1rm' ? 'Est. 1RM' : 'Max Weight'}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Need at least 2 sessions with this exercise to show a trend.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

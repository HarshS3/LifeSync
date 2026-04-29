import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

function GymStepsTab({
  stepsDate,
  setStepsDate,
  stepsValue,
  setStepsValue,
  stepsRangeMode,
  setStepsRangeMode,
  stepsLoading,
  stepsSaving,
  stepsError,
  saveSteps,
  buildStepsChart,
  stepsSeries
}) {
  const chartData = buildStepsChart({
    start: (() => {
      const d = new Date(stepsDate)
      const days = stepsRangeMode === 'month' ? 30 : 7
      d.setDate(d.getDate() - days + 1)
      return d
    })(),
    days: stepsRangeMode === 'month' ? 30 : 7,
    series: stepsSeries
  })

  return (
    <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 3 }}>Daily Step Count</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'flex-start' }}>
        <TextField
          type="date"
          label="Date"
          size="small"
          value={stepsDate}
          onChange={(e) => setStepsDate(e.target.value)}
        />
        <TextField
          label="Steps"
          size="small"
          value={stepsValue}
          onChange={(e) => setStepsValue(e.target.value)}
          placeholder="e.g. 10000"
        />
        <Button
          variant="contained"
          onClick={saveSteps}
          disabled={stepsSaving || stepsLoading}
          sx={{ bgcolor: '#171717', '&:hover': { bgcolor: '#374151' } }}
        >
          {stepsSaving ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      {stepsError && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#fef2f2', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningAmberIcon sx={{ color: '#ef4444' }} />
          <Typography variant="body2" sx={{ color: '#b91c1c' }}>{stepsError}</Typography>
        </Box>
      )}

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Trends</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={stepsRangeMode === 'week' ? 'contained' : 'outlined'}
            onClick={() => setStepsRangeMode('week')}
            sx={{ textTransform: 'none' }}
          >
            Last 7 Days
          </Button>
          <Button
            size="small"
            variant={stepsRangeMode === 'month' ? 'contained' : 'outlined'}
            onClick={() => setStepsRangeMode('month')}
            sx={{ textTransform: 'none' }}
          >
            Last 30 Days
          </Button>
        </Box>
      </Box>

      {stepsLoading ? (
        <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={30} sx={{ color: '#171717' }} />
        </Box>
      ) : (
        <Box sx={{ position: 'relative', width: '100%', height: 260, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #f1f5f9', p: 2 }}>
          {chartData.points ? (
            <svg viewBox={`0 0 ${chartData.dims.W} ${chartData.dims.H}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <line
                  key={t}
                  x1={chartData.dims.x0}
                  y1={chartData.dims.y0 + chartData.dims.innerH * t}
                  x2={chartData.dims.x1}
                  y2={chartData.dims.y0 + chartData.dims.innerH * t}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
              ))}
              {/* Y Axis Labels */}
              <text x={chartData.dims.x0 - 10} y={chartData.dims.y0} textAnchor="end" fontSize="10" fill="#94a3b8">{chartData.max}</text>
              <text x={chartData.dims.x0 - 10} y={chartData.dims.y1} textAnchor="end" fontSize="10" fill="#94a3b8">{chartData.min}</text>
              {/* Path */}
              <polyline
                points={chartData.points}
                fill="none"
                stroke="#171717"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Dots */}
              {chartData.points.split(' ').map((p, i) => {
                const [x, y] = p.split(',')
                return <circle key={i} cx={x} cy={y} r="4" fill="#fff" stroke="#171717" strokeWidth="2" />
              })}
              {/* X Labels */}
              {chartData.labels.map((lab, i) => {
                if (stepsRangeMode === 'month' && i % 5 !== 0) return null
                const x = chartData.dims.x0 + (chartData.dims.innerW * i) / (chartData.labels.length - 1)
                return (
                  <text key={i} x={x} y={chartData.dims.y1 + 20} textAnchor="middle" fontSize="9" fill="#94a3b8">{lab}</text>
                )
              })}
            </svg>
          ) : (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>No data for this range</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

export default GymStepsTab

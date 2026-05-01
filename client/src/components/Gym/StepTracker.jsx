import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'

export default function StepTracker({
  stepsDate, setStepsDate,
  stepsValue, setStepsValue,
  stepsRangeMode, setStepsRangeMode,
  stepsSeries,
  stepsLoading,
  stepsSaving,
  stepsError,
  saveSteps,
  buildStepsChart
}) {
  const end = new Date(stepsDate)
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  const daysCount = stepsRangeMode === 'month' ? 30 : 7
  start.setDate(start.getDate() - daysCount + 1)
  start.setHours(0, 0, 0, 0)
  
  const chart = buildStepsChart({ start, end, days: daysCount, series: stepsSeries })

  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const fmtSteps = (v) => (typeof v === 'number' ? `${Math.round(v).toLocaleString()} steps` : '')

  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Daily steps
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Log your steps for a day and view trends.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={stepsRangeMode === 'week' ? 'contained' : 'outlined'}
            onClick={() => setStepsRangeMode('week')}
            sx={{ textTransform: 'none' }}
          >
            Week
          </Button>
          <Button
            variant={stepsRangeMode === 'month' ? 'contained' : 'outlined'}
            onClick={() => setStepsRangeMode('month')}
            sx={{ textTransform: 'none' }}
          >
            Month
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Date"
          type="date"
          value={stepsDate}
          onChange={(e) => setStepsDate(e.target.value)}
          size="small"
          sx={{ width: { xs: '100%', sm: 180 } }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Steps"
          type="number"
          value={stepsValue}
          onChange={(e) => setStepsValue(e.target.value)}
          size="small"
          sx={{ width: { xs: '100%', sm: 180 } }}
        />
        <Button variant="contained" onClick={saveSteps} disabled={stepsSaving || stepsLoading}>
          {stepsSaving ? 'Saving…' : 'Save Steps'}
        </Button>
        {stepsError ? (
          <Typography variant="body2" sx={{ color: '#b91c1c' }}>
            {stepsError}
          </Typography>
        ) : null}
      </Box>

      {stepsLoading ? (
        <LinearProgress />
      ) : (
        !chart.dims ? (
          <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
            No steps logged in this range.
          </Typography>
        ) : (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              {fmt(start)} – {fmt(end)}
            </Typography>
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <Box sx={{ minWidth: 560 }}>
                <svg width="560" height="200" viewBox="0 0 560 200" role="img" aria-label="Steps chart">
                  <rect x="0" y="0" width="560" height="200" fill='background.paper' />

                  {/* axes */}
                  <line x1={chart.dims.x0} y1={chart.dims.y1} x2={chart.dims.x1} y2={chart.dims.y1} stroke='divider' strokeWidth="1" />
                  <line x1={chart.dims.x0} y1={chart.dims.y0} x2={chart.dims.x0} y2={chart.dims.y1} stroke='divider' strokeWidth="1" />

                  {/* y grid */}
                  <line x1={chart.dims.x0} y1={chart.dims.y0} x2={chart.dims.x1} y2={chart.dims.y0} stroke='action.selected' strokeWidth="1" />
                  <line
                    x1={chart.dims.x0}
                    y1={(chart.dims.y0 + chart.dims.y1) / 2}
                    x2={chart.dims.x1}
                    y2={(chart.dims.y0 + chart.dims.y1) / 2}
                    stroke='action.selected'
                    strokeWidth="1"
                  />
                  <line x1={chart.dims.x0} y1={chart.dims.y1} x2={chart.dims.x1} y2={chart.dims.y1} stroke='action.selected' strokeWidth="1" />

                  {/* y labels */}
                  <text x={chart.dims.x0 - 8} y={chart.dims.y0 + 3} fontSize="10" fill='text.secondary' textAnchor="end">
                    {fmtSteps(chart.max)}
                  </text>
                  <text x={chart.dims.x0 - 8} y={(chart.dims.y0 + chart.dims.y1) / 2 + 3} fontSize="10" fill="#9ca3af" textAnchor="end">
                    {fmtSteps(chart.min != null && chart.max != null ? (chart.min + chart.max) / 2 : null)}
                  </text>
                  <text x={chart.dims.x0 - 8} y={chart.dims.y1 + 3} fontSize="10" fill='text.secondary' textAnchor="end">
                    {fmtSteps(chart.min)}
                  </text>

                  {/* axis titles */}
                  <text x={(chart.dims.x0 + chart.dims.x1) / 2} y={200 - 8} fontSize="10" fill='text.secondary' textAnchor="middle">
                    Date
                  </text>
                  <text
                    x="16"
                    y={(chart.dims.y0 + chart.dims.y1) / 2}
                    fontSize="10"
                    fill='text.secondary'
                    textAnchor="middle"
                    transform={`rotate(-90 16 ${(chart.dims.y0 + chart.dims.y1) / 2})`}
                  >
                    Steps
                  </text>

                  {/* line */}
                  <polyline fill="none" stroke='text.primary' strokeWidth="2" points={chart.points} />

                  {/* dots */}
                  {chart.labels.map((l, i) => {
                    const ptsArr = chart.points.split(' ')
                    if (!ptsArr[i]) return null
                    const [px, py] = ptsArr[i].split(',')
                    return (
                      <g key={i}>
                        <circle cx={px} cy={py} r="3" fill='text.primary' />
                        <text x={px} y={chart.dims.y1 + 14} fontSize="9" fill="#9ca3af" textAnchor="middle">
                          {l}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </Box>
            </Box>
          </Box>
        )
      )}
    </Box>
  )
}

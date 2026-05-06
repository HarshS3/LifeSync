import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';

const StepsTab = ({
  stepsRangeMode,
  setStepsRangeMode,
  stepsDate,
  setStepsDate,
  stepsValue,
  setStepsValue,
  saveSteps,
  stepsSaving,
  stepsLoading,
  stepsError,
  stepsSeries,
  buildStepsChart,
  isMobile
}) => {
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
          onFocus={(e) => e.target.select()}
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
        (() => {
          const end = new Date(stepsDate)
          end.setHours(23, 59, 59, 999)
          const start = new Date(end)
          const days = stepsRangeMode === 'month' ? 30 : 7
          start.setDate(start.getDate() - days + 1)
          start.setHours(0, 0, 0, 0)
          const chart = buildStepsChart({ start, end, days, series: stepsSeries })

          if (!chart.dims) {
            return (
              <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                No steps logged in this range.
              </Typography>
            )
          }

          const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          const fmtSteps = (v) => (typeof v === 'number' ? `${Math.round(v).toLocaleString()} steps` : '')

          const d = chart.dims
          const yMin = chart.min
          const yMax = chart.max
          const yMid = yMin != null && yMax != null ? (yMin + yMax) / 2 : null

          return (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                {fmt(start)} – {fmt(end)}
              </Typography>
              <Box sx={{ width: '100%' }}>
                <Box component="svg" viewBox="0 0 560 200" role="img" aria-label="Steps chart" sx={{ width: '100%', maxWidth: 560, height: 'auto' }}>
                  <rect x="0" y="0" width="560" height="200" fill='background.paper' />

                  {/* axes */}
                  <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke='divider' strokeWidth="1" />
                  <line x1={d.x0} y1={d.y0} x2={d.x0} y2={d.y1} stroke='divider' strokeWidth="1" />

                  {/* y grid */}
                  <line x1={d.x0} y1={d.y0} x2={d.x1} y2={d.y0} stroke='action.selected' strokeWidth="1" />
                  <line
                    x1={d.x0}
                    y1={(d.y0 + d.y1) / 2}
                    x2={d.x1}
                    y2={(d.y0 + d.y1) / 2}
                    stroke='action.selected'
                    strokeWidth="1"
                  />
                  <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke='action.selected' strokeWidth="1" />

                  {/* y labels */}
                  <text x={d.x0 - 8} y={d.y0 + 3} fontSize="10" fill='text.secondary' textAnchor="end">
                    {fmtSteps(yMax)}
                  </text>
                  <text x={d.x0 - 8} y={(d.y0 + d.y1) / 2 + 3} fontSize="10" fill="#9ca3af" textAnchor="end">
                    {fmtSteps(yMid)}
                  </text>
                  <text x={d.x0 - 8} y={d.y1 + 3} fontSize="10" fill='text.secondary' textAnchor="end">
                    {fmtSteps(yMin)}
                  </text>

                  {/* axis titles */}
                  <text x={(d.x0 + d.x1) / 2} y={200 - 8} fontSize="10" fill='text.secondary' textAnchor="middle">
                    Date
                  </text>
                  <text
                    x="16"
                    y={(d.y0 + d.y1) / 2}
                    fontSize="10"
                    fill='text.secondary'
                    textAnchor="middle"
                    transform={`rotate(-90 16 ${(d.y0 + d.y1) / 2})`}
                  >
                    Steps
                  </text>

                  {/* line */}
                  <polyline fill="none" stroke='text.primary' strokeWidth="2" points={chart.points} />

                  {/* points */}
                  {chart.points
                    .split(' ')
                    .filter(Boolean)
                    .map((p, i) => {
                      const [x, y] = p.split(',').map(Number)
                      return <circle key={i} cx={x} cy={y} r={3} fill='text.primary' />
                    })}
                </Box>
              </Box>
            </Box>
          )
        })()
      )}
    </Box>
  );
};

export default StepsTab;

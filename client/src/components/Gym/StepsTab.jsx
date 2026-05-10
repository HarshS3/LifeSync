import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme } from '@mui/material/styles';

const getStepsRangeBoundaries = (dateStr, mode) => {
  const [y, m, dd] = dateStr.split('-').map(Number)
  if (!y || !m || !dd || y > 9999) return null

  const selectedDate = new Date(y, m - 1, dd)
  let start, end, days

  if (mode === 'month') {
    start = new Date(y, m - 1, 1, 0, 0, 0, 0)
    const lastDay = new Date(y, m, 0)
    end = new Date(y, m, 0, 23, 59, 59, 999)
    days = lastDay.getDate()
  } else {
    const dayOfWeek = selectedDate.getDay() 
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    start = new Date(selectedDate)
    start.setDate(selectedDate.getDate() - diffToMonday)
    start.setHours(0, 0, 0, 0)
    end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    days = 7
  }
  return { start, end, days }
}

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
  const theme = useTheme();

  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
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
          inputProps={{ 
            max: new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0],
          }}
        />
        <TextField
          label="Steps"
          type="number"
          value={stepsValue}
          onChange={(e) => setStepsValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          size="small"
          sx={{ width: { xs: '100%', sm: 180 } }}
          inputProps={{ min: 0, max: 200000 }}
        />
        <Button variant="contained" onClick={saveSteps} disabled={stepsSaving || stepsLoading}>
          {stepsSaving ? 'Saving…' : 'Save Steps'}
        </Button>
        {stepsError ? (
          <Typography variant="body2" sx={{ color: 'error.main' }}>
            {stepsError}
          </Typography>
        ) : null}
      </Box>

      {stepsLoading ? (
        <LinearProgress />
      ) : (
        (() => {
          const boundaries = getStepsRangeBoundaries(stepsDate, stepsRangeMode);
          if (!boundaries) {
            return (
              <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 4 }}>
                Please select a valid date.
              </Typography>
            )
          }

          const { start, end, days } = boundaries;
          const chart = buildStepsChart({ start, end, days, series: stepsSeries })

          if (!chart.dims) {
            return (
              <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 4 }}>
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

          const textColor = theme.palette.text.secondary;
          const primaryColor = theme.palette.primary.main;
          const dividerColor = theme.palette.divider;
          const gridColor = theme.palette.action.selected;

          return (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                {fmt(start)} – {fmt(end)}
              </Typography>
              <Box sx={{ width: '100%' }}>
                <Box component="svg" viewBox="0 0 560 200" role="img" aria-label="Steps chart" sx={{ width: '100%', maxWidth: 560, height: 'auto' }}>
                  <rect x="0" y="0" width="560" height="200" fill="transparent" />

                  {/* axes */}
                  <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke={dividerColor} strokeWidth="1" />
                  <line x1={d.x0} y1={d.y0} x2={d.x0} y2={d.y1} stroke={dividerColor} strokeWidth="1" />

                  {/* y grid */}
                  <line x1={d.x0} y1={d.y0} x2={d.x1} y2={d.y0} stroke={gridColor} strokeWidth="1" />
                  <line
                    x1={d.x0}
                    y1={(d.y0 + d.y1) / 2}
                    x2={d.x1}
                    y2={(d.y0 + d.y1) / 2}
                    stroke={gridColor}
                    strokeWidth="1"
                  />
                  <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke={gridColor} strokeWidth="1" />

                  {/* y labels */}
                  <text x={d.x0 - 8} y={d.y0 + 3} fontSize="10" fill={textColor} textAnchor="end">
                    {fmtSteps(yMax)}
                  </text>
                  <text x={d.x0 - 8} y={(d.y0 + d.y1) / 2 + 3} fontSize="10" fill={textColor} textAnchor="end">
                    {fmtSteps(yMid)}
                  </text>
                  <text x={d.x0 - 8} y={d.y1 + 3} fontSize="10" fill={textColor} textAnchor="end">
                    {fmtSteps(yMin)}
                  </text>

                  {/* axis titles */}
                  <text x={(d.x0 + d.x1) / 2} y={200 - 8} fontSize="10" fill={textColor} textAnchor="middle">
                    Date
                  </text>
                  <text
                    x="16"
                    y={(d.y0 + d.y1) / 2}
                    fontSize="10"
                    fill={textColor}
                    textAnchor="middle"
                    transform={`rotate(-90 16 ${(d.y0 + d.y1) / 2})`}
                  >
                    Steps
                  </text>

                  {/* line */}
                  <polyline fill="none" stroke={primaryColor} strokeWidth="2" points={chart.points} />

                  {/* points */}
                  {chart.pointsData.map((pt, i) => (
                    <circle key={i} cx={pt.x} cy={pt.y} r={3} fill={primaryColor} />
                  ))}

                  {/* x labels */}
                  {chart.xLabels.map((xl) => (
                    (days <= 7 || xl.index % Math.ceil(days / 6) === 0) && (
                      <text key={xl.index} x={xl.x} y={d.y1 + 15} fontSize="10" fill={textColor} textAnchor="middle">
                        {xl.label}
                      </text>
                    )
                  ))}
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

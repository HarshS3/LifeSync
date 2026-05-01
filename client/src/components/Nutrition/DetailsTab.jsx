import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import TextField from '@mui/material/TextField'
import LocalDiningIcon from '@mui/icons-material/LocalDining'
import InfoIcon from '@mui/icons-material/Info'
import { 
  fmt, 
  percent, 
  SUMMARY_MICRO_META, 
  MICRO_TO_TARGET_KEY 
} from '../../lib/nutritionHelpers'

function DetailsTab({
  log,
  setLog,
  totals,
  calorieTarget,
  proteinTarget,
  clinicalTargetsRequiresSetup,
  clinicalTargetsMissingFields,
  microTargetLookup,
  clinicalTargetRows,
  macroCalories,
  totalMacroCalories,
  nutritionStats,
  nutritionStatsLoading,
  rangeDaysLogged,
  autoSaveLog,
  formatDate,
  selectedDate
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 3 }}>
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
          Today's Details
        </Typography>

        {(!log?.meals || log.meals.length === 0) && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            No meals logged for this selected date yet.
          </Typography>
        )}

        {clinicalTargetsRequiresSetup && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#92400e' }}>
              Clinical targets need setup. Complete Body + Clinical Profile to unlock personalized targets.
            </Typography>
            <Button 
              size="small" 
              variant="outlined" 
              sx={{ mt: 1, textTransform: 'none', borderColor: '#f59e0b', color: '#92400e' }}
              onClick={() => {
                 window.dispatchEvent(new CustomEvent('lifesync:navigate', { detail: { tab: 'Profile' } }));
              }}
            >
              Set up Clinical Profile
            </Button>
            {clinicalTargetsMissingFields?.length > 0 && (
              <Typography variant="caption" sx={{ color: '#b45309', display: 'block', mt: 0.5 }}>
                Debug missing fields: {clinicalTargetsMissingFields.join(', ')}
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Calories
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {fmt(totals.calories, 0)} / {calorieTarget ? fmt(calorieTarget, 0) : '—'} kcal
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percent(totals.calories, calorieTarget)}
              sx={{ height: 8, borderRadius: 99, '& .MuiLinearProgress-bar': { bgcolor: '#16a34a' } }}
            />
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Protein
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {fmt(totals.protein)} / {proteinTarget ? fmt(proteinTarget) : '—'} g
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percent(totals.protein, proteinTarget)}
              sx={{ height: 8, borderRadius: 99, '& .MuiLinearProgress-bar': { bgcolor: '#2563eb' } }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Carbs
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {fmt(totals.carbs)} g
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Fat
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {fmt(totals.fat)} g
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Fiber
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {fmt(totals.fiber)} g
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Micros
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
            {SUMMARY_MICRO_META.map(({ key, label, unit }) => (
              <Box key={key}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {Number(totals?.[key] || 0).toFixed(unit === 'ug' ? 0 : 1)} {unit}
                </Typography>
                {(() => {
                  const targetKey = MICRO_TO_TARGET_KEY[key]
                  const target = targetKey ? Number(microTargetLookup?.[targetKey]) : NaN
                  const hasTarget = Number.isFinite(target) && target > 0
                  return (
                    <>
                      <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.25 }}>
                        {hasTarget
                          ? `Target ${target.toFixed(unit === 'ug' ? 0 : 1)} ${unit}`
                          : 'Target unavailable'}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={hasTarget ? percent(Number(totals?.[key] || 0), target) : 0}
                        sx={{
                          mt: 0.5,
                          height: 5,
                          borderRadius: 99,
                          bgcolor: 'action.selected',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: hasTarget ? '#10b981' : '#d1d5db',
                          },
                        }}
                      />
                    </>
                  )
                })()}
              </Box>
            ))}
          </Box>

          {clinicalTargetRows?.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Clinical Targets
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                {clinicalTargetRows.map((row) => (
                  <Box key={row.key}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{row.label}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {Number(row.currentValue || 0).toFixed(row.unit === 'kcal' ? 0 : 1)} / {Number(row.targetValue || 0).toFixed(row.unit === 'kcal' ? 0 : 1)} {row.unit}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percent(row.currentValue, row.targetValue)}
                      sx={{ height: 6, borderRadius: 99, bgcolor: 'action.selected' }}
                    />
                  </Box>
                ))}
              </Box>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Macro Split (by calories)
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Chip
              icon={<LocalDiningIcon sx={{ fontSize: 16 }} />}
              label={`Protein ${Math.round((macroCalories.protein / totalMacroCalories) * 100)}%`}
              size="small"
              sx={{ bgcolor: '#eff6ff', color: '#1d4ed8' }}
            />
            <Chip
              icon={<LocalDiningIcon sx={{ fontSize: 16 }} />}
              label={`Carbs ${Math.round((macroCalories.carbs / totalMacroCalories) * 100)}%`}
              size="small"
              sx={{ bgcolor: '#fef9c3', color: '#854d0e' }}
            />
            <Chip
              icon={<LocalDiningIcon sx={{ fontSize: 16 }} />}
              label={`Fat ${Math.round((macroCalories.fat / totalMacroCalories) * 100)}%`}
              size="small"
              sx={{ bgcolor: '#fee2e2', color: '#b91c1c' }}
            />
          </Box>

          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
            Based on logged macros. Calories from alcohol or unlogged foods are not included.
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Trends (server)
          </Typography>

          {nutritionStatsLoading && <LinearProgress sx={{ height: 6, borderRadius: 99, mb: 1 }} />}

          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            7d avg: {nutritionStats?.weeklyAvg?.calories ?? '—'} kcal · P {nutritionStats?.weeklyAvg?.protein ?? '—'}g · Water {nutritionStats?.weeklyAvg?.water ?? '—'} ml
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            30d avg: {nutritionStats?.monthlyAvg?.calories ?? '—'} kcal · P {nutritionStats?.monthlyAvg?.protein ?? '—'}g · Water {nutritionStats?.monthlyAvg?.water ?? '—'} ml
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.5 }}>
            Days logged: 7d {nutritionStats?.weeklyAvg?.daysLogged ?? '—'} · 30d {nutritionStats?.monthlyAvg?.daysLogged ?? '—'} · 30d range {rangeDaysLogged ?? '—'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
          Notes
        </Typography>
        <TextField
          multiline
          minRows={6}
          value={log?.notes || ''}
          onChange={(e) => {
            let updatedLog = null
            setLog(prev => {
              updatedLog = {
                ...prev,
                notes: e.target.value
              }
              return updatedLog
            })
            if (updatedLog) autoSaveLog(updatedLog)
          }}
          fullWidth
        />
      </Box>
    </Box>
  )
}

export default DetailsTab

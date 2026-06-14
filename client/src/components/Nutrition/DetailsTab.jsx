import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import TextField from '@mui/material/TextField'
import Collapse from '@mui/material/Collapse'
import LocalDiningIcon from '@mui/icons-material/LocalDining'
import InfoIcon from '@mui/icons-material/Info'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import {
  fmt,
  percent,
  SUMMARY_MICRO_META,
  MICRO_TO_TARGET_KEY
} from '../../lib/nutritionHelpers'

const SEVERITY_COLORS = { critical: '#ef4444', high: '#f59e0b', moderate: '#6366f1' }
const TDEE_SOURCE_LABELS = {
  metabolic_map: 'Metabolic Map (stress + training + steps adjusted)',
  adaptive: 'Adaptive TDEE (30-day calorie vs weight trend)',
  formula: 'Mifflin-St Jeor formula',
  stored: 'Stored clinical targets',
}

function GapRow({ gap }) {
  const [open, setOpen] = useState(false)
  const color = SEVERITY_COLORS[gap.severity] || '#888'
  return (
    <Box sx={{ borderLeft: `3px solid ${color}`, pl: 1.5, mb: 1.5, borderRadius: '0 6px 6px 0', bgcolor: '#fafafa', p: 1.5, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#111' }}>{gap.name}</Typography>
          <Typography variant="caption" sx={{ color: '#888' }}>{gap.why}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color }}>{gap.avgPercent}%</Typography>
          {open ? <ExpandLessIcon sx={{ fontSize: 16, color: '#aaa' }} /> : <ExpandMoreIcon sx={{ fontSize: 16, color: '#aaa' }} />}
        </Box>
      </Box>
      <LinearProgress variant="determinate" value={Math.min(gap.avgPercent, 100)}
        sx={{ mt: 0.5, height: 5, borderRadius: 99, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
      <Typography variant="caption" sx={{ color: '#aaa' }}>
        Target: {gap.target}{gap.unit} · Low {gap.deficientDays}/{gap.daysAnalyzed} days
      </Typography>
      <Collapse in={open}>
        {gap.foodSuggestions?.length > 0 && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #e5e7eb' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Add to your next meal:
            </Typography>
            {gap.foodSuggestions.map((f, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#333' }}>{f.name}</Typography>
                <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>{Number(f.amountPer100g).toFixed(1)}{f.unit}/100g</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Collapse>
    </Box>
  )
}

function DetailsTab({
  log,
  setLog,
  totals,
  calorieTarget,
  proteinTarget,
  clinicalTargets,
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
  selectedDate,
  priorityGaps = [],
  priorityGapsLoading = false,
  tdeeSource,
  adaptiveTdee,
}) {
  const [fullReportOpen, setFullReportOpen] = useState(false)

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 3 }}>
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        {/* TDEE source badge */}
        {tdeeSource && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1.5, border: '1px solid #bae6fd' }}>
            <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 600 }}>
              Targets powered by: {TDEE_SOURCE_LABELS[tdeeSource] || tdeeSource}
              {adaptiveTdee ? ` · ${adaptiveTdee} kcal` : ''}
            </Typography>
          </Box>
        )}

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

          {/* ── Priority Gaps (last 7 days) ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <WarningAmberIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Priority Gaps (last 7 days)</Typography>
          </Box>

          {priorityGapsLoading && <LinearProgress sx={{ height: 4, borderRadius: 99, mb: 1.5 }} />}

          {!priorityGapsLoading && priorityGaps.length === 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, mb: 1.5 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#10b981' }} />
              <Typography variant="caption" sx={{ color: '#065f46' }}>No chronic deficiencies in the last 7 days.</Typography>
            </Box>
          )}

          {!priorityGapsLoading && priorityGaps.map((gap, i) => <GapRow key={i} gap={gap} />)}

          <Divider sx={{ my: 2 }} />

          {/* Full report toggle */}
          <Button
            size="small"
            variant="outlined"
            fullWidth
            onClick={() => setFullReportOpen(o => !o)}
            endIcon={fullReportOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mb: 1.5, textTransform: 'none', borderColor: '#e5e7eb', color: 'text.secondary' }}
          >
            Full Nutrient Report (all nutrients)
          </Button>

          <Collapse in={fullReportOpen}>
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
              label={`Protein ${totalMacroCalories > 0 ? Math.round(((macroCalories?.protein || 0) / totalMacroCalories) * 100) : 0}%`}
              size="small"
              sx={{ bgcolor: '#eff6ff', color: '#1d4ed8' }}
            />
            <Chip
              icon={<LocalDiningIcon sx={{ fontSize: 16 }} />}
              label={`Carbs ${totalMacroCalories > 0 ? Math.round(((macroCalories?.carbs || 0) / totalMacroCalories) * 100) : 0}%`}
              size="small"
              sx={{ bgcolor: '#fef9c3', color: '#854d0e' }}
            />
            <Chip
              icon={<LocalDiningIcon sx={{ fontSize: 16 }} />}
              label={`Fat ${totalMacroCalories > 0 ? Math.round(((macroCalories?.fat || 0) / totalMacroCalories) * 100) : 0}%`}
              size="small"
              sx={{ bgcolor: '#fee2e2', color: '#b91c1c' }}
            />
          </Box>

          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
            Based on logged macros. Calories from alcohol or unlogged foods are not included.
          </Typography>
          </Collapse>

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

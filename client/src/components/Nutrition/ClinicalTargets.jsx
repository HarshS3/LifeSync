import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import LocalDiningIcon from '@mui/icons-material/LocalDining'

const ClinicalTargets = ({ totals = {}, clinicalTargetRows = [], microTargetLookup = {}, SUMMARY_MICRO_META = [], MICRO_TO_TARGET_KEY = {}, percent = () => 0, macroCalories = {}, totalMacroCalories = 1, fmt = (v)=>v }) => {
  return (
    <>
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
                    {hasTarget ? `Target ${target.toFixed(unit === 'ug' ? 0 : 1)} ${unit}` : 'Target unavailable'}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={hasTarget ? percent(Number(totals?.[key] || 0), target) : 0}
                    sx={{ mt: 0.5, height: 5, borderRadius: 99, bgcolor: 'action.selected', '& .MuiLinearProgress-bar': { bgcolor: hasTarget ? '#10b981' : '#d1d5db' } }}
                  />
                </>
              )
            })()}
          </Box>
        ))}
      </Box>

      {clinicalTargetRows.length > 0 && (
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
                <LinearProgress variant="determinate" value={percent(row.currentValue, row.targetValue)} sx={{ height: 6, borderRadius: 99, bgcolor: 'action.selected' }} />
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
        <Chip icon={<LocalDiningIcon sx={{ fontSize: 16 }} />} label={`Protein ${Math.round((macroCalories.protein / totalMacroCalories) * 100)}%`} size="small" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8' }} />
        <Chip icon={<LocalDiningIcon sx={{ fontSize: 16 }} />} label={`Carbs ${Math.round((macroCalories.carbs / totalMacroCalories) * 100)}%`} size="small" sx={{ bgcolor: '#fef9c3', color: '#854d0e' }} />
        <Chip icon={<LocalDiningIcon sx={{ fontSize: 16 }} />} label={`Fat ${Math.round((macroCalories.fat / totalMacroCalories) * 100)}%`} size="small" sx={{ bgcolor: '#fee2e2', color: '#b91c1c' }} />
      </Box>
    </>
  )
}

export default ClinicalTargets

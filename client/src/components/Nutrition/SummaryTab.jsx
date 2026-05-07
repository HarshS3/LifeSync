import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import { 
  fmt, 
  percent, 
  TARGET_KEY_TO_TOTAL_KEY, 
  SUMMARY_MICRO_META, 
  MICRO_TO_TARGET_KEY 
} from '../../lib/nutritionHelpers'

function SummaryTab({
  periodSummaryLoading,
  weeklyTotals,
  monthlyTotals,
  clinicalTargets,
  user,
  dynamicTargets
}) {
  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Nutrition Summary</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Weekly and monthly nutrient consumption vs total required amount for each period.
      </Typography>

      {periodSummaryLoading && <LinearProgress sx={{ mb: 2 }} />}

      {['Weekly', 'Monthly'].map((period) => {
        const totalsForPeriod = period === 'Weekly' ? weeklyTotals : monthlyTotals
        const days = period === 'Weekly' ? 7 : 30
        
        // Calculate actual dates for this period to lookup dynamic targets
        const pEnd = new Date()
        pEnd.setHours(23, 59, 59, 999)
        const pStart = new Date(pEnd)
        pStart.setDate(pStart.getDate() - (days - 1))
        pStart.setHours(0, 0, 0, 0)

        const rowMap = new Map()

        const getRequiredForPeriod = (targetKey) => {
          if (!targetKey) return 0
          let total = 0
          const staticTargets = clinicalTargets?.targets || {}
          const staticMicros = staticTargets.micronutrients || {}
          let staticVal = (targetKey in staticTargets) ? staticTargets[targetKey] : staticMicros[targetKey]

          // Fallback to user-level targets if clinical targets are missing (e.g. before profile setup)
          if (staticVal == null || staticVal === 0) {
            if (targetKey === 'calories') staticVal = user?.dailyCalorieTarget
            if (targetKey === 'protein') staticVal = user?.dailyProteinTarget
            // If we still have nothing for primary macros, use reasonable defaults consistent with backend
            if (!staticVal) {
              if (targetKey === 'calories') staticVal = 2100
              if (targetKey === 'protein') staticVal = 150
              if (targetKey === 'carbs') staticVal = 250
              if (targetKey === 'fat') staticVal = 70
              if (targetKey === 'saturatedFat') staticVal = 22
              if (targetKey === 'monounsaturatedFat') staticVal = 30
              if (targetKey === 'polyunsaturatedFat') staticVal = 15
              if (targetKey === 'cholesterol') staticVal = 300
            }
          }

          for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0]
            const dyn = (dynamicTargets && typeof dynamicTargets === 'object') ? dynamicTargets[dateKey] : null
            if (dyn) {
              const actualDyn = dyn.targets || {}
              const dynMicros = actualDyn.micronutrients || {}
              const val = (targetKey in actualDyn) ? actualDyn[targetKey] : dynMicros[targetKey]
              total += Number(val || 0)
            } else {
              total += Number(staticVal || 0)
            }
          }
          return total
        }

        Object.entries(TARGET_KEY_TO_TOTAL_KEY).forEach(([targetKey, totalKey]) => {
          const required = getRequiredForPeriod(targetKey)
          const consumed = Number(totalsForPeriod?.[totalKey] || 0)
          const unit =
            targetKey === 'calories' ? 'kcal' :
            targetKey === 'omega3' || targetKey === 'cholesterol' ? 'mg' :
            ['vitaminD', 'vitaminA', 'folate', 'selenium'].includes(targetKey) ? 'ug' :
            ['protein', 'fat', 'carbs', 'fiber', 'sugar', 'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat'].includes(targetKey) ? 'g' : 'mg'
          const label = targetKey.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
          rowMap.set(totalKey, {
            key: `${period}-${targetKey}`,
            label,
            consumed,
            required: Number.isFinite(required) && required > 0 ? required : null,
            unit,
          })
        })

        SUMMARY_MICRO_META.forEach(({ key, label, unit }) => {
          if (rowMap.has(key)) return
          const targetKey = MICRO_TO_TARGET_KEY[key]
          const required = getRequiredForPeriod(targetKey)
          const consumed = Number(totalsForPeriod?.[key] || 0)
          rowMap.set(key, {
            key: `${period}-micro-${key}`,
            label,
            consumed,
            required: Number.isFinite(required) && required > 0 ? required : null,
            unit,
          })
        })

        const rows = Array.from(rowMap.values())

        return (
          <Box key={period} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{period}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              {rows.map((row) => (
                <Box key={row.key}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{row.label}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {fmt(row.consumed, row.unit === 'kcal' ? 0 : 1)} / {row.required == null ? '—' : fmt(row.required, row.unit === 'kcal' ? 0 : 1)} {row.unit}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={row.required == null ? 0 : percent(row.consumed, row.required)}
                    sx={{
                      height: 6,
                      borderRadius: 99,
                      bgcolor: 'action.selected',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: row.required == null ? '#d1d5db' : '#2563eb',
                      },
                    }}
                  />
                  {row.required == null && (
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>Target unavailable</Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )
      })}

      {!clinicalTargets?.targets && (
        <Typography variant="body2" sx={{ color: '#92400e' }}>
          Clinical targets are required to compute weekly/monthly requirement bars.
        </Typography>
      )}
    </Box>
  )
}

export default SummaryTab

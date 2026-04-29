import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import NutritionalDNA from '../NutritionalDNA'
import SatietyProfile from '../SatietyProfile'
import GutHealth from '../GutHealth'
import { StatCard, BarChart } from './TrendsShared'

function NutritionTab({ data, nutritionInsight, calcAvg }) {
  return (
    <Box>
      <NutritionalDNA />
      <SatietyProfile />
      <GutHealth />
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
          AI Insight (nutrition)
        </Typography>

        {nutritionInsight?.text ? (
          <>
            <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
              {nutritionInsight.text}
            </Typography>
            {nutritionInsight?.createdAt && (
              <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 1 }}>
                Updated {new Date(nutritionInsight.createdAt).toLocaleString()}
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
            Generate a nutrition insight from the Daily Log tab.
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <StatCard label="Avg Calories" value={calcAvg(data.nutrition, 'totalCalories')} unit="kcal" trend={-2} />
        <StatCard label="Avg Protein" value={calcAvg(data.nutrition, 'totalProtein')} unit="g" trend={5} />
        <StatCard label="Avg Carbs" value={calcAvg(data.nutrition, 'totalCarbs')} unit="g" trend={-8} />
      </Box>

      {data.nutrition.length > 0 && (
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle2" sx={{ mb: 3, color: '#6b7280' }}>
            Calories (last 7 days)
          </Typography>
          <BarChart items={data.nutrition} maxValue={3000} valueKey="totalCalories" labelKey="date" />
        </Box>
      )}
    </Box>
  )
}

export default NutritionTab

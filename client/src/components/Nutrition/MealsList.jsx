import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import ExpandableSection from '../ExpandableSection'

const MealsList = ({ meals = [], totals = {}, fmt = (v)=>v, formatTime = (t)=>t, editMealFromDay = ()=>{}, removeMealFromDay = ()=>{} }) => {
  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Meals
        </Typography>
        <Chip
          icon={<RestaurantIcon sx={{ fontSize: 16 }} />}
          label={`${fmt(totals.calories, 0)} kcal`}
          size="small"
          sx={{ bgcolor: '#f0fdf4', color: '#166534', borderRadius: 1 }}
        />
      </Box>

      {meals?.length === 0 && (
        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
          No meals logged yet for this day.
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {meals?.map((meal, idx) => {
          const mealTotals = meal.foods?.reduce(
            (acc, f) => ({
              calories: acc.calories + (f.calories || 0),
              protein: acc.protein + (f.protein || 0),
              carbs: acc.carbs + (f.carbs || 0),
              fat: acc.fat + (f.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          ) || { calories: 0, protein: 0, carbs: 0, fat: 0 }

          return (
            <Box
              key={idx}
              sx={{
                p: 2,
                borderRadius: 1.5,
                border: '1px solid #e5e7eb',
                bgcolor: 'action.hover',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', mb: 1, gap: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {meal.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={meal.mealType}
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'divider' }}
                    />
                    {meal.time && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatTime(meal.time)}
                      </Typography>
                    )}
                    {meal.loggedAt && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.6 }}>
                        (Logged: {formatTime(meal.loggedAt)})
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {fmt(mealTotals.calories, 0)} kcal
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => editMealFromDay(idx)}
                      sx={{ p: 0.25, color: '#3b82f6', '&:hover': { bgcolor: '#eff6ff' } }}
                      title="Edit meal"
                    >
                      <EditIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => removeMealFromDay(idx)}
                      sx={{ p: 0.25, color: '#ef4444', '&:hover': { bgcolor: '#fee2e2' } }}
                      title="Delete meal"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    P {fmt(mealTotals.protein)}g · C {fmt(mealTotals.carbs)}g · F {fmt(mealTotals.fat)}g
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {meal.foods?.map((food, i) => (
                  <Typography key={i} variant="caption" sx={{ color: 'text.secondary' }}>
                    {food.name} {food.quantity ? `· ${food.quantity}${food.unit}` : ''}{' '}
                    {food.calories ? `· ${food.calories} kcal` : ''}
                  </Typography>
                ))}
              </Box>

              {meal.notes && (
                <Typography variant="caption" sx={{ color: '#9ca3af', mt: 0.5, display: 'block' }}>
                  {meal.notes}
                </Typography>
              )}

              {meal.insights && (meal.insights.synergies?.length > 0 || meal.insights.antagonisms?.length > 0) && (
                <Box sx={{ mt: 1.5 }}>
                  <ExpandableSection 
                    title="Nutrient Interactions & Bioavailability" 
                    defaultOpen={false}
                  >
                    <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: '1px dashed #d1d5db' }}>
                      {meal.insights.synergies?.map((syn, i) => (
                        <Box key={`syn-${i}`} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'start' }}>
                          <Box sx={{ mt: 0.25, width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', flexShrink: 0 }} />
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#065f46', display: 'block' }}>{syn.title} ({syn.effect})</Typography>
                            <Typography variant="caption" sx={{ color: '#047857', display: 'block', lineHeight: 1.3 }}>{syn.description}</Typography>
                          </Box>
                        </Box>
                      ))}
                      {meal.insights.antagonisms?.map((ant, i) => (
                        <Box key={`ant-${i}`} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'start' }}>
                          <Box sx={{ mt: 0.25, width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b', flexShrink: 0 }} />
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#b45309', display: 'block' }}>{ant.title} ({ant.effect})</Typography>
                            <Typography variant="caption" sx={{ color: '#92400e', display: 'block', lineHeight: 1.3 }}>{ant.description}</Typography>
                            {ant.fix && <Typography variant="caption" sx={{ color: '#78350f', fontWeight: 600, display: 'block', mt: 0.25 }}>Fix: {ant.fix}</Typography>}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </ExpandableSection>
                </Box>
              )}

              {meal.bioavailability?.results && Object.keys(meal.bioavailability.results).length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <ExpandableSection
                    title={`Absorption Analysis (${meal.bioavailability.overallConfidence || 'medium'} confidence)`}
                    defaultOpen={false}
                  >
                    <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: '1px dashed #c7d2fe' }}>
                      {meal.bioavailability.narratives?.length > 0 && (
                        <Box sx={{ mb: 1.5, p: 1, bgcolor: '#f0f9ff', borderRadius: 1, border: '1px solid #bae6fd' }}>
                          {meal.bioavailability.narratives.map((n, i) => (
                            <Typography key={i} variant="caption" sx={{ display: 'block', color: '#0369a1', lineHeight: 1.5 }}>{n}</Typography>
                          ))}
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {Object.entries(meal.bioavailability.results).map(([nutrient, data]) => {
                          const pctAbsorbed = Math.round(data.multiplier * 100)
                          const isLow = data.multiplier < 0.5
                          const isMedium = data.multiplier >= 0.5 && data.multiplier < 0.8
                          const barColor = isLow ? '#ef4444' : isMedium ? '#f59e0b' : '#10b981'
                          const label = nutrient.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
                          return (
                            <Box key={nutrient}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}>
                                  <Typography variant="caption" sx={{ color: '#9ca3af', textDecoration: 'line-through' }}>
                                    {data.consumed_amount}{data.unit}
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: barColor }}>
                                    ~{data.effective_amount}{data.unit} absorbed ({pctAbsorbed}%)
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ position: 'relative', height: 6, bgcolor: 'action.selected', borderRadius: 99, overflow: 'hidden' }}>
                                <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', bgcolor: 'divider', borderRadius: 99 }} />
                                <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(pctAbsorbed, 100)}%`, bgcolor: barColor, borderRadius: 99, transition: 'width 0.5s' }} />
                              </Box>
                              {data.interactions?.length > 0 && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25, lineHeight: 1.3 }}>
                                  {data.interactions.filter(i => i.type !== 'neutral').map(i => `${i.agent.replace(/_/g,' ')}: ${i.effect}`).join(' · ')}
                                </Typography>
                              )}
                            </Box>
                          )
                        })}
                      </Box>
                    </Box>
                  </ExpandableSection>
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default MealsList

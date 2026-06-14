import React, { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Collapse from '@mui/material/Collapse'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ExpandableSection from '../ExpandableSection'
import InsulinIntelligencePanel from './InsulinIntelligencePanel'
import DailyIntelligencePanel from './DailyIntelligencePanel'
import { fmt, percent, generateCGMData } from '../../lib/nutritionHelpers'
import { API_BASE } from '../../config'

// ── Over-Intake Recovery Banner ───────────────────────────────────────────────
function OverIntakeBanner({ calories, targetCalories, getAuthHeaders }) {
  const [dismissed, setDismissed] = useState(false)
  const [open, setOpen] = useState(true)
  const today = new Date().toISOString().split('T')[0]
  const key = `over_intake_dismissed_${today}`

  useEffect(() => {
    if (sessionStorage.getItem(key) === '1') setDismissed(true)
  }, [key])

  const dismiss = () => { sessionStorage.setItem(key, '1'); setDismissed(true) }

  if (dismissed || !calories || !targetCalories || calories <= targetCalories * 1.20) return null

  const surplus = Math.round(calories - targetCalories)

  return (
    <Box sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 2, overflow: 'hidden', mb: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#92400e' }}>
            High intake day — +{surplus} kcal over target
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {open ? <ExpandLessIcon sx={{ fontSize: 16, color: '#a16207' }} /> : <ExpandMoreIcon sx={{ fontSize: 16, color: '#a16207' }} />}
          <IconButton size="small" onClick={e => { e.stopPropagation(); dismiss(); }}><CloseIcon sx={{ fontSize: 14, color: '#a16207' }} /></IconButton>
        </Box>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="caption" sx={{ color: '#78350f', display: 'block', mb: 1.5 }}>
            One day over doesn't matter. How the next 3 days go does.
          </Typography>
          {[
            { label: 'Today', text: 'No further eating today unless genuinely hungry.' },
            { label: 'Tomorrow', text: `Eat at maintenance (${targetCalories} kcal). Not a deficit — cortisol is already elevated. Hit protein target.` },
            { label: 'Day after', text: 'Back to normal. The surplus will be physiologically neutral if the next two days are clean.' },
          ].map((s, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
              <Box sx={{ bgcolor: '#f59e0b', borderRadius: 1, px: 0.75, py: 0.25, minWidth: 52, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: '0.6rem' }}>{s.label}</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#78350f', lineHeight: 1.6, flex: 1 }}>{s.text}</Typography>
            </Box>
          ))}
          <Box sx={{ bgcolor: '#fef2f2', borderRadius: 1.5, p: 1.25, mt: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#b91c1c', display: 'block', mb: 0.5, textTransform: 'uppercase', fontSize: '0.6rem' }}>What doesn't help</Typography>
            <Typography variant="caption" sx={{ color: '#b91c1c', display: 'block' }}>• Skipping tomorrow's meals — amplifies cortisol and muscle loss</Typography>
            <Typography variant="caption" sx={{ color: '#b91c1c', display: 'block' }}>• Extra cardio to "burn it off" — adds stress on top of stress</Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}

// ── Compound Effect Card ──────────────────────────────────────────────────────
function CompoundEffectCard({ getAuthHeaders }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [horizon, setHorizon] = useState(90)

  useEffect(() => {
    const headers = getAuthHeaders ? getAuthHeaders() : {}
    fetch(`${API_BASE}/api/insights/compound-effect`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data || data.status === 'insufficient_data') return null

  const isLoss = data.metabolicGoal?.includes('loss')
  const isFat = data.metric === 'body_fat'
  const currentH = data.currentTrajectory?.find(t => t.days === horizon)
  const targetH = data.targetTrajectory?.find(t => t.days === horizon)
  const currentVal = isFat ? (isLoss ? currentH?.fatChange : currentH?.leanChange) : currentH?.weightChange
  const targetVal = isFat ? (isLoss ? targetH?.fatChange : targetH?.leanChange) : targetH?.weightChange
  const metricLabel = isFat ? (isLoss ? 'fat' : 'lean mass') : 'weight'
  const sign = n => n > 0 ? `+${n?.toFixed(1)}` : n?.toFixed(1)

  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingDownIcon sx={{ fontSize: 16, color: '#6366f1' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Compound Effect</Typography>
          {!open && currentVal != null && (
            <Chip label={`${sign(currentVal)}kg ${metricLabel} in ${horizon === 30 ? '1 mo' : horizon === 90 ? '3 mo' : '6 mo'}`} size="small"
              sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#f5f3ff', color: '#6366f1', fontWeight: 700 }} />
          )}
        </Box>
        {open ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>{data.gapNarrative}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            {[30, 90, 180].map(h => (
              <Button key={h} size="small" variant={horizon === h ? 'contained' : 'outlined'}
                onClick={() => setHorizon(h)} sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25, minWidth: 'auto', px: 1.5 }}>
                {h === 30 ? '1 mo' : h === 90 ? '3 mo' : '6 mo'}
              </Button>
            ))}
          </Box>
          {currentH && targetH && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ bgcolor: '#f9fafb', borderRadius: 1.5, p: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.6rem', color: 'text.secondary' }}>Current pace</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#f59e0b' }}>{sign(currentVal)}kg</Typography>
                <Typography variant="caption" color="text.secondary">{metricLabel}</Typography>
              </Box>
              <Box sx={{ bgcolor: '#f0fdf4', borderRadius: 1.5, p: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.6rem', color: 'text.secondary' }}>At targets</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#10b981' }}>{sign(targetVal)}kg</Typography>
                <Typography variant="caption" color="text.secondary">{metricLabel}</Typography>
              </Box>
            </Box>
          )}
          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', textAlign: 'center' }}>
            Adaptive TDEE model · not a guarantee
          </Typography>
        </Box>
      </Collapse>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function DailyLogTab({
  log,
  totals,
  calorieTarget,
  proteinTarget,
  editMealFromDay,
  removeMealFromDay,
  generateNutritionInsight,
  generateMealSuggestions,
  nutritionInsight,
  nutritionInsightGenerating,
  mealSuggestions,
  mealSuggestionsGenerating,
  handleWaterChange,
  timingAlerts,
  insightMatchesSelectedDay,
  setActiveTab,
  SupplementSection,
  onSupplementUpdate,
  clinicalTargets,
  getAuthHeaders
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Daily Intelligence Panel */}
      <DailyIntelligencePanel getAuthHeaders={getAuthHeaders} />

      {/* Over-intake recovery banner — appears when 20%+ over target */}
      <OverIntakeBanner calories={totals?.calories} targetCalories={clinicalTargets?.targets?.calories} getAuthHeaders={getAuthHeaders} />

      {/* Compound effect — collapsed by default */}
      <CompoundEffectCard getAuthHeaders={getAuthHeaders} />

      {/* Meals list */}
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

        {log.meals?.length === 0 && (
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            No meals logged yet for this day.
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(log.meals || [])
            .map((meal, originalIdx) => ({ meal, originalIdx }))
            .map(({ meal, originalIdx }) => {
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
                key={originalIdx}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: '1px solid #e5e7eb',
                  bgcolor: 'action.hover',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {meal.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={meal.mealType}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'divider' }}
                      />
                      {meal.time && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {(() => {
                            const [h, m] = meal.time.split(':');
                            const hours = parseInt(h);
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            const h12 = hours % 12 || 12;
                            return `${h12}:${m} ${ampm}`;
                          })()}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {fmt(mealTotals.calories, 0)} kcal
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => editMealFromDay(originalIdx)}
                        sx={{ p: 0.25, color: '#3b82f6', '&:hover': { bgcolor: '#eff6ff' } }}
                        title="Edit meal"
                      >
                        <EditIcon sx={{ fontSize: '1.1rem' }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => removeMealFromDay(originalIdx)}
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

                {meal.notes && (
                  <Typography variant="caption" sx={{ color: '#9ca3af', mt: 1.5, display: 'block' }}>
                    {meal.notes}
                  </Typography>
                )}
                {/* Bioavailability Results */}
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

      {/* macro summary strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
        {[
          { label: 'Calories', val: fmt(totals.calories, 0), unit: 'kcal', pct: percent(totals.calories, calorieTarget), color: '#16a34a' },
          { label: 'Protein',  val: fmt(totals.protein),     unit: 'g',    pct: percent(totals.protein, proteinTarget),   color: '#2563eb' },
          { label: 'Carbs',    val: fmt(totals.carbs),       unit: 'g',    pct: null, color: '#d97706' },
          { label: 'Fat',      val: fmt(totals.fat),         unit: 'g',    pct: null, color: '#dc2626' },
        ].map((m) => (
          <Box key={m.label} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>{m.label}</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
              {m.val} <span style={{ fontWeight: 400, fontSize: '0.8em', color: '#9ca3af' }}>{m.unit}</span>
            </Typography>
            {m.pct != null && (
              <LinearProgress variant="determinate" value={m.pct} sx={{ mt: 1, height: 4, borderRadius: 99, bgcolor: 'action.selected', '& .MuiLinearProgress-bar': { bgcolor: m.color } }} />
            )}
          </Box>
        ))}
      </Box>

      {/* Daily Warnings & Insights */}
      {(() => {
        const alerts = [];
        if (totals.saturatedFat > 30) {
          alerts.push({ type: 'warning', text: `High Saturated Fat (${fmt(totals.saturatedFat)}g): Keeping saturated fat <20-30g protects your heart health over the long term.` });
        }
        const cholesterolCap = clinicalTargets?.targets?.cholesterol ?? 300;
        const cholesterolRationale = clinicalTargets?.targets?.cholesterolRationale;
        if (totals.cholesterol > cholesterolCap) {
          const rationaleText = cholesterolRationale && cholesterolCap < 300
            ? cholesterolRationale
            : `High Cholesterol (${fmt(totals.cholesterol)}mg / cap: ${cholesterolCap}mg): Consider balancing this with high-fiber foods (oats, beans, leafy greens) which help clear excess cholesterol from your system.`;
          alerts.push({ type: 'warning', text: rationaleText });
        }
        if (totals.sodium > 3000) {
          alerts.push({ type: 'warning', text: `High Sodium Detected (${fmt(totals.sodium)}mg): Hydrate extra today or expect 1-2lbs of water retention on the scale tomorrow. This is not fat gain.` });
        }
        if (totals.protein > 50 && log.meals) {
          const spikeMeal = log.meals.find(meal => {
            const p = meal.foods?.reduce((acc, f) => acc + (f.protein || 0), 0) || 0;
            return p > 50 && p > (totals.protein * 0.5);
          });
          if (spikeMeal) {
            alerts.push({ type: 'info', text: `Lopsided Protein Loading: More than 50% of your daily protein is in "${spikeMeal.name}". Your body maximizes muscle synthesis at ~30-40g per meal. Spread it out for better gains.` });
          }
        }
        timingAlerts.forEach(t => {
          alerts.push({ 
            type: t.type === 'timing_warning' ? 'warning' : 'info', 
            text: `${t.title}: ${t.text}` 
          });
        });

        if (alerts.length === 0) return null;

        return (
          <Box sx={{ p: 2.5, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#111827' }}>
              Daily Medical Alerts & Insights
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {alerts.map((alert, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: alert.type === 'warning' ? '#fef2f2' : '#eff6ff', borderRadius: 1.5, border: `1px solid ${alert.type === 'warning' ? '#fecaca' : '#bfdbfe'}` }}>
                  <Typography sx={{ fontSize: '1.2rem' }}>{alert.type === 'warning' ? '🚨' : '💡'}</Typography>
                  <Typography variant="caption" sx={{ color: alert.type === 'warning' ? '#991b1b' : '#1e3a8a', lineHeight: 1.4, fontWeight: 500 }}>
                    {alert.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        );
      })()}

      {/* Effective Daily Absorption Summary */}
      {log.effectiveNutrientTotals && Object.keys(log.effectiveNutrientTotals).length > 0 && (
        <Box sx={{ p: 2.5, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <ExpandableSection title="Daily Effective Absorption Summary" defaultOpen={false}>
            <Box sx={{ pt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
              {Object.entries(log.effectiveNutrientTotals).map(([nutrient, data]) => {
                const pctVal = Math.round((data.multiplier || 1) * 100)
                const isLow = pctVal < 50
                const isMed = pctVal >= 50 && pctVal < 80
                const color = isLow ? '#ef4444' : isMed ? '#f59e0b' : '#10b981'
                const label = nutrient.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
                return (
                  <Box key={nutrient} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5, border: '1px solid #f3f4f6' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.65rem' }}>{label}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color, display: 'block' }}>
                      ~{data.effective}{data.unit}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', fontSize: '0.65rem' }}>
                      of {data.consumed}{data.unit} ({pctVal}% absorbed)
                    </Typography>
                    <Box sx={{ mt: 0.75, height: 4, bgcolor: 'divider', borderRadius: 99, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${Math.min(pctVal, 100)}%`, bgcolor: color, borderRadius: 99, transition: 'width 0.5s' }} />
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </ExpandableSection>
        </Box>
      )}

      {/* Simulated CGM Graph */}
      <Box sx={{ p: 2.5, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Simulated Glucose Response</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Based on meal Glycemic Pressure & macro buffering.</Typography>
          </Box>
          <Chip label="Simulation" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600 }} />
        </Box>
        <Box sx={{ height: 250, width: '100%', mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={log.insulinIntelligence?.curveData ? log.insulinIntelligence.curveData.map((v, i) => ({
                glucose: v,
                time: log.insulinIntelligence.labels[i] || ""
              })) : generateCGMData(log.meals)} 
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="35%" stopColor="#f59e0b" stopOpacity={0.6}/>
                  <stop offset="65%" stopColor="#10b981" stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke='divider' />
              <XAxis dataKey="time" minTickGap={30} tick={{ fontSize: 11, fill: 'text.secondary' }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 180]} tick={{ fontSize: 11, fill: 'text.secondary' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip 
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontSize: 13, fontWeight: 700 }}
                labelStyle={{ fontSize: 12, color: 'text.secondary', marginBottom: 4 }}
              />
              <Area type="monotone" dataKey="glucose" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#glucoseGradient)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* Insulin Intelligence Panel */}
      <InsulinIntelligencePanel analysis={log.insulinIntelligence} />

      {/* AI insight + hydration */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>AI Insight</Typography>
          {insightMatchesSelectedDay && nutritionInsight?.text ? (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{nutritionInsight.text}</Typography>
              {nutritionInsight?.createdAt && (
                <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 1 }}>
                  Updated {new Date(nutritionInsight.createdAt).toLocaleString()}
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Generate an insight for today.</Typography>
          )}
          {mealSuggestions && (
            <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', lineHeight: 1.7, mt: 2, pt: 2, borderTop: '1px solid #f3f4f6' }}>{mealSuggestions}</Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" size="small" onClick={generateNutritionInsight} disabled={nutritionInsightGenerating} sx={{ textTransform: 'none', borderColor: 'divider', color: 'text.secondary' }}>
              {nutritionInsightGenerating ? 'Generating...' : 'Generate Insight'}
            </Button>
            <Button variant="outlined" size="small" onClick={generateMealSuggestions} disabled={mealSuggestionsGenerating} sx={{ textTransform: 'none', borderColor: 'divider', color: 'text.secondary' }}>
              {mealSuggestionsGenerating ? 'Thinking...' : 'Suggest Meals'}
            </Button>
          </Box>
        </Box>

        {SupplementSection && <SupplementSection log={log} onUpdate={onSupplementUpdate} />}
      </Box>

      {/* CTA to Log Meal tab */}
      <Box sx={{ p: 2.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#166534' }}>Ready to log a meal?</Typography>
          <Typography variant="caption" sx={{ color: '#15803d' }}>Search the food database, set your portion, and add it to today.</Typography>
        </Box>
        <Button variant="contained" size="small" onClick={() => setActiveTab(1)} sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, color: 'background.paper', fontWeight: 700 }}>
          + Log Meal
        </Button>
      </Box>
    </Box>
  )
}

export default DailyLogTab

import React, { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// ─── Spike Analysis Engine ────────────────────────────────────────────────────

// (Local analyzeMeals removed; now provided by backend)

// ─── Sub-Components ───────────────────────────────────────────────────────────

function CollapsibleSection({ title, badge, badgeColor, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
      <Box
        onClick={() => setOpen(p => !p)}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          py: 1.5, px: 2, cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
          transition: 'background 0.15s',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{title}</Typography>
          {badge && (
            <Chip label={badge} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: badgeColor || 'action.selected', color: 'text.primary' }} />
          )}
        </Box>
        <IconButton size="small" sx={{ p: 0.25, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>{children}</Box>
      </Collapse>
    </Box>
  )
}

function SpikeBar({ level, glycemicLoad }) {
  // GL scale: low < 10, medium 10-20, high > 20. Cap bar at GL 30.
  const pct = Math.min(100, Math.round(((glycemicLoad || 0) / 30) * 100))
  const color = level === 'high' ? '#ef4444' : level === 'moderate' ? '#f59e0b' : '#10b981'
  const label = level === 'high' ? 'High GL' : level === 'moderate' ? 'Moderate GL' : 'Low GL'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ flex: 1, height: 8, bgcolor: 'action.selected', borderRadius: 99, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 99, transition: 'width 0.6s' }} />
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color, minWidth: 60 }}>
        {label}{glycemicLoad != null ? ` (${glycemicLoad})` : ''}
      </Typography>
    </Box>
  )
}

// ─── Knowledge Cards ──────────────────────────────────────────────────────────

function WhatIsSpike() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
        When you eat carbohydrates, your digestive system breaks them down into glucose, which enters your bloodstream. 
        Your pancreas responds by secreting <strong>insulin</strong> — a hormone that acts as a key, unlocking your cells to absorb that glucose.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
        {[
          { step: '1', label: 'Eat Carbs', desc: 'Glucose enters blood', color: '#f0fdf4' },
          { step: '2', label: 'Insulin Released', desc: 'Pancreas responds', color: '#eff6ff' },
          { step: '3', label: 'Cells Absorb', desc: 'Blood sugar normalizes', color: '#fefce8' },
        ].map(s => (
          <Box key={s.step} sx={{ p: 1.5, bgcolor: s.color, borderRadius: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', color: '#374151' }}>Step {s.step}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: '#111827' }}>{s.label}</Typography>
            <Typography sx={{ fontSize: '0.65rem', color: '#6b7280' }}>{s.desc}</Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
        A <strong>spike</strong> occurs when blood glucose rises sharply — typically above 140–160 mg/dL — usually due to high-glycemic carbs eaten without enough protein, fat, or fiber to slow absorption.
      </Typography>
    </Box>
  )
}

function FatStorageExplainer({ analysis }) {
  const highSugar = analysis.totalDailySugar > 50
  const highCarbs = analysis.totalDailyCarbs > 250
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
        Insulin is the <strong>master fat-storage hormone</strong>. When insulin levels are chronically elevated, two key mechanisms activate:
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[
          { icon: '🚫', title: 'Lipolysis Inhibited', desc: 'High insulin signals fat cells to stop releasing stored fat. You literally cannot burn fat effectively while insulin is elevated.' },
          { icon: '📦', title: 'Lipogenesis Activated', desc: 'Excess glucose that can\'t be stored in muscle/liver glycogen gets converted to triglycerides and packed into fat cells (de novo lipogenesis).' },
          { icon: '⚡', title: 'Reactive Hypoglycemia', desc: 'After a large spike, a sharp insulin surge can overshoot — dropping blood sugar too low, causing hunger, brain fog, and cravings within 2 hours.' },
        ].map((item, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
            <Typography sx={{ fontSize: '1.1rem' }}>{item.icon}</Typography>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'text.primary' }}>{item.title}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>{item.desc}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
      {(highSugar || highCarbs) && (
        <Box sx={{ p: 1.5, bgcolor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#c2410c', display: 'block' }}>
            ⚠ Today's Flags
          </Typography>
          {highSugar && <Typography variant="caption" sx={{ color: '#9a3412', display: 'block' }}>• Sugar intake: {analysis.totalDailySugar}g (high — target &lt;50g for fat loss)</Typography>}
          {highCarbs && <Typography variant="caption" sx={{ color: '#9a3412', display: 'block' }}>• Total carbs: {analysis.totalDailyCarbs}g (elevated — risk of glycogen overflow → fat storage)</Typography>}
        </Box>
      )}
    </Box>
  )
}

function GlycemicConcepts() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        {[
          {
            term: 'Glycemic Index (GI)',
            color: '#eff6ff',
            border: '#bfdbfe',
            def: 'Ranks carbs 0–100 on how quickly they raise blood sugar compared to pure glucose.',
            examples: 'White rice: 72 · White bread: 75 · Oats: 55 · Lentils: 32',
            tip: 'GI alone can mislead — it ignores quantity. A small portion of a high-GI food may spike less than a huge portion of low-GI food.',
          },
          {
            term: 'Glycemic Load (GL)',
            color: '#f0fdf4',
            border: '#bbf7d0',
            def: 'GL = (GI × grams of carbs) ÷ 100. Accounts for both food quality AND quantity.',
            examples: 'GL < 10: Low · GL 10–20: Medium · GL > 20: High',
            tip: 'This is what actually predicts your blood glucose response. LifeSync uses a simulated version of this in your glucose graph.',
          },
          {
            term: 'Insulin Index (II)',
            color: '#faf5ff',
            border: '#e9d5ff',
            def: 'Unlike GI, the Insulin Index measures the actual insulin response — not just glucose. Protein triggers insulin too.',
            examples: 'White bread: 100 · Beef: 51 · Eggs: 31 · Lentils: 58',
            tip: 'High-protein meals still raise insulin. But the insulin from protein promotes muscle synthesis, not fat storage — timing matters.',
          },
          {
            term: 'Insulin Resistance',
            color: '#fef2f2',
            border: '#fecaca',
            def: 'Over time, cells stop responding to insulin signals. The pancreas compensates by producing MORE insulin — a vicious cycle.',
            examples: 'Causes: Chronic spikes, visceral fat, sedentary lifestyle, poor sleep',
            tip: 'Early signs: energy crashes after meals, persistent belly fat, sugar cravings. Exercise is the single most powerful insulin sensitizer.',
          },
        ].map((card, i) => (
          <Box key={i} sx={{ p: 2, bgcolor: card.color, border: `1px solid ${card.border}`, borderRadius: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', color: '#111827', mb: 0.5 }}>{card.term}</Typography>
            <Typography variant="caption" sx={{ display: 'block', color: '#374151', lineHeight: 1.5, mb: 0.5 }}>{card.def}</Typography>
            <Typography sx={{ display: 'block', fontSize: '0.65rem', color: '#6b7280', fontStyle: 'italic', mb: 0.5 }}>{card.examples}</Typography>
            <Typography sx={{ display: 'block', fontSize: '0.65rem', color: '#374151', fontWeight: 600 }}>💡 {card.tip}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function HowToReduceSpikes({ analysis }) {
  const highSpikeMeals = analysis.highSpikeMeals
  const lowFiber = analysis.fiberCoverage === 'low'
  const tips = [
    {
      active: lowFiber,
      icon: '🥦',
      title: 'Eat Fiber First (Vegetable Preload)',
      urgency: lowFiber ? 'high' : 'normal',
      desc: `You logged ${analysis.totalDailyFiber}g fiber today (target 25–35g). Eating salad or vegetables before your carb-heavy course can reduce glucose peak by 30–40%. Fiber viscosity slows glucose absorption in the gut.`,
    },
    {
      active: highSpikeMeals.length > 0,
      icon: '🥩',
      title: 'Protein-Buffer Your Carbs',
      urgency: highSpikeMeals.length > 1 ? 'high' : 'normal',
      desc: `Protein slows gastric emptying and stimulates GLP-1 (a gut hormone that blunts insulin spikes). Aim for 20–30g protein per meal alongside carbs. ${highSpikeMeals.length > 0 ? `High-spike meals today: ${highSpikeMeals.map(m => m.name).join(', ')}.` : ''}`,
    },
    {
      active: true,
      icon: '🚶',
      title: '10-Minute Post-Meal Walk',
      urgency: 'normal',
      desc: 'A short walk after eating activates GLUT-4 transporters in muscle — moving glucose from your blood into muscle cells without requiring insulin. Studies show this reduces post-meal glucose peaks by ~22%.',
    },
    {
      active: analysis.totalDailySugar > 40,
      icon: '💧',
      title: 'Order Matters: Vinegar or Lemon Water',
      urgency: 'normal',
      desc: 'Consuming 1–2 tbsp apple cider vinegar or fresh lime water before a carb-heavy meal inhibits amylase (the enzyme that breaks down starch) and slows glucose absorption. Effect: ~20% reduction in peak spike.',
    },
    {
      active: true,
      icon: '⏰',
      title: 'Strategic Meal Timing',
      urgency: 'low',
      desc: 'Insulin sensitivity is highest in the morning and lowest at night (circadian rhythm effect). Eating your largest carb meal at breakfast or lunch and keeping dinner lower-carb meaningfully reduces fat storage risk.',
    },
    {
      active: true,
      icon: '🧊',
      title: 'Eat Cooked-and-Cooled Carbs',
      urgency: 'low',
      desc: 'Cooling cooked rice or potatoes overnight converts digestible starch into resistant starch, which feeds gut bacteria instead of spiking glucose. Reheating preserves most of this benefit.',
    },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5 }}>
        Strategies are ranked by relevance to your meals today:
      </Typography>
      {tips.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0)).map((tip, i) => (
        <Box key={i} sx={{
          display: 'flex', gap: 1.5, p: 1.5, borderRadius: 1.5,
          bgcolor: tip.urgency === 'high' ? '#fff7ed' : tip.active ? '#f0fdf4' : 'action.hover',
          border: `1px solid ${tip.urgency === 'high' ? '#fed7aa' : tip.active ? '#bbf7d0' : 'transparent'}`,
        }}>
          <Typography sx={{ fontSize: '1.1rem', mt: 0.1 }}>{tip.icon}</Typography>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{tip.title}</Typography>
              {tip.active && tip.urgency === 'high' && (
                <Chip label="Today" size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: '#f97316', color: 'white', fontWeight: 700 }} />
              )}
              {tip.active && tip.urgency !== 'high' && (
                <Chip label="Relevant" size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: '#10b981', color: 'white', fontWeight: 700 }} />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>{tip.desc}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InsulinIntelligencePanel({ analysis }) {
  if (!analysis) return null

  const { mealAnalyses = [], overallLevel, totalDailyFiber, patternSummary, bestCounterfactual } = analysis

  const levelColor  = overallLevel === 'high' ? '#ef4444' : overallLevel === 'moderate' ? '#f59e0b' : '#10b981'
  const levelLabel  = overallLevel === 'high' ? 'High-GL Day' : overallLevel === 'moderate' ? 'Moderate GL' : 'Well-Controlled'
  const headerBg    = overallLevel === 'high' ? '#fef2f2' : overallLevel === 'moderate' ? '#fffbeb' : '#f0fdf4'
  const headerBorder = overallLevel === 'high' ? '#fecaca' : overallLevel === 'moderate' ? '#fde68a' : '#bbf7d0'

  // Derive highSpikeMeals for backwards-compat with HowToReduceSpikes and FatStorageExplainer
  const highSpikeMeals = mealAnalyses.filter(m => m.spikeLevel === 'high')
  const analysisWithCompat = { ...analysis, highSpikeMeals, fiberCoverage: totalDailyFiber >= 25 ? 'good' : totalDailyFiber >= 15 ? 'moderate' : 'low' }

  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>

      {/* Header */}
      <Box sx={{ p: 2.5, bgcolor: headerBg, borderBottom: `1px solid ${headerBorder}` }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.25 }}>
              Glycemic Pattern
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              GL-based model · Not CGM data
            </Typography>
          </Box>
          <Chip label={levelLabel} size="small" sx={{ bgcolor: levelColor, color: 'white', fontWeight: 700, fontSize: '0.7rem' }} />
        </Box>

        {/* Pattern summary */}
        {patternSummary && (
          <Typography variant="caption" sx={{ color: '#374151', lineHeight: 1.6, display: 'block', mb: 1.5 }}>
            {patternSummary}
          </Typography>
        )}

        {/* Counterfactual — best improvement tip */}
        {bestCounterfactual && (
          <Box sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 1.5, p: 1.25, mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#92400e', display: 'block', mb: 0.25 }}>
              💡 Best change for tomorrow
            </Typography>
            <Typography variant="caption" sx={{ color: '#78350f', fontWeight: 600, display: 'block' }}>
              {bestCounterfactual.action}
            </Typography>
            <Typography variant="caption" sx={{ color: '#a16207' }}>
              Estimated ~{bestCounterfactual.reduction} point improvement in glycemic response
            </Typography>
          </Box>
        )}

        {/* Per-meal breakdown */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {mealAnalyses.map((meal, i) => (
            <Box key={i}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4, flexWrap: 'wrap', gap: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {meal.name}
                  {meal.time && <span style={{ opacity: 0.5, fontWeight: 400 }}> · {meal.time}</span>}
                  {meal.gi != null && <span style={{ opacity: 0.6, fontWeight: 400 }}> · GI ~{meal.gi}</span>}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {meal.carbs}g C · {meal.protein}g P · {meal.fiber}g F
                </Typography>
              </Box>
              <SpikeBar level={meal.spikeLevel} glycemicLoad={meal.glycemicLoad} />
              {/* Modifier tags */}
              {meal.modifiersApplied && (
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                  {meal.modifiersApplied.mealSequence && <Chip label="↓ meal sequence" size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: '#dbeafe', color: '#1e40af' }} />}
                  {meal.modifiersApplied.postWorkout && <Chip label="↓ post-workout" size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: '#dcfce7', color: '#166534' }} />}
                  {meal.modifiersApplied.circadian === 'elevated' && <Chip label="↑ evening" size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: '#fef3c7', color: '#92400e' }} />}
                  {meal.modifiersApplied.cumulativeFiber && <Chip label="↓ fiber buffer" size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: '#ede9fe', color: '#5b21b6' }} />}
                </Box>
              )}
              {meal.counterfactual && (
                <Typography variant="caption" sx={{ color: '#7c3aed', fontStyle: 'italic', display: 'block', mt: 0.25 }}>
                  💡 {meal.counterfactual.action} → ~{meal.counterfactual.reduction} pt improvement
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        {/* Summary stats */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          {[
            { label: 'Daily Fiber', val: `${totalDailyFiber || 0}g`, color: (totalDailyFiber || 0) >= 25 ? '#10b981' : '#f59e0b' },
            { label: 'Total Carbs', val: `${analysis.totalDailyCarbs || 0}g`, color: 'text.secondary' },
            { label: 'Total Sugar', val: `${analysis.totalDailySugar || 0}g`, color: (analysis.totalDailySugar || 0) > 50 ? '#ef4444' : '#10b981' },
          ].map((stat, i) => (
            <Box key={i} sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: stat.color, display: 'block' }}>{stat.val}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Expandable Sections */}
      <CollapsibleSection title="What Is an Insulin Spike?" badge="Basics" defaultOpen={false}>
        <WhatIsSpike />
      </CollapsibleSection>

      <CollapsibleSection
        title="Fat Storage & Metabolic Effects"
        badge={overallLevel === 'high' ? 'Risk Today' : null}
        badgeColor={overallLevel === 'high' ? '#ef4444' : null}
        defaultOpen={overallLevel === 'high'}
      >
        <FatStorageExplainer analysis={analysisWithCompat} />
      </CollapsibleSection>

      <CollapsibleSection title="GI · GL · Insulin Index · Insulin Resistance" badge="Science" defaultOpen={false}>
        <GlycemicConcepts />
      </CollapsibleSection>

      <CollapsibleSection
        title="How to Reduce Spikes"
        badge={highSpikeMeals.length > 0 ? `${highSpikeMeals.length} fixes today` : 'Tips'}
        badgeColor={highSpikeMeals.length > 0 ? '#f97316' : '#10b981'}
        defaultOpen={highSpikeMeals.length > 0}
      >
        <HowToReduceSpikes analysis={analysisWithCompat} />
      </CollapsibleSection>

      <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Pattern model using Glycemic Load — not CGM data. Shows relative patterns for guidance only.
        </Typography>
      </Box>
    </Box>
  )
}

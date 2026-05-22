import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Model from 'react-body-highlighter'

// ── Colour helpers ────────────────────────────────────────────────────────────
function clamp01(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

// ── Palette (matches mobile app for visual consistency) ───────────────────────
const HEATMAP_PALETTE = ['#e5e7eb', '#fed7aa', '#fb923c', '#ea580c', '#9a3412']
const SELECTED_COLOR  = '#3b82f6'   // blue highlight for selected

function heatFill(t) {
  const x = clamp01(t)
  return HEATMAP_PALETTE[Math.min(Math.floor(x * 5), 4)]
}

function heatStroke(t) {
  const x = clamp01(t)
  return x > 0.05 ? 'rgba(255, 77, 45, 0.45)' : 'rgba(148, 163, 184, 0.35)'
}

// ── Region definitions ────────────────────────────────────────────────────────
// muscles must match slugs recognised by react-body-highlighter
const REGIONS = [
  { key: 'shoulders',  label: 'Shoulders',   muscles: ['front-deltoids', 'back-deltoids'], side: 'both'  },
  { key: 'chest',      label: 'Chest',        muscles: ['chest'],                           side: 'front' },
  { key: 'back',       label: 'Back',         muscles: ['upper-back', 'lower-back', 'trapezius'], side: 'back' },
  { key: 'biceps',     label: 'Biceps',       muscles: ['biceps'],                          side: 'front' },
  { key: 'triceps',    label: 'Triceps',      muscles: ['triceps'],                         side: 'back'  },
  { key: 'forearms',   label: 'Forearms',     muscles: ['forearm'],                         side: 'both'  },
  { key: 'core',       label: 'Core',         muscles: ['abs', 'obliques'],                 side: 'front' },
  { key: 'glutes',     label: 'Glutes',       muscles: ['gluteal'],                         side: 'back'  },
  { key: 'quads',      label: 'Quads',        muscles: ['quadriceps'],                      side: 'front' },
  { key: 'hamstrings', label: 'Hamstrings',   muscles: ['hamstring'],                       side: 'back'  },
  { key: 'calves',     label: 'Calves',       muscles: ['calves'],                          side: 'back'  },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function MuscleHeatmapFigure({ intensityByRegion }) {
  const [side, setSide] = useState('front')
  // selectedRegionKey is the REGION key (e.g. 'chest'), NOT a raw muscle slug
  const [selectedRegionKey, setSelectedRegionKey] = useState(null)

  const I = intensityByRegion || {}
  const v = (k) => clamp01(I[k])

  // Build data array for react-body-highlighter
  // Frequency 1-5 maps to HEATMAP_PALETTE[freq-1]
  const heatmapData = useMemo(() => {
    return REGIONS.map((r) => ({
      name:      r.label,
      muscles:   r.muscles,
      frequency: Math.min(Math.floor(v(r.key) * 5), 4) + 1,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [I, v])

  // When a muscle path is clicked, find which REGION owns it
  const handleModelClick = (muscleObj) => {
    if (!muscleObj) return
    // react-body-highlighter returns { muscle, data } or just the muscle name
    const muscleName =
      typeof muscleObj === 'string'
        ? muscleObj
        : muscleObj.muscle || muscleObj.name || ''

    if (!muscleName) return

    const region = REGIONS.find((r) =>
      r.muscles.some((m) => m.toLowerCase() === muscleName.toLowerCase())
    )
    if (!region) return

    setSelectedRegionKey((prev) => (prev === region.key ? null : region.key))
  }

  const selectedRegion   = REGIONS.find((r) => r.key === selectedRegionKey)
  const selectedIntensity = selectedRegion ? v(selectedRegion.key) : 0
  const intensityPct      = Math.round(selectedIntensity * 100)

  const intensityLabel = (t) => {
    if (t <= 0)   return 'Not trained'
    if (t < 0.25) return 'Low volume'
    if (t < 0.5)  return 'Moderate'
    if (t < 0.75) return 'High volume'
    return 'Very high'
  }

  // Determines which model type to pass based on current side
  // FIX: was hardcoded to "posterior" — this broke the front/back toggle entirely
  const modelType = side === 'front' ? 'anterior' : 'posterior'

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' }, gap: 2, alignItems: 'start' }}>

      {/* ── SVG Body Model ── */}
      <Box sx={{
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        bgcolor: '#fcfcfd',
        p: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        minHeight: 360,
      }}>
        {/* Front / Back toggle */}
        <Button
          size="small"
          variant="outlined"
          onClick={() => { setSide((s) => (s === 'front' ? 'back' : 'front')); setSelectedRegionKey(null) }}
          sx={{
            position: 'absolute', top: 12, right: 12,
            textTransform: 'none', fontSize: '0.72rem', zIndex: 10,
          }}
        >
          {side === 'front' ? 'View Back →' : '← View Front'}
        </Button>

        {/* View label */}
        <Typography variant="caption" sx={{ color: '#94a3b8', mb: 1, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>
          {side === 'front' ? 'Anterior (Front)' : 'Posterior (Back)'}
        </Typography>

        <Box sx={{ height: 320, width: '100%', display: 'flex', justifyContent: 'center' }}>
          {/* type prop fixed: was hardcoded "posterior" — front toggle was broken */}
          <Model
            data={heatmapData}
            type={modelType}
            onClick={handleModelClick}
            baseColor="#e5e7eb"
            highlightedColors={HEATMAP_PALETTE}
          />
        </Box>

        {/* Tap hint */}
        <Typography variant="caption" sx={{ color: '#cbd5e1', mt: 1, fontSize: '0.68rem' }}>
          Click a muscle to inspect
        </Typography>
      </Box>

      {/* ── Right panel: legend + selection ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Selected muscle card */}
        {selectedRegion ? (
          <Box sx={{
            borderRadius: 2,
            border: `2px solid ${SELECTED_COLOR}`,
            bgcolor: '#eff6ff',
            p: 2,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                Selected
              </Typography>
              <Box
                component="span"
                onClick={() => setSelectedRegionKey(null)}
                sx={{ cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', lineHeight: 1, '&:hover': { color: '#475569' } }}
              >
                ×
              </Box>
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e40af', mb: 1 }}>
              {selectedRegion.label}
            </Typography>

            {/* Intensity bar */}
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {intensityLabel(selectedIntensity)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                  {intensityPct}%
                </Typography>
              </Box>
              <Box sx={{ height: 6, borderRadius: 999, bgcolor: '#e2e8f0', overflow: 'hidden' }}>
                <Box sx={{
                  height: '100%',
                  width: `${intensityPct}%`,
                  borderRadius: 999,
                  bgcolor: heatFill(selectedIntensity),
                  transition: 'width 0.4s ease',
                }} />
              </Box>
            </Box>

            {/* Muscles list */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selectedRegion.muscles.map((m) => (
                <Chip key={m} label={m.replace(/-/g, ' ')} size="small"
                  sx={{ fontSize: '0.62rem', height: 18, bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }} />
              ))}
            </Box>
          </Box>
        ) : (
          <Box sx={{
            borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: '#f8fafc', p: 2,
          }}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>
              No muscle selected
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Click any region on the figure to inspect its training volume.
            </Typography>
          </Box>
        )}

        {/* Intensity scale */}
        <Box sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper', p: 2 }}>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>
            Intensity scale
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
            {HEATMAP_PALETTE.map((color, i) => (
              <Box key={i} sx={{ flex: 1, height: 10, borderRadius: 999, bgcolor: color, border: '1px solid rgba(15,23,42,0.10)' }} />
            ))}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>Resting</Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>Very High</Typography>
          </Box>
        </Box>

        {/* Region list */}
        <Box sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper', p: 2 }}>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1.5, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>
            All regions
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 1.5, rowGap: 1 }}>
            {REGIONS.map((r) => (
              <Box
                key={r.key}
                onClick={() => setSelectedRegionKey((prev) => prev === r.key ? null : r.key)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, minWidth: 0,
                  cursor: 'pointer', borderRadius: 1, p: 0.5,
                  bgcolor: selectedRegionKey === r.key ? '#eff6ff' : 'transparent',
                  border: selectedRegionKey === r.key ? '1px solid #bfdbfe' : '1px solid transparent',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: '#f1f5f9' },
                }}
              >
                <Box sx={{
                  width: 10, height: 10, borderRadius: 999, flex: '0 0 auto',
                  bgcolor: selectedRegionKey === r.key ? SELECTED_COLOR : heatFill(v(r.key)),
                  border: `1px solid ${selectedRegionKey === r.key ? SELECTED_COLOR : heatStroke(v(r.key))}`,
                }} />
                <Typography variant="caption" sx={{
                  color: selectedRegionKey === r.key ? '#1d4ed8' : '#64748b',
                  fontWeight: selectedRegionKey === r.key ? 700 : 400,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontSize: '0.72rem',
                }}>
                  {r.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

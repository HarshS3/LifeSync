import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Model from 'react-body-highlighter'

function clamp01(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '')
  if (h.length !== 6) return { r: 0, g: 0, b: 0 }
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function blendHex(a, b, t) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex({
    r: lerp(A.r, B.r, t),
    g: lerp(A.g, B.g, t),
    b: lerp(A.b, B.b, t),
  })
}

// Colors matching the mobile app's palette for consistency
const HEATMAP_PALETTE = ['#e5e7eb', '#fed7aa', '#fb923c', '#ea580c', '#9a3412']

function heatFill(t) {
  const x = clamp01(t)
  // 5 levels of intensity
  const index = Math.min(Math.floor(x * 5), 4)
  return HEATMAP_PALETTE[index]
}

function heatStroke(t) {
  const x = clamp01(t)
  return x > 0.05 ? 'rgba(255, 77, 45, 0.45)' : 'rgba(148, 163, 184, 0.35)'
}

const REGIONS = [
  { key: 'shoulders', label: 'Shoulders', muscles: ['front-deltoids', 'back-deltoids'] },
  { key: 'chest', label: 'Chest', muscles: ['chest'] },
  { key: 'back', label: 'Back', muscles: ['upper-back', 'lower-back', 'trapezius'] },
  { key: 'biceps', label: 'Biceps', muscles: ['biceps'] },
  { key: 'triceps', label: 'Triceps', muscles: ['triceps'] },
  { key: 'forearms', label: 'Forearms', muscles: ['forearm'] },
  { key: 'core', label: 'Core', muscles: ['abs', 'obliques'] },
  { key: 'glutes', label: 'Glutes', muscles: ['gluteal'] },
  { key: 'quads', label: 'Quads', muscles: ['quadriceps'] },
  { key: 'hamstrings', label: 'Hamstrings', muscles: ['hamstring'] },
  { key: 'calves', label: 'Calves', muscles: ['calves'] },
]

export default function MuscleHeatmapFigure({ intensityByRegion }) {
  const [side, setSide] = useState('front')
  const I = intensityByRegion || {}
  
  const v = (k) => clamp01(I[k])

  const heatmapData = useMemo(() => {
    return REGIONS.map(r => ({
      name: r.label,
      muscles: r.muscles,
      // Map 0-1 intensity to frequency (1-5) for the highlighter's highlightedColors index
      frequency: Math.min(Math.floor(v(r.key) * 5), 4) + 1
    }))
  }, [I])

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: 2, alignItems: 'start' }}>
      <Box sx={{
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        bgcolor: '#fcfcfd',
        p: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        <Button 
          size="small" 
          variant="outlined"
          onClick={() => setSide(side === 'front' ? 'back' : 'front')}
          sx={{ 
            position: 'absolute', 
            top: 12, 
            right: 12, 
            textTransform: 'none',
            fontSize: '0.75rem',
            zIndex: 10
          }}
        >
          {side === 'front' ? 'View Back' : 'View Front'}
        </Button>

        <Box sx={{ height: 320, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Model
            data={heatmapData}
            type="posterior" // posterior/anterior
            side={side === 'front' ? 'anterior' : 'posterior'}
            highlighted={[]}
            onClick={(m) => console.log('Clicked muscle:', m)}
            baseColor="#e5e7eb"
            colors={HEATMAP_PALETTE}
          />
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        bgcolor: 'background.paper',
        p: 2,
      }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          Intensity scale
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {HEATMAP_PALETTE.map((color, i) => (
            <Box key={i} sx={{ width: 26, height: 10, borderRadius: 999, bgcolor: color, border: '1px solid rgba(15, 23, 42, 0.12)' }} />
          ))}
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          Regions
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 1.5, rowGap: 1 }}>
          {REGIONS.map((r) => (
            <Box key={r.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  bgcolor: heatFill(v(r.key)),
                  border: `1px solid ${heatStroke(v(r.key))}`,
                  flex: '0 0 auto',
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

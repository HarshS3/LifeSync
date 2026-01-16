import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

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

function heatFill(t) {
  const x = clamp01(t)
  // Dark graphite -> ember
  const base = '#0b0f14'
  const warm = '#ff4d2d'
  // Slight easing to make mid-values readable
  const eased = x ** 0.65
  return blendHex(base, warm, eased)
}

function heatStroke(t) {
  const x = clamp01(t)
  return x > 0.05 ? 'rgba(255, 77, 45, 0.45)' : 'rgba(148, 163, 184, 0.35)'
}

const REGIONS = [
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'triceps', label: 'Triceps' },
  { key: 'forearms', label: 'Forearms' },
  { key: 'core', label: 'Core' },
  { key: 'glutes', label: 'Glutes' },
  { key: 'quads', label: 'Quads' },
  { key: 'hamstrings', label: 'Hamstrings' },
  { key: 'calves', label: 'Calves' },
]

export default function MuscleHeatmapFigure({ intensityByRegion }) {
  const I = intensityByRegion || {}
  const v = (k) => clamp01(I[k])

  const sw = 1.1

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: 2, alignItems: 'start' }}>
      <Box sx={{
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        bgcolor: '#fcfcfd',
        p: 1.5,
        overflow: 'hidden',
      }}>
        <svg viewBox="0 0 520 240" width="100%" height="240" role="img" aria-label="Monthly muscle heatmap">
          <defs>
            <filter id="grain" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0" />
            </filter>
          </defs>

          {/* backdrop */}
          <rect x="0" y="0" width="520" height="240" fill="#ffffff" />
          <rect x="0" y="0" width="520" height="240" filter="url(#grain)" opacity="0.35" />

          {/* FRONT */}
          <g transform="translate(40,18)">
            <text x="90" y="16" fontSize="12" fill="#6b7280">Front</text>

            {/* head + torso silhouette */}
            <circle cx="90" cy="40" r="16" fill="#0b0f14" opacity="0.9" />
            <path d="M70 58 C64 74, 62 92, 66 112 C68 122, 66 136, 60 148 C56 156, 60 166, 72 172 C80 176, 100 176, 108 172 C120 166, 124 156, 120 148 C114 136, 112 122, 114 112 C118 92, 116 74, 110 58 Z" fill="#0b0f14" opacity="0.92" />

            {/* shoulders */}
            <path
              d="M56 70 C44 78, 38 90, 40 104 C44 120, 58 128, 70 120 C76 116, 78 88, 68 72 Z"
              fill={heatFill(v('shoulders'))}
              stroke={heatStroke(v('shoulders'))}
              strokeWidth={sw}
            />
            <path
              d="M124 70 C136 78, 142 90, 140 104 C136 120, 122 128, 110 120 C104 116, 102 88, 112 72 Z"
              fill={heatFill(v('shoulders'))}
              stroke={heatStroke(v('shoulders'))}
              strokeWidth={sw}
            />

            {/* chest */}
            <path
              d="M68 76 C74 92, 72 112, 76 122 C80 132, 100 132, 104 122 C108 112, 106 92, 112 76 C104 70, 76 70, 68 76 Z"
              fill={heatFill(v('chest'))}
              stroke={heatStroke(v('chest'))}
              strokeWidth={sw}
            />

            {/* biceps + triceps + forearms (stylized split) */}
            <path
              d="M40 104 C32 116, 30 132, 36 148 C40 158, 54 160, 58 148 C62 136, 60 118, 52 106 Z"
              fill={heatFill(v('biceps'))}
              stroke={heatStroke(v('biceps'))}
              strokeWidth={sw}
            />
            <path
              d="M140 104 C148 116, 150 132, 144 148 C140 158, 126 160, 122 148 C118 136, 120 118, 128 106 Z"
              fill={heatFill(v('biceps'))}
              stroke={heatStroke(v('biceps'))}
              strokeWidth={sw}
            />

            <path
              d="M52 108 C46 122, 46 138, 52 150 C56 158, 68 158, 70 150 C72 140, 70 122, 62 110 Z"
              fill={heatFill(v('triceps'))}
              stroke={heatStroke(v('triceps'))}
              strokeWidth={sw}
              opacity="0.9"
            />
            <path
              d="M128 108 C134 122, 134 138, 128 150 C124 158, 112 158, 110 150 C108 140, 110 122, 118 110 Z"
              fill={heatFill(v('triceps'))}
              stroke={heatStroke(v('triceps'))}
              strokeWidth={sw}
              opacity="0.9"
            />

            <path
              d="M34 148 C30 160, 30 176, 38 188 C44 196, 56 196, 58 186 C60 176, 54 160, 46 150 Z"
              fill={heatFill(v('forearms'))}
              stroke={heatStroke(v('forearms'))}
              strokeWidth={sw}
            />
            <path
              d="M146 148 C150 160, 150 176, 142 188 C136 196, 124 196, 122 186 C120 176, 126 160, 134 150 Z"
              fill={heatFill(v('forearms'))}
              stroke={heatStroke(v('forearms'))}
              strokeWidth={sw}
            />

            {/* core */}
            <path
              d="M74 122 C72 138, 74 156, 78 170 C82 182, 98 182, 102 170 C106 156, 108 138, 106 122 Z"
              fill={heatFill(v('core'))}
              stroke={heatStroke(v('core'))}
              strokeWidth={sw}
            />

            {/* legs */}
            <path
              d="M76 170 C70 182, 66 200, 68 216 C70 226, 84 226, 86 216 C88 202, 88 186, 86 174 Z"
              fill={heatFill(v('quads'))}
              stroke={heatStroke(v('quads'))}
              strokeWidth={sw}
            />
            <path
              d="M104 170 C110 182, 114 200, 112 216 C110 226, 96 226, 94 216 C92 202, 92 186, 94 174 Z"
              fill={heatFill(v('quads'))}
              stroke={heatStroke(v('quads'))}
              strokeWidth={sw}
            />

            <path
              d="M70 216 C66 224, 66 234, 70 240 C74 246, 82 246, 84 240 C86 232, 84 224, 80 216 Z"
              fill={heatFill(v('calves'))}
              stroke={heatStroke(v('calves'))}
              strokeWidth={sw}
            />
            <path
              d="M110 216 C114 224, 114 234, 110 240 C106 246, 98 246, 96 240 C94 232, 96 224, 100 216 Z"
              fill={heatFill(v('calves'))}
              stroke={heatStroke(v('calves'))}
              strokeWidth={sw}
            />
          </g>

          {/* BACK */}
          <g transform="translate(290,18)">
            <text x="90" y="16" fontSize="12" fill="#6b7280">Back</text>

            <circle cx="90" cy="40" r="16" fill="#0b0f14" opacity="0.9" />
            <path d="M70 58 C64 74, 62 92, 66 112 C68 122, 66 136, 60 148 C56 156, 60 166, 72 172 C80 176, 100 176, 108 172 C120 166, 124 156, 120 148 C114 136, 112 122, 114 112 C118 92, 116 74, 110 58 Z" fill="#0b0f14" opacity="0.92" />

            {/* shoulders (rear) */}
            <path
              d="M56 70 C44 78, 38 90, 40 104 C44 120, 58 128, 70 120 C76 116, 78 88, 68 72 Z"
              fill={heatFill(v('shoulders'))}
              stroke={heatStroke(v('shoulders'))}
              strokeWidth={sw}
            />
            <path
              d="M124 70 C136 78, 142 90, 140 104 C136 120, 122 128, 110 120 C104 116, 102 88, 112 72 Z"
              fill={heatFill(v('shoulders'))}
              stroke={heatStroke(v('shoulders'))}
              strokeWidth={sw}
            />

            {/* back */}
            <path
              d="M68 76 C72 96, 72 116, 76 130 C80 144, 100 144, 104 130 C108 116, 108 96, 112 76 C102 72, 78 72, 68 76 Z"
              fill={heatFill(v('back'))}
              stroke={heatStroke(v('back'))}
              strokeWidth={sw}
            />

            {/* glutes */}
            <path
              d="M74 138 C70 152, 72 166, 82 174 C86 178, 94 178, 98 174 C108 166, 110 152, 106 138 C100 142, 80 142, 74 138 Z"
              fill={heatFill(v('glutes'))}
              stroke={heatStroke(v('glutes'))}
              strokeWidth={sw}
            />

            {/* hamstrings */}
            <path
              d="M76 170 C70 182, 66 200, 68 216 C70 226, 84 226, 86 216 C88 202, 88 186, 86 174 Z"
              fill={heatFill(v('hamstrings'))}
              stroke={heatStroke(v('hamstrings'))}
              strokeWidth={sw}
            />
            <path
              d="M104 170 C110 182, 114 200, 112 216 C110 226, 96 226, 94 216 C92 202, 92 186, 94 174 Z"
              fill={heatFill(v('hamstrings'))}
              stroke={heatStroke(v('hamstrings'))}
              strokeWidth={sw}
            />

            {/* calves */}
            <path
              d="M70 216 C66 224, 66 234, 70 240 C74 246, 82 246, 84 240 C86 232, 84 224, 80 216 Z"
              fill={heatFill(v('calves'))}
              stroke={heatStroke(v('calves'))}
              strokeWidth={sw}
            />
            <path
              d="M110 216 C114 224, 114 234, 110 240 C106 246, 98 246, 96 240 C94 232, 96 224, 100 216 Z"
              fill={heatFill(v('calves'))}
              stroke={heatStroke(v('calves'))}
              strokeWidth={sw}
            />
          </g>
        </svg>
      </Box>

      {/* Legend */}
      <Box sx={{
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        bgcolor: '#fff',
        p: 2,
      }}>
        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
          Intensity scale
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <Box key={t} sx={{ width: 26, height: 10, borderRadius: 999, bgcolor: heatFill(t), border: '1px solid rgba(15, 23, 42, 0.12)' }} />
          ))}
        </Box>

        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
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
              <Typography variant="caption" sx={{ color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

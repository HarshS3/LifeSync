import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import WhatshotIcon from '@mui/icons-material/Whatshot'

export default function ReadinessSection({ readiness, loading }) {
  return (
    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
      <Box sx={{
        p: 3, borderRadius: 2,
        background: readiness
          ? `linear-gradient(135deg, ${readiness.color}12 0%, #fff 60%)`
          : '#fff',
        border: `1px solid ${readiness ? readiness.color + '40' : '#e5e7eb'}`,
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Background glow */}
        {readiness && (
          <Box sx={{
            position: 'absolute', top: -40, right: -40,
            width: 180, height: 180, borderRadius: '50%',
            bgcolor: readiness.color, opacity: 0.06, pointerEvents: 'none'
          }} />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <WhatshotIcon sx={{ color: readiness?.color || '#f59e0b' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
            Today's Training Readiness
          </Typography>
          {loading && (
            <Typography variant="caption" sx={{ color: '#94a3b8', ml: 'auto' }}>Calculating…</Typography>
          )}
        </Box>

        {!readiness && !loading && (
          <Typography variant="body2" sx={{ color: '#94a3b8', py: 2 }}>
            Log your daily wellness check-in (sleep, energy, stress) for 3+ days to unlock your readiness score.
          </Typography>
        )}

        {readiness && (
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Score ring */}
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
              <Box sx={{
                width: 120, height: 120, borderRadius: '50%', mx: 'auto',
                border: `8px solid ${readiness.color}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 24px ${readiness.color}40`
              }}>
                <Typography sx={{ fontSize: '2.2rem', fontWeight: 900, color: readiness.color, lineHeight: 1 }}>
                  {readiness.readinessScore}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>/10</Typography>
              </Box>
              <Box sx={{
                mt: 1.5, px: 2, py: 0.5, borderRadius: 2,
                bgcolor: readiness.color, display: 'inline-block'
              }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                  {readiness.status === 'push_hard' ? '🔥 Push Hard'
                    : readiness.status === 'train_normal' ? '💪 Train Normal'
                    : readiness.status === 'train_light' ? '🔄 Train Light'
                    : '😴 Rest Day'}
                </Typography>
              </Box>
            </Box>

            {/* Recommendation + Components */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.7, mb: 2, fontSize: '0.95rem' }}>
                {readiness.recommendation}
              </Typography>

              {/* Component scores */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                {[
                  { label: 'Sleep', score: readiness.components.sleep.score, detail: `${readiness.components.sleep.avgHours}h (${readiness.components.sleep.quality}/10 qual)`, emoji: '😴' },
                  { label: 'RHR', score: readiness.components.rhr.score, detail: `${readiness.components.rhr.avgRhr} bpm`, emoji: '🫀' },
                  { label: 'Energy', score: readiness.components.energy.score, detail: `${readiness.components.energy.avgRating}/10`, emoji: '⚡' },
                  { label: 'Stress', score: readiness.components.stress.score, detail: `${readiness.components.stress.avgRating}/10 stress`, emoji: '🧘' },
                  { label: 'Load', score: readiness.components.trainingLoad.score, detail: `${Math.round(readiness.components.trainingLoad.volumeRatio * 100)}% base${readiness.components.trainingLoad.daysSinceRestDay > 3 ? ` (${readiness.components.trainingLoad.daysSinceRestDay}d no rest)` : ''}`, emoji: '🏋️' },
                ].map(comp => {
                  const pct = (comp.score / 10) * 100
                  const c = comp.score >= 7 ? '#22c55e' : comp.score >= 5 ? '#f59e0b' : '#ef4444'
                  return (
                    <Box key={comp.label} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
                          {comp.emoji} {comp.label}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: c }}>{comp.score}/10</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate" value={pct}
                        sx={{ height: 4, borderRadius: 2, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: c, borderRadius: 2 } }}
                      />
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>{comp.detail}</Typography>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}

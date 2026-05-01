import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import TimerIcon from '@mui/icons-material/Timer'
import SpeedIcon from '@mui/icons-material/Speed'
import Chip from '@mui/material/Chip'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

const RecoveryCapacity = () => {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/insights/recovery-capacity`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch recovery capacity:', err)
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchData()
  }, [token])

  if (loading) return <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3, mb: 3 }} />
  if (!data || data.status === 'insufficient_data') {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.default', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
        <FitnessCenterIcon sx={{ color: '#94a3b8', fontSize: 40, mb: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
          Recovery Capacity: Analyzing...
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Log more workouts to map your recovery curves. I'm learning the optimal rest window for each muscle group.
        </Typography>
      </Paper>
    )
  }

  const mgs = Object.keys(data.recoveryInsights || {})

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        🦾 Training Recovery Capacity
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        {/* Recovery Windows */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            border: '1px solid',
            borderColor: '#e2e8f0',
            bgcolor: 'background.paper'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TimerIcon sx={{ color: '#3b82f6' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Optimal Rest Windows</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {mgs.map(mg => {
              const info = data.recoveryInsights[mg]
              return (
                <Box key={mg} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{mg}</Typography>
                    {info.optimalGap && (
                      <Chip label={`${info.optimalGap.toFixed(1)} days`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    {info.recommendation}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Paper>

        {/* Volume Tolerance (MRV) */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            border: '1px solid',
            borderColor: '#e2e8f0',
            bgcolor: 'background.paper'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SpeedIcon sx={{ color: '#f59e0b' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Volume Tolerance (MRV)</Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {mgs.map(mg => {
              const info = data.mrvInsights[mg]
              return (
                <Box key={mg} sx={{ p: 2, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #ffedd5' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{mg}</Typography>
                  <Typography variant="body2" sx={{ color: '#9a3412' }}>
                    Max Recoverable Volume: <strong>{info.suggestedVolumeRange}</strong>
                  </Typography>
                </Box>
              )
            })}
          </Box>

          <Typography variant="caption" sx={{ display: 'block', mt: 3, color: '#94a3b8', fontStyle: 'italic' }}>
            * MRV is the volume limit where performance begins to regress. Training consistently near or above this requires scheduled deloads.
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}

export default RecoveryCapacity

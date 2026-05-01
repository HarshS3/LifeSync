import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import PsychologyIcon from '@mui/icons-material/Psychology'
import BoltIcon from '@mui/icons-material/Bolt'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

const StressImpact = () => {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/insights/stress-impact`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch stress impact:', err)
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchData()
  }, [token])

  if (loading) return <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3, mb: 3 }} />
  if (!data || data.status === 'insufficient_data') {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.default', border: '1px dashed #cbd5e1', textAlign: 'center', mb: 3 }}>
        <PsychologyIcon sx={{ color: '#94a3b8', fontSize: 40, mb: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
          Stress Resilience: Analyzing...
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Log your stress levels (1-10) during daily check-ins. I'm mapping how your training performance and weight respond to stress.
        </Typography>
      </Paper>
    )
  }

  const { stressSensitivity, insights } = data

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        🧠 Stress-Performance Relationship
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.5fr' }, gap: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            bgcolor: stressSensitivity === 'resilient' ? '#f0fdf4' : '#fff7ed',
            border: '1px solid',
            borderColor: stressSensitivity === 'resilient' ? '#dcfce7' : '#ffedd5',
            textAlign: 'center'
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Stress Profile
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: stressSensitivity === 'resilient' ? '#166534' : '#9a3412', my: 1 }}>
            {stressSensitivity === 'resilient' ? 'Resilient' : 'Sensitive'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            {stressSensitivity === 'resilient' 
              ? 'Your body maintains high performance even during stressful periods.' 
              : 'Your physiological markers suggest stress significantly impacts your recovery and strength.'}
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e2e8f0', bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <BoltIcon sx={{ color: '#3b82f6' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Biological Observations</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {insights.map((insight, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: 20, mt: 0.2 }} />
                <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.5 }}>
                  {insight}
                </Typography>
              </Box>
            ))}
            {insights.length === 0 && (
              <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                No significant deviations detected during stress periods yet.
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}

export default StressImpact

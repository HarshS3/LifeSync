import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import Chip from '@mui/material/Chip'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

const SleepArchitecture = () => {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/insights/sleep-architecture`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch sleep architecture:', err)
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchData()
  }, [token])

  if (loading) return <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3, mb: 3 }} />
  if (!data || data.status === 'insufficient_data') {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.default', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
        <NightsStayIcon sx={{ color: '#94a3b8', fontSize: 40, mb: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
          Sleep Architecture: Analyzing...
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Log your sleep hours for at least 10 days. I'm learning how your specific performance correlates with sleep duration.
        </Typography>
      </Paper>
    )
  }

  const { optimalSleep, performanceInsight, tankInsight } = data

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        🌙 Sleep Architecture & Readiness
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' }, gap: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            border: '1px solid',
            borderColor: '#e2e8f0',
            bgcolor: 'background.paper',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#eff6ff', color: '#2563eb', display: 'flex' }}>
              <AutoAwesomeIcon fontSize="small" />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Optimal Sleep Window</Typography>
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
            {optimalSleep.min} - {optimalSleep.max} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>hours</span>
          </Typography>
          
          <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
            {performanceInsight} Unlike the standard "8-hour rule," your biological readiness peaks in this specific range.
          </Typography>

          {tankInsight && (
            <Box sx={{ mt: 3, p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fee2e2', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <TrendingDownIcon sx={{ color: '#dc2626', mt: 0.2 }} />
              <Typography variant="body2" sx={{ color: '#991b1b', fontWeight: 500 }}>
                {tankInsight}
              </Typography>
            </Box>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            border: '1px solid',
            borderColor: '#e2e8f0',
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', mb: 2 }}>
            Personalized Goal
          </Typography>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e3a8a' }}>{optimalSleep.min}</Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Aim for {optimalSleep.min}h+ tonight
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5 }}>
            to maximize tomorrow's training performance.
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}

export default SleepArchitecture

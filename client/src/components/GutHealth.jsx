import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import GrassIcon from '@mui/icons-material/Grass'
import Diversity3Icon from '@mui/icons-material/Diversity3'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import CircularProgress from '@mui/material/CircularProgress'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

const GutHealth = () => {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/insights/gut-health`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch gut health:', err)
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchData()
  }, [token])

  if (loading) return <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3, mb: 3 }} />
  if (!data || data.status === 'insufficient_data') {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'background.default', border: '1px dashed #cbd5e1', textAlign: 'center', mb: 3 }}>
        <GrassIcon sx={{ color: '#94a3b8', fontSize: 40, mb: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
          Gut Microbiome: Diversity Tracking
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          I'm identifying unique plant species in your meals. Log your vegetables, fruits, and grains to calculate your Diversity Score.
        </Typography>
      </Paper>
    )
  }

  const { plantPoints, fiberToCarbRatio, insights, uniquePlants } = data
  const progress = (plantPoints / 30) * 100

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        🌿 Gut Health & Microbiome Diversity
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' }, gap: 3 }}>
        {/* Diversity Score (The 30-Plant Rule) */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e2e8f0', bgcolor: 'background.paper', textAlign: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b', mb: 2 }}>
            WEEKLY PLANT POINTS
          </Typography>
          
          <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
            <CircularProgress 
              variant="determinate" 
              value={100} 
              size={120} 
              thickness={4} 
              sx={{ color: '#f1f5f9' }} 
            />
            <CircularProgress 
              variant="determinate" 
              value={Math.min(progress, 100)} 
              size={120} 
              thickness={4} 
              sx={{ color: '#10b981', position: 'absolute', left: 0 }} 
            />
            <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#065f46' }}>{plantPoints}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>OF 30</Typography>
            </Box>
          </Box>

          <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>
            {plantPoints < 15 ? 'Diversity needs focus' : plantPoints < 30 ? 'Good diversity' : 'Elite diversity'}
          </Typography>
        </Paper>

        {/* Logic & Recommendations */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e2e8f0', bgcolor: '#f0fdfa' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <HealthAndSafetyIcon sx={{ color: '#059669' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#065f46' }}>The 30-Plant Rule</Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {insights.map((insight, idx) => (
              <Box key={idx} sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #ccfbf1' }}>
                <Typography variant="body2" sx={{ color: '#0f766e', lineHeight: 1.5 }}>
                  {insight}
                </Typography>
              </Box>
            ))}
          </Box>

          {uniquePlants.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                Detected Species This Week
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {uniquePlants.map(p => (
                  <Box key={p} sx={{ px: 1.5, py: 0.5, bgcolor: 'background.paper', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.75rem', color: '#475569', textTransform: 'capitalize' }}>
                    {p}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  )
}

export default GutHealth

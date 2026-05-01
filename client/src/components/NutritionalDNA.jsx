import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import BoltIcon from '@mui/icons-material/Bolt'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Chip from '@mui/material/Chip'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

const NutritionalDNA = () => {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/insights/nutritional-dna`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch nutritional DNA:', err)
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
        <HelpOutlineIcon sx={{ color: '#94a3b8', fontSize: 40, mb: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
          Nutritional DNA: Analyzing...
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Keep logging your meals and weight. I'm observing how your body responds to different macronutrients.
        </Typography>
      </Paper>
    )
  }

  const { carbTolerance } = data.profile || {}

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        🧬 Your Nutritional DNA
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Carbohydrate Tolerance */}
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Carbohydrate Tolerance
            </Typography>
            <Chip 
              label={carbTolerance?.tolerance?.toUpperCase()} 
              size="small"
              sx={{ 
                fontWeight: 800, 
                bgcolor: carbTolerance?.tolerance === 'high' ? '#dcfce7' : carbTolerance?.tolerance === 'low' ? '#fee2e2' : '#f1f5f9',
                color: carbTolerance?.tolerance === 'high' ? '#166534' : carbTolerance?.tolerance === 'low' ? '#991b1b' : '#475569'
              }}
            />
          </Box>

          <Typography variant="body2" sx={{ color: '#475569', mb: 2, lineHeight: 1.6 }}>
            {carbTolerance?.reasoning}
          </Typography>

          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid #f1f5f9' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              Recommended Strategy
            </Typography>
            <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 500 }}>
              {carbTolerance?.action}
            </Typography>
          </Box>

          {/* Background Icon */}
          <BoltIcon sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, color: '#f1f5f9', zIndex: 0 }} />
        </Paper>

        {/* Sodium / Water Retention (Coming Soon or Analyzed) */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            border: '1px solid',
            borderColor: '#e2e8f0',
            bgcolor: 'background.paper',
            opacity: 0.8
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
            Salt Sensitivity
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
            I am currently tracking how your morning weight correlates with previous-day sodium intake.
          </Typography>
          <Chip label="ANALYZING..." size="small" variant="outlined" sx={{ color: '#64748b' }} />
          <WaterDropIcon sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, color: '#f1f5f9', zIndex: 0 }} />
        </Paper>
      </Box>
    </Box>
  )
}

export default NutritionalDNA

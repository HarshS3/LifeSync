import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

const SatietyProfile = () => {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/insights/satiety-profile`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch satiety profile:', err)
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchData()
  }, [token])

  if (loading) return <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 3, mb: 3 }} />
  if (!data || data.status === 'insufficient_data') {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', textAlign: 'center', mb: 3 }}>
        <RestaurantIcon sx={{ color: '#94a3b8', fontSize: 40, mb: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
          Satiety Patterns: Mapping...
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          I'm analyzing the gaps between your meal logs to understand how different macros keep you full. Keep logging with accurate timestamps!
        </Typography>
      </Paper>
    )
  }

  const { results, insights } = data

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        🍽️ Hunger & Satiety Profile
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <SatietyCard 
          label="Protein Satiety" 
          value={results.proteinSatiety ? `${results.proteinSatiety.toFixed(1)}h` : 'N/A'} 
          color="#3b82f6" 
          desc="Avg. time until next log after high-protein meal"
        />
        <SatietyCard 
          label="Carb Satiety" 
          value={results.carbSatiety ? `${results.carbSatiety.toFixed(1)}h` : 'N/A'} 
          color="#ef4444" 
          desc="Avg. time until next log after high-carb meal"
        />
        <SatietyCard 
          label="Fat Satiety" 
          value={results.fatSatiety ? `${results.fatSatiety.toFixed(1)}h` : 'N/A'} 
          color="#f59e0b" 
          desc="Avg. time until next log after high-fat meal"
        />
      </Box>

      {insights.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 3, border: '1px solid #dcfce7' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <TipsAndUpdatesIcon sx={{ color: '#16a34a', mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534', mb: 0.5 }}>
                Adaptation Strategy
              </Typography>
              {insights.map((insight, idx) => (
                <Typography key={idx} variant="body2" sx={{ color: '#15803d', mb: 1, lineHeight: 1.5 }}>
                  • {insight}
                </Typography>
              ))}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  )
}

const SatietyCard = ({ label, value, color, desc }) => (
  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0' }}>
    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
      {label}
    </Typography>
    <Typography variant="h5" sx={{ fontWeight: 800, color, my: 0.5 }}>
      {value}
    </Typography>
    <Typography variant="caption" sx={{ color: '#94a3b8', lineHeight: 1.2, display: 'block' }}>
      {desc}
    </Typography>
  </Paper>
)

export default SatietyProfile

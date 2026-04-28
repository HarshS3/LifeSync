import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

const ProgressNarrative = () => {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/insights/progress`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch progress narrative:', err)
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchData()
  }, [token])

  if (loading) return <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3, mb: 3 }} />
  if (!data || !data.narratives || data.narratives.length === 0) return null

  return (
    <Box sx={{ mb: 4 }}>
      {data.narratives.map((n, idx) => (
        <Paper
          key={idx}
          elevation={0}
          sx={{
            p: 3,
            mb: 2,
            borderRadius: 4,
            bgcolor: n.type === 'recomposition' ? '#f0fdf4' : '#f8fafc',
            border: '1px solid',
            borderColor: n.type === 'recomposition' ? '#dcfce7' : '#e2e8f0',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: n.type === 'recomposition' ? '#22c55e' : '#64748b',
                color: '#fff',
                display: 'flex'
              }}
            >
              {n.type === 'recomposition' ? <TrendingUpIcon /> : <InfoOutlinedIcon />}
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                {n.title}
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
                {n.text}
              </Typography>
            </Box>
          </Box>
          
          {/* Subtle Background Accent */}
          <Box
            sx={{
              position: 'absolute',
              right: -10,
              bottom: -10,
              opacity: 0.05,
              transform: 'rotate(-15deg)'
            }}
          >
            <TrendingUpIcon sx={{ fontSize: 100 }} />
          </Box>
        </Paper>
      ))}
    </Box>
  )
}

export default ProgressNarrative

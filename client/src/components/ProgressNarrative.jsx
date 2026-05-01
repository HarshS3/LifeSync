import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
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
      {data.narratives.map((n, idx) => {
        const isRecomp = n.type === 'recomposition'
        const color = isRecomp ? '#22c55e' : '#64748b'
        
        return (
          <Paper
            key={idx}
            elevation={0}
            sx={{
              p: 3,
              mb: 2,
              borderRadius: 4,
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? 'rgba(255,255,255,0.03)' 
                : (isRecomp ? '#f0fdf4' : 'background.default'),
              border: '1px solid',
              borderColor: (theme) => theme.palette.mode === 'dark'
                ? 'divider'
                : (isRecomp ? '#dcfce7' : '#e2e8f0'),
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: color,
                  color: 'background.paper',
                  display: 'flex'
                }}
              >
                {isRecomp ? <TrendingUpIcon /> : <InfoOutlinedIcon />}
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  {n.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
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
                transform: 'rotate(-15deg)',
                color: 'text.primary'
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 100 }} />
            </Box>
          </Paper>
        )
      })}
    </Box>
  )
}

export default ProgressNarrative

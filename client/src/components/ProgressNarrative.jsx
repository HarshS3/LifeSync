import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

const ProgressNarrative = ({ inline = false }) => {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/insights/progress`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`Server error (${res.status}): ${errorText}`)
        }
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

  if (loading) return inline ? null : <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2, mb: 3 }} />
  if (!data || !data.narratives || data.narratives.length === 0) return null

  const cards = data.narratives.map((n, idx) => {
    const isRecomp = n.type === 'recomposition'
    const dotColor = isRecomp ? '#22c55e' : '#64748b'
    const HeaderIcon = isRecomp ? TrendingUpIcon : InfoOutlinedIcon

    return (
      <Box
        key={idx}
        sx={{
          p: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <HeaderIcon sx={{ color: dotColor }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {n.title}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 1.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0, mt: 0.75 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
            {n.text}
          </Typography>
        </Box>
      </Box>
    )
  })

  if (inline) {
    return <>{cards}</>
  }

  return (
    <Box
      sx={{
        mb: 3,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: data.narratives.length > 1 ? 'repeat(2, 1fr)' : '1fr' },
        gap: 2,
      }}
    >
      {cards}
    </Box>
  )
}

export default ProgressNarrative

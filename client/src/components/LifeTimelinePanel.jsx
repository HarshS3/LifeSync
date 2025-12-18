import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import SpaIcon from '@mui/icons-material/Spa'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import { API_BASE } from '../config'

function buildEvents(fitness, mental, nutrition) {
  const events = []
  fitness.forEach((f) => {
    events.push({
      date: f.date ? new Date(f.date) : new Date(),
      kind: 'training',
      title: f.type || 'Training',
      summary: f.focus || 'Workout logged',
      detail: f.intensity ? `Intensity ${f.intensity}/10` : null,
    })
  })
  mental.forEach((m) => {
    events.push({
      date: m.date ? new Date(m.date) : new Date(),
      kind: 'wellness',
      title: m.mood || 'Check-in',
      summary: m.notes || 'Mood logged',
      detail: m.energyLevel ? `Energy ${m.energyLevel}/10` : null,
    })
  })
  nutrition.forEach((n) => {
    const cal = Array.isArray(n.meals) ? n.meals.reduce((s, m) => s + (m.calories || 0), 0) : 0
    events.push({
      date: n.date ? new Date(n.date) : new Date(),
      kind: 'nutrition',
      title: 'Nutrition',
      summary: cal ? `${cal} kcal` : n.notes || 'Meals logged',
      detail: null,
    })
  })
  return events.filter((e) => e.date).sort((a, b) => b.date - a.date).slice(0, 6)
}

const kindStyles = {
  training: { bg: '#eff6ff', color: '#2563eb', icon: <FitnessCenterIcon sx={{ fontSize: 14 }} /> },
  wellness: { bg: '#faf5ff', color: '#9333ea', icon: <SpaIcon sx={{ fontSize: 14 }} /> },
  nutrition: { bg: '#ecfdf5', color: '#059669', icon: <RestaurantIcon sx={{ fontSize: 14 }} /> },
}

function LifeTimelinePanel() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    const fetchJson = async (url) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return []
        const text = await res.text()
        try {
          return JSON.parse(text)
        } catch {
          return []
        }
      } catch {
        return []
      }
    }
    
    Promise.all([
      fetchJson(`${API_BASE}/api/logs/fitness`),
      fetchJson(`${API_BASE}/api/logs/mental`),
      fetchJson(`${API_BASE}/api/logs/nutrition`),
    ]).then(([f, m, n]) => setEvents(buildEvents(f || [], m || [], n || [])))
  }, [])

  const formatDate = (d) => d?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) || ''

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2, color: '#6b7280' }}>
        Recent Activity
      </Typography>

      {events.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            No activity yet. Start logging to see your history.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {events.map((e, idx) => {
            const style = kindStyles[e.kind]
            return (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 2,
                  borderRadius: 1.5,
                  border: '1px solid #e5e7eb',
                  bgcolor: '#fff',
                  transition: 'border-color 0.15s',
                  '&:hover': { borderColor: '#d1d5db' },
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: style.bg,
                    color: style.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {style.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717' }}>
                      {e.title}
                    </Typography>
                    <Chip
                      label={e.kind}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: style.bg,
                        color: style.color,
                        fontWeight: 500,
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    {e.summary}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>
                  {formatDate(e.date)}
                </Typography>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}

export default LifeTimelinePanel

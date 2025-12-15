import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import SpaIcon from '@mui/icons-material/Spa'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import CloseIcon from '@mui/icons-material/Close'
import MedicationIcon from '@mui/icons-material/Medication'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import Calendar from './Calendar'
import { useAuth } from '../context/AuthContext'

function GlobalCalendar() {
  const { token } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedEvents, setSelectedEvents] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterTab, setFilterTab] = useState(0)

  useEffect(() => {
    loadAllEvents()
  }, [token])

  const loadAllEvents = async () => {
    setLoading(true)
    try {
      // Get date range for habits (current month +/- 1 month)
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()

      const [workouts, mental, nutrition, habits] = await Promise.all([
        fetchJson('/api/gym/workouts'),
        fetchJson('/api/logs/mental'),
        fetchJson('/api/logs/nutrition'),
        fetchJson(`/api/habits/logs/range?start=${startDate}&end=${endDate}`),
      ])

      const allEvents = []

      // Workout events
      workouts.forEach(w => {
        allEvents.push({
          date: w.date,
          type: 'workout',
          title: w.name || 'Workout',
          icon: <FitnessCenterIcon sx={{ fontSize: 16 }} />,
          color: '#2563eb',
          bgColor: '#eff6ff',
          details: `${w.exercises?.length || 0} exercises`,
          data: w,
          summary: w.exercises?.map(e => `${e.name} (${e.sets?.length || 0} sets)`).join(', ') || '',
        })
      })

      // Mental/Wellness events
      mental.forEach(m => {
        const hasMeds = m.medsTaken?.length > 0
        allEvents.push({
          date: m.date,
          type: 'mental',
          title: 'Wellness Check-in',
          icon: <SpaIcon sx={{ fontSize: 16 }} />,
          color: '#9333ea',
          bgColor: '#faf5ff',
          details: `Mood ${m.moodScore || 5}/10 • Energy ${m.energyLevel || 5}/10`,
          data: m,
          summary: [
            `Sleep: ${m.sleepHours || 0}h`,
            `Stress: ${m.stressLevel || 0}/10`,
            hasMeds ? `Meds: ${m.medsTaken.join(', ')}` : null,
          ].filter(Boolean).join(' • '),
        })
      })

      // Nutrition events
      nutrition.forEach(n => {
        const calories =
          n.totalCalories ||
          n.dailyTotals?.calories ||
          n.meals?.reduce((s, m) => s + (m.totalCalories || 0), 0) ||
          0
        allEvents.push({
          date: n.date,
          type: 'nutrition',
          title: 'Nutrition Log',
          icon: <RestaurantIcon sx={{ fontSize: 16 }} />,
          color: '#15803d',
          bgColor: '#f0fdf4',
          details: calories ? `${calories} kcal` : 'Meals logged',
          data: n,
          summary: n.meals?.map(m => m.name).join(', ') || n.notes || '',
        })
      })

      // Habit completion events
      habits.forEach(h => {
        if (h.habit && h.completed) {
          allEvents.push({
            date: h.date,
            type: 'habit',
            title: h.habit.name || 'Habit',
            icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
            color: h.habit.color || '#6366f1',
            bgColor: `${h.habit.color || '#6366f1'}15`,
            details: 'Completed',
            data: h,
            summary: h.habit.category || '',
            habitIcon: h.habit.icon,
          })
        }
      })

      setEvents(allEvents.sort((a, b) => new Date(b.date) - new Date(a.date)))
    } catch (err) {
      console.error('Failed to load events:', err)
    }
    setLoading(false)
  }

  const fetchJson = async (url) => {
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }

  const handleDateClick = (date, dayEvents) => {
    setSelectedDate(date)
    setSelectedEvents(dayEvents)
    if (dayEvents.length > 0) {
      setDialogOpen(true)
    }
  }

  // Filter events by type
  const filteredEvents = filterTab === 0 
    ? events 
    : events.filter(e => {
        if (filterTab === 1) return e.type === 'workout'
        if (filterTab === 2) return e.type === 'mental'
        if (filterTab === 3) return e.type === 'nutrition'
        if (filterTab === 4) return e.type === 'habit'
        return true
      })

  // Stats
  const thisMonth = new Date()
  const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
  const monthEvents = events.filter(e => new Date(e.date) >= monthStart)
  
  const stats = {
    workouts: monthEvents.filter(e => e.type === 'workout').length,
    checkins: monthEvents.filter(e => e.type === 'mental').length,
    nutrition: monthEvents.filter(e => e.type === 'nutrition').length,
    habits: monthEvents.filter(e => e.type === 'habit').length,
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717' }}>
            Calendar
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            All your activities in one view
          </Typography>
        </Box>
      </Box>

      {/* Monthly Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, textAlign: 'center' }}>
          <FitnessCenterIcon sx={{ color: '#2563eb', mb: 0.5 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2563eb' }}>{stats.workouts}</Typography>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Workouts</Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: '#faf5ff', borderRadius: 2, textAlign: 'center' }}>
          <SpaIcon sx={{ color: '#9333ea', mb: 0.5 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#9333ea' }}>{stats.checkins}</Typography>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Check-ins</Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, textAlign: 'center' }}>
          <RestaurantIcon sx={{ color: '#15803d', mb: 0.5 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#15803d' }}>{stats.nutrition}</Typography>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Nutrition</Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: '#eef2ff', borderRadius: 2, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ color: '#6366f1', mb: 0.5 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#6366f1' }}>{stats.habits}</Typography>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>Habits</Typography>
        </Box>
      </Box>

      {/* Filter Tabs */}
      <Box sx={{ borderBottom: '1px solid #e5e7eb', mb: 3 }}>
        <Tabs
          value={filterTab}
          onChange={(e, v) => setFilterTab(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              color: '#6b7280',
              minWidth: 'auto',
              px: 2,
              '&.Mui-selected': { color: '#171717' },
            },
            '& .MuiTabs-indicator': { bgcolor: '#171717' },
          }}
        >
          <Tab label="All" />
          <Tab icon={<FitnessCenterIcon sx={{ fontSize: 16 }} />} label="Workouts" iconPosition="start" />
          <Tab icon={<SpaIcon sx={{ fontSize: 16 }} />} label="Wellness" iconPosition="start" />
          <Tab icon={<RestaurantIcon sx={{ fontSize: 16 }} />} label="Nutrition" iconPosition="start" />
          <Tab icon={<CheckCircleIcon sx={{ fontSize: 16 }} />} label="Habits" iconPosition="start" />
        </Tabs>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 350px' }, gap: 3 }}>
        {/* Calendar */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Calendar 
            events={filteredEvents} 
            onDateClick={handleDateClick}
          />
        </Box>

        {/* Upcoming Events Sidebar */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Recent Activity
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 500, overflow: 'auto' }}>
            {filteredEvents.slice(0, 15).map((event, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: event.bgColor,
                  border: `1px solid ${event.color}20`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ color: event.color }}>{event.icon}</Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#171717', flex: 1 }}>
                    {event.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                  {event.details}
                </Typography>
                {event.summary && (
                  <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.5 }}>
                    {event.summary.slice(0, 80)}{event.summary.length > 80 ? '...' : ''}
                  </Typography>
                )}
              </Box>
            ))}

            {filteredEvents.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CalendarMonthIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  No activities logged yet
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Day Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">
              {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {selectedEvents.length} {selectedEvents.length === 1 ? 'event' : 'events'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {selectedEvents.map((event, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: event.bgColor,
                  border: `1px solid ${event.color}30`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    bgcolor: event.color,
                    color: '#fff',
                    display: 'flex',
                  }}>
                    {event.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {event.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      {event.details}
                    </Typography>
                  </Box>
                </Box>

                {/* Workout Details */}
                {event.type === 'workout' && event.data?.exercises && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {event.data.exercises.map((ex, i) => (
                      <Box key={i} sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        py: 1,
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={ex.muscleGroup}
                            size="small"
                            sx={{ 
                              height: 20, 
                              fontSize: '0.65rem',
                              bgcolor: 'rgba(0,0,0,0.1)',
                            }}
                          />
                          <Typography variant="body2">{ex.name}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {ex.sets?.map(s => `${s.weight}×${s.reps}`).join(', ')}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Mental Details */}
                {event.type === 'mental' && event.data && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>Mood</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{event.data.moodScore || 5}/10</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>Energy</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{event.data.energyLevel || 5}/10</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>Sleep</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{event.data.sleepHours || 0}h</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>Stress</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{event.data.stressLevel || 0}/10</Typography>
                    </Box>
                    {event.data.medsTaken?.length > 0 && (
                      <Box sx={{ gridColumn: '1 / -1', p: 1.5, bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <MedicationIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>Medications Taken</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {event.data.medsTaken.map((med, i) => (
                            <Chip key={i} label={med} size="small" sx={{ bgcolor: '#15803d20', color: '#15803d' }} />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Nutrition Details */}
                {event.type === 'nutrition' && event.data?.meals && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {event.data.meals.map((meal, i) => (
                      <Box key={i} sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        py: 1,
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                      }}>
                        <Typography variant="body2">{meal.name}</Typography>
                        {meal.calories && (
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            {meal.calories} kcal
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default GlobalCalendar

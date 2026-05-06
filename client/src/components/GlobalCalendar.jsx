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
import { API_BASE } from '../config'

function GlobalCalendar() {
  const { token, user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedEvents, setSelectedEvents] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterTab, setFilterTab] = useState(0)

  const [visibleMonth, setVisibleMonth] = useState(new Date())

  useEffect(() => {
    loadAllEvents(visibleMonth)
  }, [token, visibleMonth])

  const loadAllEvents = async (date) => {
    setLoading(true)
    try {
      const year = date.getFullYear()
      const month = date.getMonth()
      
      // Fetch 1 month before and after to handle edge days in the grid
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month + 2, 0)
      
      const startStr = start.toISOString()
      const endStr = end.toISOString()

      if (!user || !user._id) {
        setEvents([])
        setLoading(false)
        return
      }

      const [workouts, mental, nutrition, habits] = await Promise.all([
        fetchJson(`${API_BASE}/api/gym/workouts/range/${encodeURIComponent(startStr)}/${encodeURIComponent(endStr)}`),
        fetchJson(`${API_BASE}/api/logs/mental/range/${encodeURIComponent(startStr)}/${encodeURIComponent(endStr)}`),
        fetchJson(`${API_BASE}/api/nutrition/logs/range/${encodeURIComponent(startStr)}/${encodeURIComponent(endStr)}`),
        fetchJson(`${API_BASE}/api/habits/logs/range?start=${startStr}&end=${endStr}`),
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
          bgColor: 'rgba(37, 99, 235, 0.08)',
          details: `${w.exercises?.length || 0} exercises`,
          data: w,
          summary: w.exercises?.map(e => e.name).join(', ') || '',
        })
      })

      // Mental/Wellness events
      mental.forEach(m => {
        const hasMeds = m.medsTaken?.length > 0
        allEvents.push({
          date: m.date,
          type: 'mental',
          title: 'Wellness Log',
          icon: <SpaIcon sx={{ fontSize: 16 }} />,
          color: '#9333ea',
          bgColor: 'rgba(147, 51, 234, 0.08)',
          details: `Mood ${m.moodScore || 5}/10 • Energy ${m.energyLevel || 5}/10`,
          data: m,
          summary: [
            `Sleep: ${m.sleepHours || 0}h`,
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
          bgColor: 'rgba(21, 128, 61, 0.08)',
          details: calories ? `${Math.round(calories)} kcal` : 'Meals logged',
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

  const handleMonthChange = (date) => {
    setVisibleMonth(date)
  }

  // Filter events by type
  const filteredEvents = filterTab === 0
    ? events
    : events.filter(e => {
        if (filterTab === 1) return e.type === 'workout'
        if (filterTab === 2) return e.type === 'habit'
        return true
      })

  // Stats for the visible month
  const monthEvents = events.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === visibleMonth.getMonth() && d.getFullYear() === visibleMonth.getFullYear()
  })
  
  const stats = {
    workouts: monthEvents.filter(e => e.type === 'workout').length,
    checkins: monthEvents.filter(e => e.type === 'mental').length,
    nutrition: monthEvents.filter(e => e.type === 'nutrition').length,
    habits: monthEvents.filter(e => e.type === 'habit').length,
  }

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.01em' }}>
            Calendar
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            A unified view of your physical and mental progress
          </Typography>
        </Box>
      </Box>

      {/* Monthly Stats */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <Box sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, textAlign: 'center', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
          <FitnessCenterIcon sx={{ color: '#2563eb', mb: 1, fontSize: 24 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>{stats.workouts}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workouts</Typography>
        </Box>
        <Box sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, textAlign: 'center', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
          <SpaIcon sx={{ color: '#9333ea', mb: 1, fontSize: 24 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>{stats.checkins}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check-ins</Typography>
        </Box>
        <Box sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, textAlign: 'center', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
          <RestaurantIcon sx={{ color: '#15803d', mb: 1, fontSize: 24 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>{stats.nutrition}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nutrition</Typography>
        </Box>
        <Box sx={{ p: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, textAlign: 'center', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
          <CheckCircleIcon sx={{ color: '#6366f1', mb: 1, fontSize: 24 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>{stats.habits}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Habits</Typography>
        </Box>
      </Box>

      {/* Filter Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={filterTab}
          onChange={(e, v) => setFilterTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              color: 'text.secondary',
              minWidth: 'auto',
              mr: 2,
              borderRadius: 2,
              '&.Mui-selected': { color: 'text.primary', bgcolor: 'action.selected' },
            },
            '& .MuiTabs-indicator': { display: 'none' },
          }}
        >
          <Tab label="All Activity" />
          <Tab icon={<FitnessCenterIcon sx={{ fontSize: 18 }} />} label="Workouts" iconPosition="start" />
          <Tab icon={<CheckCircleIcon sx={{ fontSize: 18 }} />} label="Habits" iconPosition="start" />
        </Tabs>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }, gap: 4 }}>
        {/* Calendar */}
        <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.paper', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
          <Calendar 
            events={filteredEvents} 
            onDateClick={handleDateClick}
            onMonthChange={handleMonthChange}
          />
        </Box>

        {/* Recent Activity Sidebar */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimelineIcon sx={{ fontSize: 18 }} />
            Monthly Feed
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 600, overflow: 'auto', pr: 1 }}>
            {monthEvents.slice(0, 20).map((event, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  gap: 2,
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: event.color, bgcolor: event.bgColor },
                }}
              >
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2, 
                  bgcolor: event.bgColor, 
                  color: event.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {event.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {event.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {new Date(event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 500 }}>
                    {event.details}
                  </Typography>
                  {event.summary && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', opacity: 0.8, fontStyle: 'italic' }} noWrap>
                      {event.summary}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}

            {monthEvents.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'background.paper', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                <CalendarMonthIcon sx={{ fontSize: 48, color: 'divider', mb: 1.5 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  No activities logged this month
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Day Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, bgcolor: 'background.default' } }}
      >
        <DialogTitle sx={{ p: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Daily Retrospective
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogOpen(false)} sx={{ bgcolor: 'action.hover' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {selectedEvents.map((event, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{ 
                    width: 44,
                    height: 44,
                    borderRadius: 2, 
                    bgcolor: event.bgColor,
                    color: event.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {event.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {event.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {event.details}
                    </Typography>
                  </Box>
                </Box>

                {/* Workout Details */}
                {event.type === 'workout' && event.data?.exercises && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {event.data.exercises.map((ex, i) => (
                      <Box key={i} sx={{ 
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'action.hover',
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: event.color }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{ex.name}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {ex.sets?.length || 0} sets
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Mental Details */}
                {event.type === 'mental' && event.data && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    {[
                      { label: 'Mood', value: `${event.data.moodScore || 5}/10`, color: '#9333ea' },
                      { label: 'Energy', value: `${event.data.energyLevel || 5}/10`, color: '#f59e0b' },
                      { label: 'Sleep', value: `${event.data.sleepHours || 0}h`, color: '#3b82f6' },
                      { label: 'Stress', value: `${event.data.stressLevel || 0}/10`, color: '#ef4444' },
                    ].map((stat, i) => (
                      <Box key={i} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>{stat.label}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: stat.color }}>{stat.value}</Typography>
                      </Box>
                    ))}
                    {event.data.medsTaken?.length > 0 && (
                      <Box sx={{ gridColumn: '1 / -1', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', display: 'block', mb: 1 }}>Medications</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {event.data.medsTaken.map((med, i) => (
                            <Chip key={i} label={med} size="small" sx={{ fontWeight: 600, bgcolor: 'background.paper' }} />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Nutrition Details */}
                {event.type === 'nutrition' && event.data?.meals && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {event.data.meals.map((meal, i) => (
                      <Box key={i} sx={{ 
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'action.hover',
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{meal.name}</Typography>
                        {meal.totalCalories && (
                          <Chip 
                            label={`${Math.round(meal.totalCalories)} kcal`} 
                            size="small" 
                            sx={{ fontWeight: 700, bgcolor: 'background.paper', color: '#15803d' }} 
                          />
                        )}
                      </Box>
                    ))}
                    {event.data.dailyTotals && (
                      <Box sx={{ mt: 1, p: 2, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Daily Total</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#15803d' }}>{Math.round(event.data.dailyTotals.calories)} kcal</Typography>
                      </Box>
                    )}
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

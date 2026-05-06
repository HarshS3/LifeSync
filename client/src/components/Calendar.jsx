import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import SpaIcon from '@mui/icons-material/Spa'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import CloseIcon from '@mui/icons-material/Close'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function Calendar({ events = [], onDateClick, onEventClick, compact = false, onMonthChange }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  useEffect(() => {
    if (typeof onMonthChange === 'function') onMonthChange(currentDate)
  }, [currentDate, onMonthChange])

  // Group events by date
  const eventsByDate = {}
  events.forEach(event => {
    const dateKey = new Date(event.date).toDateString()
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = []
    eventsByDate[dateKey].push(event)
  })

  const handleDateClick = (day) => {
    const clickedDate = new Date(year, month, day)
    setSelectedDate(clickedDate)
    
    if (onDateClick) {
      onDateClick(clickedDate, eventsByDate[clickedDate.toDateString()] || [])
    } else {
      setDialogOpen(true)
    }
  }

  const getEventDots = (day) => {
    const dateKey = new Date(year, month, day).toDateString()
    const dayEvents = eventsByDate[dateKey] || []
    
    const types = new Set(dayEvents.map(e => e.type))
    return Array.from(types)
  }

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate.toDateString()] || []) : []

  const renderDays = () => {
    const days = []
    const today = new Date()
    
    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push(
        <Box key={`prev-${i}`} sx={{ 
          p: compact ? 0.75 : 1,
          minHeight: compact ? 36 : 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#d1d5db',
        }}>
          <Typography variant={compact ? 'caption' : 'body2'}>
            {daysInPrevMonth - i}
          </Typography>
        </Box>
      )
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
      const dateKey = new Date(year, month, day).toDateString()
      const dayEvents = eventsByDate[dateKey] || []
      const hasEvents = dayEvents.length > 0
      
      const hasWorkout = dayEvents.some(e => e.type === 'workout')
      const otherTypes = Array.from(new Set(dayEvents.filter(e => e.type !== 'workout').map(e => e.type)))
      
      days.push(
        <Box
          key={day}
          onClick={() => handleDateClick(day)}
          sx={{
            p: compact ? 0.5 : 1,
            minHeight: compact ? 40 : 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            cursor: 'pointer',
            borderRadius: 1.5,
            position: 'relative',
            // Workout gives a soft blue background
            bgcolor: isToday 
              ? '#3b82f6' 
              : (hasWorkout ? 'rgba(37, 99, 235, 0.08)' : 'transparent'),
            color: isToday ? '#ffffff' : 'text.primary',
            border: hasWorkout && !isToday ? '1px solid rgba(37, 99, 235, 0.15)' : '1px solid transparent',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: isToday ? '#2563eb' : 'action.hover',
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            },
          }}
        >
          <Typography 
            variant={compact ? 'caption' : 'body2'} 
            sx={{ 
              fontWeight: isToday || hasWorkout ? 700 : 400,
              fontSize: compact ? '0.75rem' : '0.875rem',
              mb: 0.5,
              mt: compact ? 0.25 : 0
            }}
          >
            {day}
          </Typography>

          {/* Event Indicators */}
          {hasEvents && (
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 0.5,
              width: '100%',
              mt: 'auto',
              pb: 0.5
            }}>
              {/* If compact, we might show fewer or different indicators */}
              {compact ? (
                hasWorkout && !isToday && (
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#2563eb' }} />
                )
              ) : (
                <>
                  {otherTypes.map((type, i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: type === 'mental' ? '#9333ea'
                               : type === 'nutrition' ? '#15803d'
                               : type === 'habit' ? '#6366f1'
                               : '#94a3b8',
                      }}
                    />
                  ))}
                </>
              )}
            </Box>
          )}
        </Box>
      )
    }

    // Next month days
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push(
        <Box key={`next-${i}`} sx={{ 
          p: compact ? 0.75 : 1,
          minHeight: compact ? 36 : 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#d1d5db',
        }}>
          <Typography variant={compact ? 'caption' : 'body2'}>{i}</Typography>
        </Box>
      )
    }

    return days
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'workout': return <FitnessCenterIcon sx={{ fontSize: 16 }} />
      case 'mental': return <SpaIcon sx={{ fontSize: 16 }} />
      case 'nutrition': return <RestaurantIcon sx={{ fontSize: 16 }} />
      default: return null
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton 
            size="small" 
            onClick={prevMonth}
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: 'action.selected', transform: 'translateX(-2px)' },
              '&:active': { transform: 'translateX(0px)' },
              '&:focus': { outline: '2px solid #1f2937' }
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant={compact ? 'body2' : 'subtitle1'} sx={{ fontWeight: 600, minWidth: compact ? 100 : 140, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </Typography>
          <IconButton 
            size="small" 
            onClick={nextMonth}
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: 'action.selected', transform: 'translateX(2px)' },
              '&:active': { transform: 'translateX(0px)' },
              '&:focus': { outline: '2px solid #1f2937' }
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
        {!compact && (
          <Chip 
            label="Today" 
            size="small" 
            onClick={goToToday}
            sx={{ cursor: 'pointer', bgcolor: 'action.selected' }}
          />
        )}
      </Box>

      {/* Days header */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1 }}>
        {DAYS.map(day => (
          <Typography 
            key={day} 
            variant="caption" 
            sx={{ textAlign: 'center', color: 'text.secondary', fontWeight: 600 }}
          >
            {compact ? day[0] : day}
          </Typography>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {renderDays()}
      </Box>

      {/* Legend */}
      {!compact && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 }, mt: 3, justifyContent: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'rgba(37, 99, 235, 0.2)', border: '1px solid #2563eb' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Workout</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#15803d' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Nutrition</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#9333ea' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Wellness</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#6366f1' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Habits</Typography>
          </Box>
        </Box>
      )}

      {/* Events Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Typography>
          <IconButton size="small" onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedEvents.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedEvents.map((event, idx) => (
                <Box
                  key={idx}
                  onClick={() => {
                    if (onEventClick) {
                      onEventClick(event);
                      setDialogOpen(false);
                    }
                  }}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    cursor: onEventClick ? 'pointer' : 'default',
                    transition: 'transform 0.2s',
                    '&:hover': onEventClick ? { transform: 'translateY(-2px)' } : {},
                    bgcolor: event.type === 'workout' ? '#eff6ff'
                           : event.type === 'mental' ? '#faf5ff'
                           : '#f0fdf4',
                    border: `1px solid ${
                      event.type === 'workout' ? '#bfdbfe'
                      : event.type === 'mental' ? '#e9d5ff'
                      : '#bbf7d0'
                    }`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    {getEventIcon(event.type)}
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {event.title}
                    </Typography>
                  </Box>
                  {event.details && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {event.details}
                    </Typography>
                  )}
                  {event.exercises && (
                    <Box sx={{ mt: 1 }}>
                      {event.exercises.map((ex, i) => (
                        <Typography key={i} variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          • {ex.name}: {ex.sets?.length || 0} sets
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                No events on this day
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default Calendar

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

function Calendar({ events = [], onDateClick, compact = false, onMonthChange }) {
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
      const hasEvents = eventsByDate[dateKey]?.length > 0
      const eventTypes = getEventDots(day)
      
      days.push(
        <Box
          key={day}
          onClick={() => handleDateClick(day)}
          sx={{
            p: compact ? 0.75 : 1,
            minHeight: compact ? 36 : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            cursor: 'pointer',
            borderRadius: 1,
            position: 'relative',
            bgcolor: isToday ? '#3b82f6' : 'transparent',
            color: isToday ? 'background.paper' : 'text.primary',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              bgcolor: isToday ? '#2563eb' : 'action.selected',
              transform: 'scale(1.05)'
            },
            '&:active': { 
              transform: 'scale(0.98)'
            },
            '&:focus': { 
              outline: '2px solid #3b82f6',
              outlineOffset: 1
            }
          }}
        >
          <Typography variant={compact ? 'caption' : 'body2'} sx={{ fontWeight: isToday ? 600 : 400 }}>
            {day}
          </Typography>
          {hasEvents && !compact && (
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              justifyContent: 'center',
              gap: 0.3,
              pointerEvents: 'none',
            }}>
              {eventTypes.slice(0, 3).map((type, i) => (
                <Box
                  key={i}
                  sx={{
                    width: type === 'workout' ? 28 : 6,
                    height: type === 'workout' ? 28 : 6,
                    borderRadius: type === 'workout' ? '50%' : '50%',
                    bgcolor: type === 'workout' ? '#2563eb'
                           : type === 'mental' ? '#9333ea'
                           : type === 'nutrition' ? '#15803d'
                           : 'text.secondary',
                    border: type === 'workout' ? '2px solid #2563eb' : 'none',
                    opacity: type === 'workout' ? 0.8 : 1,
                  }}
                />
              ))}
            </Box>
          )}
          {hasEvents && compact && (
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}>
              {eventTypes.includes('workout') && (
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#2563eb',
                    border: '2px solid #2563eb',
                    opacity: 0.8,
                  }}
                />
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
        <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2563eb' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Workout</Typography>
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
                  sx={{
                    p: 2,
                    borderRadius: 2,
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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

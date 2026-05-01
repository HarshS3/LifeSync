import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Calendar from '../Calendar'

function GymCalendarTab({
  calendarEvents,
  loadCalendarRange,
  calendarLoading
}) {
  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 3 }}>Workout Calendar</Typography>
      <Calendar 
        events={calendarEvents} 
        onMonthChange={loadCalendarRange}
        loading={calendarLoading}
      />
    </Box>
  )
}

export default GymCalendarTab

import React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Calendar from '../Calendar';

const CalendarTab = ({
  calendarLoading,
  calendarEvents,
  isMobile,
  loadCalendarRange,
  editWorkout
}) => {
  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
      {calendarLoading && <LinearProgress sx={{ mb: 2 }} />}
      <Calendar
        events={calendarEvents}
        compact={isMobile}
        onMonthChange={loadCalendarRange}
        onEventClick={(event) => {
          if (event.original) {
            editWorkout(event.original);
          }
        }}
      />
    </Box>
  );
};

export default CalendarTab;

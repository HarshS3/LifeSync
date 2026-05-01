import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import ChatPanel from './ChatPanel.jsx'
import LifeTimelinePanel from './LifeTimelinePanel.jsx'

function ChatExperience() {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {/* Chat */}
      <Grid item xs={12} md={7}>
        <Box
          sx={{
            height: { xs: 'auto', md: 'calc(100vh - 200px)' },
            minHeight: { xs: 360, md: 500 },
          }}
        >
          <ChatPanel />
        </Box>
      </Grid>

      {/* Sidebar */}
      <Grid item xs={12} md={5}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Context card */}
          <Box
            sx={{
              p: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: '1px solid #e5e7eb',
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary' }}>
              How it works
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              The assistant reads your recent logs to give personalized advice. 
              Ask about your training load, nutrition patterns, or wellness trends.
            </Typography>
          </Box>

          {/* Timeline */}
          <Box
            sx={{
              p: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: '1px solid #e5e7eb',
            }}
          >
            <LifeTimelinePanel />
          </Box>

          {/* Suggestions */}
          <Box
            sx={{
              p: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: '1px solid #e5e7eb',
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              Try asking
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                'Should I train hard today?',
                'How has my sleep affected my energy?',
                'What should I focus on this week?',
              ].map((q) => (
                <Box
                  key={q}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 1.5,
                    bgcolor: 'action.hover',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: 'action.selected', borderColor: '#d1d5db' },
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {q}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Grid>
    </Grid>
  )
}

export default ChatExperience

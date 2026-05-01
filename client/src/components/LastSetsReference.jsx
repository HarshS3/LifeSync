import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import { useNavigate } from 'react-router-dom'

function LastSetsReference({ exerciseName, lastSets, onViewHistory }) {
  const navigate = useNavigate()

  if (!lastSets || lastSets.length === 0) {
    return null
  }

  return (
    <Box sx={{ 
      p: 1.5, 
      bgcolor: 'rgba(59, 130, 246, 0.1)', 
      border: '1px solid rgba(59, 130, 246, 0.3)', 
      borderRadius: 1.5, 
      mt: 1.5,
      mb: 2
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', fontSize: '0.7rem' }}>
          Last Logged ({lastSets.length} sets)
        </Typography>
        <Button 
          size="small" 
          onClick={() => navigate(`/exercise-history/${encodeURIComponent(exerciseName)}`)}
          sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#3b82f6' }}
        >
          View Full History →
        </Button>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 1 }}>
        {lastSets.slice(0, 6).map((set, idx) => (
          <Box key={idx} sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ display: 'block', color: '#9ca3af', fontWeight: 600, fontSize: '0.7rem', mb: 0.5 }}>
              Set {idx + 1}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#60a5fa', mb: 0.25 }}>
              {set.weight}kg
            </Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
              × {set.reps}
            </Typography>
            {set.rpe && (
              <Typography variant="caption" sx={{ color: '#f59e0b', display: 'block', fontSize: '0.65rem' }}>
                RPE {set.rpe}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default LastSetsReference

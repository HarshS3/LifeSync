import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import { API_BASE } from '../config'

function GoalsPanel() {
  const [newGoal, setNewGoal] = useState({
    title: '',
    category: 'fitness',
    target: '',
    deadline: '',
  })

  const [goals] = useState([
    { id: 1, title: 'Run 5km under 25 min', category: 'fitness', progress: 65 },
    { id: 2, title: 'Meditate daily for 30 days', category: 'wellness', progress: 40 },
    { id: 3, title: 'Hit protein target 6x/week', category: 'nutrition', progress: 80 },
  ])

  const categories = ['fitness', 'nutrition', 'wellness', 'sleep', 'strength']

  const categoryColors = {
    fitness: { bg: '#dbeafe', text: '#1d4ed8' },
    nutrition: { bg: '#dcfce7', text: '#15803d' },
    wellness: { bg: '#f3e8ff', text: '#7c3aed' },
    sleep: { bg: '#fef3c7', text: '#b45309' },
    strength: { bg: '#fee2e2', text: '#dc2626' },
  }

  const handleCreate = async () => {
    try {
      await fetch(`${API_BASE}/api/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGoal.title,
          category: newGoal.category,
          targetValue: Number(newGoal.target) || 100,
          deadline: newGoal.deadline || undefined,
        }),
      })
      setNewGoal({ title: '', category: 'fitness', target: '', deadline: '' })
    } catch (err) {
      console.error(err)
    }
  }

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: '#e5e7eb' },
      '&:hover fieldset': { borderColor: '#d1d5db' },
      '&.Mui-focused fieldset': { borderColor: '#171717' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#171717' },
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: '#171717' }}>
        Goals
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: '#6b7280' }}>
        Set targets and track your progress over time
      </Typography>

      {/* Active Goals */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, color: '#6b7280', fontWeight: 500 }}>
          Active Goals
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {goals.map((goal) => (
            <Box
              key={goal.id}
              sx={{
                p: 3,
                bgcolor: '#fff',
                borderRadius: 2,
                border: '1px solid #e5e7eb',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 500, color: '#171717' }}>
                  {goal.title}
                </Typography>
                <Chip
                  label={goal.category}
                  size="small"
                  sx={{
                    bgcolor: categoryColors[goal.category]?.bg || '#f3f4f6',
                    color: categoryColors[goal.category]?.text || '#374151',
                    fontWeight: 500,
                    fontSize: 12,
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={goal.progress}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: '#f3f4f6',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#171717',
                      borderRadius: 3,
                    },
                  }}
                />
                <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500, minWidth: 40 }}>
                  {goal.progress}%
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Create New Goal */}
      <Box
        sx={{
          p: 3,
          bgcolor: '#f9fafb',
          borderRadius: 2,
          border: '1px solid #e5e7eb',
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 3, color: '#171717', fontWeight: 600 }}>
          Create New Goal
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Goal Title"
            fullWidth
            value={newGoal.title}
            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            placeholder="What do you want to achieve?"
            sx={inputSx}
          />

          <Box>
            <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500, color: '#374151' }}>
              Category
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  onClick={() => setNewGoal({ ...newGoal, category: cat })}
                  sx={{
                    bgcolor: newGoal.category === cat 
                      ? categoryColors[cat]?.bg 
                      : '#fff',
                    color: newGoal.category === cat 
                      ? categoryColors[cat]?.text 
                      : '#6b7280',
                    border: '1px solid',
                    borderColor: newGoal.category === cat 
                      ? categoryColors[cat]?.text 
                      : '#e5e7eb',
                    fontWeight: 500,
                    '&:hover': { 
                      bgcolor: categoryColors[cat]?.bg,
                    },
                  }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Target Value"
              type="number"
              value={newGoal.target}
              onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
              sx={{ ...inputSx, flex: 1 }}
            />
            <TextField
              label="Deadline"
              type="date"
              value={newGoal.deadline}
              onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>

          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newGoal.title}
            sx={{
              py: 1.5,
              bgcolor: '#171717',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#374151', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: '#e5e7eb', color: '#9ca3af' },
            }}
          >
            Create Goal
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default GoalsPanel

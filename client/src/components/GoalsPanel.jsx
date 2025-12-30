import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'

import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'

function GoalsPanel() {
  const { user, token } = useAuth()
  const [newGoal, setNewGoal] = useState({
    title: '',
    domain: 'fitness',
    target: '',
    deadline: '',
  })

  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  const domains = ['fitness', 'nutrition', 'mental', 'lifestyle']

  const categoryColors = {
    fitness: { bg: '#dbeafe', text: '#1d4ed8' },
    nutrition: { bg: '#dcfce7', text: '#15803d' },
    mental: { bg: '#f3e8ff', text: '#7c3aed' },
    lifestyle: { bg: '#fef3c7', text: '#b45309' },
  }

  const computeProgress = (goal) => {
    if (!goal) return 0
    if (goal.status === 'completed') return 100

    const start = goal.startDate ? new Date(goal.startDate) : new Date(goal.createdAt || Date.now())
    const end = goal.targetDate ? new Date(goal.targetDate) : null
    if (!end || Number.isNaN(end.getTime())) return 0

    const total = end.getTime() - start.getTime()
    if (total <= 0) return 0
    const elapsed = Date.now() - start.getTime()
    return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
  }

  const loadGoals = async () => {
    if (!user?._id) {
      setGoals([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/goals/${user._id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setGoals(Array.isArray(data) ? data : [])
      } else {
        setGoals([])
      }
    } catch (err) {
      console.error('Failed to load goals:', err)
      setGoals([])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadGoals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, token])

  const handleCreate = async () => {
    if (!user || !user._id) {
      alert('User not found!')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user: user._id,
          title: newGoal.title,
          domain: newGoal.domain,
          target: newGoal.target || undefined,
          startDate: new Date().toISOString(),
          targetDate: newGoal.deadline ? new Date(newGoal.deadline).toISOString() : undefined,
          status: 'active',
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('Create goal failed:', res.status, text)
        alert('Failed to create goal. Please check the fields and try again.')
        return
      }

      setNewGoal({ title: '', domain: 'fitness', target: '', deadline: '' })
      loadGoals()
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
          {loading ? (
            <Box sx={{ py: 2 }}>
              <LinearProgress />
            </Box>
          ) : goals.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#6b7280' }}>
              <Typography variant="body1" sx={{ mb: 0.5 }}>
                No goals yet
              </Typography>
              <Typography variant="body2">
                Create a goal below to get started.
              </Typography>
            </Box>
          ) : (
            goals.map((goal) => {
              const progress = computeProgress(goal)
              const domain = goal.domain || 'lifestyle'
              return (
                <Box
                  key={goal._id}
                  sx={{
                    p: 3,
                    bgcolor: '#fff',
                    borderRadius: 2,
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#171717' }}>
                      {goal.title}
                    </Typography>
                    <Chip
                      label={domain}
                      size="small"
                      sx={{
                        bgcolor: categoryColors[domain]?.bg || '#f3f4f6',
                        color: categoryColors[domain]?.text || '#374151',
                        fontWeight: 500,
                        fontSize: 12,
                      }}
                    />
                  </Box>

                  {(goal.target || goal.targetDate) && (
                    <Typography variant="caption" sx={{ display: 'block', color: '#6b7280', mb: 2 }}>
                      {goal.target ? `Target: ${goal.target}` : ''}
                      {goal.target && goal.targetDate ? ' • ' : ''}
                      {goal.targetDate ? `Due: ${new Date(goal.targetDate).toLocaleDateString()}` : ''}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
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
                      {progress}%
                    </Typography>
                  </Box>
                </Box>
              )
            })
          )}
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
              {domains.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  onClick={() => setNewGoal({ ...newGoal, domain: cat })}
                  sx={{
                    bgcolor: newGoal.domain === cat 
                      ? categoryColors[cat]?.bg 
                      : '#fff',
                    color: newGoal.domain === cat 
                      ? categoryColors[cat]?.text 
                      : '#6b7280',
                    border: '1px solid',
                    borderColor: newGoal.domain === cat 
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

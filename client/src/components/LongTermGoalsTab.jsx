import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Slider from '@mui/material/Slider'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import WarningIcon from '@mui/icons-material/Warning'
import FlagIcon from '@mui/icons-material/Flag'
import TimelineIcon from '@mui/icons-material/Timeline'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

const GOAL_CATEGORIES = [
  { value: 'addiction', label: 'Addiction Recovery', icon: '🚫' },
  { value: 'skill', label: 'Skill Building', icon: '📚' },
  { value: 'health', label: 'Health', icon: '💪' },
  { value: 'career', label: 'Career', icon: '💼' },
  { value: 'relationship', label: 'Relationship', icon: '❤️' },
  { value: 'financial', label: 'Financial', icon: '💰' },
  { value: 'other', label: 'Other', icon: '🎯' },
]

const GOAL_COLORS = ['#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#06b6d4', '#3b82f6']

const STATUS_OPTIONS = [
  { value: 'success', label: '✓ Clean Day', color: '#22c55e', bg: '#dcfce7' },
  { value: 'partial', label: '⚡ Struggled', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'relapse', label: '✗ Relapse', color: '#ef4444', bg: '#fee2e2' },
]

const COMMON_TRIGGERS = [
  'Stress', 'Boredom', 'Loneliness', 'Social media', 'Late night',
  'After drinking', 'Anxiety', 'Tired', 'Home alone', 'Weekend'
]

function LongTermGoalsTab() {
  const { token } = useAuth()
  const [goals, setGoals] = useState([])
  const [todayLogs, setTodayLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [editingGoal, setEditingGoal] = useState(null)
  
  const [newGoal, setNewGoal] = useState({
    name: '',
    description: '',
    category: 'addiction',
    goalType: 'abstain',
    color: '#8b5cf6',
    targetDays: 90,
    motivationText: '',
  })

  const [logEntry, setLogEntry] = useState({
    status: 'success',
    urgeLevel: 5,
    mood: 5,
    relapseCount: 1,
    trigger: '',
    notes: '',
    lessonsLearned: '',
  })

  useEffect(() => {
    loadData()
  }, [token])

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [goalsRes, todayRes] = await Promise.all([
        fetch(`${API_BASE}/api/long-term-goals`, { 
          headers: { Authorization: `Bearer ${token}` } 
        }),
        fetch(`${API_BASE}/api/long-term-goals/today`, { 
          headers: { Authorization: `Bearer ${token}` } 
        }),
      ])
      
      if (goalsRes.ok) setGoals(await goalsRes.json())
      if (todayRes.ok) setTodayLogs(await todayRes.json())
    } catch (err) {
      console.error('Failed to load goals:', err)
    }
    setLoading(false)
  }

  const handleSaveGoal = async () => {
    try {
      const url = editingGoal 
        ? `${API_BASE}/api/long-term-goals/${editingGoal._id}` 
        : `${API_BASE}/api/long-term-goals`
      const method = editingGoal ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newGoal),
      })

      if (res.ok) {
        setDialogOpen(false)
        setEditingGoal(null)
        setNewGoal({
          name: '',
          description: '',
          category: 'addiction',
          goalType: 'abstain',
          color: '#8b5cf6',
          targetDays: 90,
          motivationText: '',
        })
        loadData()
      }
    } catch (err) {
      console.error('Failed to save goal:', err)
    }
  }

  const handleLogEntry = async () => {
    if (!selectedGoal) return
    try {
      const res = await fetch(`${API_BASE}/api/long-term-goals/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          goalId: selectedGoal._id,
          date: new Date().toISOString(),
          ...logEntry,
        }),
      })

      if (res.ok) {
        setLogDialogOpen(false)
        setLogEntry({
          status: 'success',
          urgeLevel: 5,
          mood: 5,
          relapseCount: 1,
          trigger: '',
          notes: '',
          lessonsLearned: '',
        })
        loadData()
      }
    } catch (err) {
      console.error('Failed to log entry:', err)
    }
  }

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('Archive this goal?')) return
    try {
      await fetch(`${API_BASE}/api/long-term-goals/${goalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      loadData()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const loadAnalytics = async (goal) => {
    try {
      const res = await fetch(`${API_BASE}/api/long-term-goals/analytics/${goal._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const analyticsData = await res.json()

        // Also fetch raw logs (covers /api/long-term-goals/logs/:goalId)
        // Use as recent log source when available, keeping UI the same.
        let logs = null
        try {
          const logsRes = await fetch(`${API_BASE}/api/long-term-goals/logs/${goal._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (logsRes.ok) {
            const data = await logsRes.json()
            logs = Array.isArray(data) ? data : null
          }
        } catch (e) {
          // ignore; analytics endpoint already succeeded
        }

        const merged = {
          ...analyticsData,
          recentLogs: logs ? logs.slice(0, 14) : analyticsData.recentLogs,
        }

        setAnalytics(merged)
        setSelectedGoal(goal)
        setAnalyticsDialogOpen(true)
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  }

  const openLogDialog = (goal) => {
    setSelectedGoal(goal)
    const existingLog = todayLogs.find(l => l.goal?._id === goal._id)
    if (existingLog) {
      setLogEntry({
        status: existingLog.status || 'success',
        urgeLevel: existingLog.urgeLevel || 5,
        mood: existingLog.mood || 5,
        relapseCount: existingLog.relapseCount || 1,
        trigger: existingLog.trigger || '',
        notes: existingLog.notes || '',
        lessonsLearned: existingLog.lessonsLearned || '',
      })
    }
    setLogDialogOpen(true)
  }

  const getTodayStatus = (goalId) => {
    const log = todayLogs.find(l => l.goal?._id === goalId || l.goal === goalId)
    return log?.status
  }

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Long Term Goals</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Track major life goals & recovery journeys
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingGoal(null)
            setDialogOpen(true)
          }}
          sx={{
            bgcolor: '#8b5cf6',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: '#7c3aed' },
          }}
        >
          New Goal
        </Button>
      </Box>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, bgcolor: '#f8fafc', borderRadius: 3 }}>
          <FlagIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 1 }}>
            No long-term goals yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Set goals like "NoFap 90 days" or "Learn Guitar"
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {goals.map((goal) => {
            const todayStatus = getTodayStatus(goal._id)
            const progress = Math.min(100, Math.round((goal.currentStreak / goal.targetDays) * 100))
            const category = GOAL_CATEGORIES.find(c => c.value === goal.category)
            
            return (
              <Box
                key={goal._id}
                sx={{
                  p: 3,
                  bgcolor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 3,
                  borderLeft: `4px solid ${goal.color}`,
                }}
              >
                {/* Top Row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: `${goal.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                      }}
                    >
                      {category?.icon || '🎯'}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#171717' }}>
                        {goal.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {goal.description || category?.label}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => loadAnalytics(goal)}
                      sx={{ color: '#6b7280' }}
                    >
                      <TimelineIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setEditingGoal(goal)
                        setNewGoal({
                          name: goal.name,
                          description: goal.description || '',
                          category: goal.category,
                          goalType: goal.goalType,
                          color: goal.color,
                          targetDays: goal.targetDays,
                          motivationText: goal.motivationText || '',
                        })
                        setDialogOpen(true)
                      }}
                      sx={{ color: '#6b7280' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteGoal(goal._id)}
                      sx={{ color: '#6b7280' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Stats Row */}
                <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalFireDepartmentIcon sx={{ color: '#f97316', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {goal.currentStreak} day streak
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEventsIcon sx={{ color: '#eab308', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      Best: {goal.longestStreak} days
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {goal.totalRelapses} relapses
                    </Typography>
                  </Box>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Progress to {goal.targetDays} days
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      {progress}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e5e7eb',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: goal.color,
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>

                {/* Today's Status / Log Button */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  {todayStatus ? (
                    <Chip
                      icon={todayStatus === 'success' ? <CheckCircleIcon /> : todayStatus === 'relapse' ? <CancelIcon /> : <WarningIcon />}
                      label={`Today: ${STATUS_OPTIONS.find(s => s.value === todayStatus)?.label}`}
                      sx={{
                        bgcolor: STATUS_OPTIONS.find(s => s.value === todayStatus)?.bg,
                        color: STATUS_OPTIONS.find(s => s.value === todayStatus)?.color,
                        fontWeight: 600,
                      }}
                    />
                  ) : null}
                  <Button
                    variant={todayStatus ? 'outlined' : 'contained'}
                    size="small"
                    onClick={() => openLogDialog(goal)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      ...(todayStatus ? {
                        borderColor: goal.color,
                        color: goal.color,
                      } : {
                        bgcolor: goal.color,
                        '&:hover': { bgcolor: goal.color, opacity: 0.9 },
                      }),
                    }}
                  >
                    {todayStatus ? 'Update Log' : 'Log Today'}
                  </Button>
                </Box>
              </Box>
            )
          })}
        </Box>
      )}

      {/* Create/Edit Goal Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingGoal ? 'Edit Goal' : 'Create Long Term Goal'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Goal Name"
              placeholder="e.g., NoFap, Learn Piano, Quit Smoking"
              value={newGoal.name}
              onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
              fullWidth
            />
            
            <TextField
              label="Description (optional)"
              placeholder="What does success look like?"
              value={newGoal.description}
              onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newGoal.category}
                label="Category"
                onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
              >
                {GOAL_CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Goal Type</InputLabel>
              <Select
                value={newGoal.goalType}
                label="Goal Type"
                onChange={(e) => setNewGoal({ ...newGoal, goalType: e.target.value })}
              >
                <MenuItem value="abstain">🚫 Abstain (avoid something)</MenuItem>
                <MenuItem value="build">📈 Build (develop a skill)</MenuItem>
                <MenuItem value="reduce">📉 Reduce (decrease frequency)</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: '#6b7280' }}>
                Target Days: {newGoal.targetDays}
              </Typography>
              <Slider
                value={newGoal.targetDays}
                onChange={(e, v) => setNewGoal({ ...newGoal, targetDays: v })}
                min={7}
                max={365}
                marks={[
                  { value: 30, label: '30' },
                  { value: 90, label: '90' },
                  { value: 180, label: '180' },
                  { value: 365, label: '365' },
                ]}
                sx={{ color: newGoal.color }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: '#6b7280' }}>Color</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {GOAL_COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setNewGoal({ ...newGoal, color })}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      bgcolor: color,
                      cursor: 'pointer',
                      border: newGoal.color === color ? '3px solid #171717' : '3px solid transparent',
                    }}
                  />
                ))}
              </Box>
            </Box>

            <TextField
              label="Why is this important to you?"
              placeholder="Your motivation..."
              value={newGoal.motivationText}
              onChange={(e) => setNewGoal({ ...newGoal, motivationText: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#6b7280' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveGoal}
            disabled={!newGoal.name}
            sx={{ bgcolor: newGoal.color, '&:hover': { bgcolor: newGoal.color, opacity: 0.9 } }}
          >
            {editingGoal ? 'Save Changes' : 'Create Goal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Daily Log Dialog */}
      <Dialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Log Today - {selectedGoal?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Status Selection */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600 }}>How was today?</Typography>
              <ToggleButtonGroup
                value={logEntry.status}
                exclusive
                onChange={(e, v) => v && setLogEntry({ ...logEntry, status: v })}
                fullWidth
              >
                {STATUS_OPTIONS.map((opt) => (
                  <ToggleButton
                    key={opt.value}
                    value={opt.value}
                    sx={{
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&.Mui-selected': {
                        bgcolor: opt.bg,
                        color: opt.color,
                        '&:hover': { bgcolor: opt.bg },
                      },
                    }}
                  >
                    {opt.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            {/* Relapse Details (only if relapse) */}
            {logEntry.status === 'relapse' && (
              <Box sx={{ p: 2, bgcolor: '#fee2e2', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, color: '#dc2626' }}>
                  Relapse Details
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    How many times? {logEntry.relapseCount}
                  </Typography>
                  <Slider
                    value={logEntry.relapseCount}
                    onChange={(e, v) => setLogEntry({ ...logEntry, relapseCount: v })}
                    min={1}
                    max={10}
                    marks
                    sx={{ color: '#ef4444' }}
                  />
                </Box>

                <FormControl fullWidth size="small">
                  <InputLabel>What triggered it?</InputLabel>
                  <Select
                    value={logEntry.trigger}
                    label="What triggered it?"
                    onChange={(e) => setLogEntry({ ...logEntry, trigger: e.target.value })}
                  >
                    {COMMON_TRIGGERS.map((t) => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Urge Level */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Urge Level Today: {logEntry.urgeLevel}/10
              </Typography>
              <Slider
                value={logEntry.urgeLevel}
                onChange={(e, v) => setLogEntry({ ...logEntry, urgeLevel: v })}
                min={1}
                max={10}
                marks
                sx={{ color: logEntry.urgeLevel > 7 ? '#ef4444' : logEntry.urgeLevel > 4 ? '#f59e0b' : '#22c55e' }}
              />
            </Box>

            {/* Mood */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Overall Mood: {logEntry.mood}/10
              </Typography>
              <Slider
                value={logEntry.mood}
                onChange={(e, v) => setLogEntry({ ...logEntry, mood: v })}
                min={1}
                max={10}
                marks
                sx={{ color: '#6366f1' }}
              />
            </Box>

            {/* Notes */}
            <TextField
              label="Notes"
              placeholder="How are you feeling? What helped today?"
              value={logEntry.notes}
              onChange={(e) => setLogEntry({ ...logEntry, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            {/* Lessons Learned (on relapse) */}
            {logEntry.status === 'relapse' && (
              <TextField
                label="Lessons Learned"
                placeholder="What will you do differently next time?"
                value={logEntry.lessonsLearned}
                onChange={(e) => setLogEntry({ ...logEntry, lessonsLearned: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLogDialogOpen(false)} sx={{ color: '#6b7280' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleLogEntry}
            sx={{
              bgcolor: STATUS_OPTIONS.find(s => s.value === logEntry.status)?.color,
              '&:hover': { 
                bgcolor: STATUS_OPTIONS.find(s => s.value === logEntry.status)?.color,
                opacity: 0.9 
              },
            }}
          >
            Save Log
          </Button>
        </DialogActions>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog 
        open={analyticsDialogOpen} 
        onClose={() => setAnalyticsDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {selectedGoal?.name} - Analytics
        </DialogTitle>
        <DialogContent>
          {analytics && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              {/* Stats Cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: '#dcfce7', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#15803d' }}>
                    {analytics.stats.successRate}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#166534' }}>Success Rate</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#b45309' }}>
                    {analytics.stats.currentStreak}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#92400e' }}>Current Streak</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#ede9fe', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#7c3aed' }}>
                    {analytics.stats.longestStreak}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6d28d9' }}>Best Streak</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#fee2e2', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#dc2626' }}>
                    {analytics.stats.totalRelapseCount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#b91c1c' }}>Total Relapses</Typography>
                </Box>
              </Box>

              {/* Progress to Goal */}
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Progress to {selectedGoal?.targetDays} Day Goal
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    {analytics.stats.daysToTarget} days to go
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analytics.stats.progress}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    bgcolor: '#e5e7eb',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: selectedGoal?.color,
                      borderRadius: 6,
                    },
                  }}
                />
              </Box>

              {/* Weekly Chart */}
              {analytics.weeklyData?.length > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                    Last 12 Weeks
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="success" stackId="a" fill="#22c55e" name="Clean Days" />
                      <Bar dataKey="partial" stackId="a" fill="#f59e0b" name="Struggled" />
                      <Bar dataKey="relapse" stackId="a" fill="#ef4444" name="Relapse" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}

              {/* Top Triggers */}
              {analytics.topTriggers?.length > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                    Common Triggers
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {analytics.topTriggers.map((t, i) => (
                      <Chip
                        key={i}
                        label={`${t.trigger} (${t.count})`}
                        sx={{ bgcolor: '#fee2e2', color: '#dc2626' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Recent Logs */}
              {analytics.recentLogs?.length > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                    Recent History
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {analytics.recentLogs.slice(0, 30).map((log, i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 0.5,
                          bgcolor: log.status === 'success' ? '#22c55e' : log.status === 'relapse' ? '#ef4444' : '#f59e0b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          color: '#fff',
                        }}
                        title={new Date(log.date).toLocaleDateString()}
                      >
                        {log.status === 'success' ? '✓' : log.status === 'relapse' ? '✗' : '~'}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default LongTermGoalsTab

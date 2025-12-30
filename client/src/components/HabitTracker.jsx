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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Tooltip from '@mui/material/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import BarChartIcon from '@mui/icons-material/BarChart'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import NotesIcon from '@mui/icons-material/Notes'
import FlagIcon from '@mui/icons-material/Flag'
import ArchiveIcon from '@mui/icons-material/Archive'
import LongTermGoalsTab from './LongTermGoalsTab'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

const HABIT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']
const CATEGORIES = [
  { value: 'health', label: 'Health' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'learning', label: 'Learning' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
]

function HabitTracker() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [habits, setHabits] = useState([])
  const [weekData, setWeekData] = useState(null)
  const [todayLogs, setTodayLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [habitStats, setHabitStats] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [analytics, setAnalytics] = useState(null)
  const [habitNotes, setHabitNotes] = useState({})
  const [expandedHabit, setExpandedHabit] = useState(null)
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    category: 'other',
    frequency: 'daily',
    targetPerDay: 1,
    unit: '',
  })

  useEffect(() => {
    loadData()
  }, [token, weekOffset])

  const loadData = async () => {
    setLoading(true)
    try {
      const [habitsRes, weekRes, todayRes, analyticsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/habits`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/habits/week?date=${getWeekDate()}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/habits/logs?start=${new Date().toISOString()}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/habits/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/habits/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (habitsRes.ok) setHabits(await habitsRes.json())
      if (weekRes.ok) setWeekData(await weekRes.json())
      if (todayRes.ok) {
        const logs = await todayRes.json()
        setTodayLogs(logs)
        // Initialize notes from existing logs
        const notesMap = {}
        logs.forEach(log => {
          const habitId = log.habit?._id || log.habit
          if (habitId) notesMap[habitId] = log.notes || ''
        })
        setHabitNotes(prev => ({ ...prev, ...notesMap }))
      }
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json())
      if (statsRes.ok) setHabitStats(await statsRes.json())
    } catch (err) {
      console.error('Failed to load habits:', err)
    }
    setLoading(false)
  }

  const getWeekDate = () => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    return d.toISOString()
  }

  const handleToggleHabit = async (habitId, date, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/habits/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitId,
          date,
          completed: !currentStatus,
        }),
      })

      if (res.ok) {
        loadData()
      }
    } catch (err) {
      console.error('Failed to toggle habit:', err)
    }
  }

  const handleSaveNote = async (habitId) => {
    try {
      const res = await fetch(`${API_BASE}/api/habits/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitId,
          date: new Date().toISOString(),
          notes: habitNotes[habitId] || '',
        }),
      })

      if (res.ok) {
        const updatedLog = await res.json()
        // Update todayLogs with the new/updated log
        setTodayLogs(prev => {
          const existing = prev.findIndex(l => (l.habit?._id || l.habit) === habitId)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = updatedLog
            return updated
          }
          return [...prev, updatedLog]
        })
      }
    } catch (err) {
      console.error('Failed to save note:', err)
    }
  }

  const handleSaveHabit = async () => {
    try {
      const url = editingHabit ? `${API_BASE}/api/habits/${editingHabit._id}` : `${API_BASE}/api/habits`
      const method = editingHabit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newHabit),
      })

      if (res.ok) {
        setDialogOpen(false)
        setEditingHabit(null)
        setNewHabit({
          name: '',
          description: '',
          color: '#6366f1',
          category: 'other',
          frequency: 'daily',
          targetPerDay: 1,
          unit: '',
        })
        loadData()
      }
    } catch (err) {
      console.error('Failed to save habit:', err)
    }
  }

  const handleDeleteHabit = async (habitId) => {
    if (!confirm('Archive this habit?')) return
    try {
      const res = await fetch(`${API_BASE}/api/habits/${habitId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) loadData()
    } catch (err) {
      console.error('Failed to delete habit:', err)
    }
  }

  const openEditDialog = (habit) => {
    setEditingHabit(habit)
    setNewHabit({
      name: habit.name,
      description: habit.description || '',
      color: habit.color,
      category: habit.category,
      frequency: habit.frequency,
      targetPerDay: habit.targetPerDay,
      unit: habit.unit || '',
    })
    setDialogOpen(true)
  }

  const today = new Date().toDateString()
  const completedToday = todayLogs.filter(l => l.completed).length
  const totalHabits = habits.length

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717' }}>
            Habit Tracker
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Build better habits, one day at a time
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingHabit(null)
            setNewHabit({
              name: '',
              description: '',
              color: '#6366f1',
              category: 'other',
              frequency: 'daily',
              targetPerDay: 1,
              unit: '',
            })
            setDialogOpen(true)
          }}
          sx={{
            bgcolor: '#171717',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: '#374151' },
          }}
        >
          New Habit
        </Button>
      </Box>

      {/* Today's Progress Card */}
      <Box
        sx={{
          p: 3,
          mb: 3,
          bgcolor: '#f8fafc',
          borderRadius: 3,
          border: '1px solid #e5e7eb',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Today's Progress</Typography>
          <Chip
            icon={<LocalFireDepartmentIcon sx={{ fontSize: 16 }} />}
            label={`${completedToday}/${totalHabits} completed`}
            sx={{
              bgcolor: completedToday === totalHabits && totalHabits > 0 ? '#dcfce7' : '#f3f4f6',
              color: completedToday === totalHabits && totalHabits > 0 ? '#15803d' : '#374151',
              fontWeight: 600,
            }}
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: '#e5e7eb',
            '& .MuiLinearProgress-bar': {
              bgcolor: completedToday === totalHabits && totalHabits > 0 ? '#22c55e' : '#6366f1',
              borderRadius: 4,
            },
          }}
        />
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid #e5e7eb', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              color: '#6b7280',
              '&.Mui-selected': { color: '#171717' },
            },
            '& .MuiTabs-indicator': { bgcolor: '#171717' },
          }}
        >
          <Tab label="Today" icon={<TodayIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Week View" />
          <Tab label="Stats" icon={<BarChartIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="All Habits" />
          <Tab label="Long Term Goals" icon={<FlagIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Today Tab */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {habits.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: '#6b7280' }}>
              <Typography variant="body1" sx={{ mb: 1 }}>No habits yet</Typography>
              <Typography variant="body2">Create your first habit to get started!</Typography>
            </Box>
          ) : (
            habits.map((habit) => {
              const log = todayLogs.find(l => l.habit?._id === habit._id || l.habit === habit._id)
              const isCompleted = log?.completed || false
              const isExpanded = expandedHabit === habit._id
              const savedNote = log?.notes || ''
              const currentNote = habitNotes[habit._id] ?? savedNote

              return (
                <Box
                  key={habit._id}
                  sx={{
                    bgcolor: isCompleted ? `${habit.color}10` : '#fff',
                    border: `1px solid ${isCompleted ? habit.color : '#e5e7eb'}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Main habit row */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: isCompleted ? `${habit.color}15` : '#f9fafb' },
                    }}
                  >
                    <Box
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleHabit(habit._id, new Date().toISOString(), isCompleted)
                      }}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: habit.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 },
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircleIcon sx={{ fontSize: 24, color: '#fff' }} />
                      ) : null}
                    </Box>
                    <Box 
                      sx={{ flex: 1 }}
                      onClick={() => setExpandedHabit(isExpanded ? null : habit._id)}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color: '#171717',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          opacity: isCompleted ? 0.7 : 1,
                        }}
                      >
                        {habit.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {habit.streak > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocalFireDepartmentIcon sx={{ fontSize: 14, color: '#f97316' }} />
                            <Typography variant="caption" sx={{ color: '#f97316', fontWeight: 600 }}>
                              {habit.streak} day streak
                            </Typography>
                          </Box>
                        )}
                        {savedNote && !isExpanded && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <NotesIcon sx={{ fontSize: 14, color: '#6b7280' }} />
                            <Typography variant="caption" sx={{ color: '#6b7280', fontStyle: 'italic' }}>
                              {savedNote.length > 30 ? savedNote.slice(0, 30) + '...' : savedNote}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedHabit(isExpanded ? null : habit._id)
                        }}
                        sx={{ color: '#6b7280' }}
                      >
                        <NotesIcon fontSize="small" />
                      </IconButton>
                      <Box onClick={(e) => {
                        e.stopPropagation()
                        handleToggleHabit(habit._id, new Date().toISOString(), isCompleted)
                      }}>
                        {isCompleted ? (
                          <CheckCircleIcon sx={{ fontSize: 28, color: habit.color, cursor: 'pointer' }} />
                        ) : (
                          <RadioButtonUncheckedIcon sx={{ fontSize: 28, color: '#d1d5db', cursor: 'pointer' }} />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Expandable note section */}
                  {isExpanded && (
                    <Box
                      sx={{
                        px: 2,
                        pb: 2,
                        pt: 0,
                        borderTop: '1px solid #e5e7eb',
                        bgcolor: '#f9fafb',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Add a note for today..."
                        value={currentNote}
                        onChange={(e) => setHabitNotes(prev => ({ ...prev, [habit._id]: e.target.value }))}
                        sx={{
                          mt: 1.5,
                          '& .MuiOutlinedInput-root': {
                            bgcolor: '#fff',
                            fontSize: '0.875rem',
                            '& fieldset': { borderColor: '#e5e7eb' },
                            '&:hover fieldset': { borderColor: '#d1d5db' },
                            '&.Mui-focused fieldset': { borderColor: habit.color },
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                        <Button
                          size="small"
                          onClick={() => {
                            setHabitNotes(prev => ({ ...prev, [habit._id]: savedNote }))
                            setExpandedHabit(null)
                          }}
                          sx={{ color: '#6b7280', textTransform: 'none' }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            handleSaveNote(habit._id)
                            setExpandedHabit(null)
                          }}
                          sx={{
                            bgcolor: habit.color,
                            textTransform: 'none',
                            '&:hover': { bgcolor: habit.color, opacity: 0.9 },
                          }}
                        >
                          Save Note
                        </Button>
                      </Box>
                      {/* Quick actions */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 2, borderTop: '1px dashed #e5e7eb' }}>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => openEditDialog(habit)}
                          sx={{ color: '#6b7280', textTransform: 'none' }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          startIcon={<ArchiveIcon />}
                          onClick={() => handleDeleteHabit(habit._id)}
                          sx={{ color: '#ef4444', textTransform: 'none' }}
                        >
                          Archive
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              )
            })
          )}
        </Box>
      )}

      {/* Week View Tab */}
      {activeTab === 1 && weekData && (
        <Box>
          {/* Week Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => setWeekOffset(weekOffset - 1)}>
              <ChevronLeftIcon />
            </IconButton>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {new Date(weekData.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' - '}
                {new Date(new Date(weekData.weekEnd).setDate(new Date(weekData.weekEnd).getDate() - 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                {weekData.stats.completionRate}% completion rate
              </Typography>
            </Box>
            <IconButton onClick={() => setWeekOffset(weekOffset + 1)} disabled={weekOffset >= 0}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {/* Week Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(120px, 1fr) repeat(7, 1fr)',
              gap: 1,
              overflowX: 'auto',
            }}
          >
            {/* Header Row */}
            <Box sx={{ p: 1 }}></Box>
            {weekData.days.map((day) => (
              <Box
                key={day.date}
                sx={{
                  p: 1,
                  textAlign: 'center',
                  bgcolor: day.isToday ? '#171717' : 'transparent',
                  borderRadius: 2,
                  color: day.isToday ? '#fff' : '#6b7280',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {day.dayName}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {day.dayNumber}
                </Typography>
              </Box>
            ))}

            {/* Habit Rows */}
            {habits.map((habit) => (
              <>
                <Box
                  key={`label-${habit._id}`}
                  sx={{
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      bgcolor: habit.color,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: '#171717',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {habit.name}
                  </Typography>
                </Box>
                {weekData.days.map((day) => {
                  const habitDay = day.habits.find(h => h.habitId.toString() === habit._id.toString())
                  const isCompleted = habitDay?.completed || false
                  const isPast = new Date(day.date) < new Date(new Date().setHours(0, 0, 0, 0))
                  const isToday = day.isToday

                  return (
                    <Box
                      key={`${habit._id}-${day.date}`}
                      sx={{
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Tooltip title={isCompleted ? 'Completed' : isPast ? 'Missed' : 'Click to complete'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleHabit(habit._id, day.date, isCompleted)}
                          disabled={!isToday && !isPast && weekOffset === 0}
                          sx={{
                            p: 0.5,
                            color: isCompleted
                              ? habit.color
                              : isPast
                              ? '#fecaca'
                              : '#e5e7eb',
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircleIcon sx={{ fontSize: 24 }} />
                          ) : (
                            <RadioButtonUncheckedIcon sx={{ fontSize: 24 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )
                })}
              </>
            ))}

            {/* Completion Row */}
            <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                Daily Total
              </Typography>
            </Box>
            {weekData.days.map((day) => (
              <Box
                key={`total-${day.date}`}
                sx={{ p: 1, textAlign: 'center' }}
              >
                <Chip
                  label={`${day.completedCount}/${day.totalHabits}`}
                  size="small"
                  sx={{
                    bgcolor:
                      day.completedCount === day.totalHabits && day.totalHabits > 0
                        ? '#dcfce7'
                        : day.completedCount > 0
                        ? '#fef3c7'
                        : '#f3f4f6',
                    color:
                      day.completedCount === day.totalHabits && day.totalHabits > 0
                        ? '#15803d'
                        : day.completedCount > 0
                        ? '#92400e'
                        : '#6b7280',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Stats Tab */}
      {activeTab === 2 && analytics && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Summary Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#15803d' }}>
                {analytics.summary.overallRate}%
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>Completion Rate</Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2, textAlign: 'center' }}>
              <LocalFireDepartmentIcon sx={{ color: '#f97316', fontSize: 28 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#92400e' }}>
                {analytics.summary.currentStreak}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>Current Streak</Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: '#eef2ff', borderRadius: 2, textAlign: 'center' }}>
              <EmojiEventsIcon sx={{ color: '#6366f1', fontSize: 28 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#4f46e5' }}>
                {habitStats?.longestStreak ?? analytics.summary.longestStreak}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>Longest Streak</Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#171717' }}>
                {habitStats?.totalCompletionsLast30Days ?? analytics.summary.totalCompletions}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>Total (30 days)</Typography>
            </Box>
          </Box>

          {/* Daily Completion Trend */}
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle' }} />
              Daily Completion Rate (Last 30 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics.dailyData}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="dayNum" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value}%`, 'Completion Rate']}
                  labelFormatter={(label, payload) => payload[0]?.payload?.date || label}
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fill="url(#colorRate)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>

          {/* Weekly Progress */}
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Weekly Progress (Last 4 Weeks)
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="weekLabel" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    name === 'rate' ? `${value}%` : value,
                    name === 'rate' ? 'Completion Rate' : 'Completed'
                  ]}
                />
                <Bar dataKey="rate" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          {/* Per-Habit Progress */}
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Habit Performance (Last 30 Days)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {analytics.habitStats.map((habit) => (
                <Box key={habit.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: habit.color }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{habit.name}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {habit.streak > 0 && (
                        <Chip
                          size="small"
                          icon={<LocalFireDepartmentIcon sx={{ fontSize: 12 }} />}
                          label={`${habit.streak} day streak`}
                          sx={{ bgcolor: '#fef3c7', color: '#92400e', fontSize: '0.7rem', height: 22 }}
                        />
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 600, color: habit.rate >= 70 ? '#15803d' : habit.rate >= 40 ? '#92400e' : '#dc2626' }}>
                        {habit.rate}%
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={habit.rate}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e5e7eb',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: habit.color,
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Category Breakdown */}
          {analytics.categoryData.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  By Category
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryData}
                      dataKey="completions"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {analytics.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={HABIT_COLORS[index % HABIT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>

              <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Category Completion Rates
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {analytics.categoryData.map((cat, idx) => (
                    <Box key={cat.name}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{cat.name}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          {cat.habits} habits • {cat.rate}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={cat.rate}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#e5e7eb',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: HABIT_COLORS[idx % HABIT_COLORS.length],
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}

          {/* Completion Heatmap */}
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Activity Heatmap (Last 30 Days)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {analytics.heatmapData.map((day, idx) => (
                <Tooltip key={idx} title={`${day.date}: ${day.count} habits completed`}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: 0.5,
                      bgcolor: day.count === 0 
                        ? '#f3f4f6' 
                        : day.count <= 2 
                        ? '#bbf7d0' 
                        : day.count <= 4 
                        ? '#4ade80' 
                        : '#15803d',
                      cursor: 'pointer',
                      '&:hover': { transform: 'scale(1.2)' },
                      transition: 'transform 0.1s',
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>Less</Typography>
              {['#f3f4f6', '#bbf7d0', '#4ade80', '#15803d'].map((color, i) => (
                <Box key={i} sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: color }} />
              ))}
              <Typography variant="caption" sx={{ color: '#6b7280' }}>More</Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* All Habits Tab */}
      {activeTab === 3 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {habits.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: '#6b7280' }}>
              <Typography variant="body1">No habits created yet</Typography>
            </Box>
          ) : (
            habits.map((habit) => (
              <Box
                key={habit._id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: habit.color,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#171717' }}>
                    {habit.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip label={habit.category} size="small" sx={{ fontSize: '0.7rem' }} />
                    <Chip label={habit.frequency} size="small" sx={{ fontSize: '0.7rem' }} />
                    {habit.streak > 0 && (
                      <Chip
                        icon={<LocalFireDepartmentIcon sx={{ fontSize: 12 }} />}
                        label={`${habit.streak} day streak`}
                        size="small"
                        sx={{ bgcolor: '#fef3c7', color: '#92400e', fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>
                <IconButton size="small" onClick={() => openEditDialog(habit)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <Tooltip title="Archive habit">
                  <IconButton size="small" onClick={() => handleDeleteHabit(habit._id)} sx={{ color: '#6b7280' }}>
                    <ArchiveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))
          )}
        </Box>
      )}

      {/* Long Term Goals Tab */}
      {activeTab === 4 && (
        <LongTermGoalsTab />
      )}

      {/* Create/Edit Habit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingHabit ? 'Edit Habit' : 'Create New Habit'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Habit Name"
              value={newHabit.name}
              onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
              fullWidth
              placeholder="e.g., Drink 8 glasses of water"
            />

            <TextField
              label="Description (optional)"
              value={newHabit.description}
              onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#374151' }}>
                Color
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {HABIT_COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setNewHabit({ ...newHabit, color })}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      bgcolor: color,
                      border: newHabit.color === color ? '3px solid #171717' : '3px solid transparent',
                      '&:hover': { transform: 'scale(1.1)' },
                    }}
                  />
                ))}
              </Box>
            </Box>

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newHabit.category}
                label="Category"
                onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={newHabit.frequency}
                label="Frequency"
                onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekdays">Weekdays only</MenuItem>
                <MenuItem value="weekends">Weekends only</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#6b7280' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveHabit}
            disabled={!newHabit.name}
            sx={{
              bgcolor: '#171717',
              '&:hover': { bgcolor: '#374151' },
            }}
          >
            {editingHabit ? 'Save Changes' : 'Create Habit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default HabitTracker

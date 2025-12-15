import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import NotificationsIcon from '@mui/icons-material/Notifications'
import EmailIcon from '@mui/icons-material/Email'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import MedicationIcon from '@mui/icons-material/Medication'
import SpaIcon from '@mui/icons-material/Spa'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AssessmentIcon from '@mui/icons-material/Assessment'
import { useAuth } from '../context/AuthContext'

function RemindersSettings() {
  const { user, token, refreshUser } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    habitReminders: true,
    medicationReminders: true,
    workoutReminders: true,
    wellnessCheckIn: true,
    weeklyReport: true,
    reminderTimes: {
      morning: '08:00',
      evening: '20:00',
      workout: '07:00',
    },
    email: true,
    push: true,
  })

  useEffect(() => {
    if (user?.reminders) {
      setSettings({
        habitReminders: user.reminders.habitReminders ?? true,
        medicationReminders: user.reminders.medicationReminders ?? true,
        workoutReminders: user.reminders.workoutReminders ?? true,
        wellnessCheckIn: user.reminders.wellnessCheckIn ?? true,
        weeklyReport: user.reminders.weeklyReport ?? true,
        reminderTimes: {
          morning: user.reminders.reminderTimes?.morning || '08:00',
          evening: user.reminders.reminderTimes?.evening || '20:00',
          workout: user.reminders.reminderTimes?.workout || '07:00',
        },
        email: user.reminders.email ?? true,
        push: user.reminders.push ?? true,
      })
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reminders: settings }),
      })
      if (res.ok) {
        await refreshUser()
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error('Failed to save reminders:', err)
    }
    setSaving(false)
  }

  const ReminderItem = ({ icon, title, description, checked, onChange }) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        bgcolor: '#fff',
        borderRadius: 2,
        border: '1px solid #e5e7eb',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717' }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            {description}
          </Typography>
        </Box>
      </Box>
      <Switch
        checked={checked}
        onChange={onChange}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#171717',
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#171717',
          },
        }}
      />
    </Box>
  )

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: '#171717' }}>
        Reminders & Notifications
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: '#6b7280' }}>
        Stay on track with personalized reminders
      </Typography>

      {saved && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          icon={<CheckCircleIcon />}
        >
          Settings saved successfully!
        </Alert>
      )}

      {/* Notification Channels */}
      <Typography variant="subtitle2" sx={{ mb: 2, color: '#6b7280' }}>
        Notification Channels
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        <ReminderItem
          icon={<NotificationsIcon />}
          title="Push Notifications"
          description="Get reminders on your device"
          checked={settings.push}
          onChange={(e) => setSettings({ ...settings, push: e.target.checked })}
        />
        <ReminderItem
          icon={<EmailIcon />}
          title="Email Notifications"
          description="Receive weekly summaries and reports"
          checked={settings.email}
          onChange={(e) => setSettings({ ...settings, email: e.target.checked })}
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Reminder Types */}
      <Typography variant="subtitle2" sx={{ mb: 2, color: '#6b7280' }}>
        Reminder Types
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        <ReminderItem
          icon={<CheckCircleIcon />}
          title="Habit Reminders"
          description="Daily nudges to complete your habits"
          checked={settings.habitReminders}
          onChange={(e) => setSettings({ ...settings, habitReminders: e.target.checked })}
        />
        <ReminderItem
          icon={<MedicationIcon />}
          title="Medication Reminders"
          description="Never miss your medications"
          checked={settings.medicationReminders}
          onChange={(e) => setSettings({ ...settings, medicationReminders: e.target.checked })}
        />
        <ReminderItem
          icon={<FitnessCenterIcon />}
          title="Workout Reminders"
          description="Stay consistent with your training"
          checked={settings.workoutReminders}
          onChange={(e) => setSettings({ ...settings, workoutReminders: e.target.checked })}
        />
        <ReminderItem
          icon={<SpaIcon />}
          title="Wellness Check-in"
          description="Daily mood and energy logging"
          checked={settings.wellnessCheckIn}
          onChange={(e) => setSettings({ ...settings, wellnessCheckIn: e.target.checked })}
        />
        <ReminderItem
          icon={<AssessmentIcon />}
          title="Weekly Report"
          description="Summary of your progress each week"
          checked={settings.weeklyReport}
          onChange={(e) => setSettings({ ...settings, weeklyReport: e.target.checked })}
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Reminder Times */}
      <Typography variant="subtitle2" sx={{ mb: 2, color: '#6b7280' }}>
        Reminder Times
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Morning Reminder"
            type="time"
            value={settings.reminderTimes.morning}
            onChange={(e) => setSettings({
              ...settings,
              reminderTimes: { ...settings.reminderTimes, morning: e.target.value }
            })}
            fullWidth
            InputLabelProps={{ shrink: true }}
            helperText="Habits & wellness check-in"
          />
          <TextField
            label="Evening Reminder"
            type="time"
            value={settings.reminderTimes.evening}
            onChange={(e) => setSettings({
              ...settings,
              reminderTimes: { ...settings.reminderTimes, evening: e.target.value }
            })}
            fullWidth
            InputLabelProps={{ shrink: true }}
            helperText="Daily wrap-up"
          />
        </Box>
        <TextField
          label="Workout Reminder"
          type="time"
          value={settings.reminderTimes.workout}
          onChange={(e) => setSettings({
            ...settings,
            reminderTimes: { ...settings.reminderTimes, workout: e.target.value }
          })}
          sx={{ maxWidth: 200 }}
          InputLabelProps={{ shrink: true }}
          helperText="Before your workout time"
        />
      </Box>

      <Button
        fullWidth
        variant="contained"
        onClick={handleSave}
        disabled={saving}
        sx={{
          py: 1.5,
          bgcolor: '#171717',
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 2,
          '&:hover': { bgcolor: '#374151' },
        }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </Box>
  )
}

export default RemindersSettings

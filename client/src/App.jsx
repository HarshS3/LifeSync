import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import useMediaQuery from '@mui/material/useMediaQuery'

import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined'
import SpaOutlinedIcon from '@mui/icons-material/SpaOutlined'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import InsightsIcon from '@mui/icons-material/Insights'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import LogoutIcon from '@mui/icons-material/Logout'
import NotificationsIcon from '@mui/icons-material/Notifications'
import StarIcon from '@mui/icons-material/Star'
import HealingIcon from '@mui/icons-material/Healing'
import BiotechIcon from '@mui/icons-material/Biotech'
import MenuIcon from '@mui/icons-material/Menu'
import { Toaster } from 'react-hot-toast'

import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import AuthPage from './components/AuthPage.jsx'
import ForgotPassword from './components/ForgotPassword.jsx'
import ResetPassword from './components/ResetPassword.jsx'
import Onboarding from './components/Onboarding.jsx'
import Dashboard from './components/Dashboard.jsx'
import ChatExperience from './components/ChatExperience.jsx'
import DailyLogPanel from './components/DailyLogPanel.jsx'
import ProfilePanel from './components/ProfilePanel.jsx'
import HabitTracker from './components/HabitTracker.jsx'
import TrendsPanel from './components/TrendsPanel.jsx'
import GymTracker from './components/GymTracker.jsx'
import GlobalCalendar from './components/GlobalCalendar.jsx'
import LifeSyncMark from './components/LifeSyncMark.jsx'
import NutritionTracker from './components/NutritionTracker.jsx'
import RemindersSettings from './components/RemindersSettings.jsx'
import SymptomsPanel from './components/SymptomsPanel.jsx'
import LabsPanel from './components/LabsPanel.jsx'
import ExerciseHistoryPage from './components/ExerciseHistoryPage.jsx'
// import PremiumPage from './components/PremiumPage.jsx'

const navItems = [
  { id: 'home', label: 'Home', icon: <HomeOutlinedIcon fontSize="small" /> },
  { id: 'chat', label: 'Assistant', icon: <ChatBubbleOutlineIcon fontSize="small" /> },
  { id: 'profile', label: 'Profile', icon: <PersonOutlineIcon fontSize="small" /> },
  { id: 'logs', label: 'Training', icon: <FitnessCenterIcon fontSize="small" /> },
  { id: 'nutrition', label: 'Nutrition', icon: <RestaurantOutlinedIcon fontSize="small" /> },
  { id: 'mental', label: 'Wellness', icon: <SpaOutlinedIcon fontSize="small" /> },
  { id: 'symptoms', label: 'Symptoms', icon: <HealingIcon fontSize="small" /> },
  { id: 'labs', label: 'Labs', icon: <BiotechIcon fontSize="small" /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarMonthIcon fontSize="small" /> },
  { id: 'goals', label: 'Habits', icon: <FlagOutlinedIcon fontSize="small" /> },
  { id: 'trends', label: 'Insights', icon: <InsightsIcon fontSize="small" /> },
  { id: 'reminders', label: 'Reminders', icon: <NotificationsIcon fontSize="small" /> },
  // { id: 'premium', label: 'Premium', icon: <StarIcon fontSize="small" /> },
]

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

function AppContent() {
  const { user, loading, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // derivation from location.pathname, e.g., '/nutrition' -> 'nutrition'
  const activeSection = location.pathname.substring(1) || 'home'

  const [themeVariant, setThemeVariant] = useState(() => {
    try {
      const v = localStorage.getItem('lifesync_theme')
      return v === 'noir' ? 'noir' : 'paper'
    } catch {
      return 'paper'
    }
  })
  const [anchorEl, setAnchorEl] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!loading) {
      window.dispatchEvent(new Event('lifesync:app:ready'))
    }
  }, [loading])

  useEffect(() => {
    try {
      localStorage.setItem('lifesync_theme', themeVariant)
    } catch {
      // ignore
    }
    try {
      document.documentElement.dataset.lifesyncTheme = themeVariant
    } catch {
      // ignore
    }
  }, [themeVariant])

  const ui = useMemo(() => {
    const isNoir = themeVariant === 'noir'
    return isNoir
      ? {
          name: 'Noir',
          bg: '#09090b',
          surface: '#121212',
          surface2: '#18181b',
          text: '#ffffff',
          muted: '#a1a1aa',
          border: 'rgba(255, 255, 255, 0.1)',
          accent: '#3b82f6',
          accent2: '#8b5cf6',
          danger: '#ef4444',
          navActiveBg: 'rgba(59, 130, 246, 0.1)',
          navHoverBg: 'rgba(255, 255, 255, 0.04)',
        }
      : {
          name: 'Paper',
          bg: '#f6f1e7',
          surface: '#ffffff',
          surface2: '#fbf7f0',
          text: '#161310',
          muted: 'rgba(22, 19, 16, 0.62)',
          border: 'rgba(22, 19, 16, 0.10)',
          accent: '#1f6f5b',
          accent2: '#b45309',
          danger: '#dc2626',
          navActiveBg: 'rgba(31, 111, 91, 0.10)',
          navHoverBg: 'rgba(31, 111, 91, 0.06)',
        }
  }, [themeVariant])

  const toggleTheme = () => setThemeVariant((v) => (v === 'noir' ? 'paper' : 'noir'))

  useEffect(() => {
    const handler = (e) => {
      const next = e?.detail?.section
      if (typeof next === 'string' && next.length > 0) {
        navigate('/' + next)
      }
    }

    window.addEventListener('lifesync:navigate', handler)
    return () => window.removeEventListener('lifesync:navigate', handler)
  }, [navigate])

  // Safety: close any modal backdrops when auth/section changes
  useEffect(() => {
    setMobileNavOpen(false)
    setAnchorEl(null)
  }, [user?._id])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [activeSection])

  const theme = useMemo(() => {
    const isNoir = themeVariant === 'noir'

    return createTheme({
      palette: {
        mode: isNoir ? 'dark' : 'light',
        background: {
          default: ui.bg,
          paper: ui.surface,
        },
        primary: { main: ui.text },
        secondary: { main: ui.accent },
        text: {
          primary: ui.text,
          secondary: ui.muted,
        },
        divider: ui.border,
        error: { main: ui.danger },
      },
      typography: {
        fontFamily: '"Albert Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        h4: { fontFamily: '"Fraunces", ui-serif, Georgia, "Times New Roman", serif', fontWeight: 700, letterSpacing: '-0.02em' },
        h5: { fontFamily: '"Fraunces", ui-serif, Georgia, "Times New Roman", serif', fontWeight: 700, letterSpacing: '-0.01em' },
        h6: { fontFamily: '"Fraunces", ui-serif, Georgia, "Times New Roman", serif', fontWeight: 700, letterSpacing: '-0.01em' },
        subtitle1: { fontWeight: 600 },
        subtitle2: { fontWeight: 600, color: ui.muted },
        body1: { fontSize: '0.938rem' },
        body2: { fontSize: '0.875rem', color: ui.muted },
        button: { fontWeight: 600, textTransform: 'none' },
      },
      shape: { borderRadius: 10 },
      shadows: [
        'none',
        '0 1px 2px 0 rgb(0 0 0 / 0.06)',
        '0 1px 3px 0 rgb(0 0 0 / 0.10), 0 1px 2px -1px rgb(0 0 0 / 0.10)',
        '0 6px 18px rgb(0 0 0 / 0.12)',
        ...Array(21).fill('none'),
      ],
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              padding: '9px 14px',
            },
            contained: {
              backgroundColor: ui.text,
              color: isNoir ? ui.bg : '#ffffff',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: isNoir ? '#ffffff' : '#0b0b0b',
                color: isNoir ? ui.bg : '#ffffff',
                boxShadow: 'none',
              },
            },
            outlined: {
              borderColor: ui.border,
              color: ui.text,
              '&:hover': {
                borderColor: isNoir ? 'rgba(243, 240, 234, 0.28)' : 'rgba(22, 19, 16, 0.18)',
                backgroundColor: isNoir ? 'rgba(93, 228, 199, 0.08)' : 'rgba(31, 111, 91, 0.06)',
              },
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                backgroundColor: ui.surface,
                '& fieldset': { borderColor: ui.border },
                '&:hover fieldset': {
                  borderColor: isNoir ? 'rgba(243, 240, 234, 0.28)' : 'rgba(22, 19, 16, 0.18)',
                },
                '&.Mui-focused fieldset': { borderColor: ui.accent, borderWidth: 1 },
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              border: `1px solid ${ui.border}`,
            },
          },
        },
      },
    })
  }, [themeVariant, ui])

  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Removed renderContent since we use Routes below

  // Check if user needs onboarding
  const needsOnboarding = user && !user.onboardingCompleted && !showOnboarding

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: ui.bg }}>
          <CircularProgress sx={{ color: ui.accent }} />
        </Box>
      </ThemeProvider>
    )
  }

  // Show auth page if not logged in
  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<AuthPage themeVariant={themeVariant} onToggleTheme={toggleTheme} />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // Show onboarding for new users
  if (needsOnboarding) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Onboarding onComplete={() => {
          setShowOnboarding(false)
          refreshUser()
        }} />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="bottom-center" />
      
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar (desktop) */}
        <Box
          sx={{
            width: 240,
            height: '100vh',
            position: 'sticky',
            top: 0,
            borderRight: `1px solid ${ui.border}`,
            bgcolor: ui.surface,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
          }}
        >
          {/* Logo */}
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${ui.border}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  bgcolor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LifeSyncMark size={32} />
              </Box>
              <Typography variant="h6" sx={{ fontSize: 18 }}>LifeSync</Typography>
            </Box>
          </Box>

          {/* Navigation */}
          <Box sx={{ flex: 1, py: 2, px: 1.5 }}>
            {navItems.map((item) => (
              <Box
                key={item.id}
                onClick={() => navigate('/' + item.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  mb: 0.5,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  color: activeSection === item.id ? ui.text : ui.muted,
                  bgcolor: activeSection === item.id ? ui.navActiveBg : 'transparent',
                  fontWeight: activeSection === item.id ? 500 : 400,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: activeSection === item.id ? ui.navActiveBg : ui.navHoverBg,
                    color: ui.text,
                  },
                }}
              >
                {item.icon}
                <Typography variant="body2" sx={{ fontWeight: 'inherit', color: 'inherit' }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* User */}
          <Box sx={{ p: 2, borderTop: `1px solid ${ui.border}` }}>
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                p: 1,
                borderRadius: 1.5,
                '&:hover': { bgcolor: ui.navHoverBg },
              }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: ui.accent, color: ui.bg, fontSize: 14 }}>
                {user.name?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: ui.text }} noWrap>
                  {user.name || 'User'}
                </Typography>
                <Typography variant="caption" sx={{ color: ui.muted }} noWrap>
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              PaperProps={{
                sx: { mt: -1, minWidth: 180 }
              }}
            >
              <MenuItem
                onClick={() => {
                  setAnchorEl(null)
                  toggleTheme()
                }}
              >
                <SpaOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
                Theme: {ui.name}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null)
                  logout()
                }}
                sx={{ color: ui.danger }}
              >
                <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Navigation Drawer (mobile) */}
        <Drawer
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          variant="temporary"
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { width: 280, borderRight: `1px solid ${ui.border}`, bgcolor: ui.surface } }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${ui.border}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    bgcolor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LifeSyncMark size={32} />
                </Box>
                <Typography variant="h6" sx={{ fontSize: 18 }}>LifeSync</Typography>
              </Box>
            </Box>

            <Box sx={{ flex: 1, py: 2, px: 1.5 }}>
              {navItems.map((item) => (
                <Box
                  key={item.id}
                  onClick={() => {
                    navigate('/' + item.id)
                    setMobileNavOpen(false)
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 1.5,
                    py: 1,
                    mb: 0.5,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    color: activeSection === item.id ? ui.text : ui.muted,
                    bgcolor: activeSection === item.id ? ui.navActiveBg : 'transparent',
                    fontWeight: activeSection === item.id ? 500 : 400,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: activeSection === item.id ? ui.navActiveBg : ui.navHoverBg,
                      color: ui.text,
                    },
                  }}
                >
                  {item.icon}
                  <Typography variant="body2" sx={{ fontWeight: 'inherit', color: 'inherit' }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ p: 2, borderTop: `1px solid ${ui.border}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: ui.accent, color: ui.bg, fontSize: 14 }}>
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: ui.text }} noWrap>
                    {user.name || 'User'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: ui.muted }} noWrap>
                    {user.email}
                  </Typography>
                </Box>
              </Box>

              <Box
                onClick={() => {
                  setMobileNavOpen(false)
                  setAnchorEl(null)
                  logout()
                }}
                sx={{
                  mt: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  cursor: 'pointer',
                  p: 1,
                  borderRadius: 1.5,
                  color: ui.danger,
                  '&:hover': {
                    bgcolor: themeVariant === 'noir' ? 'rgba(251, 113, 133, 0.12)' : '#fef2f2',
                  },
                }}
              >
                <LogoutIcon fontSize="small" />
                <Typography variant="body2" sx={{ color: 'inherit' }}>
                  Sign Out
                </Typography>
              </Box>
            </Box>
          </Box>
        </Drawer>

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: ui.bg }}>
          {/* Header */}
          <Box
            sx={{
              px: { xs: 2, md: 4 },
              py: { xs: 1.5, md: 2 },
              bgcolor: ui.surface,
              borderBottom: `1px solid ${ui.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={() => setMobileNavOpen(true)}
                sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                aria-label="Open navigation"
              >
                <MenuIcon />
              </IconButton>
              <Typography
                variant="h5"
                sx={{ fontSize: { xs: 18, md: 20 }, lineHeight: 1.2 }}
                noWrap
              >
                {navItems.find((n) => n.id === activeSection)?.label || 'Dashboard'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: ui.muted, display: { xs: 'none', sm: 'block' } }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Typography>
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: 'auto', overflowX: 'hidden', p: { xs: 2, md: 4 }, minWidth: 0 }}>
            <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%', minWidth: 0 }}>
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Dashboard />} />
                <Route path="/profile" element={<ProfilePanel />} />
                <Route path="/logs" element={<GymTracker />} />
                <Route path="/exercise-history/:exerciseName" element={<ExerciseHistoryPage />} />
                <Route path="/nutrition" element={<NutritionTracker />} />
                <Route path="/mental" element={<DailyLogPanel />} />
                <Route path="/symptoms" element={<SymptomsPanel />} />
                <Route path="/labs" element={<LabsPanel />} />
                <Route path="/calendar" element={<GlobalCalendar />} />
                <Route path="/goals" element={<HabitTracker />} />
                <Route path="/trends" element={<TrendsPanel />} />
                <Route path="/chat" element={<ChatExperience />} />
                <Route path="/reminders" element={<RemindersSettings />} />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App

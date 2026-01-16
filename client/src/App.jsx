import { useEffect, useMemo, useState } from 'react'
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { user, loading, logout, refreshUser } = useAuth()
  const [activeSection, setActiveSection] = useState('home')
  const [anchorEl, setAnchorEl] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!loading) {
      window.dispatchEvent(new Event('lifesync:app:ready'))
    }
  }, [loading])

  useEffect(() => {
    const handler = (e) => {
      const next = e?.detail?.section
      if (typeof next === 'string' && next.length > 0) {
        setActiveSection(next)
      }
    }

    window.addEventListener('lifesync:navigate', handler)
    return () => window.removeEventListener('lifesync:navigate', handler)
  }, [])

  // Safety: close any modal backdrops when auth/section changes
  useEffect(() => {
    setMobileNavOpen(false)
    setAnchorEl(null)
  }, [user?._id])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [activeSection])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'light',
          background: {
            default: '#fafafa',
            paper: '#ffffff',
          },
          primary: {
            main: '#171717',
          },
          secondary: {
            main: '#6366f1',
          },
          text: {
            primary: '#171717',
            secondary: '#6b7280',
          },
          divider: '#e5e7eb',
        },
        typography: {
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          h4: { fontWeight: 600, letterSpacing: '-0.02em' },
          h5: { fontWeight: 600, letterSpacing: '-0.01em' },
          h6: { fontWeight: 600, letterSpacing: '-0.01em' },
          subtitle1: { fontWeight: 500 },
          subtitle2: { fontWeight: 500, color: '#6b7280' },
          body1: { fontSize: '0.938rem' },
          body2: { fontSize: '0.875rem', color: '#6b7280' },
          button: { fontWeight: 500, textTransform: 'none' },
        },
        shape: { borderRadius: 8 },
        shadows: [
          'none',
          '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          ...Array(19).fill('none'),
        ],
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 6,
                padding: '8px 16px',
                fontWeight: 500,
              },
              contained: {
                backgroundColor: '#171717',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#262626',
                  boxShadow: 'none',
                },
              },
              outlined: {
                borderColor: '#e5e7eb',
                color: '#171717',
                '&:hover': {
                  borderColor: '#d1d5db',
                  backgroundColor: '#f9fafb',
                },
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#fff',
                  '& fieldset': { borderColor: '#e5e7eb' },
                  '&:hover fieldset': { borderColor: '#d1d5db' },
                  '&.Mui-focused fieldset': { borderColor: '#171717', borderWidth: 1 },
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                border: '1px solid #e5e7eb',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                fontWeight: 500,
                fontSize: '0.75rem',
              },
            },
          },
        },
      }),
    []
  )

  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const renderContent = () => {
    switch (activeSection) {
      case 'home': return <Dashboard />
      case 'profile': return <ProfilePanel />
      case 'logs': return <GymTracker />
      case 'nutrition': return <NutritionTracker />
      case 'mental': return <DailyLogPanel />
      case 'symptoms': return <SymptomsPanel />
      case 'labs': return <LabsPanel />
      case 'calendar': return <GlobalCalendar />
      case 'goals': return <HabitTracker />
      case 'trends': return <TrendsPanel />
      case 'chat': return <ChatExperience />
      case 'reminders': return <RemindersSettings />
      // case 'premium': return <PremiumPage />
      default: return <Dashboard />
    }
  }

  // Check if user needs onboarding
  const needsOnboarding = user && !user.onboardingCompleted && !showOnboarding

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#fafafa' }}>
          <CircularProgress sx={{ color: '#171717' }} />
        </Box>
      </ThemeProvider>
    )
  }

  // Show auth page if not logged in
  if (!user) {
    // Show reset password page if token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      return (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ResetPassword />
        </ThemeProvider>
      );
    }
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthPage />
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
      
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar (desktop) */}
        <Box
          sx={{
            width: 240,
            borderRight: '1px solid #e5e7eb',
            bgcolor: '#fff',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
          }}
        >
          {/* Logo */}
          <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e5e7eb' }}>
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
                onClick={() => setActiveSection(item.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  mb: 0.5,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  color: activeSection === item.id ? '#171717' : '#6b7280',
                  bgcolor: activeSection === item.id ? '#f3f4f6' : 'transparent',
                  fontWeight: activeSection === item.id ? 500 : 400,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: activeSection === item.id ? '#f3f4f6' : '#f9fafb',
                    color: '#171717',
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
          <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                p: 1,
                borderRadius: 1.5,
                '&:hover': { bgcolor: '#f3f4f6' },
              }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#171717', color: '#fff', fontSize: 14 }}>
                {user.name?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717' }} noWrap>
                  {user.name || 'User'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }} noWrap>
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
                  logout()
                }}
                sx={{ color: '#dc2626' }}
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
          PaperProps={{ sx: { width: 280, borderRight: '1px solid #e5e7eb' } }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e5e7eb' }}>
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
                    setActiveSection(item.id)
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
                    color: activeSection === item.id ? '#171717' : '#6b7280',
                    bgcolor: activeSection === item.id ? '#f3f4f6' : 'transparent',
                    fontWeight: activeSection === item.id ? 500 : 400,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: activeSection === item.id ? '#f3f4f6' : '#f9fafb',
                      color: '#171717',
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

            <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#171717', color: '#fff', fontSize: 14 }}>
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717' }} noWrap>
                    {user.name || 'User'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9ca3af' }} noWrap>
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
                  color: '#dc2626',
                  '&:hover': { bgcolor: '#fef2f2' },
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
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
          {/* Header */}
          <Box
            sx={{
              px: { xs: 2, md: 4 },
              py: { xs: 1.5, md: 2 },
              bgcolor: '#fff',
              borderBottom: '1px solid #e5e7eb',
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
              <Typography variant="body2" sx={{ color: '#9ca3af', display: { xs: 'none', sm: 'block' } }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Typography>
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 4 } }}>
            <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
              {renderContent()}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App

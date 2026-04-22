import { useState } from 'react'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import { useAuth } from '../context/AuthContext'
import LifeSyncMark from './LifeSyncMark'

function AuthPage({ themeVariant = 'paper', onToggleTheme } = {}) {
  const [showForgot, setShowForgot] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        if (!name.trim()) {
          throw new Error('Name is required')
        }
        await register(name, email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputSx = (theme) => ({
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: theme.palette.divider },
      '&:hover fieldset': {
        borderColor: theme.palette.mode === 'dark' ? 'rgba(243, 240, 234, 0.28)' : 'rgba(22, 19, 16, 0.18)',
      },
      '&.Mui-focused fieldset': { borderColor: theme.palette.secondary.main },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: theme.palette.secondary.main },
  })

  // Show forgot/reset password pages
  if (showForgot) return <ForgotPassword />;
  if (showReset) return <ResetPassword />;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 1,
          alignItems: 'center',
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={onToggleTheme}
          disabled={!onToggleTheme}
          sx={{ borderRadius: 999, px: 1.5, py: 0.75 }}
        >
          Theme: {themeVariant === 'noir' ? 'Noir' : 'Paper'}
        </Button>
      </Box>
      <Box
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          p: 4,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <LifeSyncMark size={56} />
          </Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}
          >
            LifeSync
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {!isLogin && (
              <TextField
                label="Name"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={inputSx}
              />
            )}

            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={inputSx}
            />


            <TextField
              label="Password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helperText={!isLogin ? 'At least 6 characters' : ''}
              sx={inputSx}
            />
            {isLogin && (
              <Box sx={{ textAlign: 'right' }}>
                <Box
                  component="span"
                  sx={{ color: 'secondary.main', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  onClick={() => setShowForgot(true)}
                >
                  Forgot password?
                </Box>
              </Box>
            )}

            {error && (
              <Typography
                variant="body2"
                sx={{ color: 'error.main', textAlign: 'center' }}
              >
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'inherit' }} />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </Box>
        </form>

        <Divider sx={{ my: 3 }} />
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <Box
              component="span"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              sx={{
                color: 'text.primary',
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </Box>
          </Typography>
        </Box>
        {/* Optionally, add a way to show reset page directly for testing */}
        {/* <Box sx={{ mt: 1, textAlign: 'center' }}>
          <span style={{ color: '#6366f1', cursor: 'pointer', fontSize: 13 }} onClick={() => setShowReset(true)}>
            Reset password (dev)
          </span>
        </Box> */}
      </Box>
    </Box>
  )
}

export default AuthPage

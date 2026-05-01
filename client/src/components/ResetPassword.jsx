import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { API_BASE } from '../config'
import LifeSyncMark from './LifeSyncMark'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Get token from URL
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('Invalid or missing reset token.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      
      const data = await res.json().catch(() => ({}))
      
      if (res.ok) {
        setMessage(data.message || 'Password reset successful.')
        // Redirect after 2 seconds
        setTimeout(() => navigate('/'), 2000)
      } else {
        setError(data.error || 'Something went wrong.')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: 'rgba(22, 19, 16, 0.10)' },
      '&:hover fieldset': { borderColor: 'rgba(22, 19, 16, 0.18)' },
      '&.Mui-focused fieldset': { borderColor: '#1f6f5b' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#1f6f5b' },
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f6f1e7',
        p: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid rgba(22, 19, 16, 0.10)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          p: 4,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <LifeSyncMark size={56} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#161310', mb: 1 }}>
            Reset Password
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(22, 19, 16, 0.62)' }}>
            Enter your new password below
          </Typography>
        </Box>

        {!token && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Invalid or missing reset token. Please request a new link.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="New Password"
              type="password"
              fullWidth
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={!token || loading}
              sx={inputSx}
            />

            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              disabled={!token || loading}
              sx={inputSx}
            />

            {error && (
              <Typography variant="body2" sx={{ color: '#dc2626', textAlign: 'center' }}>
                {error}
              </Typography>
            )}

            {message && (
              <Alert severity="success" sx={{ mb: 1 }}>
                {message} Redirecting to sign in...
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !token || !!message}
              sx={{
                py: 1.5,
                bgcolor: '#161310',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                '&:hover': { bgcolor: '#000000' },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'background.paper' }} /> : 'Update Password'}
            </Button>

            <Button
              variant="text"
              fullWidth
              sx={{ color: 'rgba(22, 19, 16, 0.62)', textTransform: 'none' }}
              onClick={() => navigate('/')}
            >
              Back to Sign In
            </Button>
          </Box>
        </form>
      </Box>
    </Box>
  )
}

export default ResetPassword

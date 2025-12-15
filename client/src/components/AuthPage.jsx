import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '../context/AuthContext'

function AuthPage() {
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

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: '#e5e7eb' },
      '&:hover fieldset': { borderColor: '#d1d5db' },
      '&.Mui-focused fieldset': { borderColor: '#171717' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#171717' },
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#fafafa',
        p: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: '#fff',
          borderRadius: 3,
          border: '1px solid #e5e7eb',
          p: 4,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: '#171717', mb: 1 }}
          >
            LifeSync
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
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

            {error && (
              <Typography
                variant="body2"
                sx={{ color: '#dc2626', textAlign: 'center' }}
              >
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                bgcolor: '#171717',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#374151', boxShadow: 'none' },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#fff' }} />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </Box>
        </form>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <Box
              component="span"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              sx={{
                color: '#171717',
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default AuthPage

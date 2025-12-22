import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/direct-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Password updated successfully.');
      } else {
        setError(data.error || 'Something went wrong.');
      }
    } catch (err) {
      setError('Network error.');
    }
    setLoading(false);
  };

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
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#171717', mb: 1 }}>
            Forgot Password
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Enter your email and new password
          </Typography>
        </Box>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#e5e7eb' }, '&:hover fieldset': { borderColor: '#d1d5db' }, '&.Mui-focused fieldset': { borderColor: '#171717' } }, '& .MuiInputLabel-root.Mui-focused': { color: '#171717' } }}
            />
            <TextField
              label="New Password"
              type="password"
              fullWidth
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              helperText={'At least 6 characters'}
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#e5e7eb' }, '&:hover fieldset': { borderColor: '#d1d5db' }, '&.Mui-focused fieldset': { borderColor: '#171717' } }, '& .MuiInputLabel-root.Mui-focused': { color: '#171717' } }}
            />
            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#e5e7eb' }, '&:hover fieldset': { borderColor: '#d1d5db' }, '&.Mui-focused fieldset': { borderColor: '#171717' } }, '& .MuiInputLabel-root.Mui-focused': { color: '#171717' } }}
            />
            {error && (
              <Typography variant="body2" sx={{ color: '#dc2626', textAlign: 'center' }}>
                {error}
              </Typography>
            )}
            {message && (
              <Typography variant="body2" sx={{ color: '#16a34a', textAlign: 'center' }}>
                {message}
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
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Update Password'}
            </Button>
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 1, borderRadius: 2, borderColor: '#e5e7eb', color: '#171717', fontWeight: 600, textTransform: 'none' }}
              onClick={() => window.location.href = '/'}
            >
              Return to Sign In
            </Button>
          </Box>
        </form>
      </Box>
    </Box>
  );
};

export default ForgotPassword;

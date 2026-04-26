import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TimerIcon from '@mui/icons-material/Timer';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function RestTimer({ initialSeconds = 60, onClose }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const [total, setTotal] = useState(initialSeconds);

  useEffect(() => {
    let interval = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      // Optional: Play a sound
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([200, 100, 200]);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const adjustTime = (amount) => {
    setSeconds((s) => Math.max(0, s + amount));
    setTotal((t) => Math.max(0, t + amount));
  };

  const reset = () => {
    setSeconds(total);
    setIsActive(true);
  };

  const progress = total > 0 ? (seconds / total) * 100 : 0;

  return (
    <Box sx={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 220,
      bgcolor: '#1e293b',
      color: '#fff',
      borderRadius: 3,
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      p: 2,
      zIndex: 2000,
      border: '1px solid rgba(255,255,255,0.1)',
      animation: 'slideUp 0.3s ease-out',
      '@keyframes slideUp': {
        from: { transform: 'translateY(20px)', opacity: 0 },
        to: { transform: 'translateY(0)', opacity: 1 },
      }
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimerIcon sx={{ fontSize: 16, color: '#38bdf8' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Rest Timer
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#fff' } }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ position: 'relative', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        {/* Progress Circle (Simplified SVG) */}
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <circle 
            cx="40" cy="40" r="36" fill="none" stroke="#38bdf8" strokeWidth="4" 
            strokeDasharray={2 * Math.PI * 36}
            strokeDashoffset={2 * Math.PI * 36 * (1 - progress / 100)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
            transform="rotate(-90 40 40)"
          />
        </svg>
        <Typography variant="h5" sx={{ position: 'absolute', fontWeight: 700, fontFamily: 'monospace' }}>
          {formatTime(seconds)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <IconButton size="small" onClick={() => adjustTime(-15)} sx={{ color: '#94a3b8' }}>
          <RemoveIcon fontSize="small" />
        </IconButton>
        <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5 }}>15s</Typography>
        <IconButton size="small" onClick={() => adjustTime(15)} sx={{ color: '#94a3b8' }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button 
          fullWidth 
          variant="contained" 
          size="small" 
          onClick={() => setIsActive(!isActive)}
          sx={{ 
            bgcolor: isActive ? '#ef4444' : '#10b981',
            '&:hover': { bgcolor: isActive ? '#dc2626' : '#059669' },
            textTransform: 'none',
            fontWeight: 700
          }}
          startIcon={isActive ? <PauseIcon /> : <PlayArrowIcon />}
        >
          {isActive ? 'Pause' : 'Resume'}
        </Button>
        <IconButton 
          onClick={reset}
          sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

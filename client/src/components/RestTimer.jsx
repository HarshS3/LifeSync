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

export default function RestTimer({ open, onClose, initialSeconds = 60 }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [total, setTotal] = useState(initialSeconds);

  // Sync with prop when timer is opened or initialSeconds changes
  useEffect(() => {
    if (open) {
      setSeconds(initialSeconds);
      setTotal(initialSeconds);
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [open, initialSeconds]);

  useEffect(() => {
    let interval = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0 && isActive) {
      setIsActive(false);
      // Optional: Play a sound or vibrate
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([300, 100, 300]);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  if (!open) return null;

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
      bottom: { xs: 80, md: 24 }, // Avoid mobile nav if present, or just higher up
      right: { xs: 16, md: 24 },
      width: 220,
      bgcolor: '#1e293b',
      color: 'background.paper',
      borderRadius: 4,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
      p: 2.5,
      zIndex: 5000,
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(8px)',
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      '@keyframes slideUp': {
        from: { transform: 'translateY(40px)', opacity: 0 },
        to: { transform: 'translateY(0)', opacity: 1 },
      }
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimerIcon sx={{ fontSize: 18, color: '#38bdf8' }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Resting
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: 'background.paper', bgcolor: 'rgba(255,255,255,0.1)' } }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Box sx={{ position: 'relative', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle 
            cx="50" cy="50" r="45" fill="none" stroke="#38bdf8" strokeWidth="6" 
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={2 * Math.PI * 45 * (1 - progress / 100)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <Typography variant="h4" sx={{ position: 'absolute', fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: seconds <= 5 ? '#f43f5e' : 'background.paper' }}>
          {formatTime(seconds)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2.5 }}>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => adjustTime(-15)} 
          sx={{ minWidth: 45, py: 0, color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          -15s
        </Button>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => adjustTime(15)} 
          sx={{ minWidth: 45, py: 0, color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          +15s
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button 
          fullWidth 
          variant="contained" 
          onClick={() => setIsActive(!isActive)}
          sx={{ 
            bgcolor: isActive ? '#ef4444' : '#10b981',
            '&:hover': { bgcolor: isActive ? '#dc2626' : '#059669' },
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: 2
          }}
          startIcon={isActive ? <PauseIcon /> : <PlayArrowIcon />}
        >
          {isActive ? 'Pause' : 'Resume'}
        </Button>
        <IconButton 
          onClick={reset}
          sx={{ 
            bgcolor: 'rgba(255,255,255,0.05)', 
            color: 'background.paper', 
            borderRadius: 2,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } 
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>
    </Box>
  );
}

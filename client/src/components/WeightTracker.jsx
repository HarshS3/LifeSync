import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, LinearProgress } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

function WeightTracker({ selectedDate }) {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Also fetch Adaptive TDEE which runs off the same trend
  const [adaptiveTdee, setAdaptiveTdee] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!token) return;
      try {
        setLoading(true);
        // Fetch Adaptive TDEE (which natively calculates the smoothed weight curve)
        const res = await fetch(`${API_BASE}/api/nutrition/adaptive-tdee?daysBack=30`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch weight data');
        const json = await res.json();
        setAdaptiveTdee(json);
        
        if (json.smoothedCurve) {
          setData(json.smoothedCurve);
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Error loading body composition data.');
        setLoading(false);
      }
    }
    fetchData();
  }, [token, selectedDate]);

  if (loading) return <LinearProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  
  if (adaptiveTdee?.status === 'insufficient_data') {
    return (
      <Box sx={{ p: 4, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">Insufficient Data</Typography>
        <Typography variant="body2" color="textSecondary">Log your weight for at least 5-7 days to unlock Adaptive TDEE and Rolling Averages.</Typography>
      </Box>
    );
  }

  const { isAdapted, recommendation, weightChangeKg, avgDailyIntake, adaptiveTdee: tdeeKcal, daysAnalyzed } = adaptiveTdee || {};

  // Rate of Loss calculation
  const currentWeight = data && data.length > 0 ? data[data.length - 1].value : (user?.weight || 70);
  const percentChange = (weightChangeKg / currentWeight) * 100;
  // Per week percent change
  const weeklyRate = (percentChange / Math.max(1, daysAnalyzed)) * 7;
  
  // Rate logic (only if losing weight)
  const isLosing = weeklyRate < 0;
  const absRate = Math.abs(weeklyRate);
  
  let rateColor = '#10b981'; // Green (Safe)
  let rateLabel = isLosing ? 'Optimal / Safe' : 'Weight Gaining (Stable)';
  
  if (isLosing) {
    if (absRate > 0.8 && absRate <= 1.2) {
      rateColor = '#f59e0b'; // Yellow (Aggressive)
      rateLabel = 'Aggressive Loss';
    } else if (absRate > 1.2) {
      rateColor = '#ef4444'; // Red (Danger)
      rateLabel = 'Extreme Loss (Muscle Risk)';
    }
  } else if (absRate > 1.0) {
    rateColor = '#2563eb'; // Blue (Aggressive Bulk)
    rateLabel = 'Aggressive Gain (Bulk)';
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>7-Day Rolling Average Weight</Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827' }}>
              {currentWeight.toFixed(1)} <span style={{ fontSize: '1rem', color: '#6b7280' }}>kg</span>
            </Typography>
            <Typography variant="caption" sx={{ color: weightChangeKg < 0 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
              {weightChangeKg > 0 ? '+' : ''}{weightChangeKg.toFixed(2)}kg in {daysAnalyzed} days
            </Typography>
          </Box>
        </Box>

        {data && data.length > 0 && (
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.map(d => ({ ...d, time: new Date(d.date).toLocaleDateString() }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip 
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Metabolic Engine</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>Calculated Adaptive TDEE</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{tdeeKcal} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>kcal</span></Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>Average Intake (Last {daysAnalyzed} days)</Typography>
              <Typography variant="h6">{avgDailyIntake} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>kcal</span></Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>Caloric Deficit / Surplus</Typography>
              <Typography variant="h6" sx={{ color: avgDailyIntake < tdeeKcal ? '#10b981' : '#ef4444' }}>
                {avgDailyIntake - tdeeKcal > 0 ? '+' : ''}{(avgDailyIntake - tdeeKcal).toFixed(0)} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>kcal / day</span>
              </Typography>
            </Box>
            {isAdapted && (
              <Box sx={{ p: 1.5, bgcolor: '#fef2f2', borderRadius: 1.5, border: '1px solid #fecaca' }}>
                <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600 }}>🚨 Metabolic Adaptation Detected</Typography>
                <Typography variant="caption" sx={{ display: 'block', color: '#7f1d1d', mt: 0.5 }}>
                  {recommendation}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Rate of Loss Monitoring</Typography>
          <Box>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>Current Trajectory</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: rateColor }}>
              {weeklyRate.toFixed(2)}% <span style={{ fontSize: '0.9rem', fontWeight: 400, color: '#374151' }}>per week</span>
            </Typography>
          </Box>
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f9fafb', borderRadius: 1, border: '1px solid #f3f4f6' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>Status: {rateLabel}</Typography>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.5 }}>
              Green (≤0.8% loss): Ideal for fat loss while maintaining muscle.<br/>
              Yellow (0.8-1.2% loss): Aggressive loss. Protein must be very high.<br/>
              Red (&gt;1.2% loss): Extreme risk of muscle loss and metabolic slowdown.<br/>
              Blue (&gt;1.0% gain): Aggressive surplus (Bulk).
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default WeightTracker;

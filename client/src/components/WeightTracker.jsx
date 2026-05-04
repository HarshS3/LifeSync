import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, LinearProgress } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

function WeightTracker({ selectedDate }) {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [daysBack, setDaysBack] = useState(30);
  const [adaptiveTdee, setAdaptiveTdee] = useState(null);

  // Logging state
  const [weightValue, setWeightValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [logError, setLogError] = useState('');

  const fetchData = async (isInitial = false) => {
    if (!token) return;
    try {
      if (isInitial && !data) setLoading(true);
      setError(null);

      // 1. Fetch Adaptive TDEE and Raw Weight Logs (Range data for graph)
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - daysBack);
      
      const [tdeeRes, rawRes] = await Promise.all([
        fetch(`${API_BASE}/api/nutrition/adaptive-tdee?daysBack=${daysBack}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/nutrition/weight/range/${start.toISOString()}/${end.toISOString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const tdeeJson = await tdeeRes.json();
      setAdaptiveTdee(tdeeJson);

      if (rawRes.ok) {
        const rawJson = await rawRes.json();
        setRawData(rawJson);
        
        // Use smoothed curve if available, otherwise raw data
        if (tdeeJson.status === 'success' && tdeeJson.smoothedCurve) {
          setData(tdeeJson.smoothedCurve);
        } else {
          setData(rawJson.map(d => ({ date: d.date, value: d.weightKg })));
        }
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Error loading weight data.');
      setLoading(false);
    }
  };

  const fetchDayWeight = async () => {
    if (!token || !selectedDate) return;
    try {
      const dStr = new Date(selectedDate).toISOString();
      const dayRes = await fetch(`${API_BASE}/api/nutrition/weight/date/${encodeURIComponent(dStr)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (dayRes.ok) {
        const dayData = await dayRes.json();
        setWeightValue(dayData?.weightKg != null ? String(dayData.weightKg) : '');
      } else {
        setWeightValue('');
      }
    } catch (err) {
      console.error('Error fetching day weight:', err);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [token, daysBack]);

  useEffect(() => {
    fetchDayWeight();
  }, [token, selectedDate]);

  const handleSaveWeight = async () => {
    const w = Number(weightValue);
    if (!token || isNaN(w) || w <= 0) {
      setLogError('Please enter a valid weight.');
      return;
    }

    try {
      setSaving(true);
      setLogError('');
      const res = await fetch(`${API_BASE}/api/nutrition/weight`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          date: new Date(selectedDate).toISOString(), 
          weightKg: w 
        }),
      });

      if (!res.ok) throw new Error('Failed to save weight');
      
      // Immediate refresh of the graph and TDEE
      await fetchData(false);
    } catch (err) {
      setLogError('Failed to save weight.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <LinearProgress sx={{ my: 4 }} />;
  
  const { isAdapted, recommendation, weightChangeKg, avgDailyIntake, adaptiveTdee: tdeeKcal, daysAnalyzed, status } = adaptiveTdee || {};

  // Display weight logic
  const lastRaw = rawData.length > 0 ? rawData[rawData.length - 1].weightKg : null;
  const displayWeight = lastRaw || (user?.weight || 0);

  // Rate of Loss calculation
  const percentChange = weightChangeKg ? (weightChangeKg / displayWeight) * 100 : 0;
  const weeklyRate = weightChangeKg ? (percentChange / Math.max(1, daysAnalyzed)) * 7 : 0;
  
  const isLosing = weeklyRate < 0;
  const absRate = Math.abs(weeklyRate);
  
  let rateColor = '#10b981';
  let rateLabel = isLosing ? 'Optimal / Safe' : 'Weight Gaining (Stable)';
  
  if (isLosing) {
    if (absRate > 0.8 && absRate <= 1.2) {
      rateColor = '#f59e0b';
      rateLabel = 'Aggressive Loss';
    } else if (absRate > 1.2) {
      rateColor = '#ef4444';
      rateLabel = 'Extreme Loss (Muscle Risk)';
    }
  } else if (absRate > 1.0) {
    rateColor = '#2563eb';
    rateLabel = 'Aggressive Gain (Bulk)';
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Logging Section */}
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Log Weight</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Weight (kg)"
            type="number"
            size="small"
            value={weightValue}
            onChange={(e) => setWeightValue(e.target.value)}
            sx={{ width: 150 }}
          />
          <Button 
            variant="contained" 
            onClick={handleSaveWeight}
            disabled={saving}
            sx={{ bgcolor: '#111827', '&:hover': { bgcolor: '#000' }, textTransform: 'none' }}
          >
            {saving ? 'Saving...' : 'Save Weight'}
          </Button>
          {logError && <Typography variant="caption" color="error">{logError}</Typography>}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Logging for: {new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
        </Box>
      </Box>

      {/* Graph Section */}
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Weight Trend</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              {[
                { label: '7D', value: 7 },
                { label: '30D', value: 30 },
                { label: '90D', value: 90 },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  size="small"
                  variant={daysBack === opt.value ? 'contained' : 'outlined'}
                  onClick={() => setDaysBack(opt.value)}
                  sx={{
                    minWidth: 50,
                    borderRadius: 2,
                    textTransform: 'none',
                    bgcolor: daysBack === opt.value ? '#111827' : 'transparent',
                    borderColor: 'divider',
                    color: daysBack === opt.value ? 'background.paper' : 'text.secondary',
                    '&:hover': { bgcolor: daysBack === opt.value ? '#000' : 'action.hover' },
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827' }}>
              {displayWeight.toFixed(1)} <span style={{ fontSize: '1rem', color: 'text.secondary' }}>kg</span>
            </Typography>
            {status === 'success' && (
              <Typography variant="caption" sx={{ color: weightChangeKg < 0 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                {weightChangeKg > 0 ? '+' : ''}{weightChangeKg.toFixed(2)}kg in {daysAnalyzed} days
              </Typography>
            )}
          </Box>
        </Box>

        {data && data.length > 0 ? (
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.map(d => ({ ...d, time: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }))} margin={{ top: 10, right: 10, left: 40, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke='divider' />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis 
                  domain={['auto', 'auto']} 
                  tick={{ fontSize: 11, fill: '#6b7280' }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={60}
                  label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', offset: -45, style: { fontSize: 11, fill: '#6b7280', fontWeight: 600 } }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px' }}
                  itemStyle={{ fontSize: 12, fontWeight: 600 }}
                  labelStyle={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}
                  formatter={(value) => [`${value} kg`, 'Weight']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  fillOpacity={0.15} 
                  fill="url(#colorWeight)" 
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: '#3b82f6' }}
                />
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="body2" color="textSecondary">No weight data logged for this period.</Typography>
          </Box>
        )}
      </Box>

      {/* Adaptive TDEE Section (only if sufficient data) */}
      {status === 'success' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Metabolic Engine</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Calculated Adaptive TDEE</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{tdeeKcal} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>kcal</span></Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Average Intake (Last {daysAnalyzed} days)</Typography>
                <Typography variant="h6">{avgDailyIntake} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>kcal</span></Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Caloric Deficit / Surplus</Typography>
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

          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Rate of Loss Monitoring</Typography>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Current Trajectory</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: rateColor }}>
                {weeklyRate.toFixed(2)}% <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'text.secondary' }}>per week</span>
              </Typography>
            </Box>
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid #f3f4f6' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Status: {rateLabel}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Green (≤0.8% loss): Ideal for fat loss while maintaining muscle.<br/>
                Yellow (0.8-1.2% loss): Aggressive loss.<br/>
                Red (&gt;1.2% loss): Extreme risk of muscle loss.<br/>
                Blue (&gt;1.0% gain): Aggressive surplus (Bulk).
              </Typography>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">Metabolic Insights Unavailable</Typography>
          <Typography variant="body2" color="textSecondary">Log your weight for at least 5-7 days to unlock Adaptive TDEE and Rolling Averages.</Typography>
        </Box>
      )}
    </Box>
  );
}

export default WeightTracker;

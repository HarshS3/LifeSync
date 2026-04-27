import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Divider, LinearProgress, Button } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

const WeeklyReview = ({ weekKey }) => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/insights/weekly-review?weekKey=${weekKey}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load weekly review');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (weekKey) fetchReview();
  }, [weekKey, token]);

  if (loading) return (
    <Box sx={{ p: 6, textAlign: 'center' }}>
      <LinearProgress sx={{ maxWidth: 400, mx: 'auto', mb: 2, borderRadius: 2 }} />
      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', textTransform: 'uppercase' }}>
        Synthesizing your performance...
      </Typography>
    </Box>
  );

  if (error) return <Typography color="error" sx={{ p: 4 }}>Error: {error}</Typography>;
  if (!data) return null;

  const { nutrition, weightTrend, strongestLift, bestDay, worstDay, insights, nextWeekGoal } = data;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: '#fafafa', minHeight: '100vh' }}>
      {/* HEADER */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <EmojiEventsIcon sx={{ fontSize: '4rem', color: '#f59e0b', mb: 2 }} />
        <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1, color: '#111827' }}>
          Weekly Anchor
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
          Week {weekKey.split('-W')[1]} · Performance Revelation
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* WEIGHT TREND */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'visible' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <TrendingUpIcon sx={{ color: '#3b82f6' }} />
                Weight Trajectory
              </Typography>
              <Box sx={{ height: 300, width: '100%' }}>
                {weightTrend.length > 0 ? (
                  <ResponsiveContainer>
                    <LineChart data={weightTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { weekday: 'short' })}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                      />
                      <YAxis 
                        hide 
                        domain={['auto', 'auto']}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        formatter={(val) => [`${val} kg`, 'Weight']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#3b82f6" 
                        strokeWidth={4} 
                        dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">Log weight daily to see trends here.</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* STRONGEST LIFT */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 3, bgcolor: '#111827', color: '#fff' }}>
            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <FitnessCenterIcon sx={{ color: '#10b981' }} />
                Weekly Peak
              </Typography>
              {strongestLift ? (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="h2" sx={{ fontWeight: 900, mb: 1 }}>{strongestLift.weight}kg</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#10b981', mb: 2 }}>{strongestLift.exercise}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.6 }}>
                    Hit on {new Date(strongestLift.date).toLocaleDateString()} · {strongestLift.reps} Reps
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ opacity: 0.6, fontStyle: 'italic' }}>No workout data this week.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* NUTRITION HIGHLIGHTS */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, p: 1 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <RestaurantIcon sx={{ color: '#f59e0b' }} />
                Nutrition Extremes
              </Typography>
              
              <Box sx={{ mb: 4 }}>
                <Typography variant="overline" sx={{ color: '#059669', fontWeight: 800 }}>Best Alignment</Typography>
                {bestDay ? (
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #d1fae5' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{new Date(bestDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Typography>
                      <Chip label={`${bestDay.proteinPercent}% Protein Target`} size="small" sx={{ bgcolor: '#059669', color: '#fff', fontWeight: 700 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">{bestDay.calories} kcal consumed · Balanced macros.</Typography>
                  </Box>
                ) : <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.5 }}>No data</Typography>}
              </Box>

              <Box>
                <Typography variant="overline" sx={{ color: '#dc2626', fontWeight: 800 }}>Biggest Deficit</Typography>
                {worstDay ? (
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fee2e2' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{new Date(worstDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Typography>
                      <Chip label={`${worstDay.proteinPercent}% Protein Target`} size="small" sx={{ bgcolor: '#dc2626', color: '#fff', fontWeight: 700 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">{worstDay.explanation || "Missing protein targets led to potential catabolic stress."}</Typography>
                  </Box>
                ) : <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.5 }}>No data</Typography>}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* INSIGHTS & NEXT GOAL */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card sx={{ borderRadius: 3, bgcolor: '#eff6ff', border: '1px solid #dbeafe' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, color: '#1e40af' }}>
                  <LightbulbIcon />
                  The One Thing
                </Typography>
                {insights.map((insight, i) => (
                  <Typography key={i} variant="body1" sx={{ color: '#1e3a8a', mb: 1.5, fontWeight: 500 }}>
                    â€¢ {insight}
                  </Typography>
                ))}
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 3, bgcolor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, color: '#5b21b6' }}>
                  <CheckCircleOutlineIcon />
                  Next Week's Mission
                </Typography>
                <Typography variant="body1" sx={{ color: '#4c1d95', fontWeight: 600 }}>
                  {nextWeekGoal}
                </Typography>
                <Button 
                  fullWidth 
                  variant="contained" 
                  sx={{ mt: 3, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' }, textTransform: 'none', fontWeight: 700, py: 1.5, borderRadius: 2 }}
                >
                  Accept Mission & View Meal Plan
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ mt: 8, textAlign: 'center', pb: 10 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Performance analysis powered by LifeSync Engine
        </Typography>
      </Box>
    </Box>
  );
};

export default WeeklyReview;

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme } from '@mui/material/styles';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InsightsIcon from '@mui/icons-material/Insights';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import StatCard from './StatCard';
import MuscleHeatmapFigure from '../MuscleHeatmapFigure';

const OverviewTab = ({
  stats,
  readiness,
  readinessLoading,
  showAdvancedOverview,
  setShowAdvancedOverview,
  volumeChartData,
  selectedAnalysisExercise,
  setSelectedAnalysisExercise,
  allExerciseNames,
  analysisChartMode,
  setAnalysisChartMode,
  exerciseProgressionData,
  trainingInsights,
  generateAiWorkoutSuggestion,
  aiWorkoutSuggestionLoading,
  aiWorkoutSuggestion,
  generateAiRecoverySuggestion,
  aiRecoverySuggestionLoading,
  aiRecoverySuggestion,
  correlationChartData,
  correlatedInsights,
  loadCorrelatedInsights,
  correlationLoading,
  muscleHeatmap,
  muscleDistribution,
  workouts,
  isMobile,
  EXERCISE_LIBRARY
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <StatCard
          icon={<FitnessCenterIcon />}
          label="Total Workouts"
          value={stats.totalWorkouts}
          color="#2563eb"
        />
        <StatCard
          icon={<WhatshotIcon />}
          label="This Week"
          value={stats.weeklyWorkouts}
          color="#f59e0b"
        />
        <StatCard
          icon={<TrendingUpIcon />}
          label="Total Volume"
          value={`${(stats.totalVolume / 1000).toFixed(1)}k`}
          sublabel="kg"
          color="#15803d"
        />
        <StatCard
          icon={<CheckCircleIcon />}
          label="Streak"
          value={stats.currentStreak}
          sublabel="days"
          color="#9333ea"
        />
      </Box>

      {/* Readiness */}
      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <Box sx={{
          p: 3, borderRadius: 2,
          background: readiness
            ? `linear-gradient(135deg, ${readiness.color}12 0%, #fff 60%)`
            : 'background.paper',
          border: `1px solid ${readiness ? readiness.color + '40' : 'divider'}`,
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Background glow */}
          {readiness && (
            <Box sx={{
              position: 'absolute', top: -40, right: -40,
              width: 180, height: 180, borderRadius: '50%',
              bgcolor: readiness.color, opacity: 0.06, pointerEvents: 'none'
            }} />
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <WhatshotIcon sx={{ color: readiness?.color || '#f59e0b' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
              Today's Training Readiness
            </Typography>
            {readinessLoading && (
              <Typography variant="caption" sx={{ color: '#94a3b8', ml: 'auto' }}>Calculating…</Typography>
            )}
          </Box>

          {!readiness && !readinessLoading && (
            <Typography variant="body2" sx={{ color: '#94a3b8', py: 2 }}>
              Log your daily wellness check-in (sleep, energy, stress) for 3+ days to unlock your readiness score.
            </Typography>
          )}

          {readiness && (
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* Score ring */}
              <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                <Box sx={{
                  width: 120, height: 120, borderRadius: '50%', mx: 'auto',
                  border: `8px solid ${readiness.color}`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 24px ${readiness.color}40`
                }}>
                  <Typography sx={{ fontSize: '2.2rem', fontWeight: 900, color: readiness.color, lineHeight: 1 }}>
                    {readiness.readinessScore}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>/10</Typography>
                </Box>
                <Box sx={{
                  mt: 1.5, px: 2, py: 0.5, borderRadius: 2,
                  bgcolor: readiness.color, display: 'inline-block'
                }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'background.paper', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                    {readiness.status === 'push_hard' ? '🔥 Push Hard'
                      : readiness.status === 'train_normal' ? '💪 Train Normal'
                        : readiness.status === 'train_light' ? '🔄 Train Light'
                          : '😴 Rest Day'}
                  </Typography>
                </Box>
              </Box>

              {/* Recommendation + Components */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.7, mb: 2, fontSize: '0.95rem' }}>
                  {readiness.recommendation}
                </Typography>

                {/* Component scores */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  {[
                    { label: 'Sleep', score: readiness.components.sleep.score, detail: `${readiness.components.sleep.avgHours}h (${readiness.components.sleep.quality}/10 qual)`, emoji: '😴' },
                    { label: 'RHR', score: readiness.components.rhr.score, detail: `${readiness.components.rhr.avgRhr} bpm`, emoji: '🫀' },
                    { label: 'Energy', score: readiness.components.energy.score, detail: `${readiness.components.energy.avgRating}/10`, emoji: '⚡' },
                    { label: 'Stress', score: readiness.components.stress.score, detail: `${readiness.components.stress.avgRating}/10 stress`, emoji: '🧘' },
                    { label: 'Load', score: readiness.components.trainingLoad.score, detail: `${Math.round(readiness.components.trainingLoad.volumeRatio * 100)}% base${readiness.components.trainingLoad.daysSinceRestDay > 3 ? ` (${readiness.components.trainingLoad.daysSinceRestDay}d no rest)` : ''}`, emoji: '🏋️' },
                  ].map(comp => {
                    const pct = (comp.score / 10) * 100
                    const c = comp.score >= 7 ? '#22c55e' : comp.score >= 5 ? '#f59e0b' : '#ef4444'
                    return (
                      <Box key={comp.label} sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
                            {comp.emoji} {comp.label}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: c }}>{comp.score}/10</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate" value={pct}
                          sx={{ height: 4, borderRadius: 2, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: c, borderRadius: 2 } }}
                        />
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>{comp.detail}</Typography>
                      </Box>
                    )
                  })}
                </Box>
              </Box>

              {/* Overtraining risk */}
              {readiness.overtraining.risk !== 'low' && (
                <Box sx={{
                  p: 2, borderRadius: 2, minWidth: 200, flex: 1,
                  bgcolor: readiness.overtraining.risk === 'high' ? '#fef2f2' : '#fffbeb',
                  border: `1px solid ${readiness.overtraining.risk === 'high' ? '#fca5a5' : '#fde68a'}`
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WarningAmberIcon sx={{ fontSize: 18, color: readiness.overtraining.risk === 'high' ? '#ef4444' : '#f59e0b' }} />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: readiness.overtraining.risk === 'high' ? '#991b1b' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {readiness.overtraining.risk === 'high' ? 'Overtraining Risk: HIGH' : 'Overtraining Risk: Moderate'}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.6, display: 'block' }}>
                    {readiness.overtraining.detail}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Stagnation Alerts */}
          {readiness?.stagnationAlerts?.length > 0 && (
            <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUpIcon sx={{ color: '#7c3aed', fontSize: 20 }} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Stagnation Detected — {readiness.stagnationAlerts.length} exercise{readiness.stagnationAlerts.length > 1 ? 's' : ''} plateaued
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {readiness.stagnationAlerts.map((alert, i) => (
                  <Box key={i} sx={{
                    p: 2, bgcolor: '#faf5ff', borderRadius: 1.5,
                    borderLeft: '4px solid #7c3aed', display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap'
                  }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#3b0764', display: 'block' }}>
                        {alert.exercise}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b21a8' }}>
                        No progress in {alert.sessionsStagnated} sessions — best: {alert.currentBest}kg
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.6, maxWidth: 300 }}>
                      💡 {alert.suggestion}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {isMobile ? 'Advanced analytics are available below when needed.' : 'Advanced analytics are shown below.'}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setShowAdvancedOverview(v => !v)}
            sx={{
              textTransform: 'none',
              transition: 'all 0.2s ease',
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'text.primary',
                color: 'text.primary',
                bgcolor: 'action.hover',
                transform: 'translateY(-1px)'
              },
              '&:active': {
                transform: 'translateY(0px)',
                opacity: 0.85
              },
              '&:focus': { outline: '2px solid #3b82f6', outlineOffset: 2 }
            }}
          >
            {showAdvancedOverview ? 'Hide Advanced' : 'Show Advanced'}
          </Button>
        </Box>
      </Box>

      {/* Performance Charts */}
      {(!isMobile || showAdvancedOverview) && (
        <Box sx={{ gridColumn: { md: '1 / -1' } }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <BarChartIcon sx={{ color: '#8b5cf6' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary' }}>
                Volume & Intensity Trends
              </Typography>
            </Box>

            <Box sx={{ height: { xs: 220, md: 300 }, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeChartData}>
                  <defs>
                    <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      backgroundColor: theme.palette.background.paper,
                      color: theme.palette.text.primary
                    }}
                    itemStyle={{ color: theme.palette.text.primary }}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorVol)"
                    name="Volume (kg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
      )}

      {/* Exercise Specific Progression */}
      {(!isMobile || showAdvancedOverview) && (
        <Box sx={{ gridColumn: { md: '1 / -1' } }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoGraphIcon sx={{ color: '#ec4899' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  Exercise Progression
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Select
                  size="small"
                  value={selectedAnalysisExercise}
                  onChange={(e) => setSelectedAnalysisExercise(e.target.value)}
                  sx={{ minWidth: 200, height: 32, fontSize: '0.8rem' }}
                >
                  {allExerciseNames.map(name => (
                    <MenuItem key={name} value={name}>{name}</MenuItem>
                  ))}
                </Select>
                <Select
                  size="small"
                  value={analysisChartMode}
                  onChange={(e) => setAnalysisChartMode(e.target.value)}
                  sx={{ height: 32, fontSize: '0.8rem' }}
                >
                  <MenuItem value="1rm">Est. 1RM</MenuItem>
                  <MenuItem value="weight">Max Weight</MenuItem>
                </Select>
              </Box>
            </Box>

            {exerciseProgressionData.length > 1 ? (
              <Box sx={{ height: { xs: 220, md: 300 }, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={exerciseProgressionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      unit="kg"
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey={analysisChartMode === '1rm' ? 'oneRepMax' : 'weight'}
                      stroke="#ec4899"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: 'background.paper' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name={analysisChartMode === '1rm' ? 'Est. 1RM' : 'Max Weight'}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Need at least 2 sessions with this exercise to show a trend.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Training Insights - Advanced Analysis */}
      {(!isMobile || showAdvancedOverview) && (
        <Box sx={{ gridColumn: { md: '1 / -1' } }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <AutoGraphIcon sx={{ color: '#38bdf8' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                Performance Analysis & Insights
              </Typography>
            </Box>

            {trainingInsights.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {trainingInsights.map((insight, idx) => {
                  let Icon = InsightsIcon;
                  let color = '#64748b';
                  let bgColor = 'background.default';

                  if (insight.title.includes('Progression')) { Icon = TimelineIcon; color = '#10b981'; bgColor = '#ecfdf5'; }
                  else if (insight.title.includes('Plateau')) { Icon = WarningAmberIcon; color = '#f59e0b'; bgColor = '#fffbeb'; }
                  else if (insight.title.includes('Load') || insight.title.includes('Volume')) { Icon = FitnessCenterIcon; color = '#3b82f6'; bgColor = '#eff6ff'; }
                  else if (insight.title.includes('Consistency') || insight.title.includes('Streak') || insight.title.includes('Balance')) { Icon = TrendingUpIcon; color = '#8b5cf6'; bgColor = '#f5f3ff'; }
                  else if (insight.title.includes('Best') || insight.title.includes('PR')) { Icon = EmojiEventsIcon; color = '#eab308'; bgColor = '#fefce8'; }
                  else if (insight.title.includes('Muscle')) { Icon = InsightsIcon; color = '#0ea5e9'; bgColor = '#f0f9ff'; }

                  return (
                    <Box key={idx} sx={{
                      p: 2.5,
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      gap: 2,
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        borderColor: color
                      }
                    }}>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 40, height: 40, borderRadius: 2,
                        bgcolor: bgColor, color: color, flexShrink: 0
                      }}>
                        <Icon fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#1e293b', fontWeight: 700, mb: 0.5 }}>
                          {insight.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.5 }}>
                          {insight.detail}
                        </Typography>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                <AutoGraphIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1, opacity: 0.5 }} />
                <Typography variant="body1" sx={{ color: '#475569', fontWeight: 600 }}>
                  No insights generated yet.
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Log a few more workouts to unlock advanced performance analysis and trend detection.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* AI Suggestions */}
      {(!isMobile || showAdvancedOverview) && (
        <Box sx={{ gridColumn: { md: '1 / -1' } }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              AI Suggestions
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
              Generated only when you ask—useful for demo or low-friction planning.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={generateAiWorkoutSuggestion}
                disabled={aiWorkoutSuggestionLoading}
                sx={{ textTransform: 'none' }}
              >
                {aiWorkoutSuggestionLoading ? 'Thinking…' : 'Suggest Today’s Workout'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={generateAiRecoverySuggestion}
                disabled={aiRecoverySuggestionLoading}
                sx={{ textTransform: 'none' }}
              >
                {aiRecoverySuggestionLoading ? 'Thinking…' : 'Recovery + Plan Adjustment'}
              </Button>
            </Box>

            {(aiWorkoutSuggestion || aiRecoverySuggestion) ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {aiWorkoutSuggestion ? (
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      Today’s Workout
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.secondary', lineHeight: 1.7 }}>
                      {aiWorkoutSuggestion}
                    </Typography>
                  </Box>
                ) : null}

                {aiRecoverySuggestion ? (
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      Recovery + Adjustment
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.secondary', lineHeight: 1.7 }}>
                      {aiRecoverySuggestion}
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Ask when you want suggestions.
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Life Sync: Cross-Domain Correlation */}
      {(!isMobile || showAdvancedOverview) && (
        <Box sx={{ gridColumn: { md: '1 / -1' } }}>
          <Box sx={{ p: 3, bgcolor: '#0f172a', borderRadius: 2, border: '1px solid rgba(56, 189, 248, 0.2)', color: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <InsightsIcon sx={{ color: '#38bdf8' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#38bdf8' }}>
                Correlation Center: Fuel vs. Output
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 3 }}>
              This chart connects your vertical health slices. See how your nutrition (Protein/Calories) directly impacts your gym performance over the last 14 days.
            </Typography>

            <Box sx={{ height: { xs: 220, md: 300 }, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={correlationChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ bgcolor: '#1e293b', border: 'none', borderRadius: '8px', color: 'background.paper' }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="volume"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Workout Volume (kg)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="protein"
                    stroke="#f472b6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    name="Protein Intake (g)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
      )}

      {/* Life Sync: Deep Correlation Insights */}
      {(!isMobile || showAdvancedOverview) && (
        <Box sx={{ gridColumn: { md: '1 / -1' } }}>
          <Box sx={{ p: 3, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #ffedd5' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AutoGraphIcon sx={{ color: '#ea580c' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#9a3412' }}>
                  Deep Sync: Clinical Pattern Analysis
                </Typography>
              </Box>

              <Button
                size="small"
                variant="contained"
                onClick={loadCorrelatedInsights}
                disabled={correlationLoading}
                sx={{
                  bgcolor: '#ea580c',
                  '&:hover': { bgcolor: '#c2410c' },
                  textTransform: 'none',
                  fontWeight: 700
                }}
              >
                {correlationLoading ? 'AI Analyzing...' : (correlatedInsights.length > 0 ? 'Re-Run Analysis' : 'Run Pattern Analysis')}
              </Button>
            </Box>

            {correlatedInsights.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {correlatedInsights.map((insight, idx) => (
                  <Box key={idx} sx={{
                    p: 3,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    borderLeft: `6px solid ${insight.impact === 'high' ? '#ef4444' : '#f97316'}`,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', mb: 1 }}>
                      {insight.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, mb: 2 }}>
                      {insight.detail}
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px dashed #e2e8f0' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                        Recommended Action
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                        {insight.action}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#9a3412', opacity: 0.8, maxWidth: 400, mx: 'auto', mb: 2 }}>
                  Click the button above to have AI analyze the patterns between your nutrition, sleep, and workout volume. This uses advanced processing to find what drives your gains.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Monthly Muscle Heatmap */}
      {(!isMobile || showAdvancedOverview) && (
        <Box sx={{ gridColumn: { md: '1 / -1' } }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Muscle Heatmap (30 days)
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Based on logged sets
              </Typography>
            </Box>

            {muscleHeatmap && muscleHeatmap.scoredSets > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr' }, gap: 2 }}>
                <Box>
                  <MuscleHeatmapFigure intensityByRegion={muscleHeatmap.normalized} />
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Log a few workouts with named exercises to see this.
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Weekly Hypertrophy Volume (Hard Sets) */}
      {(!isMobile || showAdvancedOverview) && (
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Weekly Hypertrophy Volume
            </Typography>
            <Chip
              label="Target: 10 sets/week"
              size="small"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#f1f5f9', color: '#64748b' }}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(EXERCISE_LIBRARY).map(([key, data]) => {
              if (key === 'cardio') return null;
              const count = muscleDistribution[key] || 0
              const target = 10;
              const percentage = Math.min((count / target) * 100, 100)
              const statusColor = count >= 10 ? '#10b981' : count >= 5 ? '#f59e0b' : '#64748b'

              return (
                <Box key={key}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>
                      {data.label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: statusColor }}>
                      {count}/{target} sets
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: '#f1f5f9',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: statusColor,
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              )
            })}
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#94a3b8', fontStyle: 'italic' }}>
            * Scientific standard: 10-20 "hard sets" per muscle group per week is optimal for muscle growth.
          </Typography>
        </Box>
      )}

      {/* Recent Workouts Preview */}
      {(!isMobile || showAdvancedOverview) && (
        <Box sx={{ gridColumn: { md: '1 / -1' } }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Recent Workouts
            </Typography>
            {workouts.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {workouts.slice(0, 5).map((workout, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      bgcolor: 'action.hover',
                      borderRadius: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {workout.name || 'Workout'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {new Date(workout.date).toLocaleDateString()} • {workout.exercises?.length || 0} exercises
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {[...new Set(workout.exercises?.map(e => e.muscleGroup) || [])].slice(0, 4).map((muscle, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: EXERCISE_LIBRARY[muscle]?.color || 'text.secondary',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                No workouts yet. Start your first workout!
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default OverviewTab;

import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BarChartIcon from '@mui/icons-material/BarChart'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import InsightsIcon from '@mui/icons-material/Insights'
import ReadinessSection from './ReadinessSection'
import ProgressionChart from './ProgressionChart'
import TrainingInsights from './TrainingInsights'
import MuscleHeatmapFigure from '../MuscleHeatmapFigure'
import { Suspense, lazy } from 'react'

const GlbModelViewer = lazy(() => import('../GlbModelViewer.jsx'))
const DEFAULT_BODY_MODEL_GLB_URL = new URL('../../assets/Untitled.glb', import.meta.url).href

const StatCard = ({ icon, label, value, sublabel, color }) => (
  <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
      <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: `${color}10`, color }}>
        {React.cloneElement(icon, { fontSize: 'small' })}
      </Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {value}
      </Typography>
      {sublabel && (
        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
          {sublabel}
        </Typography>
      )}
    </Box>
  </Box>
)

function GymOverviewTab({
  stats,
  readiness,
  readinessLoading,
  volumeChartData,
  allExerciseNames,
  selectedAnalysisExercise,
  setSelectedAnalysisExercise,
  analysisChartMode,
  setAnalysisChartMode,
  exerciseProgressionData,
  trainingInsights,
  generateAiWorkoutSuggestion,
  aiWorkoutSuggestionLoading,
  generateAiRecoverySuggestion,
  aiRecoverySuggestionLoading,
  aiWorkoutSuggestion,
  aiRecoverySuggestion,
  correlationChartData,
  correlatedInsights,
  muscleHeatmap
}) {
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

      <ReadinessSection readiness={readiness} loading={readinessLoading} />

      {/* Performance Charts */}
      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <BarChartIcon sx={{ color: '#8b5cf6' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              Volume & Intensity Trends
            </Typography>
          </Box>
          
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeChartData}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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

      <ProgressionChart
        allExerciseNames={allExerciseNames}
        selectedAnalysisExercise={selectedAnalysisExercise}
        setSelectedAnalysisExercise={setSelectedAnalysisExercise}
        analysisChartMode={analysisChartMode}
        setAnalysisChartMode={setAnalysisChartMode}
        exerciseProgressionData={exerciseProgressionData}
      />

      {/* Training Insights - Advanced Analysis */}
      <Box sx={{ gridColumn: { md: '1 / -1' } }}>
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <AutoGraphIcon sx={{ color: '#38bdf8' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
              Performance Analysis & Insights
            </Typography>
          </Box>
          
          <TrainingInsights trainingInsights={trainingInsights} />

        </Box>
      </Box>

      {/* AI Suggestions */}
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

      {/* Life Sync: Cross-Domain Correlation */}
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

          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={correlationChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#64748b' }} 
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
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

      {/* Life Sync: Deep Correlation Insights */}
      {correlatedInsights.length > 0 && (
        <Box sx={{ gridColumn: { md: '1 / -1' } }}>
          <Box sx={{ p: 3, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #ffedd5' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <AutoGraphIcon sx={{ color: '#ea580c' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#9a3412' }}>
                Deep Sync: Clinical Pattern Analysis
              </Typography>
            </Box>
            
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
          </Box>
        </Box>
      )}

      {/* Monthly Muscle Heatmap */}
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
              {/* === TEMPORARILY DISABLED 3D MODEL === 
              <Suspense fallback={
                <Box sx={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>Loading 3D Body Model...</Typography>
                </Box>
              }>
                <GlbModelViewer
                  src={DEFAULT_BODY_MODEL_GLB_URL}
                  intensityByRegion={muscleHeatmap.normalized}
                  height={420}
                  title="Body Model"
                  subtitle="Use this as a base for muscle visualization"
                />
              </Suspense>
              */}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Log a few workouts with named exercises to see this.
            </Typography>
          )}
        </Box>
      </Box>

      {/* Weekly Hypertrophy Volume (Hard Sets) */}
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
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {Object.entries(stats.muscleDistribution || {}).map(([muscle, sets]) => (
            <Box key={muscle} sx={{ minWidth: 80 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>{muscle}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{sets} sets</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export default GymOverviewTab

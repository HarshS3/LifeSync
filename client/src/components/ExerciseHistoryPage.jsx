import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ComposedChart, Area, AreaChart
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'
import { toast } from 'react-hot-toast'

function ExerciseHistoryPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))
  const { exerciseName } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [chartView, setChartView] = useState('weight') // 'weight', '1rm', 'volume', 'rpe'

  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    loadExerciseHistory()
  }, [token, exerciseName])

  const loadExerciseHistory = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/gym/exercise-history/${encodeURIComponent(exerciseName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history || [])
        setStats(data.stats || null)
      }
    } catch (err) {
      console.error('Failed to load exercise history:', err)
      toast.error('Failed to load exercise history')
    } finally {
      setLoading(false)
    }
  }

  const fetchAiAnalysis = async (historyData, statsData) => {
    if (!token || !historyData.length) return
    try {
      setAiLoading(true)
      const res = await fetch(`${API_BASE}/api/gym/exercise-analysis/${encodeURIComponent(exerciseName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ history: historyData, stats: statsData })
      })
      if (res.ok) {
        const data = await res.json()
        setAiAnalysis(data)
      }
    } catch (err) {
      console.error('Failed to fetch AI analysis:', err)
    } finally {
      setAiLoading(false)
    }
  }

  const calculate1RM = (weight, reps) => {
    if (reps <= 1) return weight
    // Brzycki Formula
    return weight * (36 / (37 - Math.min(reps, 30)))
  }

  // Transform history for chart
  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .map(log => {
        const oneRM = calculate1RM(log.maxWeight || 0, log.maxReps || 0)
        return {
          date: new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          fullDate: new Date(log.date),
          weight: log.maxWeight || 0,
          reps: log.maxReps || 0,
          sets: log.sets?.length || 0,
          volume: log.volume || 0,
          oneRM: Number(oneRM.toFixed(1)),
          rpe: Number(log.avgRPE) || 0,
          isPR: false // Will be set below
        }
      })
      .slice(-30) // Last 30 instances
  }, [history])

  // Calculate Heuristic Trend
  const trendInfo = useMemo(() => {
    if (chartData.length < 4) return { status: 'stable', change: 0 }

    const recent = chartData.slice(-3)
    const previous = chartData.slice(-6, -3)

    const recentAvg = recent.reduce((sum, d) => sum + d.oneRM, 0) / recent.length
    const prevAvg = previous.reduce((sum, d) => sum + d.oneRM, 0) / previous.length

    const pctChange = ((recentAvg - prevAvg) / prevAvg) * 100

    if (pctChange > 2) return { status: 'gaining', change: pctChange, color: '#059669', icon: <TrendingUpIcon /> }
    if (pctChange < -2) return { status: 'losing', change: pctChange, color: '#ef4444', icon: <TrendingDownIcon /> }
    return { status: 'plateauing', change: pctChange, color: '#f59e0b', icon: <TrendingFlatIcon /> }
  }, [chartData])

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center', color: '#9ca3af' }}>
          Loading exercise history...
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            transition: 'all 0.2s ease',
            '&:hover': { bgcolor: 'action.selected', transform: 'translateX(-2px)' },
            '&:active': { transform: 'translateX(0px)' }
          }}
        >
          <ArrowBackIosNewIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <FitnessCenterIcon sx={{ fontSize: 32, color: '#3b82f6' }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {exerciseName}
            </Typography>
            {trendInfo && (
              <Chip
                label={trendInfo.status.toUpperCase()}
                size="small"
                sx={{
                  bgcolor: `${trendInfo.color}15`,
                  color: trendInfo.color,
                  fontWeight: 700,
                  border: `1px solid ${trendInfo.color}40`,
                  ml: 1
                }}
                icon={trendInfo.icon}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Exercise progression and clinical performance analysis
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 350px' }, gap: 3, mb: 4 }}>
        <Box>
          {/* Stats Cards */}
          {stats && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
              <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper', p: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Max Weight
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1d4ed8', mt: 0.5 }}>
                  {stats.maxWeight}<Typography component="span" variant="caption" sx={{ color: '#9ca3af', ml: 0.5 }}>kg</Typography>
                </Typography>
              </Card>
              <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper', p: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Best 1RM
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#059669', mt: 0.5 }}>
                  {stats.estimated1RM}<Typography component="span" variant="caption" sx={{ color: '#9ca3af', ml: 0.5 }}>kg</Typography>
                </Typography>
              </Card>
              <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper', p: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Avg. Volume
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b', mt: 0.5 }}>
                  {(history.reduce((sum, h) => sum + (h.volume || 0), 0) / history.length / 1000).toFixed(1)}k
                </Typography>
              </Card>
              <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper', p: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Frequency
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#7c3aed', mt: 0.5 }}>
                  {stats.totalLogs} <Typography component="span" variant="caption" sx={{ color: '#9ca3af' }}>logs</Typography>
                </Typography>
              </Card>
            </Box>
          )}

          {/* Chart View Selector */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {['weight', '1rm', 'volume', 'rpe'].map((view) => (
              <Button
                key={view}
                size="small"
                variant={chartView === view ? 'contained' : 'outlined'}
                onClick={() => setChartView(view)}
                sx={{
                  textTransform: 'capitalize',
                  borderRadius: 2,
                  px: 2,
                  bgcolor: chartView === view ? 'text.primary' : 'transparent',
                  color: chartView === view ? 'background.paper' : 'text.primary',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: chartView === view ? '#000' : 'action.hover', borderColor: 'text.primary' }
                }}
              >
                {view === '1rm' ? 'Est. 1RM' : view}
              </Button>
            ))}
          </Box>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', bgcolor: 'background.paper', mb: 3, p: 2.5, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <ResponsiveContainer width="100%" height={isTablet ? 300 : 400}>
                {chartView === 'weight' ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke='divider' vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={['dataMin - 5', 'auto']} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [value, 'kg']}
                    />
                    <Area type="monotone" dataKey="weight" stroke="#1d4ed8" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                  </AreaChart>
                ) : chartView === '1rm' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke='divider' vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={['dataMin - 5', 'auto']} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="stepAfter" dataKey="oneRM" stroke="#059669" strokeWidth={3} name="Est. 1RM (kg)" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                  </LineChart>
                ) : chartView === 'volume' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke='divider' vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="volume" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Total Volume" />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke='divider' vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[5, 10]} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="rpe" stroke="#ef4444" strokeWidth={3} name="Intensity (RPE)" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </Card>
          )}
        </Box>

        {/* AI Insight Sidebar */}
        <Box>
          <Card sx={{ borderRadius: 3, bgcolor: '#111827', color: '#fff', height: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <AutoAwesomeIcon sx={{ color: '#fbbf24' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>LifeSync AI Coach</Typography>
              </Box>

              {aiLoading ? (
                <Stack spacing={2}>
                  <LinearProgress sx={{ bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' } }} />
                  <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center' }}>Analyzing performance patterns...</Typography>
                </Stack>
              ) : aiAnalysis ? (
                <Box>
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, borderLeft: `4px solid ${trendInfo.color}` }}>
                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Current Status</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: trendInfo.color, textTransform: 'capitalize' }}>{aiAnalysis.status}</Typography>
                  </Box>

                  <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WhatshotIcon sx={{ fontSize: 18, color: '#f87171' }} /> THE ANALYSIS
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#e5e7eb', lineHeight: 1.6, mb: 4 }}>
                    {aiAnalysis.explanation}
                  </Typography>

                  <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TipsAndUpdatesIcon sx={{ fontSize: 18, color: '#34d399' }} /> ACTION PLAN
                  </Typography>
                  <Stack spacing={1.5}>
                    {aiAnalysis.recommendations?.map((rec, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'start' }}>
                        <Box sx={{ mt: 0.5, width: 6, height: 6, borderRadius: '50%', bgcolor: '#3b82f6', flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: '#f3f4f6' }}>{rec}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Button
                    variant="outlined"
                    sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
                    onClick={() => fetchAiAnalysis(history, stats)}
                  >
                    Analyze Trends
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* History Table */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Full Session History
        </Typography>
        <Chip label={`${history.length} Sessions`} size="small" variant="outlined" />
      </Box>

      {history.length === 0 ? (
        <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper' }}>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              No history found for this exercise
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflowX: 'auto', pb: 1 }}>
          {history.map((log, idx) => (
            <Card key={idx} sx={{ borderRadius: 3, border: '1px solid #e5e7eb', bgcolor: 'background.paper', overflow: 'hidden', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' } }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                      <CalendarMonthIcon sx={{ color: 'text.secondary' }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {new Date(log.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                        {log.sets?.length} sets · {Math.round(log.volume / 1000 * 10) / 10}k kg volume
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={`Max: ${log.maxWeight}kg`}
                      size="small"
                      sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, borderRadius: 1.5 }}
                    />
                    <Chip
                      label={`Est. 1RM: ${calculate1RM(log.maxWeight || 0, log.maxReps || 0).toFixed(1)}kg`}
                      size="small"
                      sx={{ bgcolor: '#ecfdf5', color: '#059669', fontWeight: 700, borderRadius: 1.5 }}
                    />
                    {log.avgRPE > 0 && (
                      <Chip
                        label={`RPE ${log.avgRPE}`}
                        size="small"
                        sx={{ bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 700, borderRadius: 1.5 }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Sets Detail */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.5 }}>
                  {log.sets?.map((set, setIdx) => (
                    <Box key={setIdx} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center', border: '1px solid transparent', '&:hover': { borderColor: 'divider' } }}>
                      <Typography variant="caption" sx={{ display: 'block', color: '#9ca3af', fontWeight: 700, mb: 0.5 }}>
                        SET {setIdx + 1}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>{set.weight}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>kg</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>× {set.reps} reps</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default ExerciseHistoryPage

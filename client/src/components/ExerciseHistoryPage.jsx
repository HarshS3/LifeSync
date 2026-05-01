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
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, ComposedChart
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
  const [chartView, setChartView] = useState('weight') // 'weight', 'volume', 'rpe'

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

  // Transform history for chart
  const chartData = useMemo(() => {
    return history
      .map(log => ({
        date: new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        fullDate: new Date(log.date),
        weight: log.maxWeight || 0,
        reps: log.maxReps || 0,
        sets: log.sets?.length || 0,
        volume: (log.maxWeight || 0) * (log.maxReps || 0) * (log.sets?.length || 0),
        rpe: log.avgRPE || 0,
        allSets: log.sets || []
      }))
      .reverse()
      .slice(-30) // Last 30 instances
  }, [history])

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
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FitnessCenterIcon sx={{ fontSize: 32, color: '#3b82f6' }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {exerciseName}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Exercise progression and history
          </Typography>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 4 }}>
          <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper' }}>
            <CardContent>
              <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Total Logs
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                {stats.totalLogs}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper' }}>
            <CardContent>
              <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Max Weight
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1d4ed8', mt: 0.5 }}>
                {stats.maxWeight}
                <Typography component="span" variant="body2" sx={{ color: '#9ca3af', ml: 0.5 }}>
                  kg
                </Typography>
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper' }}>
            <CardContent>
              <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Est. 1RM
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#059669', mt: 0.5 }}>
                {stats.estimated1RM}
                <Typography component="span" variant="body2" sx={{ color: '#9ca3af', ml: 0.5 }}>
                  kg
                </Typography>
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper' }}>
            <CardContent>
              <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Avg Sets/Log
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b', mt: 0.5 }}>
                {stats.avgSetsPerLog.toFixed(1)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Chart View Selector */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant={chartView === 'weight' ? 'contained' : 'outlined'}
          onClick={() => setChartView('weight')}
          sx={{ textTransform: 'none' }}
        >
          Weight Progression
        </Button>
        <Button
          size="small"
          variant={chartView === 'volume' ? 'contained' : 'outlined'}
          onClick={() => setChartView('volume')}
          sx={{ textTransform: 'none' }}
        >
          Volume Trend
        </Button>
        <Button
          size="small"
          variant={chartView === 'rpe' ? 'contained' : 'outlined'}
          onClick={() => setChartView('rpe')}
          sx={{ textTransform: 'none' }}
        >
          RPE/Intensity
        </Button>
      </Box>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper', mb: 4, p: 2 }}>
          <ResponsiveContainer width="100%" height={isTablet ? 300 : 400}>
            {chartView === 'weight' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke='divider' />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'background.paper', border: '1px solid #e5e7eb', borderRadius: 8 }}
                  formatter={(value) => [value.toFixed(1), '']}
                />
                <Legend />
                <Line type="monotone" dataKey="weight" stroke="#1d4ed8" strokeWidth={2} name="Max Weight (kg)" dot={{ fill: '#1d4ed8', r: 4 }} />
              </LineChart>
            ) : chartView === 'volume' ? (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke='divider' />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'background.paper', border: '1px solid #e5e7eb', borderRadius: 8 }}
                  formatter={(value) => [value.toFixed(0), '']}
                />
                <Legend />
                <Bar dataKey="volume" fill="#f59e0b" name="Total Volume (kg)" />
                <Line type="monotone" dataKey="weight" stroke="#1d4ed8" strokeWidth={2} name="Max Weight (kg)" />
              </ComposedChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke='divider' />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'background.paper', border: '1px solid #e5e7eb', borderRadius: 8 }}
                  formatter={(value) => [value.toFixed(1), '']}
                />
                <Legend />
                <Line type="monotone" dataKey="rpe" stroke="#ef4444" strokeWidth={2} name="Avg RPE" dot={{ fill: '#ef4444', r: 4 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </Card>
      )}

      {/* History Table */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, fontSize: '1.1rem' }}>
        Detailed History
      </Typography>

      {history.length === 0 ? (
        <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper' }}>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              No history found for this exercise
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {history.map((log, idx) => (
            <Card key={idx} sx={{ borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'background.paper', overflow: 'hidden' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CalendarMonthIcon sx={{ color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        {log.sets?.length} sets
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {log.maxWeight && (
                      <Chip
                        label={`${log.maxWeight}kg`}
                        variant="outlined"
                        sx={{ borderColor: '#1d4ed8', color: '#1d4ed8' }}
                        icon={<TrendingUpIcon />}
                      />
                    )}
                    {log.maxReps && (
                      <Chip
                        label={`${log.maxReps} reps`}
                        variant="outlined"
                        sx={{ borderColor: '#059669', color: '#059669' }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Sets Detail */}
                <Box sx={{ mt: 2, bgcolor: 'action.hover', borderRadius: 1.5, p: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                    Sets
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1 }}>
                    {log.sets?.map((set, setIdx) => (
                      <Box key={setIdx} sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ display: 'block', color: '#9ca3af', fontWeight: 600 }}>
                          Set {setIdx + 1}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1d4ed8' }}>
                          {set.weight}kg
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          x{set.reps}
                        </Typography>
                        {set.rpe && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#f59e0b' }}>
                            RPE {set.rpe}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
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

import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { useAuth } from '../context/AuthContext'

function TrendsPanel() {
  const [activeTab, setActiveTab] = useState(0)
  const [data, setData] = useState({ fitness: [], nutrition: [], mental: [] })
  const { token } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchJson = async (url) => {
          const res = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (!res.ok) return []
          const text = await res.text()
          try {
            return JSON.parse(text)
          } catch {
            return []
          }
        }
        const [fit, nut, men] = await Promise.all([
          fetchJson('/api/fitness'),
          fetchJson('/api/nutrition/logs'),
          fetchJson('/api/mental'),
        ])

        const normalizedNutrition = Array.isArray(nut)
          ? nut.map(n => {
              const daily = n.dailyTotals || {}
              const totalCalories = n.totalCalories ?? daily.calories ?? 0
              const protein = n.protein ?? daily.protein ?? 0
              const hydrationLevel = n.hydrationLevel ?? (n.waterIntake ? Math.min(10, Math.round((n.waterIntake || 0) / 250)) : 0)
              return { ...n, totalCalories, protein, hydrationLevel }
            })
          : []

        setData({ 
          fitness: Array.isArray(fit) ? fit.slice(0, 7) : [], 
          nutrition: normalizedNutrition.slice(0, 7), 
          mental: Array.isArray(men) ? men.slice(0, 7) : [] 
        })
      } catch (err) {
        console.error('Failed to fetch trends:', err)
      }
    }
    fetchData()
  }, [token])

  const StatCard = ({ label, value, unit, trend }) => (
    <Box
      sx={{
        p: 3,
        bgcolor: '#fff',
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        flex: 1,
        minWidth: 140,
      }}
    >
      <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#171717' }}>
          {value}
        </Typography>
        {unit && (
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            {unit}
          </Typography>
        )}
      </Box>
      {trend && (
        <Typography
          variant="caption"
          sx={{
            color: trend > 0 ? '#15803d' : trend < 0 ? '#dc2626' : '#6b7280',
            fontWeight: 500,
          }}
        >
          {trend > 0 ? '+' : ''}{trend}% vs last week
        </Typography>
      )}
    </Box>
  )

  const BarChart = ({ items, maxValue, valueKey, labelKey }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 160 }}>
      {items.map((item, i) => {
        const val = item[valueKey] || 0
        const height = maxValue ? (val / maxValue) * 100 : 0
        return (
          <Box
            key={i}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: 40,
                height: `${Math.max(height, 4)}%`,
                bgcolor: '#171717',
                borderRadius: 1,
                transition: 'height 0.3s',
              }}
            />
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {new Date(item[labelKey]).toLocaleDateString('en-US', { weekday: 'short' })}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )

  const calcAvg = (arr, key) => {
    if (!arr.length) return 0
    return Math.round(arr.reduce((sum, item) => sum + (item[key] || 0), 0) / arr.length)
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: '#171717' }}>
        Trends
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: '#6b7280' }}>
        Insights from your logged data
      </Typography>

      <Box sx={{ borderBottom: '1px solid #e5e7eb', mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              color: '#6b7280',
              '&.Mui-selected': { color: '#171717' },
            },
            '& .MuiTabs-indicator': { bgcolor: '#171717', height: 2 },
          }}
        >
          <Tab label="Training" />
          <Tab label="Nutrition" />
          <Tab label="Wellness" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <StatCard label="Avg Duration" value={calcAvg(data.fitness, 'duration')} unit="min" trend={8} />
            <StatCard label="Avg Intensity" value={calcAvg(data.fitness, 'intensity')} unit="/10" trend={-3} />
            <StatCard label="Sessions" value={data.fitness.length} trend={12} />
          </Box>
          {data.fitness.length > 0 && (
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ mb: 3, color: '#6b7280' }}>
                Duration (last 7 sessions)
              </Typography>
              <BarChart items={data.fitness} maxValue={120} valueKey="duration" labelKey="date" />
            </Box>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <StatCard label="Avg Calories" value={calcAvg(data.nutrition, 'totalCalories')} unit="kcal" trend={5} />
            <StatCard label="Avg Protein" value={calcAvg(data.nutrition, 'protein')} unit="g" trend={15} />
            <StatCard label="Hydration" value={calcAvg(data.nutrition, 'hydrationLevel')} unit="/10" trend={0} />
          </Box>
          {data.nutrition.length > 0 && (
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ mb: 3, color: '#6b7280' }}>
                Calories (last 7 days)
              </Typography>
              <BarChart items={data.nutrition} maxValue={3000} valueKey="totalCalories" labelKey="date" />
            </Box>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <StatCard label="Avg Mood" value={calcAvg(data.mental, 'moodScore')} unit="/10" trend={10} />
            <StatCard label="Avg Energy" value={calcAvg(data.mental, 'energyLevel')} unit="/10" trend={-5} />
            <StatCard label="Avg Sleep" value={calcAvg(data.mental, 'sleepHours')} unit="hrs" trend={3} />
          </Box>
          {data.mental.length > 0 && (
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" sx={{ mb: 3, color: '#6b7280' }}>
                Mood (last 7 days)
              </Typography>
              <BarChart items={data.mental} maxValue={10} valueKey="moodScore" labelKey="date" />
            </Box>
          )}
        </Box>
      )}

      {data.fitness.length === 0 && data.nutrition.length === 0 && data.mental.length === 0 && (
        <Box
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: '#f9fafb',
            borderRadius: 2,
            border: '1px solid #e5e7eb',
          }}
        >
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 1 }}>
            No data yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Start logging your activities to see trends here
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default TrendsPanel

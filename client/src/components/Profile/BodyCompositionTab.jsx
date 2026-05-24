import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine
} from 'recharts'
import { TrendingUp, List, Activity, Target } from 'lucide-react'

const SectionTitle = ({ children, sx }) => (
  <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5, ...sx }}>
    {children}
  </Typography>
)

const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'divider' },
    '&:hover fieldset': { borderColor: '#d1d5db' },
    '&.Mui-focused fieldset': { borderColor: 'text.primary' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: 'text.primary' },
}

export default function BodyCompositionTab({
  profile,
  selectedCompositionLogIndex,
  activeCompositionLog,
  addCompositionLog,
  selectCompositionLog,
  removeCompositionLog,
  getCompositionLogLabel,
  bodyCompOcrFile,
  setBodyCompOcrFile,
  bodyCompOcrLoading,
  importBodyCompositionFromOcr,
  bodyCompOcrError,
  updateBodyCompositionField,
  updateBodyCompositionSegmental,
}) {
  const [view, setView] = useState('entries')
  const [selectedChartMetric, setSelectedChartMetric] = useState('bodyFatPercent')
  const [timeRange, setTimeRange] = useState('all')

  const logs = [...(profile.bodyCompositionLogs || [])].sort((a, b) => {
    const da = a.date ? new Date(a.date) : new Date(a.updatedAt || 0)
    const db = b.date ? new Date(b.date) : new Date(b.updatedAt || 0)
    return da - db
  })

  const chartData = logs.map(entry => ({
    ...entry,
    displayDate: entry.date ? new Date(entry.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '?',
    timestamp: entry.date ? new Date(entry.date).getTime() : new Date(entry.updatedAt).getTime()
  }))

  const metrics = [
    { key: 'weightKg', label: 'Weight', unit: 'kg', color: '#6366f1' },
    { key: 'bodyFatPercent', label: 'Body Fat', unit: '%', color: '#ec4899' },
    { key: 'smmKg', label: 'Muscle Mass (SMM)', unit: 'kg', color: '#10b981' },
    { key: 'bmi', label: 'BMI', unit: '', color: '#f59e0b' },
    { key: 'fatMassKg', label: 'Fat Mass', unit: 'kg', color: '#ef4444' },
    { key: 'visceralFatLevel', label: 'Visceral Fat', unit: 'lvl', color: '#8b5cf6' },
  ]

  if (logs.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            py: 5,
            px: 3,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.default',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No entries yet
          </Typography>
          <Button
            variant="contained"
            size="medium"
            onClick={addCompositionLog}
            sx={{ textTransform: 'none', bgcolor: 'text.primary', color: 'background.paper' }}
          >
            Add composition entry
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {view === 'entries' ? 'Entries save automatically. Expand a section to edit or import a scan.' : 'Visualize your body composition progress over time.'}
        </Typography>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(e, v) => v && setView(v)}
          size="small"
          sx={{
            height: 32,
            '& .MuiToggleButton-root': {
              px: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              border: '1px solid',
              borderColor: 'divider',
              '&.Mui-selected': {
                bgcolor: 'text.primary',
                color: 'background.paper',
                '&:hover': { bgcolor: 'text.secondary' }
              }
            }
          }}
        >
          <ToggleButton value="entries">
            <List size={14} style={{ marginRight: 6 }} /> Entries
          </ToggleButton>
          <ToggleButton value="charts">
            <TrendingUp size={14} style={{ marginRight: 6 }} /> Trends
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'entries' ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <SectionTitle sx={{ mb: 0 }}>Composition log</SectionTitle>
            <Button
              variant="outlined"
              size="small"
              onClick={addCompositionLog}
              sx={{ textTransform: 'none', borderColor: 'text.primary', color: 'text.primary' }}
            >
              Add entry
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[...(profile.bodyCompositionLogs || [])].map((entry, idx) => (
              <Chip
                key={`${entry?.updatedAt || entry?.date || 'entry'}-${idx}`}
                label={getCompositionLogLabel(entry, idx)}
                onClick={() => selectCompositionLog(idx)}
                sx={{
                  bgcolor: idx === selectedCompositionLogIndex ? 'text.primary' : 'action.selected',
                  color: idx === selectedCompositionLogIndex ? 'background.paper' : 'text.secondary',
                }}
              />
            ))}
          </Box>

          <Box sx={{ mt: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Import body scan
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              Upload an InBody/Tanita/ACCUNIQ-style report (image or PDF). Values merge into the selected log (newest by default).
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setBodyCompOcrFile(e.target.files?.[0] || null)}
              />
              <Button
                variant="contained"
                disabled={!bodyCompOcrFile || bodyCompOcrLoading}
                onClick={importBodyCompositionFromOcr}
                sx={{ textTransform: 'none', bgcolor: 'text.primary', color: 'background.paper', '&:hover': { bgcolor: 'text.secondary' } }}
              >
                {bodyCompOcrLoading ? 'Reading…' : 'Import body scan'}
              </Button>
              {bodyCompOcrError ? (
                <Typography variant="body2" sx={{ color: '#b91c1c' }}>
                  {bodyCompOcrError}
                </Typography>
              ) : null}
            </Box>
          </Box>

          <Accordion defaultExpanded={true} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Log Details: {getCompositionLogLabel(profile.bodyCompositionLogs?.[selectedCompositionLogIndex], selectedCompositionLogIndex)}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Accordion defaultExpanded={true} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 1, '&:before': { display: 'none' }, bgcolor: 'action.hover' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Main metrics
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      label="Scan date"
                      type="date"
                      value={activeCompositionLog?.date ?? ''}
                      onChange={(e) => updateBodyCompositionField('date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Weight (kg)"
                      type="number"
                      value={activeCompositionLog?.weightKg ?? ''}
                      onChange={(e) => updateBodyCompositionField('weightKg', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Body fat (%)"
                      type="number"
                      value={activeCompositionLog?.bodyFatPercent ?? ''}
                      onChange={(e) => updateBodyCompositionField('bodyFatPercent', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="SMM (kg)"
                      type="number"
                      value={activeCompositionLog?.smmKg ?? ''}
                      onChange={(e) => updateBodyCompositionField('smmKg', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Fat mass (kg)"
                      type="number"
                      value={activeCompositionLog?.fatMassKg ?? ''}
                      onChange={(e) => updateBodyCompositionField('fatMassKg', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Visceral fat"
                      type="number"
                      value={activeCompositionLog?.visceralFatLevel ?? ''}
                      onChange={(e) => updateBodyCompositionField('visceralFatLevel', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded={false} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 1, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Advanced metrics (Protein, Water, BMR, etc.)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      label="Protein (kg)"
                      type="number"
                      value={activeCompositionLog?.proteinKg ?? ''}
                      onChange={(e) => updateBodyCompositionField('proteinKg', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="TBW (kg)"
                      type="number"
                      value={activeCompositionLog?.tbwKg ?? ''}
                      onChange={(e) => updateBodyCompositionField('tbwKg', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Mineral (kg)"
                      type="number"
                      value={activeCompositionLog?.mineralKg ?? ''}
                      onChange={(e) => updateBodyCompositionField('mineralKg', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="BMR (kcal)"
                      type="number"
                      value={activeCompositionLog?.bmrKcal ?? ''}
                      onChange={(e) => updateBodyCompositionField('bmrKcal', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Metabolic age"
                      type="number"
                      value={activeCompositionLog?.metabolicAge ?? ''}
                      onChange={(e) => updateBodyCompositionField('metabolicAge', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="BMI"
                      type="number"
                      value={activeCompositionLog?.bmi ?? ''}
                      onChange={(e) => updateBodyCompositionField('bmi', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded={false} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 1, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Segmental fat
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      label="Left arm (kg)"
                      type="number"
                      value={activeCompositionLog?.segmentalFatKg?.leftArm ?? ''}
                      onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'leftArm', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Right arm (kg)"
                      type="number"
                      value={activeCompositionLog?.segmentalFatKg?.rightArm ?? ''}
                      onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'rightArm', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Trunk (kg)"
                      type="number"
                      value={activeCompositionLog?.segmentalFatKg?.trunk ?? ''}
                      onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'trunk', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Left leg (kg)"
                      type="number"
                      value={activeCompositionLog?.segmentalFatKg?.leftLeg ?? ''}
                      onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'leftLeg', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Right leg (kg)"
                      type="number"
                      value={activeCompositionLog?.segmentalFatKg?.rightLeg ?? ''}
                      onChange={(e) => updateBodyCompositionSegmental('segmentalFatKg', 'rightLeg', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded={false} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 1, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Segmental muscle (kg)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      label="Left arm (kg)"
                      type="number"
                      value={activeCompositionLog?.segmentalMuscleKg?.leftArm ?? ''}
                      onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'leftArm', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Right arm (kg)"
                      type="number"
                      value={activeCompositionLog?.segmentalMuscleKg?.rightArm ?? ''}
                      onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'rightArm', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Trunk (kg)"
                      type="number"
                      value={activeCompositionLog?.segmentalMuscleKg?.trunk ?? ''}
                      onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'trunk', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Left leg (kg)"
                      type="number"
                      value={activeCompositionLog?.segmentalMuscleKg?.leftLeg ?? ''}
                      onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'leftLeg', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                    <TextField
                      label="Right leg (kg)"
                      type="number"
                      value={activeCompositionLog?.segmentalMuscleKg?.rightLeg ?? ''}
                      onChange={(e) => updateBodyCompositionSegmental('segmentalMuscleKg', 'rightLeg', e.target.value)}
                      sx={{ ...inputSx, flex: 1, minWidth: 180 }}
                      size="small"
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Newest log is used for targets reading BMR.
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => removeCompositionLog(selectedCompositionLogIndex)}
                  startIcon={<DeleteOutlineIcon />}
                  sx={{ textTransform: 'none' }}
                >
                  Delete Log
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        </>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Sparkline Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
            {metrics.slice(0, 3).map(m => {
              const current = chartData.length > 0 ? chartData[chartData.length - 1][m.key] : null
              const previous = chartData.length > 1 ? chartData[chartData.length - 2][m.key] : null
              const diff = (current && previous) ? current - previous : 0
              return (
                <Box key={m.key} sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>{m.label}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{current || '--'}<span style={{ fontSize: '0.75rem', fontWeight: 400, marginLeft: 2 }}>{m.unit}</span></Typography>
                    {diff !== 0 && (
                      <Typography variant="caption" sx={{ color: diff < 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>

          {/* Main Chart */}
          <Box sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Metric Trends</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Track your body metrics over time</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {metrics.map(m => (
                  <Button
                    key={m.key}
                    size="small"
                    onClick={() => setSelectedChartMetric(m.key)}
                    sx={{
                      minWidth: 0,
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.7rem',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 1.5,
                      bgcolor: selectedChartMetric === m.key ? m.color : 'transparent',
                      color: selectedChartMetric === m.key ? '#fff' : 'text.secondary',
                      border: '1px solid',
                      borderColor: selectedChartMetric === m.key ? m.color : 'divider',
                      '&:hover': { bgcolor: selectedChartMetric === m.key ? m.color : 'action.hover' }
                    }}
                  >
                    {m.label}
                  </Button>
                ))}
              </Box>
            </Box>

            <Box sx={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metrics.find(m => m.key === selectedChartMetric)?.color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={metrics.find(m => m.key === selectedChartMetric)?.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 11, fill: '#9ca3af' }} 
                    axisLine={false} 
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    hide 
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                    itemStyle={{ fontSize: 13, fontWeight: 700 }}
                    labelStyle={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}
                    formatter={(value) => [`${value} ${metrics.find(m => m.key === selectedChartMetric)?.unit}`, metrics.find(m => m.key === selectedChartMetric)?.label]}
                  />
                  <Area
                    type="monotone"
                    dataKey={selectedChartMetric}
                    stroke={metrics.find(m => m.key === selectedChartMetric)?.color}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorMetric)"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          {/* Composition Breakdown (Fat vs Muscle) */}
          <Box sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Composition Breakdown</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 3 }}>Fat Mass vs Skeletal Muscle Mass (kg)</Typography>
            
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 11, fill: '#9ca3af' }} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fatMassKg" 
                    name="Fat Mass" 
                    stroke="#ef4444" 
                    strokeWidth={3} 
                    dot={{ r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="smmKg" 
                    name="Muscle Mass (SMM)" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}


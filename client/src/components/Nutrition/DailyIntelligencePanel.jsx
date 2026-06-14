/**
 * DailyIntelligencePanel (Web)
 * Mirror of the mobile component — same data, MUI styling.
 */
import React, { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import LinearProgress from '@mui/material/LinearProgress'
import IconButton from '@mui/material/IconButton'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import BoltIcon from '@mui/icons-material/Bolt'
import NightlightIcon from '@mui/icons-material/Nightlight'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import PsychologyIcon from '@mui/icons-material/Psychology'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

import { API_BASE } from '../../config'

const MODE_CONFIG = {
  fueling:     { label: 'Fueling',     color: '#3b82f6', bg: '#eff6ff',  Icon: BoltIcon },
  recovering:  { label: 'Recovering',  color: '#f59e0b', bg: '#fffbeb',  Icon: NightlightIcon },
  cutting:     { label: 'Cutting',     color: '#ef4444', bg: '#fef2f2',  Icon: TrendingDownIcon },
  maintaining: { label: 'Maintaining', color: '#6366f1', bg: '#f5f3ff',  Icon: FitnessCenterIcon },
  bulking:     { label: 'Building',    color: '#10b981', bg: '#f0fdf4',  Icon: LocalFireDepartmentIcon },
}

const URGENCY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#6366f1' }

function ActionCard({ action }) {
  const [open, setOpen] = useState(action.urgency === 'high')
  const color = URGENCY_COLOR[action.urgency] || '#888'

  return (
    <Box
      sx={{ borderLeft: `3px solid ${color}`, pl: 1.5, mb: 1, borderRadius: '0 8px 8px 0', bgcolor: color + '0d', cursor: 'pointer', pr: 1, py: 0.75 }}
      onClick={() => setOpen(o => !o)}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon sx={{ fontSize: 14, color }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#111' }}>{action.title}</Typography>
        </Box>
        {open ? <ExpandLessIcon sx={{ fontSize: 14, color: '#aaa' }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: '#aaa' }} />}
      </Box>
      <Collapse in={open}>
        <Typography variant="caption" sx={{ color: '#555', display: 'block', mt: 0.5, lineHeight: 1.5 }}>
          {action.body}
        </Typography>
        {action.suggestion && (
          <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600, display: 'block', mt: 0.25 }}>
            → {action.suggestion}
          </Typography>
        )}
        {action.windowClosesMins != null && (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5, bgcolor: color + '20', borderRadius: 1, px: 0.75, py: 0.25 }}>
            <AccessTimeIcon sx={{ fontSize: 10, color }} />
            <Typography variant="caption" sx={{ color, fontWeight: 700, fontSize: 10 }}>
              Window closes in {action.windowClosesMins} min
            </Typography>
          </Box>
        )}
      </Collapse>
    </Box>
  )
}

function InsightCard({ insight }) {
  if (!insight) return null
  return (
    <Box sx={{ bgcolor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 1.5, p: 1.5, mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <PsychologyIcon sx={{ fontSize: 13, color: '#8b5cf6' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1 }}>
          Cross-domain insight
        </Typography>
        <Chip label={insight.impact} size="small"
          sx={{ height: 16, fontSize: 9, fontWeight: 700,
            bgcolor: insight.impact === 'high' ? '#fef2f2' : '#f5f3ff',
            color: insight.impact === 'high' ? '#ef4444' : '#7c3aed' }} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#3b0764', lineHeight: 1.5, mb: 0.25 }}>
        {insight.title}
      </Typography>
      {insight.detail && (
        <Typography variant="caption" sx={{ color: '#6d28d9', display: 'block', lineHeight: 1.5, mb: 0.25 }}>
          {insight.detail}
        </Typography>
      )}
      {insight.action && (
        <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 600, fontStyle: 'italic' }}>
          → {insight.action}
        </Typography>
      )}
    </Box>
  )
}

export default function DailyIntelligencePanel({ getAuthHeaders }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const headers = getAuthHeaders ? getAuthHeaders() : {}
    fetch(`${API_BASE}/api/nutrition/daily-intelligence`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <LinearProgress sx={{ height: 2, borderRadius: 99, mb: 1 }} />
  }

  if (!data) return null

  const modeCfg = MODE_CONFIG[data.mode] || MODE_CONFIG.maintaining
  const { Icon: ModeIcon } = modeCfg
  const hasDelta = data.targetDelta?.calories !== 0 || data.targetDelta?.protein !== 0
  const hasActions = data.actions?.length > 0

  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid #e5e7eb', borderRadius: 2, mb: 2.5, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, cursor: 'pointer' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: modeCfg.bg, borderRadius: 99, px: 1.25, py: 0.5 }}>
            <ModeIcon sx={{ fontSize: 14, color: modeCfg.color }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: modeCfg.color }}>{modeCfg.label}</Typography>
          </Box>
          {data.recoveryDebt >= 5 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 1, px: 0.75, py: 0.25 }}>
              <WarningAmberIcon sx={{ fontSize: 11, color: '#f59e0b' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#92400e', fontSize: 10 }}>
                debt {data.recoveryDebt}/10
              </Typography>
            </Box>
          )}
        </Box>
        <IconButton size="small">
          {collapsed ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ExpandLessIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Box>

      <Collapse in={!collapsed}>
        <Box sx={{ px: 2, pb: 2 }}>
          {/* Dynamic target delta */}
          {hasDelta && data.targetDelta?.reason && (
            <Box sx={{ bgcolor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 1.5, p: 1.25, mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Today's adjusted target
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, my: 0.5 }}>
                {data.targetDelta.calories > 0 && (
                  <Chip label={`+${data.targetDelta.calories} kcal`} size="small"
                    sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 700, height: 20 }} />
                )}
                {data.targetDelta.protein > 0 && (
                  <Chip label={`+${data.targetDelta.protein}g protein`} size="small"
                    sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 700, height: 20 }} />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: '#0369a1' }}>{data.targetDelta.reason}</Typography>
            </Box>
          )}

          {/* Actions */}
          {hasActions && data.actions.map((a, i) => <ActionCard key={i} action={a} />)}

          {/* Cross-domain insight */}
          <InsightCard insight={data.insight} />

          {!hasActions && !data.insight && !hasDelta && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#10b981' }} />
              <Typography variant="caption" sx={{ color: '#555' }}>No urgent actions right now.</Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

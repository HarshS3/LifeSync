import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'

import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

function toDateInputValue(d) {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function normalizeTagsInput(tagsText) {
  return String(tagsText || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 20)
}

function SymptomsPanel() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    date: toDateInputValue(new Date()),
    symptomName: '',
    severity: '',
    tags: '',
    notes: '',
  })

  const headers = useMemo(() => {
    const h = { 'Content-Type': 'application/json' }
    if (token) h.Authorization = `Bearer ${token}`
    return h
  }, [token])

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/symptoms?limit=60`, { headers })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || `Failed to load symptoms (${res.status})`)
      }
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load symptoms')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const resetForm = () => {
    setEditingId(null)
    setForm({
      date: toDateInputValue(new Date()),
      symptomName: '',
      severity: '',
      tags: '',
      notes: '',
    })
  }

  const startEdit = (log) => {
    setEditingId(log?._id || null)
    setForm({
      date: toDateInputValue(log?.date || new Date()),
      symptomName: log?.symptomName || '',
      severity: log?.severity == null ? '' : String(log.severity),
      tags: Array.isArray(log?.tags) ? log.tags.join(', ') : '',
      notes: log?.notes || '',
    })
  }

  const submit = async () => {
    if (!token) {
      setError('Please sign in again to continue.')
      return
    }

    const symptomName = String(form.symptomName || '').trim()
    if (!symptomName) {
      setError('Symptom name is required.')
      return
    }

    const severity = form.severity === '' ? null : Number(form.severity)
    if (severity != null && (!Number.isFinite(severity) || severity < 0 || severity > 10)) {
      setError('Severity must be a number between 0 and 10.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        date: form.date ? new Date(form.date).toISOString() : undefined,
        symptomName,
        severity,
        notes: form.notes,
        tags: normalizeTagsInput(form.tags),
      }

      const url = editingId
        ? `${API_BASE}/api/symptoms/${editingId}`
        : `${API_BASE}/api/symptoms`

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || `Failed to save (${res.status})`)
      }

      const saved = await res.json()

      setLogs((prev) => {
        if (!editingId) return [saved, ...prev]
        return prev.map((l) => (l._id === editingId ? saved : l))
      })

      resetForm()
    } catch (e) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!token) return
    if (!id) return

    const ok = window.confirm('Delete this symptom log?')
    if (!ok) return

    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/symptoms/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || `Failed to delete (${res.status})`)
      }
      setLogs((prev) => prev.filter((l) => l._id !== id))
      if (editingId === id) resetForm()
    } catch (e) {
      setError(e.message || 'Failed to delete')
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: '#171717' }}>
          Symptoms
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>
          Track symptoms over time and review patterns.
        </Typography>
      </Box>

      {!token && (
        <Alert severity="warning">Please sign in to track symptoms.</Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '420px 1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* Editor */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717', mb: 2 }}>
            {editingId ? 'Edit symptom log' : 'New symptom log'}
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Symptom"
              placeholder="e.g. headache"
              value={form.symptomName}
              onChange={(e) => setForm((p) => ({ ...p, symptomName: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Severity (0–10)"
              type="number"
              value={form.severity}
              onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))}
              fullWidth
              inputProps={{ min: 0, max: 10 }}
            />

            <TextField
              label="Tags (comma-separated)"
              placeholder="e.g. eyes, nausea"
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="contained"
                disabled={saving || !token}
                onClick={submit}
                sx={{ flex: 1, py: 1.2 }}
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add symptom'}
              </Button>
              {editingId && (
                <Button variant="outlined" onClick={resetForm} disabled={saving}>
                  Cancel
                </Button>
              )}
            </Box>
          </Stack>
        </Box>

        {/* List */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717' }}>
              Recent logs
            </Typography>
            <Button variant="outlined" onClick={load} disabled={loading || !token}>
              Refresh
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: '#171717' }} />
            </Box>
          ) : logs.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              No symptom logs yet.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {logs.map((log) => (
                <Box
                  key={log._id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #e5e7eb',
                    bgcolor: editingId === log._id ? '#f9fafb' : '#fff',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#171717' }} noWrap>
                        {log.symptomName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {log.date ? new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {log.severity != null && (
                        <Chip
                          size="small"
                          label={`${log.severity}/10`}
                          sx={{
                            bgcolor: (log.severity || 0) >= 7 ? '#fee2e2' : (log.severity || 0) >= 4 ? '#fef3c7' : '#dcfce7',
                            color: '#171717',
                            border: '1px solid #e5e7eb',
                          }}
                        />
                      )}
                      <IconButton size="small" onClick={() => startEdit(log)} title="Edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => remove(log._id)} title="Delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {!!log.notes && (
                    <Typography variant="body2" sx={{ color: '#374151', mt: 1, whiteSpace: 'pre-wrap' }}>
                      {log.notes}
                    </Typography>
                  )}

                  {Array.isArray(log.tags) && log.tags.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {log.tags.slice(0, 12).map((t) => (
                        <Chip
                          key={t}
                          size="small"
                          label={t}
                          sx={{ bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151' }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default SymptomsPanel

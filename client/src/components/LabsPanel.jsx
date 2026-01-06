import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import AddIcon from '@mui/icons-material/Add'
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

function newResultRow() {
  return {
    name: '',
    value: '',
    unit: '',
    refRangeLow: '',
    refRangeHigh: '',
    notes: '',
  }
}

function normalizeResults(rows) {
  return (rows || [])
    .map((r) => {
      const name = String(r.name || '').trim()
      if (!name) return null
      return {
        name,
        value: r.value,
        unit: r.unit,
        refRangeLow: r.refRangeLow === '' ? null : r.refRangeLow,
        refRangeHigh: r.refRangeHigh === '' ? null : r.refRangeHigh,
        notes: r.notes,
      }
    })
    .filter(Boolean)
    .slice(0, 200)
}

function LabsPanel() {
  const { token } = useAuth()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reports, setReports] = useState([])

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    date: toDateInputValue(new Date()),
    panelName: '',
    source: 'manual',
    notes: '',
    results: [newResultRow(), newResultRow(), newResultRow()],
  })

  const [ocrFile, setOcrFile] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')

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
      const res = await fetch(`${API_BASE}/api/labs?limit=30`, { headers })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || `Failed to load labs (${res.status})`)
      }
      const data = await res.json()
      setReports(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load lab reports')
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const runOcr = async () => {
    if (!token) {
      setOcrError('Please sign in to use OCR.')
      return
    }
    if (!ocrFile) {
      setOcrError('Please choose an image first.')
      return
    }

    setOcrLoading(true)
    setOcrError('')
    try {
      const fd = new FormData()
      fd.append('image', ocrFile)

      const res = await fetch(`${API_BASE}/api/labs/ocr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || `OCR failed (${res.status})`)
      }

      const data = await res.json().catch(() => null)
      const text = String(data?.text || '')
      setOcrText(text)
      // For now: print OCR output in console (as requested)
      // Server also prints it.
      // eslint-disable-next-line no-console
      console.log('[Lab OCR] Extracted text:\n' + text)
    } catch (e) {
      setOcrError(e.message || 'OCR failed')
    } finally {
      setOcrLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({
      date: toDateInputValue(new Date()),
      panelName: '',
      source: 'manual',
      notes: '',
      results: [newResultRow(), newResultRow(), newResultRow()],
    })
  }

  const startEdit = (report) => {
    setEditingId(report?._id || null)
    const results = Array.isArray(report?.results) && report.results.length
      ? report.results.map((r) => ({
          name: r?.name || '',
          value: r?.value ?? '',
          unit: r?.unit || '',
          refRangeLow: r?.refRangeLow ?? '',
          refRangeHigh: r?.refRangeHigh ?? '',
          notes: r?.notes || '',
        }))
      : [newResultRow()]

    setForm({
      date: toDateInputValue(report?.date || new Date()),
      panelName: report?.panelName || '',
      source: report?.source || 'manual',
      notes: report?.notes || '',
      results: results.length ? results : [newResultRow()],
    })
  }

  const submit = async () => {
    if (!token) {
      setError('Please sign in again to continue.')
      return
    }

    const panelName = String(form.panelName || '').trim()
    if (!panelName) {
      setError('Panel name is required.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        date: form.date ? new Date(form.date).toISOString() : undefined,
        panelName,
        notes: form.notes,
        source: form.source,
        results: normalizeResults(form.results),
      }

      const url = editingId
        ? `${API_BASE}/api/labs/${editingId}`
        : `${API_BASE}/api/labs`

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

      setReports((prev) => {
        if (!editingId) return [saved, ...prev]
        return prev.map((r) => (r._id === editingId ? saved : r))
      })

      resetForm()
    } catch (e) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!token || !id) return

    const ok = window.confirm('Delete this lab report?')
    if (!ok) return

    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/labs/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || `Failed to delete (${res.status})`)
      }
      setReports((prev) => prev.filter((r) => r._id !== id))
      if (editingId === id) resetForm()
    } catch (e) {
      setError(e.message || 'Failed to delete')
    }
  }

  const abnormalCount = (report) => {
    const results = Array.isArray(report?.results) ? report.results : []
    return results.filter((r) => r?.flag === 'high' || r?.flag === 'low').length
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: '#171717' }}>
          Labs
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>
          Store lab panels and track changes over time.
        </Typography>
      </Box>

      {!token && (
        <Alert severity="warning">Please sign in to manage lab reports.</Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717', mb: 1 }}>
          OCR (image → text)
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
          Upload a lab image to extract text. (Temporary: prints OCR output to console.)
        </Typography>

        {ocrError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {ocrError}
          </Alert>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2, alignItems: { sm: 'center' } }}>
          <Button variant="outlined" component="label" disabled={!token || ocrLoading}>
            Choose image
            <input
              hidden
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setOcrFile(f)
                setOcrText('')
                setOcrError('')
              }}
            />
          </Button>

          <Typography variant="body2" sx={{ color: '#6b7280', flex: 1 }} noWrap>
            {ocrFile ? ocrFile.name : 'No file selected'}
          </Typography>

          <Button variant="contained" onClick={runOcr} disabled={!token || !ocrFile || ocrLoading}>
            {ocrLoading ? 'Running…' : 'Run OCR'}
          </Button>
        </Stack>

        <TextField
          label="Extracted text"
          value={ocrText}
          onChange={(e) => setOcrText(e.target.value)}
          placeholder="OCR output will appear here…"
          fullWidth
          multiline
          minRows={4}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 520px' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* List */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717' }}>
              Recent reports
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
          ) : reports.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              No lab reports yet.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {reports.map((r) => {
                const abn = abnormalCount(r)
                return (
                  <Box
                    key={r._id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid #e5e7eb',
                      bgcolor: editingId === r._id ? '#f9fafb' : '#fff',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#171717' }} noWrap>
                          {r.panelName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          {Array.isArray(r.results) ? ` • ${r.results.length} results` : ''}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {abn > 0 && (
                          <Chip
                            size="small"
                            label={`${abn} flagged`}
                            sx={{ bgcolor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
                          />
                        )}
                        <IconButton size="small" onClick={() => startEdit(r)} title="Edit">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => remove(r._id)} title="Delete">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {!!r.notes && (
                      <Typography variant="body2" sx={{ color: '#374151', mt: 1, whiteSpace: 'pre-wrap' }}>
                        {r.notes}
                      </Typography>
                    )}

                    {Array.isArray(r.results) && r.results.length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {r.results
                          .filter((x) => x?.flag === 'high' || x?.flag === 'low')
                          .slice(0, 6)
                          .map((x) => (
                            <Chip
                              key={`${x.name}-${x.flag}`}
                              size="small"
                              label={`${x.name}: ${x.value}${x.unit ? ` ${x.unit}` : ''} (${x.flag})`}
                              sx={{
                                bgcolor: x.flag === 'high' ? '#fee2e2' : '#fef3c7',
                                border: '1px solid #e5e7eb',
                                color: '#171717',
                              }}
                            />
                          ))}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Stack>
          )}
        </Box>

        {/* Editor */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717', mb: 2 }}>
            {editingId ? 'Edit lab report' : 'New lab report'}
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
              label="Panel Name"
              placeholder="e.g. CBC, CMP, Lipid"
              value={form.panelName}
              onChange={(e) => setForm((p) => ({ ...p, panelName: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Source"
              placeholder="manual"
              value={form.source}
              onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />

            <Divider />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" sx={{ color: '#6b7280' }}>
                Results
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={() => setForm((p) => ({ ...p, results: [...p.results, newResultRow()] }))}
              >
                Add row
              </Button>
            </Box>

            <Stack spacing={1.25}>
              {form.results.map((row, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    bgcolor: '#fafafa',
                  }}
                >
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 90px', gap: 1.25 }}>
                    <TextField
                      label="Name"
                      value={row.name}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          results: p.results.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                        }))
                      }
                      fullWidth
                    />
                    <TextField
                      label="Value"
                      value={row.value}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          results: p.results.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)),
                        }))
                      }
                      fullWidth
                    />
                    <TextField
                      label="Unit"
                      value={row.unit}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          results: p.results.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r)),
                        }))
                      }
                      fullWidth
                    />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 44px', gap: 1.25, mt: 1.25 }}>
                    <TextField
                      label="Ref Low"
                      value={row.refRangeLow}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          results: p.results.map((r, i) => (i === idx ? { ...r, refRangeLow: e.target.value } : r)),
                        }))
                      }
                      fullWidth
                    />
                    <TextField
                      label="Ref High"
                      value={row.refRangeHigh}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          results: p.results.map((r, i) => (i === idx ? { ...r, refRangeHigh: e.target.value } : r)),
                        }))
                      }
                      fullWidth
                    />
                    <IconButton
                      size="small"
                      title="Remove row"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          results: p.results.length <= 1 ? p.results : p.results.filter((_, i) => i !== idx),
                        }))
                      }
                      sx={{ alignSelf: 'center' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <TextField
                    label="Notes"
                    value={row.notes}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        results: p.results.map((r, i) => (i === idx ? { ...r, notes: e.target.value } : r)),
                      }))
                    }
                    fullWidth
                    multiline
                    minRows={1}
                    sx={{ mt: 1.25 }}
                  />
                </Box>
              ))}
            </Stack>

            <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
              <Button
                variant="contained"
                disabled={saving || !token}
                onClick={submit}
                sx={{ flex: 1, py: 1.2 }}
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create report'}
              </Button>
              {editingId && (
                <Button variant="outlined" onClick={resetForm} disabled={saving}>
                  Cancel
                </Button>
              )}
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}

export default LabsPanel

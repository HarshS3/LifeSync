import { useState, useEffect, useRef, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import KitchenIcon from '@mui/icons-material/Kitchen'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

// Words to strip from OCR output that are never food items
const OCR_NOISE_WORDS = new Set([
  'total', 'subtotal', 'tax', 'gst', 'sgst', 'cgst', 'igst', 'bill', 'invoice',
  'receipt', 'amount', 'paid', 'cash', 'card', 'upi', 'balance', 'due', 'date',
  'time', 'qty', 'quantity', 'price', 'rate', 'mrp', 'rs', 'inr', 'rupees',
  'thank', 'you', 'visit', 'again', 'shop', 'store', 'supermarket', 'mart',
  'mobile', 'phone', 'email', 'address', 'gst', 'hsn', 'item', 'no', 'sr',
  'sl', 'discount', 'offer', 'free', 'save', 'saving', 'net', 'gross',
])

/**
 * Heuristic OCR post-processor.
 * Takes raw Tesseract text, splits into candidate lines,
 * filters noise, returns an array of candidate item names.
 */
function extractItemsFromOcrText(rawText) {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 2)

  const candidates = []

  lines.forEach(line => {
    // Strip numbers, prices, units (e.g. "Toor Dal 500g 85.00" → "Toor Dal")
    const cleaned = line
      .replace(/[\d₹%/.@#*|\\]+/g, ' ')   // strip digits/symbols
      .replace(/\b(kg|g|ml|l|ltr|pcs|pc|nos|unit|pack|packet|bag|box|bottle|can|tin)\b/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (cleaned.length < 3) return

    // Skip lines where every word is a noise word or number
    const words = cleaned.toLowerCase().split(/\s+/).filter(w => w.length > 1)
    const nonNoise = words.filter(w => !OCR_NOISE_WORDS.has(w) && !/^\d+$/.test(w))
    if (nonNoise.length === 0) return

    // Title-case the item
    const named = cleaned
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')

    candidates.push(named)
  })

  // Deduplicate
  return [...new Set(candidates)]
}

export default function KitchenInventory() {
  const { token } = useAuth()
  const [items, setItems] = useState([])          // items currently saved
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState('')

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrPreview, setOcrPreview] = useState(null)
  const [ocrCandidates, setOcrCandidates] = useState([])  // items extracted but not yet confirmed
  const [ocrError, setOcrError] = useState('')
  const fileInputRef = useRef(null)

  const authHeader = { Authorization: `Bearer ${token}` }

  // ── Fetch saved inventory ────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch(`${API_BASE}/api/nutrition/kitchen-inventory`, { headers: authHeader })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => setItems(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  // ── Save items to backend ────────────────────────────────────────
  const saveItems = useCallback(async (newList) => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/nutrition/kitchen-inventory`, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newList }),
      })
      if (res.ok) {
        const data = await res.json()
        setItems(data.items)
      }
    } catch (err) {
      console.error('Failed to save inventory:', err)
    } finally {
      setSaving(false)
    }
  }, [token])

  // ── Add single item manually ─────────────────────────────────────
  const addItem = () => {
    const trimmed = newItem.trim()
    if (!trimmed || items.includes(trimmed)) return
    const updated = [...items, trimmed]
    setNewItem('')
    saveItems(updated)
  }

  // ── Remove item ──────────────────────────────────────────────────
  const removeItem = (item) => {
    saveItems(items.filter(i => i !== item))
  }

  // ── OCR: load Tesseract lazily and scan bill image ───────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrError('')
    setOcrCandidates([])
    setOcrPreview(URL.createObjectURL(file))
    setOcrLoading(true)
    setOcrProgress(0)

    try {
      // Lazy-load Tesseract.js from CDN via dynamic import equivalent
      const Tesseract = (await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js')).default

      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round((m.progress || 0) * 100))
          }
        },
      })

      const extracted = extractItemsFromOcrText(result.data.text)
      if (extracted.length === 0) {
        setOcrError('No recognisable items found in the image. Try a clearer photo of the bill.')
      } else {
        setOcrCandidates(extracted)
      }
    } catch (err) {
      console.error('OCR error:', err)
      setOcrError('OCR failed. Make sure the image is clear and readable.')
    } finally {
      setOcrLoading(false)
      // reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Confirm OCR candidates into inventory ────────────────────────
  const [selectedCandidates, setSelectedCandidates] = useState([])

  useEffect(() => {
    // Auto-select all candidates when they arrive
    setSelectedCandidates(ocrCandidates)
  }, [ocrCandidates])

  const toggleCandidate = (item) => {
    setSelectedCandidates(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  const confirmCandidates = () => {
    const merged = [...new Set([...items, ...selectedCandidates])]
    saveItems(merged)
    setOcrCandidates([])
    setSelectedCandidates([])
    setOcrPreview(null)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* Header */}
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <KitchenIcon sx={{ color: '#f59e0b' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Kitchen Inventory
          </Typography>
          {saving && (
            <Typography variant="caption" sx={{ color: '#94a3b8', ml: 'auto' }}>Saving…</Typography>
          )}
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Track what's in your kitchen. The meal plan generator uses this to suggest recipes you can actually make.
        </Typography>
      </Box>

      {/* Manual item entry */}
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.secondary' }}>
          Add Item Manually
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="e.g. Moong Dal, Spinach, Paneer…"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />
          <Button
            variant="contained"
            onClick={addItem}
            startIcon={<AddIcon />}
            sx={{
              textTransform: 'none', fontWeight: 600, borderRadius: 1.5,
              bgcolor: '#f59e0b', color: 'background.paper', flexShrink: 0,
              '&:hover': { bgcolor: '#d97706' }
            }}
          >
            Add
          </Button>
        </Box>
      </Box>

      {/* OCR bill scanner */}
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
          Scan Grocery Bill (OCR)
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Take a photo of your grocery receipt or bill. We'll extract the item names automatically.
        </Typography>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={ocrLoading}
          sx={{
            textTransform: 'none', borderRadius: 1.5, fontWeight: 600,
            borderColor: 'divider', color: 'text.secondary',
            '&:hover': { borderColor: '#f59e0b', color: '#f59e0b', bgcolor: '#fffbeb' }
          }}
        >
          {ocrLoading ? 'Reading bill…' : 'Upload Bill Image'}
        </Button>

        {ocrLoading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Running OCR… {ocrProgress}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={ocrProgress}
              sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: 'action.selected', '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' } }}
            />
          </Box>
        )}

        {ocrError && (
          <Typography variant="body2" sx={{ color: '#ef4444', mt: 1.5 }}>{ocrError}</Typography>
        )}

        {/* Preview + candidates */}
        {ocrCandidates.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {ocrPreview && (
                <Box
                  component="img"
                  src={ocrPreview}
                  sx={{ height: 160, borderRadius: 2, border: '1px solid #e5e7eb', objectFit: 'contain', flexShrink: 0 }}
                />
              )}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {ocrCandidates.length} items found — tap to deselect
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" sx={{ textTransform: 'none', color: '#94a3b8', fontSize: '0.75rem' }} onClick={() => setSelectedCandidates([])}>
                      None
                    </Button>
                    <Button size="small" sx={{ textTransform: 'none', color: 'text.secondary', fontSize: '0.75rem' }} onClick={() => setSelectedCandidates(ocrCandidates)}>
                      All
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {ocrCandidates.map(item => {
                    const selected = selectedCandidates.includes(item)
                    return (
                      <Chip
                        key={item}
                        label={item}
                        onClick={() => toggleCandidate(item)}
                        sx={{
                          bgcolor: selected ? '#fef3c7' : 'action.selected',
                          border: `1px solid ${selected ? '#f59e0b' : 'divider'}`,
                          color: selected ? '#92400e' : 'text.secondary',
                          fontWeight: selected ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          '&:hover': { bgcolor: selected ? '#fde68a' : 'divider' }
                        }}
                      />
                    )
                  })}
                </Box>

                <Button
                  variant="contained"
                  startIcon={<CheckCircleOutlineIcon />}
                  onClick={confirmCandidates}
                  disabled={selectedCandidates.length === 0}
                  sx={{
                    textTransform: 'none', fontWeight: 700, borderRadius: 1.5,
                    bgcolor: '#22c55e', color: 'background.paper',
                    '&:hover': { bgcolor: '#16a34a' },
                    '&:disabled': { bgcolor: '#d1fae5', color: '#86efac' }
                  }}
                >
                  Add {selectedCandidates.length} item{selectedCandidates.length !== 1 ? 's' : ''} to Kitchen
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Current inventory */}
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            In Your Kitchen
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {loading && <LinearProgress sx={{ borderRadius: 1, bgcolor: 'action.selected', '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' } }} />}

        {!loading && items.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <KitchenIcon sx={{ fontSize: 40, color: 'divider', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Your kitchen is empty. Add items manually or scan a grocery bill.
            </Typography>
          </Box>
        )}

        {items.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {items.map(item => (
              <Chip
                key={item}
                label={item}
                onDelete={() => removeItem(item)}
                deleteIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />}
                sx={{
                  bgcolor: 'background.default',
                  border: '1px solid #e2e8f0',
                  color: '#334155',
                  fontWeight: 500,
                  '& .MuiChip-deleteIcon': { color: '#94a3b8', '&:hover': { color: '#ef4444' } }
                }}
              />
            ))}
          </Box>
        )}

        {items.length > 0 && (
          <Button
            size="small"
            onClick={() => saveItems([])}
            sx={{ mt: 2, textTransform: 'none', color: '#94a3b8', fontSize: '0.75rem', '&:hover': { color: '#ef4444' } }}
          >
            Clear all
          </Button>
        )}
      </Box>
    </Box>
  )
}

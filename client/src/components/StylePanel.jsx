import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import CardActions from '@mui/material/CardActions'
import LinearProgress from '@mui/material/LinearProgress'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import CheckroomIcon from '@mui/icons-material/Checkroom'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import CloudIcon from '@mui/icons-material/Cloud'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

const CATEGORIES = [
  'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'activewear', 'formal'
]

const COLORS = [
  { name: 'Black', hex: '#171717' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Gray', hex: '#6b7280' },
  { name: 'Beige', hex: '#d4c4a8' },
  { name: 'Brown', hex: '#8b4513' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Orange', hex: '#f97316' },
]

const OCCASIONS = ['casual', 'work', 'formal', 'workout', 'date', 'outdoor']

const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all-season']

function StylePanel() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [wardrobe, setWardrobe] = useState([])
  const [outfitSuggestions, setOutfitSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [serverStats, setServerStats] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [suggestingOutfit, setSuggestingOutfit] = useState(false)
  
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'tops',
    colors: [],
    occasions: [],
    seasons: ['all-season'],
    brand: '',
    imageUrl: '',
    favorite: false,
    notes: '',
  })

  // Load wardrobe
  useEffect(() => {
    loadWardrobe()
  }, [token])

  useEffect(() => {
    if (!token) return
    if (activeTab !== 2) return
    loadStyleStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab])

  const loadWardrobe = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/style/wardrobe`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setWardrobe(data)
      }
    } catch (err) {
      console.error('Failed to load wardrobe:', err)
    }
    setLoading(false)
  }

  const loadStyleStats = async () => {
    if (!token) return
    setStatsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/style/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setServerStats(data)
      }
    } catch (err) {
      console.error('Failed to load style stats:', err)
    }
    setStatsLoading(false)
  }

  const handleSaveItem = async () => {
    if (!newItem.name || !newItem.category) return
    
    try {
      const url = editingItem 
        ? `${API_BASE}/api/style/wardrobe/${editingItem._id}`
        : `${API_BASE}/api/style/wardrobe`
      const method = editingItem ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newItem)
      })
      
      if (res.ok) {
        loadWardrobe()
        handleCloseDialog()
      }
    } catch (err) {
      console.error('Failed to save item:', err)
    }
  }

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this item?')) return
    try {
      await fetch(`${API_BASE}/api/style/wardrobe/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      loadWardrobe()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleToggleFavorite = async (item) => {
    try {
      await fetch(`${API_BASE}/api/style/wardrobe/${item._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...item, favorite: !item.favorite })
      })
      loadWardrobe()
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingItem(null)
    setNewItem({
      name: '',
      category: 'tops',
      colors: [],
      occasions: [],
      seasons: ['all-season'],
      brand: '',
      imageUrl: '',
      favorite: false,
      notes: '',
    })
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setNewItem({
      name: item.name,
      category: item.category,
      colors: item.colors || [],
      occasions: item.occasions || [],
      seasons: item.seasons || ['all-season'],
      brand: item.brand || '',
      imageUrl: item.imageUrl || '',
      favorite: item.favorite || false,
      notes: item.notes || '',
    })
    setDialogOpen(true)
  }

  const getOutfitSuggestion = async () => {
    setSuggestingOutfit(true)
    try {
      const res = await fetch(`${API_BASE}/api/style/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          occasion: 'casual',
          weather: 'mild'
        })
      })
      if (res.ok) {
        const data = await res.json()
        setOutfitSuggestions(prev => [data, ...prev].slice(0, 5))
      }
    } catch (err) {
      console.error('Failed to get suggestion:', err)
    }
    setSuggestingOutfit(false)
  }

  const filteredWardrobe = filterCategory === 'all' 
    ? wardrobe 
    : wardrobe.filter(item => item.category === filterCategory)

  const wardrobeStats = {
    total: wardrobe.length,
    favorites: wardrobe.filter(i => i.favorite).length,
    byCategory: CATEGORIES.reduce((acc, cat) => {
      acc[cat] = wardrobe.filter(i => i.category === cat).length
      return acc
    }, {})
  }

  const stats = serverStats || wardrobeStats

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: '#171717' }}>
        Style Assistant
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: '#6b7280' }}>
        Manage your wardrobe and get AI-powered outfit suggestions
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            minWidth: 'auto',
            px: 2,
          },
          '& .Mui-selected': { color: '#171717' },
          '& .MuiTabs-indicator': { backgroundColor: '#171717' },
        }}
      >
        <Tab label="Wardrobe" />
        <Tab label="Outfit Ideas" />
        <Tab label="Stats" />
      </Tabs>

      {/* Wardrobe Tab */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={filterCategory}
                label="Category"
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <MenuItem value="all">All Items</MenuItem>
                {CATEGORIES.map(cat => (
                  <MenuItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{
                bgcolor: '#171717',
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': { bgcolor: '#374151' }
              }}
            >
              Add Item
            </Button>
          </Box>

          {loading ? (
            <LinearProgress sx={{ mb: 2 }} />
          ) : filteredWardrobe.length === 0 ? (
            <Box
              sx={{
                p: 6,
                textAlign: 'center',
                bgcolor: '#f9fafb',
                borderRadius: 2,
                border: '1px dashed #d1d5db',
              }}
            >
              <CheckroomIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, color: '#374151' }}>
                Your wardrobe is empty
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
                Start adding clothes to get personalized outfit suggestions
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setDialogOpen(true)}
                sx={{ textTransform: 'none' }}
              >
                Add Your First Item
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredWardrobe.map(item => (
                <Grid item xs={12} sm={6} md={4} key={item._id}>
                  <Card 
                    sx={{ 
                      border: '1px solid #e5e7eb',
                      boxShadow: 'none',
                      '&:hover': { boxShadow: 2 }
                    }}
                  >
                    {item.imageUrl ? (
                      <CardMedia
                        component="img"
                        height="160"
                        image={item.imageUrl}
                        alt={item.name}
                        sx={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 160,
                          bgcolor: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckroomIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
                      </Box>
                    )}
                    <CardContent sx={{ pb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717' }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            {item.category} {item.brand && `• ${item.brand}`}
                          </Typography>
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={() => handleToggleFavorite(item)}
                        >
                          {item.favorite 
                            ? <FavoriteIcon sx={{ fontSize: 18, color: '#ef4444' }} />
                            : <FavoriteBorderIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                          }
                        </IconButton>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                        {item.colors?.slice(0, 3).map(color => (
                          <Box
                            key={color}
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              bgcolor: COLORS.find(c => c.name === color)?.hex || '#9ca3af',
                              border: '1px solid #e5e7eb',
                            }}
                            title={color}
                          />
                        ))}
                      </Box>
                    </CardContent>
                    <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
                      <IconButton size="small" onClick={() => handleEditItem(item)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteItem(item._id)}>
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Outfit Ideas Tab */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              startIcon={suggestingOutfit ? null : <AutoAwesomeIcon />}
              onClick={getOutfitSuggestion}
              disabled={suggestingOutfit || wardrobe.length < 3}
              sx={{
                bgcolor: '#171717',
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': { bgcolor: '#374151' }
              }}
            >
              {suggestingOutfit ? 'Generating...' : 'Get Outfit Suggestion'}
            </Button>
          </Box>

          {wardrobe.length < 3 ? (
            <Box
              sx={{
                p: 4,
                bgcolor: '#fef3c7',
                borderRadius: 2,
                border: '1px solid #fcd34d',
              }}
            >
              <Typography variant="body2" sx={{ color: '#92400e' }}>
                Add at least 3 items to your wardrobe to get outfit suggestions.
              </Typography>
            </Box>
          ) : outfitSuggestions.length === 0 ? (
            <Box
              sx={{
                p: 6,
                textAlign: 'center',
                bgcolor: '#f9fafb',
                borderRadius: 2,
                border: '1px dashed #d1d5db',
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, color: '#374151' }}>
                No suggestions yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Click "Get Outfit Suggestion" to get AI-powered recommendations
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {outfitSuggestions.map((suggestion, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 3,
                    bgcolor: '#fff',
                    borderRadius: 2,
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AutoAwesomeIcon sx={{ fontSize: 20, color: '#6366f1' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {suggestion.occasion || 'Casual'} Outfit
                    </Typography>
                    <Chip 
                      size="small" 
                      label={suggestion.weather || 'Mild'}
                      icon={suggestion.weather === 'cold' ? <AcUnitIcon /> : <WbSunnyIcon />}
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  
                  <Typography variant="body2" sx={{ color: '#374151', mb: 2 }}>
                    {suggestion.description || 'A comfortable and stylish combination from your wardrobe.'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {suggestion.items?.map((item, i) => (
                      <Chip
                        key={i}
                        label={item.name || item}
                        variant="outlined"
                        sx={{ borderColor: '#e5e7eb' }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Stats Tab */}
      {activeTab === 2 && (
        <Box>
          {statsLoading && <LinearProgress sx={{ mb: 2 }} />}
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 3, bgcolor: '#f9fafb', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#171717' }}>
                  {stats.total}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  Total Items
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 3, bgcolor: '#fef2f2', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#ef4444' }}>
                  {stats.favorites}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  Favorites
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mt: 4, mb: 2, color: '#6b7280' }}>
            Items by Category
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {CATEGORIES.map(cat => (
              <Box key={cat}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {cat}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    {stats.byCategory?.[cat] || 0}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.total ? ((stats.byCategory?.[cat] || 0) / stats.total) * 100 : 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#e5e7eb',
                    '& .MuiLinearProgress-bar': { bgcolor: '#171717', borderRadius: 4 }
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Add/Edit Item Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingItem ? 'Edit Item' : 'Add New Item'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="Item Name"
              fullWidth
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="e.g., Blue Oxford Shirt"
            />
            
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newItem.category}
                label="Category"
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              >
                {CATEGORIES.map(cat => (
                  <MenuItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Colors</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {COLORS.map(color => (
                  <Box
                    key={color.name}
                    onClick={() => {
                      const colors = newItem.colors.includes(color.name)
                        ? newItem.colors.filter(c => c !== color.name)
                        : [...newItem.colors, color.name]
                      setNewItem({ ...newItem, colors })
                    }}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: color.hex,
                      border: newItem.colors.includes(color.name) 
                        ? '3px solid #6366f1' 
                        : '2px solid #e5e7eb',
                      cursor: 'pointer',
                      '&:hover': { transform: 'scale(1.1)' },
                      transition: 'all 0.2s',
                    }}
                    title={color.name}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Occasions</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {OCCASIONS.map(occ => (
                  <Chip
                    key={occ}
                    label={occ}
                    onClick={() => {
                      const occasions = newItem.occasions.includes(occ)
                        ? newItem.occasions.filter(o => o !== occ)
                        : [...newItem.occasions, occ]
                      setNewItem({ ...newItem, occasions })
                    }}
                    variant={newItem.occasions.includes(occ) ? 'filled' : 'outlined'}
                    sx={{
                      textTransform: 'capitalize',
                      ...(newItem.occasions.includes(occ) && {
                        bgcolor: '#171717',
                        color: '#fff',
                      })
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Seasons</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {SEASONS.map(season => (
                  <Chip
                    key={season}
                    label={season}
                    onClick={() => {
                      const seasons = newItem.seasons.includes(season)
                        ? newItem.seasons.filter(s => s !== season)
                        : [...newItem.seasons, season]
                      setNewItem({ ...newItem, seasons })
                    }}
                    variant={newItem.seasons.includes(season) ? 'filled' : 'outlined'}
                    sx={{
                      textTransform: 'capitalize',
                      ...(newItem.seasons.includes(season) && {
                        bgcolor: '#171717',
                        color: '#fff',
                      })
                    }}
                  />
                ))}
              </Box>
            </Box>

            <TextField
              label="Brand (optional)"
              fullWidth
              value={newItem.brand}
              onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
            />

            <TextField
              label="Image URL (optional)"
              fullWidth
              value={newItem.imageUrl}
              onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
              placeholder="https://..."
            />

            <TextField
              label="Notes (optional)"
              fullWidth
              multiline
              rows={2}
              value={newItem.notes}
              onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveItem}
            disabled={!newItem.name}
            sx={{
              bgcolor: '#171717',
              textTransform: 'none',
              '&:hover': { bgcolor: '#374151' }
            }}
          >
            {editingItem ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StylePanel

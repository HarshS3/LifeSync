import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import ExpandableSection from '../ExpandableSection'

const MealBuilder = ({
  newMeal,
  setNewMeal,
  isMobile,
  addFoodRow,
  removeFoodRow,
  updateFoodField,
  renderNutrientInputs,
  addMealToDay,
  resetNewMeal,
  formatDate,
  setTemplateDialogOpen,
}) => {
  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Meal Type"
          value={newMeal.mealType}
          onChange={(e) => setNewMeal({ ...newMeal, mealType: e.target.value })}
          size="small"
          SelectProps={{ native: true }}
          sx={{ flex: 1, minWidth: { xs: '100%', sm: 160 } }}
        >
          {['breakfast','lunch','dinner','snack','pre-workout','post-workout'].map(t => <option key={t} value={t}>{t}</option>)}
        </TextField>
        <TextField
          label="Log Time"
          type="time"
          value={newMeal.time}
          onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
          size="small"
          sx={{ flex: 1, minWidth: { xs: '100%', sm: 160 } }}
          InputLabelProps={{ shrink: true }}
          inputProps={{ step: 300 }}
        />
      </Box>

      <Divider sx={{ mb: 2 }} />
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Foods</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
        {newMeal.foods.map((food, idx) => (
          <Box key={idx} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden', position: 'relative' }}>
            <IconButton size="small" onClick={() => removeFoodRow(idx)} sx={{ position: 'absolute', top: 4, right: 4, zIndex: 10, bgcolor: 'rgba(255,255,255,0.7)' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
            {!!food.servingLabel && (
              <Box sx={{ px: 1.5, py: 0.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Reference: {food.servingLabel} {food.servingWeightG ? `(${food.servingWeightG}g)` : ''}
                </Typography>
              </Box>
            )}
            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField label="Food Item" placeholder="e.g. Chicken Breast" value={food.name} onChange={(e) => updateFoodField(idx, 'name', e.target.value)} size="small" sx={{ width: '100%' }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
                <TextField label="Qty" value={food.quantity} onChange={(e) => updateFoodField(idx, 'quantity', e.target.value)} size="small" inputProps={{ inputMode: 'decimal', style: { textAlign: 'center' } }} />
                <TextField label="Unit" value={food.baseServingUnit || food.unit || 'serving'} size="small" sx={{ bgcolor: 'action.selected' }} InputProps={{ readOnly: true }} />
                <TextField label="Weight (g)" type="number" value={food.baseServingQty && food.servingWeightG && food.quantity ? Math.round((Number(food.quantity) / Number(food.baseServingQty)) * Number(food.servingWeightG)) : ''} size="small" onChange={(e) => {}} />
                <TextField label="Calories" value={food.calories} onChange={(e) => updateFoodField(idx, 'calories', e.target.value)} size="small" />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
              <ExpandableSection title="Macros and Fats" defaultOpen={false}>
                {renderNutrientInputs({ food, index: idx, fields: [] , updateFoodField })}
              </ExpandableSection>
            </Box>
          </Box>
        ))}
      </Box>

      <Button size="small" onClick={addFoodRow} sx={{ textTransform: 'none', mb: 2 }}>+ Add another food</Button>

      <TextField label="Meal notes (optional)" value={newMeal.notes} onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })} multiline minRows={2} fullWidth size="small" sx={{ mb: 2.5 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
        <Button variant="outlined" size="small" onClick={resetNewMeal} sx={{ borderColor: 'divider', color: 'text.secondary' }}>Clear</Button>
        <Button variant="contained" onClick={() => { addMealToDay(); }} disabled={newMeal.foods.length === 0} fullWidth={isMobile} sx={{ bgcolor: '#16a34a' }}>{`Add to ${formatDate(new Date())}`}</Button>
        <Button variant="outlined" size="small" onClick={() => setTemplateDialogOpen(true)} sx={{ borderColor: '#16a34a', color: '#16a34a' }}>Save Template</Button>
      </Box>
    </Box>
  )
}

export default MealBuilder

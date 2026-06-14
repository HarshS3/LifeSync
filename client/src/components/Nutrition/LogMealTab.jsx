import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Collapse from '@mui/material/Collapse'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import HistoryIcon from '@mui/icons-material/History'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ExpandableSection from '../ExpandableSection'
import ScanProductTab from './ScanProductTab'
import RecipeExplorer from '../RecipeExplorer'
import { useAuth } from '../../context/AuthContext'
import {
  MEAL_TYPES,
  MACRO_FIELD_META,
  MINERAL_FIELD_META,
  VITAMIN_FIELD_META,
  formatServingDisplay
} from '../../lib/nutritionHelpers'

function LogMealTab({
  newMeal,
  setNewMeal,
  addFoodRow,
  removeFoodRow,
  updateFoodField,
  addMealToDay,
  foodSearchQuery,
  setFoodSearchQuery,
  foodResults,
  foodSearchLoading,
  foodSearchAttempted,
  handleSearchResultSelect,
  selectedFoodForAnalysis,
  setSelectedFoodForAnalysis,
  analyzeSelectedFood,
  foodAnalysis,
  foodAnalysisLoading,
  foodAnalysisError,
  savedTemplates,
  savedTemplatesLoading,
  useTemplate,
  deleteTemplate,
  frequentMeals,
  frequentMealsLoading,
  templateName,
  setTemplateName,
  saveAsTemplate,
  savingTemplate,
  liveInsights,
  log,
  handleWaterChange,
  handleTotalWaterChange,
  // Scan product props (formerly their own tab)
  barcodeInput,
  setBarcodeInput,
  lookupBarcode,
  barcodeLookupLoading,
  startBarcodeScanner,
  supportsBarcodeDetector,
  scannerOpen,
  scanBusy,
  stopBarcodeScanner,
  scanVideoRef,
}) {
  const { token } = useAuth()
  const [scanOpen, setScanOpen] = useState(false)
  const [recipesOpen, setRecipesOpen] = useState(false)

  const renderNutrientInputs = (food, index, fields) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
      {fields.map(({ key, label, unit }) => (
        <TextField
          key={`${index}-${key}`}
          label={`${label} (${unit})`}
          value={food?.[key] ?? ''}
          onChange={(e) => updateFoodField(index, key, e.target.value)}
          size="small"
          sx={{ width: 110 }}
        />
      ))}
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Quick access row — Scan + Recipes */}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button
          variant={scanOpen ? 'contained' : 'outlined'}
          startIcon={<QrCodeScannerIcon />}
          onClick={() => { setScanOpen(o => !o); setRecipesOpen(false); }}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Scan Barcode
        </Button>
        <Button
          variant={recipesOpen ? 'contained' : 'outlined'}
          startIcon={<MenuBookIcon />}
          onClick={() => { setRecipesOpen(o => !o); setScanOpen(false); }}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Browse Recipes
        </Button>
      </Box>

      <Collapse in={scanOpen}>
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <ScanProductTab
            barcodeInput={barcodeInput}
            setBarcodeInput={setBarcodeInput}
            lookupBarcode={lookupBarcode}
            barcodeLookupLoading={barcodeLookupLoading}
            startBarcodeScanner={startBarcodeScanner}
            supportsBarcodeDetector={supportsBarcodeDetector}
            scannerOpen={scannerOpen}
            scanBusy={scanBusy}
            stopBarcodeScanner={stopBarcodeScanner}
            scanVideoRef={scanVideoRef}
          />
        </Box>
      </Collapse>

      <Collapse in={recipesOpen}>
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb', p: 3 }}>
          <RecipeExplorer token={token} />
        </Box>
      </Collapse>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.25fr' }, gap: 3, alignItems: 'start' }}>

      {/* LEFT: Search + Deep Analysis */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Search Food Database</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Find any dish or ingredient to auto-fill nutrition data.</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <TextField
              placeholder="e.g. paneer tikka, dal, rice, tea"
              value={foodSearchQuery}
              onChange={(e) => setFoodSearchQuery(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                endAdornment: foodSearchLoading ? <Typography variant="caption" sx={{ color: 'text.secondary' }}>Searching...</Typography> : null
              }}
            />
          </Box>

          {!foodSearchLoading && foodSearchAttempted && foodResults.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', textAlign: 'center', py: 2 }}>No item found</Typography>
          )}

          {foodResults.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, maxHeight: 300, overflow: 'auto', borderRadius: 1.5, border: '1px solid #e5e7eb', p: 0.75 }}>
              {foodResults.map((f, idx) => (
                <Box
                  key={f.id || idx}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 1.25, borderRadius: 1.5, cursor: 'pointer', transition: 'background 0.1s', '&:hover': { bgcolor: '#f0fdf4' } }}
                  onClick={() => handleSearchResultSelect(f)}
                >
                  <Box>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                      {f.name}
                      {f.brand && (
                        <Typography component="span" variant="caption" sx={{ color: '#059669', bgcolor: '#d1fae5', px: 0.6, py: 0.2, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700 }}>
                          {f.brand}
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {formatServingDisplay(f.servingLabel || `${f.servingQty} ${f.servingUnit}`, f.servingWeightG)} · {Math.round(f.calories)} kcal
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', ml: 1, flexShrink: 0 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>P {Math.round(f.protein)}g</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>C {Math.round(f.carbs)}g · F {Math.round(f.fat)}g</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Deep Food Analysis</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              placeholder="Enter food name to analyze"
              value={selectedFoodForAnalysis}
              onChange={(e) => setSelectedFoodForAnalysis(e.target.value)}
              size="small"
              fullWidth
            />
            <Button size="small" variant="contained" onClick={() => analyzeSelectedFood({ includeLLM: false })} disabled={foodAnalysisLoading} sx={{ whiteSpace: 'nowrap' }}>
              {foodAnalysisLoading ? '...' : 'Analyze'}
            </Button>
            <Button size="small" variant="outlined" onClick={() => analyzeSelectedFood({ includeLLM: true })} disabled={foodAnalysisLoading} sx={{ whiteSpace: 'nowrap' }}>
              + LLM
            </Button>
          </Box>
          {foodAnalysisError && <Typography variant="caption" sx={{ color: '#b91c1c', display: 'block', mb: 1 }}>{foodAnalysisError}</Typography>}
          {foodAnalysis && (
            <Box sx={{ borderRadius: 1.5, border: '1px solid #e5e7eb', bgcolor: 'action.hover', p: 1.5, mt: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                {foodAnalysis.canonical_id || '-'} · {Math.round((foodAnalysis.resolver?.confidence || 0) * 100)}% confidence
              </Typography>
              {!!foodAnalysis.derived_metrics && (
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
                  <Chip size="small" label={`Glycemic: ${foodAnalysis.derived_metrics.glycemic_pressure?.label || '-'}`} sx={{ fontSize: '0.7rem' }} />
                  <Chip size="small" label={`Satiety: ${foodAnalysis.derived_metrics.satiety_index?.label || '-'}`} sx={{ fontSize: '0.7rem' }} />
                  <Chip size="small" label={`Inflam: ${foodAnalysis.derived_metrics.inflammatory_potential?.label || '-'}`} sx={{ fontSize: '0.7rem' }} />
                </Box>
              )}
              {foodAnalysis.explanation?.narrative && (
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.6 }}>{foodAnalysis.explanation.narrative}</Typography>
              )}
              {foodAnalysis.llm?.narrative && (
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.6, mt: 0.5 }}>{foodAnalysis.llm.narrative}</Typography>
              )}
            </Box>
          )}
        </Box>

        {/* SAVED TEMPLATES SECTION */}
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BookmarkIcon sx={{ color: '#6366f1' }} />
            Saved Templates
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Quickly load your favorite meal combinations.</Typography>
          
          {savedTemplatesLoading ? (
            <LinearProgress />
          ) : savedTemplates.length === 0 ? (
            <Typography variant="caption" sx={{ color: '#9ca3af', fontStyle: 'italic' }}>No templates saved yet.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflow: 'auto', pr: 0.5 }}>
              {savedTemplates.map((tpl) => (
                <Box 
                  key={tpl._id} 
                  sx={{ 
                    p: 1.5, 
                    borderRadius: 1.5, 
                    border: '1px solid #e5e7eb', 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: '#f5f3ff', borderColor: '#c4b5fd' }
                  }}
                  onClick={() => useTemplate(tpl)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#4338ca' }}>{tpl.name}</Typography>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl._id); }}>
                      <DeleteIcon sx={{ fontSize: '0.9rem', color: '#9ca3af' }} />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {tpl.foods.length} items · {Math.round(tpl.foods.reduce((s, f) => s + (f.calories || 0), 0))} kcal
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* FREQUENT MEALS (AUTO-CALCULATED) */}
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon sx={{ color: '#10b981' }} />
            Frequent Meals
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Auto-calculated from your last 60 days of logs.</Typography>
          
          {frequentMealsLoading ? (
            <LinearProgress />
          ) : frequentMeals.length === 0 ? (
            <Typography variant="caption" sx={{ color: '#9ca3af', fontStyle: 'italic' }}>Keep logging to see your trends here.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 300, overflow: 'auto', pr: 0.5 }}>
              {frequentMeals.map((tpl, idx) => (
                <Box 
                  key={`freq-${idx}`} 
                  sx={{ 
                    p: 1.5, 
                    borderRadius: 1.5, 
                    border: '1px solid #e5e7eb', 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: '#f0fdf4', borderColor: '#86efac' }
                  }}
                  onClick={() => useTemplate(tpl)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#059669' }}>{tpl.mealName}</Typography>
                    <Chip label={`${tpl.frequency}x`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#d1fae5', color: '#065f46', fontWeight: 700 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {tpl.foods?.length || 0} items · {Math.round(tpl.totalCalories || 0)} kcal
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* HYDRATION SECTION */}
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Hydration Tracking</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Log quick glasses or enter total consumption for today.</Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <WaterDropIcon sx={{ color: '#0ea5e9', fontSize: 32 }} />
            <Box sx={{ flexGrow: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Total Daily Water (ml)"
                placeholder="e.g. 2500"
                value={log?.totalWaterOverride ?? ''}
                onChange={(e) => handleTotalWaterChange(e.target.value)}
                helperText={log?.totalWaterOverride ? "Using this as ground truth for today" : "Incremental logs will be used if this is empty"}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

          <Box sx={{ opacity: log?.totalWaterOverride ? 0.5 : 1, pointerEvents: log?.totalWaterOverride ? 'none' : 'auto' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
              Quick Add (Incremental)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => handleWaterChange(250)} startIcon={<WaterDropIcon sx={{ fontSize: 15 }} />} fullWidth>+250 ml</Button>
              <Button size="small" variant="outlined" onClick={() => handleWaterChange(500)} startIcon={<WaterDropIcon sx={{ fontSize: 15 }} />} fullWidth>+500 ml</Button>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
               <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                 Currently logged: {log?.waterIntake || 0} ml
               </Typography>
               <Button size="small" onClick={() => handleWaterChange(-250)} sx={{ color: '#9ca3af', textTransform: 'none', fontSize: '0.75rem', minWidth: 0, p: 0 }}>
                 − Remove 250ml
               </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* RIGHT: Meal Builder */}
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Meal name"
            value={newMeal.name}
            onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
            size="small"
            fullWidth
            sx={{ flex: 2, minWidth: 200 }}
          />
          <TextField
            select
            label="Type"
            value={newMeal.mealType}
            onChange={(e) => setNewMeal({ ...newMeal, mealType: e.target.value })}
            SelectProps={{ native: true }}
            size="small"
            sx={{ flex: 1, minWidth: 120 }}
          >
            {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </TextField>
          <TextField
            type="time"
            label="Time"
            value={newMeal.time}
            onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ flex: 1, minWidth: 100 }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {newMeal.foods.map((food, idx) => (
          <Box key={idx} sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1.5, position: 'relative' }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Food Name"
                value={food.name}
                onChange={(e) => updateFoodField(idx, 'name', e.target.value)}
                size="small"
                fullWidth
              />
              <IconButton size="small" color="error" onClick={() => removeFoodRow(idx)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Qty"
                type="number"
                value={food.quantity}
                onChange={(e) => updateFoodField(idx, 'quantity', e.target.value)}
                size="small"
                sx={{ width: 100 }}
              />
              <TextField
                label="Unit"
                value={food.unit}
                onChange={(e) => updateFoodField(idx, 'unit', e.target.value)}
                size="small"
                sx={{ width: 100 }}
              />
              <TextField
                label="Calories"
                type="number"
                value={food.calories}
                onChange={(e) => updateFoodField(idx, 'calories', e.target.value)}
                size="small"
                sx={{ width: 100 }}
              />
            </Box>

            <ExpandableSection title="Detailed Nutrients (Click to edit)" defaultOpen={false}>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Macros</Typography>
                {renderNutrientInputs(food, idx, MACRO_FIELD_META)}
                
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mt: 2, display: 'block' }}>Minerals</Typography>
                {renderNutrientInputs(food, idx, MINERAL_FIELD_META)}

                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mt: 2, display: 'block' }}>Vitamins</Typography>
                {renderNutrientInputs(food, idx, VITAMIN_FIELD_META)}
              </Box>
            </ExpandableSection>
          </Box>
        ))}

        <Button 
          fullWidth 
          variant="outlined" 
          startIcon={<AddIcon />} 
          onClick={addFoodRow}
          sx={{ mb: 3, textTransform: 'none', borderColor: 'divider', color: 'text.secondary' }}
        >
          Add Food Row
        </Button>

        {/* Real-time Interaction Insights */}
        {(liveInsights?.synergies?.length > 0 || liveInsights?.antagonisms?.length > 0) && (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f0f9ff', borderRadius: 1.5, border: '1px solid #bae6fd' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 1 }}>
              <RestaurantIcon sx={{ fontSize: 18 }} />
              Real-time Interaction Engine
            </Typography>
            <Stack spacing={1}>
              {liveInsights.synergies.map((s, i) => (
                <Box key={`syn-${i}`}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#065f46', display: 'block' }}>{s.title} ({s.effect})</Typography>
                  <Typography variant="caption" sx={{ color: '#047857', display: 'block', lineHeight: 1.3 }}>{s.description}</Typography>
                </Box>
              ))}
              {liveInsights.antagonisms.map((a, i) => (
                <Box key={`ant-${i}`}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#b45309', display: 'block' }}>{a.title} ({a.effect})</Typography>
                  <Typography variant="caption" sx={{ color: '#92400e', display: 'block', lineHeight: 1.3 }}>{a.description}</Typography>
                  {a.fix && <Typography variant="caption" sx={{ color: '#78350f', fontWeight: 600, display: 'block', mt: 0.25 }}>Fix: {a.fix}</Typography>}
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        <TextField
          label="Meal notes"
          placeholder="How did you feel? Any specific symptoms?"
          value={newMeal.notes}
          onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
          multiline
          rows={2}
          fullWidth
          size="small"
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={addMealToDay}
            sx={{ bgcolor: 'text.primary', '&:hover': { bgcolor: 'text.secondary' }, py: 1.25, fontWeight: 700 }}
          >
            Log Meal to Today
          </Button>
          
          <Box sx={{ flexShrink: 0 }}>
            <ExpandableSection title="Save as Template" defaultOpen={false}>
              <Box sx={{ mt: 1, p: 2, border: '1px solid #e5e7eb', borderRadius: 1.5, bgcolor: 'action.hover', minWidth: 250 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Template Name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  sx={{ mb: 1.5 }}
                />
                <Button 
                  fullWidth 
                  variant="outlined" 
                  size="small" 
                  onClick={saveAsTemplate}
                  disabled={savingTemplate || !templateName.trim()}
                >
                  {savingTemplate ? 'Saving...' : 'Confirm Save'}
                </Button>
              </Box>
            </ExpandableSection>
          </Box>
        </Box>
      </Box>
    </Box>
    </Box>
  )
}

export default LogMealTab

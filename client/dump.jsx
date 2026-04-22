  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717' }}>
            Nutrition
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Log meals, macros, and hydration
          </Typography>
        </Box>
      </Box>

      {/* Date controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          p: 2.5,
          borderRadius: 2,
          bgcolor: '#fff',
          border: '1px solid #e5e7eb',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton size="small" onClick={() => changeDay(-1)}>
            <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Box>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              {selectedDate.toDateString() === new Date().toDateString() ? 'Today' : 'Selected day'}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {formatDate(selectedDate)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => changeDay(1)}>
            <ArrowForwardIosIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Button
            size="small"
            startIcon={<TodayIcon sx={{ fontSize: 16 }} />}
            onClick={goToday}
            sx={{ ml: 1, textTransform: 'none' }}
          >
            Today
          </Button>
        </Box>
        <Button
          variant="contained"
          onClick={saveDay}
          disabled={loading}
        >
          Save Day
        </Button>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, color: '#6b7280', '&.Mui-selected': { color: '#171717' } }, '& .MuiTabs-indicator': { bgcolor: '#171717' } }}
      >
        <Tab label="Daily View" />
        <Tab label="Add Meal" />
        <Tab label="Weight" />
        <Tab label="Summary" />
        <Tab label="Scan Product" />
        <Tab label="Insights" />
      </Tabs>

      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Meals list */}
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Meals
              </Typography>
              <Chip
                icon={<RestaurantIcon sx={{ fontSize: 16 }} />}
                label={`${fmt(totals.calories, 0)} kcal`}
                size="small"
                sx={{ bgcolor: '#f0fdf4', color: '#166534', borderRadius: 1 }}
              />
            </Box>

            {log.meals?.length === 0 && (
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                No meals logged yet for this day.
              </Typography>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {log.meals?.map((meal, idx) => {
                const mealTotals = meal.foods?.reduce(
                  (acc, f) => ({
                    calories: acc.calories + (f.calories || 0),
                    protein: acc.protein + (f.protein || 0),
                    carbs: acc.carbs + (f.carbs || 0),
                    fat: acc.fat + (f.fat || 0),
                  }),
                  { calories: 0, protein: 0, carbs: 0, fat: 0 }
                ) || { calories: 0, protein: 0, carbs: 0, fat: 0 }

                return (
                  <Box
                    key={idx}
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      border: '1px solid #e5e7eb',
                      bgcolor: '#f9fafb',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {meal.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={meal.mealType}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#e5e7eb' }}
                          />
                          {meal.time && (
                            <Typography variant="caption" sx={{ color: '#6b7280' }}>
                              {(() => {
                                const [h, m] = meal.time.split(':');
                                if (h === undefined || m === undefined) return meal.time;
                                let hour = parseInt(h, 10);
                                const min = m;
                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                hour = hour % 12;
                                if (hour === 0) hour = 12;
                                return `${hour}:${min} ${ampm}`;
                              })()}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {fmt(mealTotals.calories, 0)} kcal
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => startEditMeal(idx)}
                            sx={{ p: 0.25, color: '#3b82f6', '&:hover': { bgcolor: '#eff6ff' } }}
                            title="Edit meal"
                          >
                            <EditIcon sx={{ fontSize: '1.1rem' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(idx)}
                            sx={{ p: 0.25, color: '#ef4444', '&:hover': { bgcolor: '#fee2e2' } }}
                            title="Delete meal"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          P {fmt(mealTotals.protein)}g · C {fmt(mealTotals.carbs)}g · F {fmt(mealTotals.fat)}g
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {meal.foods?.map((food, i) => (
                        <Typography key={i} variant="caption" sx={{ color: '#6b7280' }}>
                          {food.name} {food.quantity ? `· ${food.quantity}${food.unit}` : ''}{' '}
                          {food.calories ? `· ${food.calories} kcal` : ''}
                        </Typography>
                      ))}
                    </Box>

                    {meal.notes && (
                      <Typography variant="caption" sx={{ color: '#9ca3af', mt: 0.5, display: 'block' }}>
                        {meal.notes}
                      </Typography>
                    )}
                  </Box>
                )
              })}
            </Box>

          </Box>
          {/* Detailed Breakdown & Insights */}
          <ExpandableSection title="Detailed Breakdown & Insights">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Clinical Targets */}
              <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1.5, border: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Clinical Targets</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>Calories</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{calorieTarget} kcal</Typography>
                    <LinearProgress variant="determinate" value={Math.min(percent(totals.calories, calorieTarget), 100)} sx={{ mt: 0.75, height: 4, borderRadius: 99 }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>Protein</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{proteinTarget} g</Typography>
                    <LinearProgress variant="determinate" value={Math.min(percent(totals.protein, proteinTarget), 100)} sx={{ mt: 0.75, height: 4, borderRadius: 99 }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>Hydration</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.waterIntake || 0} ml</Typography>
                    <LinearProgress variant="determinate" value={Math.min(percent(log.waterIntake || 0, 2500), 100)} sx={{ mt: 0.75, height: 4, borderRadius: 99 }} />
                  </Box>
                </Box>
              </Box>

              {/* Macro Split */}
              <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1.5, border: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Macronutrient Split</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>Protein</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(totals.protein)} g</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      {Math.round(((totals.protein * 4) / (totals.calories || 1)) * 100)}% of calories
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>Carbs</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(totals.carbs)} g</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      {Math.round(((totals.carbs * 4) / (totals.calories || 1)) * 100)}% of calories
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>Fat</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(totals.fat)} g</Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      {Math.round(((totals.fat * 9) / (totals.calories || 1)) * 100)}% of calories
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Detailed Nutrients */}
              <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1.5, border: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Key Nutrients</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                  {[...CORE_NUTRIENTS_META, ...HEALTH_PRIORITY_NUTRIENTS].map((nut) => {
                    const val = totals[nut.key] || 0
                    const tgt = clinicalTargets?.targets?.[nut.key] || 0
                    const pct = tgt > 0 ? Math.round((val / tgt) * 100) : 0
                    return (
                      <Box key={nut.key}>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.25 }}>{nut.label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {fmt(val)} <span style={{ fontWeight: 400, fontSize: '0.8em', color: '#9ca3af' }}>{nut.unit}</span>
                        </Typography>
                        {tgt > 0 && (
                          <>
                            <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>Target: {fmt(tgt)} {nut.unit}</Typography>
                            <LinearProgress variant="determinate" value={Math.min(pct, 100)} sx={{ mt: 0.5, height: 3, borderRadius: 99 }} />
                          </>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              </Box>

              {/* Daily Notes */}
              <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1.5, border: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Daily Notes</Typography>
                <TextField
                  placeholder="Any reflections, patterns, or notes about today's nutrition?"
                  value={log.nutritionNotes || ''}
                  onChange={(e) => setLog({ ...log, nutritionNotes: e.target.value })}
                  multiline
                  rows={3}
                  fullWidth
                  size="small"
                  onBlur={() => autoSaveLog()}
                />
              </Box>
            </Box>
          </ExpandableSection>
        </Box>
      )}

      {/* TAB 1: LOG MEAL */}
      {activeTab === 1 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.25fr' }, gap: 3, alignItems: 'start' }}>

          {/* LEFT: Search + Deep Analysis */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Search Food Database</Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>Find any dish or ingredient to auto-fill nutrition data.</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <TextField
                  placeholder="e.g. paneer tikka, dal, rice, tea"
                  value={foodSearchQuery}
                  onChange={(e) => {
                    setFoodSearchQuery(e.target.value)
                  }}
                  size="small"
                  fullWidth
                  InputProps={{
                    endAdornment: foodSearchLoading ? <Typography variant="caption" sx={{ color: '#6b7280' }}>Searching...</Typography> : null
                  }}
                />
              </Box>

              {!foodSearchLoading && foodSearchAttempted && foodResults.length === 0 && (
                <Typography variant="body2" sx={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', py: 2 }}>No item found</Typography>
              )}

              {foodResults.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, maxHeight: 300, overflow: 'auto', borderRadius: 1.5, border: '1px solid #e5e7eb', p: 0.75 }}>
                  {foodResults.map((f, idx) => (
                    <Box
                      key={f.id || idx}
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 1.25, borderRadius: 1.5, cursor: 'pointer', transition: 'background 0.1s', '&:hover': { bgcolor: '#f0fdf4' } }}
                      onClick={() => {
                        applyFoodResultToRow(f, newMeal.foods.length > 0 ? newMeal.foods.length - 1 : 0)
                        setSelectedFoodForAnalysis(String(f.name || ''))
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.name}</Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {formatServingDisplay(f.servingLabel || `${f.servingQty} ${f.servingUnit}`, f.servingWeightG)} · {Math.round(f.calories)} kcal
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', ml: 1, flexShrink: 0 }}>
                        <Typography variant="caption" sx={{ color: '#374151', display: 'block' }}>P {Math.round(f.protein)}g</Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>C {Math.round(f.carbs)}g · F {Math.round(f.fat)}g</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
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
                  {foodAnalysisLoading ? 'â€¦' : 'Analyze'}
                </Button>
                <Button size="small" variant="outlined" onClick={() => analyzeSelectedFood({ includeLLM: true })} disabled={foodAnalysisLoading} sx={{ whiteSpace: 'nowrap' }}>
                  + LLM
                </Button>
              </Box>
              {foodAnalysisError && <Typography variant="caption" sx={{ color: '#b91c1c', display: 'block', mb: 1 }}>{foodAnalysisError}</Typography>}
              {foodAnalysis && (
                <Box sx={{ borderRadius: 1.5, border: '1px solid #e5e7eb', bgcolor: '#f9fafb', p: 1.5, mt: 1 }}>
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
                    <Typography variant="caption" sx={{ display: 'block', color: '#374151', lineHeight: 1.6 }}>{foodAnalysis.explanation.narrative}</Typography>
                  )}
                  {foodAnalysis.llm?.narrative && (
                    <Typography variant="caption" sx={{ display: 'block', color: '#374151', lineHeight: 1.6, mt: 0.5 }}>{foodAnalysis.llm.narrative}</Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>

          {/* RIGHT: Meal Builder */}
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            {/* Removed 'Build Your Meal' and instructional text as requested */}

            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Meal name"
                value={newMeal.name}
                onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                size="small"
                sx={{ flex: 1, minWidth: 160 }}
                placeholder="e.g. Breakfast, Lunchâ€¦"
              />
              <TextField
                select
                label="Type"
                value={newMeal.mealType}
                onChange={(e) => setNewMeal({ ...newMeal, mealType: e.target.value })}
                size="small"
                SelectProps={{ native: true }}
                sx={{ minWidth: 130 }}
              >
                {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </TextField>
              <TextField
                label="Time"
                type="time"
                value={newMeal.time}
                onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
                size="small"
                sx={{ width: 140 }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }} // 5 min steps
              />
            </Box>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280', mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Foods</Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              {newMeal.foods.map((food, idx) => (
                <Box key={idx} sx={{ borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden', position: 'relative' }}>
                  <IconButton
                    size="small"
                    onClick={() => removeFoodRow(idx)}
                    sx={{ position: 'absolute', top: 4, right: 4, zIndex: 10, bgcolor: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                  {!!food.servingLabel && (
                    <Box sx={{ px: 1.5, py: 0.75, bgcolor: '#eff6ff', borderBottom: '1px solid #e0eaff' }}>
                      <Typography variant="caption" sx={{ color: '#1d4ed8' }}>
                        Base serving: {formatServingDisplay(food.servingLabel, food.servingWeightG)}
                        {food.baseServingQty && food.quantity && Number(food.quantity) !== Number(food.baseServingQty) && (
                          <> · You entered {food.quantity} {food.baseServingUnit} ({((Number(food.quantity) / Number(food.baseServingQty)) || 1).toFixed(2)}x serving)</>
                        )}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ p: 1.5, bgcolor: '#f9fafb', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <TextField
                      label="Food name"
                      value={food.name}
                      onChange={(e) => updateFoodField(idx, 'name', e.target.value)}
                      size="small"
                      sx={{ flex: 1, minWidth: 120 }}
                    />
                    <TextField
                      label={food.baseServingQty ? `Amount (${food.baseServingUnit || ''})` : 'Amount'}
                      value={food.quantity}
                      onChange={(e) => updateFoodField(idx, 'quantity', e.target.value)}
                      size="small"
                      sx={{ width: 90 }}
                      inputProps={{ inputMode: 'decimal' }}
                    />
                    <TextField
                      label="Unit"
                      value={food.baseServingUnit || food.unit || ''}
                      size="small"
                      sx={{ width: 100, bgcolor: '#f3f4f6', fontWeight: 600, color: '#222', borderRadius: 1 }}
                      InputProps={{ readOnly: true }}
                      inputProps={{ style: { textAlign: 'center', fontWeight: 600, color: '#222' } }}
                    />
                    <TextField
                      label="Total g"
                      value={food.baseServingQty && food.servingWeightG && food.quantity ?
                        ((Number(food.quantity) / Number(food.baseServingQty)) * Number(food.servingWeightG)).toFixed(0) : ''}
                      size="small"
                      sx={{ width: 80, bgcolor: '#f3f4f6', fontWeight: 600, color: '#222', borderRadius: 1 }}
                      InputProps={{ readOnly: true }}
                      inputProps={{ style: { textAlign: 'center', fontWeight: 700, color: '#374151' } }}
                    />
                    <TextField
                      label="kcal"
                      value={food.calories}
                      onChange={(e) => updateFoodField(idx, 'calories', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
                    <ExpandableSection title="Macros & fats" defaultOpen={false}>
                      {renderNutrientInputs({ food, index: idx, fields: MACRO_FIELD_META, updateFoodField })}
                    </ExpandableSection>
                    <ExpandableSection title="Minerals" defaultOpen={false}>
                      {renderNutrientInputs({ food, index: idx, fields: MINERAL_FIELD_META, updateFoodField })}
                    </ExpandableSection>
                    <ExpandableSection title="Vitamins" defaultOpen={false}>
                      {renderNutrientInputs({ food, index: idx, fields: VITAMIN_FIELD_META, updateFoodField })}
                    </ExpandableSection>
                  </Box>
                </Box>
              ))}
            </Box>

            <Button size="small" onClick={addFoodRow} sx={{ textTransform: 'none', mb: 2 }}>+ Add another food</Button>

            <TextField
              label="Meal notes (optional)"
              value={newMeal.notes}
              onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
              multiline
              minRows={2}
              fullWidth
              size="small"
              sx={{ mb: 2.5 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" size="small" onClick={resetNewMeal} sx={{ borderColor: '#e5e7eb', color: '#6b7280' }}>Clear</Button>
                {editingMealIndex !== null && (
                  <Button variant="outlined" size="small" onClick={cancelEdit} sx={{ borderColor: '#e5e7eb', color: '#6b7280' }}>Cancel Edit</Button>
                )}
              </Box>
              <Button
                variant="contained"
                onClick={() => { addMealToDay(); setActiveTab(0); }}
                disabled={!newMeal.name.trim()}
                sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, fontWeight: 700 }}
              >
                {editingMealIndex !== null ? `✓ Update ${newMeal.name}` : `Add to ${formatDate(selectedDate)}`}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {activeTab === 3 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 3 }}>
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Today's Details
            </Typography>

              {(!log?.meals || log.meals.length === 0) && (
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
                  No meals logged for this selected date yet.
                </Typography>
              )}

              {clinicalTargetsRequiresSetup && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#92400e' }}>
                    Clinical targets need setup. Complete Body + Clinical Profile to unlock personalized targets.
                  </Typography>
                  {clinicalTargetsMissingFields.length > 0 && (
                    <Typography variant="caption" sx={{ color: '#b45309', display: 'block', mt: 0.5 }}>
                      Debug missing fields: {clinicalTargetsMissingFields.join(', ')}
                    </Typography>
                  )}
                </Box>
              )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: '#374151' }}>
                    Calories
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {fmt(totals.calories, 0)} / {calorieTarget ? fmt(calorieTarget, 0) : '—'} kcal
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={percent(totals.calories, calorieTarget)}
                  sx={{ height: 8, borderRadius: 99, '& .MuiLinearProgress-bar': { bgcolor: '#16a34a' } }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: '#374151' }}>
                    Protein
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {fmt(totals.protein)} / {proteinTarget ? fmt(proteinTarget) : '—'} g
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={percent(totals.protein, proteinTarget)}
                  sx={{ height: 8, borderRadius: 99, '& .MuiLinearProgress-bar': { bgcolor: '#2563eb' } }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    Carbs
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {fmt(totals.carbs)} g
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    Fat
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {fmt(totals.fat)} g
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    Fiber
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {fmt(totals.fiber)} g
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <ExpandableSection title="Detailed Nutrients (Vitamins & Minerals)" defaultOpen={false}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mt: 2 }}>
                  {SUMMARY_MICRO_META.map(({ key, label, unit }) => (
                    <Box key={key}>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>{label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {Number(totals?.[key] || 0).toFixed(unit === 'ug' ? 0 : 1)} {unit}
                      </Typography>
                      {(() => {
                        const targetKey = MICRO_TO_TARGET_KEY[key]
                        const target = targetKey ? Number(microTargetLookup?.[targetKey]) : NaN
                        const hasTarget = Number.isFinite(target) && target > 0
                        return (
                          <>
                            <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.25 }}>
                              {hasTarget
                                ? `Target ${target.toFixed(unit === 'ug' ? 0 : 1)} ${unit}`
                                : 'Target unavailable'}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={hasTarget ? percent(Number(totals?.[key] || 0), target) : 0}
                              sx={{
                                mt: 0.5,
                                height: 5,
                                borderRadius: 99,
                                bgcolor: '#f3f4f6',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: hasTarget ? '#10b981' : '#d1d5db',
                                },
                              }}
                            />
                          </>
                        )
                      })()}
                    </Box>
                  ))}
                </Box>
              </ExpandableSection>

              {clinicalTargetRows.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Clinical Targets
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    {clinicalTargetRows.map((row) => (
                      <Box key={row.key}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>{row.label}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {Number(row.currentValue || 0).toFixed(row.unit === 'kcal' ? 0 : 1)} / {Number(row.targetValue || 0).toFixed(row.unit === 'kcal' ? 0 : 1)} {row.unit}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percent(row.currentValue, row.targetValue)}
                          sx={{ height: 6, borderRadius: 99, bgcolor: '#f3f4f6' }}
                        />
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Macro Split (by calories)
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Chip
                  icon={<LocalDiningIcon sx={{ fontSize: 16 }} />}
                  label={`Protein ${Math.round((macroCalories.protein / totalMacroCalories) * 100)}%`}
                  size="small"
                  sx={{ bgcolor: '#eff6ff', color: '#1d4ed8' }}
                />
                <Chip
                  icon={<LocalDiningIcon sx={{ fontSize: 16 }} />}
                  label={`Carbs ${Math.round((macroCalories.carbs / totalMacroCalories) * 100)}%`}
                  size="small"
                  sx={{ bgcolor: '#fef9c3', color: '#854d0e' }}
                />
                <Chip
                  icon={<LocalDiningIcon sx={{ fontSize: 16 }} />}
                  label={`Fat ${Math.round((macroCalories.fat / totalMacroCalories) * 100)}%`}
                  size="small"
                  sx={{ bgcolor: '#fee2e2', color: '#b91c1c' }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                Based on logged macros. Calories from alcohol or unlogged foods are not included.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Trends (server)
              </Typography>

              {nutritionStatsLoading && <LinearProgress sx={{ height: 6, borderRadius: 99, mb: 1 }} />}

              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                7d avg: {nutritionStats?.weeklyAvg?.calories ?? '—'} kcal · P {nutritionStats?.weeklyAvg?.protein ?? '—'}g · Water {nutritionStats?.weeklyAvg?.water ?? '—'} ml
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                30d avg: {nutritionStats?.monthlyAvg?.calories ?? '—'} kcal · P {nutritionStats?.monthlyAvg?.protein ?? '—'}g · Water {nutritionStats?.monthlyAvg?.water ?? '—'} ml
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.5 }}>
                Days logged: 7d {nutritionStats?.weeklyAvg?.daysLogged ?? '—'} · 30d {nutritionStats?.monthlyAvg?.daysLogged ?? '—'} · 30d range {rangeDaysLogged ?? '—'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Notes
            </Typography>
            <TextField
              multiline
              minRows={6}
              value={log.notes || ''}
              onChange={(e) => {
                let updatedLog = null
                setLog(prev => {
                  updatedLog = {
                    ...prev,
                    notes: e.target.value
                  }
                  return updatedLog
                })
                if (updatedLog) autoSaveLog(updatedLog)
              }}
              fullWidth
            />
          </Box>
        </Box>
      )}

      {activeTab === 3 && (
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Nutrition Summary</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
            Weekly and monthly nutrient consumption vs total required amount for each period.
          </Typography>

          {periodSummaryLoading && <LinearProgress sx={{ mb: 2 }} />}

          {['Weekly', 'Monthly'].map((period) => {
            const totalsForPeriod = period === 'Weekly' ? weeklyTotals : monthlyTotals
            const days = period === 'Weekly' ? 7 : 30
            const targets = clinicalTargets?.targets || {}
            const micros = targets?.micronutrients || {}

            const rowMap = new Map()

            Object.entries(TARGET_KEY_TO_TOTAL_KEY).forEach(([targetKey, totalKey]) => {
              const perDay = (targetKey in targets) ? targets[targetKey] : micros[targetKey]
              const required = Number(perDay) * days
              const consumed = Number(totalsForPeriod?.[totalKey] || 0)
              const unit =
                targetKey === 'calories' ? 'kcal' :
                targetKey === 'omega3' ? 'mg' :
                ['vitaminD', 'vitaminA', 'folate', 'selenium'].includes(targetKey) ? 'ug' :
                ['protein', 'fat', 'carbs', 'fiber', 'sugar'].includes(targetKey) ? 'g' : 'mg'
              const label = targetKey.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
              rowMap.set(totalKey, {
                key: `${period}-${targetKey}`,
                label,
                consumed,
                required: Number.isFinite(required) && required > 0 ? required : null,
                unit,
              })
            })

            SUMMARY_MICRO_META.forEach(({ key, label, unit }) => {
              if (rowMap.has(key)) return
              const targetKey = MICRO_TO_TARGET_KEY[key]
              const perDay = targetKey ? micros[targetKey] : null
              const required = Number(perDay) * days
              const consumed = Number(totalsForPeriod?.[key] || 0)
              rowMap.set(key, {
                key: `${period}-micro-${key}`,
                label,
                consumed,
                required: Number.isFinite(required) && required > 0 ? required : null,
                unit,
              })
            })

            const rows = Array.from(rowMap.values())

            return (
              <Box key={period} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{period}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  {rows.map((row) => (
                    <Box key={row.key}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>{row.label}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {fmt(row.consumed, row.unit === 'kcal' ? 0 : 1)} / {row.required == null ? '—' : fmt(row.required, row.unit === 'kcal' ? 0 : 1)} {row.unit}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={row.required == null ? 0 : percent(row.consumed, row.required)}
                        sx={{
                          height: 6,
                          borderRadius: 99,
                          bgcolor: '#f3f4f6',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: row.required == null ? '#d1d5db' : '#2563eb',
                          },
                        }}
                      />
                      {row.required == null && (
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>Target unavailable</Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )
          })}

          {!clinicalTargets?.targets && (
            <Typography variant="body2" sx={{ color: '#92400e' }}>
              Clinical targets are required to compute weekly/monthly requirement bars.
            </Typography>
          )}
        </Box>
      )}

      {activeTab === 4 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, gap: 3 }}>
          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Scan Product Barcode</Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
              Scan with camera or enter barcode manually to fetch product details and nutrient values.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <TextField
                label="Barcode"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                size="small"
                sx={{ minWidth: 220, flex: 1 }}
                placeholder="e.g. 8901030865432"
              />
              <Button
                variant="contained"
                onClick={() => lookupBarcode(barcodeInput)}
                disabled={barcodeLookupLoading}
              >
                {barcodeLookupLoading ? 'Looking up...' : 'Lookup'}
              </Button>
              <Button
                variant="outlined"
                onClick={startBarcodeScanner}
                disabled={!supportsBarcodeDetector || scannerOpen}
              >
                Open Camera
              </Button>
              <Button
                variant="outlined"
                component="label"
                disabled={!supportsBarcodeDetector || scanBusy}
              >
                Upload Barcode Image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) scanUploadedBarcodeImage(file)
                    e.target.value = ''
                  }}
                />
              </Button>
            </Box>

            {scannerOpen && (
              <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 1.5, mb: 2 }}>
                <Box
                  component="video"
                  ref={scanVideoRef}
                  muted
                  playsInline
                  sx={{ width: '100%', maxHeight: 320, borderRadius: 1, bgcolor: '#111827' }}
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button variant="contained" onClick={scanBarcodeFrame} disabled={scanBusy}>
                    {scanBusy ? 'Scanning...' : 'Scan Frame'}
                  </Button>
                  <Button variant="outlined" onClick={stopBarcodeScanner}>Close Camera</Button>
                </Box>
              </Box>
            )}

            {!!uploadedBarcodePreview && (
              <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 1.5, mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
                  Uploaded image preview
                </Typography>
                <Box
                  component="img"
                  src={uploadedBarcodePreview}
                  alt="Uploaded barcode"
                  sx={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 1, bgcolor: '#f9fafb' }}
                />
              </Box>
            )}

            {barcodeLookupError && (
              <Typography variant="body2" sx={{ color: '#b91c1c' }}>{barcodeLookupError}</Typography>
            )}

            {!supportsBarcodeDetector && (
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                Camera scanning is unavailable in this browser. Manual barcode lookup still works.
              </Typography>
            )}
          </Box>

          <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Product Details</Typography>

            {!barcodeProduct && (
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Lookup a barcode to view product info and nutrients per 100 g.
              </Typography>
            )}

            {barcodeProduct && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {barcodeProduct?.imageUrl && (
                  <Box
                    component="img"
                    src={barcodeProduct.imageUrl}
                    alt={barcodeProduct.name || 'Product image'}
                    sx={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 1, border: '1px solid #e5e7eb', bgcolor: '#fff' }}
                  />
                )}
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{barcodeProduct.name}</Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  Brand: {barcodeProduct.brand || '—'} · Barcode: {barcodeProduct.barcode || '—'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  Qty: {barcodeProduct.quantityLabel || '—'} · Serving: {barcodeProduct.servingSize || '—'}
                </Typography>

                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 700, letterSpacing: '0.03em' }}>
                  Nutrients (per 100 g)
                </Typography>

                {[
                  ['Calories', `${Number(barcodeProduct?.nutrimentsPer100g?.caloriesKcal || 0).toFixed(0)} kcal`],
                  ['Protein', `${Number(barcodeProduct?.nutrimentsPer100g?.proteinG || 0).toFixed(1)} g`],
                  ['Carbs', `${Number(barcodeProduct?.nutrimentsPer100g?.carbsG || 0).toFixed(1)} g`],
                  ['Fat', `${Number(barcodeProduct?.nutrimentsPer100g?.fatG || 0).toFixed(1)} g`],
                  ['Fiber', `${Number(barcodeProduct?.nutrimentsPer100g?.fiberG || 0).toFixed(1)} g`],
                  ['Sugar', `${Number(barcodeProduct?.nutrimentsPer100g?.sugarG || 0).toFixed(1)} g`],
                  ['Sodium', `${Number(barcodeProduct?.nutrimentsPer100g?.sodiumMg || 0).toFixed(0)} mg`],
                  ['Potassium', `${Number(barcodeProduct?.nutrimentsPer100g?.potassiumMg || 0).toFixed(0)} mg`],
                  ['Calcium', `${Number(barcodeProduct?.nutrimentsPer100g?.calciumMg || 0).toFixed(0)} mg`],
                  ['Iron', `${Number(barcodeProduct?.nutrimentsPer100g?.ironMg || 0).toFixed(2)} mg`],
                  ['Vitamin C', `${Number(barcodeProduct?.nutrimentsPer100g?.vitaminCMg || 0).toFixed(2)} mg`],
                  ['Vitamin B12', `${Number(barcodeProduct?.nutrimentsPer100g?.vitaminB12Ug || 0).toFixed(2)} ug`],
                  ['Vitamin D', `${Number(barcodeProduct?.nutrimentsPer100g?.vitaminDUg || 0).toFixed(2)} ug`],
                  ['Omega-3', `${Number(barcodeProduct?.nutrimentsPer100g?.omega3G || 0).toFixed(3)} g`],
                ].map(([label, value]) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', py: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#374151' }}>{label}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#171717' }}>
                Daily weight
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Log your weight for the selected day and view trends.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant={weightRangeMode === 'week' ? 'contained' : 'outlined'}
                onClick={() => setWeightRangeMode('week')}
                sx={{ textTransform: 'none' }}
              >
                Week
              </Button>
              <Button
                variant={weightRangeMode === 'month' ? 'contained' : 'outlined'}
                onClick={() => setWeightRangeMode('month')}
                sx={{ textTransform: 'none' }}
              >
                Month
              </Button>
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Weight (kg)"
              type="number"
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 180 } }}
            />
            <Button variant="contained" onClick={saveWeight} disabled={weightSaving || weightLoading}>
              {weightSaving ? 'Saving…' : 'Save Weight'}
            </Button>
            {weightError ? (
              <Typography variant="body2" sx={{ color: '#b91c1c' }}>
                {weightError}
              </Typography>
            ) : null}
          </Box>

          {weightLoading ? (
            <LinearProgress />
          ) : (
            (() => {
              const end = new Date(selectedDate)
              end.setHours(23, 59, 59, 999)
              const start = new Date(end)
              const days = weightRangeMode === 'month' ? 30 : 7
              start.setDate(start.getDate() - days + 1)
              start.setHours(0, 0, 0, 0)
              const chart = buildWeightChart({ start, end, days, series: weightSeries })

              const fmt = (d) =>
                d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const startLabel = fmt(start)
              const endLabel = fmt(end)

              return (
                <Box>
                  <Box sx={{ width: '100%', overflowX: 'auto' }}>
                    <Box sx={{ minWidth: 560 }}>
                      <svg
                        width="560"
                        height="200"
                        viewBox="0 0 560 200"
                        role="img"
                        aria-label="Weight chart"
                      >
                        <rect x="0" y="0" width="560" height="200" fill="#ffffff" />

                        {(() => {
                          const d = chart.dims
                          if (!d) return null

                          const yMin = chart.min
                          const yMax = chart.max
                          const yMid = yMin != null && yMax != null ? (yMin + yMax) / 2 : null

                          const fmtKg = (v) => (typeof v === 'number' ? `${v.toFixed(1)} kg` : '')

                          return (
                            <>
                              {/* axes */}
                              <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke="#e5e7eb" strokeWidth="1" />
                              <line x1={d.x0} y1={d.y0} x2={d.x0} y2={d.y1} stroke="#e5e7eb" strokeWidth="1" />

                              {/* y ticks (max/mid/min) */}
                              <line x1={d.x0} y1={d.y0} x2={d.x1} y2={d.y0} stroke="#f3f4f6" strokeWidth="1" />
                              <line
                                x1={d.x0}
                                y1={(d.y0 + d.y1) / 2}
                                x2={d.x1}
                                y2={(d.y0 + d.y1) / 2}
                                stroke="#f3f4f6"
                                strokeWidth="1"
                              />
                              <line x1={d.x0} y1={d.y1} x2={d.x1} y2={d.y1} stroke="#f3f4f6" strokeWidth="1" />

                              <text x={d.x0 - 8} y={d.y0 + 3} fontSize="10" fill="#6b7280" textAnchor="end">
                                {fmtKg(yMax)}
                              </text>
                              <text
                                x={d.x0 - 8}
                                y={(d.y0 + d.y1) / 2 + 3}
                                fontSize="10"
                                fill="#9ca3af"
                                textAnchor="end"
                              >
                                {fmtKg(yMid)}
                              </text>
                              <text x={d.x0 - 8} y={d.y1 + 3} fontSize="10" fill="#6b7280" textAnchor="end">
                                {fmtKg(yMin)}
                              </text>

                              {/* axis titles */}
                              <text x={(d.x0 + d.x1) / 2} y={200 - 8} fontSize="10" fill="#6b7280" textAnchor="middle">
                                Date
                              </text>
                              <text
                                x="14"
                                y={(d.y0 + d.y1) / 2}
                                fontSize="10"
                                fill="#6b7280"
                                textAnchor="middle"
                                transform={`rotate(-90 14 ${(d.y0 + d.y1) / 2})`}
                              >
                                Weight (kg)
                              </text>

                              {/* x tick labels */}
                              <text x={d.x0} y={200 - 22} fontSize="10" fill="#6b7280" textAnchor="start">
                                {startLabel}
                              </text>
                              <text x={d.x1} y={200 - 22} fontSize="10" fill="#6b7280" textAnchor="end">
                                {endLabel}
                              </text>

                              {chart.points ? (
                                <polyline fill="none" stroke="#171717" strokeWidth="2" points={chart.points} />
                              ) : null}
                            </>
                          )
                        })()}
                      </svg>
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ color: '#6b7280', mt: 1 }}>
                    {chart.points ? 'Showing logged days only (gaps are days without entries).' : 'No weight entries yet for this range.'}
                  </Typography>
                </Box>
              )
            })()
          )}
        </Box>
      )}

      {activeTab === 5 && (
        <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          <NutritionInsights selectedDate={selectedDate} />
        </Box>
      )}

      {/* Toast Notification */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseToast} severity={toastSeverity} sx={{ width: '100%' }}>
          {toastMessage}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>
          Delete Meal?
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {log.meals?.[mealToDelete] && (
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Are you sure you want to delete "{log.meals[mealToDelete].name}"? This action cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleCancelDelete} sx={{ borderColor: '#e5e7eb' }} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained" 
            sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#991b1b' } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default NutritionTracker

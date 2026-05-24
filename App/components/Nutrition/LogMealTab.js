import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { Search, Zap, Camera, Mic, ChevronRight, Utensils, Plus, X, Clock } from 'lucide-react-native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function LogMealTab({ onMealLogged, currentMeals = [], COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY }) {
  const { user } = useAuth();
  const [aiInput, setAiInput] = useState('');
  
  const changeMealType = (type) => {
    setSelectedMealType(type);
    const scheduled = user?.mealSchedule?.[type];
    if (scheduled) {
      setCustomTime(scheduled);
    } else {
      // Sensible defaults if no user schedule is set
      const defaults = { breakfast: '08:30', lunch: '13:00', dinner: '19:30', snack: '' };
      const d = defaults[type];
      if (d) {
        setCustomTime(d);
      } else {
        setCustomTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }));
      }
    }
  };

  const handleTimeChange = (val) => {
    setCustomTime(val);
    // Auto-detect meal type if time looks like HH:mm
    if (/^\d{1,2}:\d{2}$/.test(val)) {
       const hour = parseInt(val.split(':')[0]);
       if (hour >= 5 && hour < 11) setSelectedMealType('breakfast');
       else if (hour >= 11 && hour < 17) setSelectedMealType('lunch');
       else if (hour >= 17 && hour < 23) setSelectedMealType('dinner');
       else setSelectedMealType('snack');
    }
  };

  const detectMealType = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 17) return 'lunch';
    if (hour >= 17 && hour < 23) return 'dinner';
    return 'snack';
  };

  const [selectedMealType, setSelectedMealType] = useState(detectMealType());
  const [customTime, setCustomTime] = useState('');

  const getEffectiveTime = () => {
    if (customTime) return customTime;
    const scheduled = user?.mealSchedule?.[selectedMealType];
    if (scheduled) return scheduled;
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Qty Modal State
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // External Search State
  const [externalResults, setExternalResults] = useState([]);
  const [isExternalLoading, setIsExternalLoading] = useState(false);
  const [addingToDbId, setAddingToDbId] = useState(null);
  const [isWaterLoading, setIsWaterLoading] = useState(false);

  // Manual Entry State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualFood, setManualFood] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    servingQty: '1',
    servingUnit: 'serving'
  });

  const handleAiLog = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    try {
      const analysisRes = await api.post('/nutrition/food/analyze', { 
        foodName: aiInput,
        includeLLM: true 
      });
      
      const analysis = analysisRes.data;
      if (!analysis) throw new Error('Analysis failed');

      // Extract nutrients robustly from the complex pipeline response
      const inputs = analysis.derived_metrics?.inputs || {};
      const resolver = analysis.resolver || {};
      const dish = analysis.dish_breakdown?.nutrition || {};
      
      const calories = inputs.calories || dish.calories_kcal || 0;
      const protein = inputs.protein || dish.protein_g || 0;
      const carbs = inputs.carbs || dish.carbs_g || 0;
      const fat = inputs.fat || dish.fat_g || 0;
      const fiber = inputs.fiber || dish.fiber_g || 0;
      const sugar = inputs.sugar || dish.sugar_g || 0;

      if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
        Alert.alert('Analysis Limited', "AI couldn't find specific nutrition data for that description. Try being more specific (e.g. 'One large apple' instead of just 'apple').");
        setIsAiLoading(false);
        return;
      }

      const foodItem = {
        name: resolver.normalized || resolver.input || aiInput,
        displayName: resolver.normalized || resolver.input || aiInput,
        calories, protein, carbs, fat, fiber, sugar,
        sodium: inputs.sodium || dish.sodium_mg || 0,
        potassium: inputs.potassium || dish.potassium_mg || 0,
        iron: inputs.iron || dish.iron_mg || 0,
        calcium: inputs.calcium || dish.calcium_mg || 0,
        magnesium: inputs.magnesium || dish.magnesium_mg || 0,
        zinc: inputs.zinc || dish.zinc_mg || 0,
        vitaminC: inputs.vitaminC || dish.vitaminC_mg || 0,
        omega3: inputs.omega3 || dish.omega3_g || 0,
        brand: 'AI Estimated',
        isAiResult: true,
        servingUnit: 'g',
        servingQty: 100
      };

      setSelectedItem(foodItem);
      setQuantity('1');
      setShowQtyModal(true);
      setAiInput('');
    } catch (err) {
      console.error('AI Log error', err);
      Alert.alert('Error', 'AI analysis failed. Try searching or manual entry.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchLoading(true);
    setExternalResults([]); // Clear previous external results
    try {
      const res = await api.get(`/nutrition/search?q=${searchQuery}`);
      setSearchResults(res.data || []);
      
      // If no local results, automatically suggest external search
      if ((res.data || []).length === 0) {
        handleExternalSearch(searchQuery);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleExternalSearch = async (query = searchQuery) => {
    if (!query.trim()) return;
    setIsExternalLoading(true);
    try {
      const res = await api.get(`/nutrition/external/search?q=${encodeURIComponent(query)}`);
      setExternalResults(res.data || []);
    } catch (err) {
      console.error('External search failed', err);
    } finally {
      setIsExternalLoading(false);
    }
  };

  const handleAddToDb = async (food) => {
    setAddingToDbId(food.id);
    try {
      await api.post('/nutrition/external/add', { food });
      Alert.alert('Success', `"${food.displayName}" added to your local database!`);
      // Refresh local search to show the new item
      handleSearch();
    } catch (err) {
      console.error('Add to DB failed', err);
      Alert.alert('Error', 'Failed to add food to database.');
    } finally {
      setAddingToDbId(null);
    }
  };

  const handleWaterChange = async (increment) => {
    setIsWaterLoading(true);
    try {
      await api.patch('/nutrition/water', { 
        date: new Date().toISOString().split('T')[0],
        increment 
      });
      if (onMealLogged) onMealLogged();
      if (Haptics && Haptics.notificationAsync) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Water log error', err);
      Alert.alert('Error', 'Failed to log water.');
    } finally {
      setIsWaterLoading(false);
    }
  };

  const handleLogFood = (item) => {
    setSelectedItem(item);
    setQuantity('1');
    
    // Initialize customTime with the best default so it's stable for editing
    const scheduled = user?.mealSchedule?.[selectedMealType];
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    setCustomTime(scheduled || now);
    
    setShowQtyModal(true);
  };

  const handleManualSubmit = async () => {
    if (!manualFood.name || !manualFood.calories) {
      Alert.alert('Required Fields', 'Please enter at least a name and calories.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalTime = customTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
      const newMeal = {
        name: manualFood.name,
        mealType: selectedMealType,
        time: finalTime,
        foods: [{
          name: manualFood.name,
          calories: parseFloat(manualFood.calories) || 0,
          protein: parseFloat(manualFood.protein) || 0,
          carbs: parseFloat(manualFood.carbs) || 0,
          fat: parseFloat(manualFood.fat) || 0,
          quantity: parseFloat(manualFood.servingQty) || 1,
          unit: manualFood.servingUnit || 'serving'
        }]
      };

      const updatedMeals = [...currentMeals, newMeal];
      await api.post('/nutrition/logs', { 
        date: new Date().toISOString().split('T')[0],
        meals: updatedMeals
      });

      setShowManualModal(false);
      setManualFood({ name: '', calories: '', protein: '', carbs: '', fat: '', servingQty: '1', servingUnit: 'serving' });
      Alert.alert('Success', `Logged: ${manualFood.name}`);
      if (onMealLogged) onMealLogged();
    } catch (err) {
      console.error('Manual log error', err);
      Alert.alert('Error', 'Failed to log manual entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLog = async () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const NUTRIENT_FIELDS = [
        'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar',
        'sodium', 'potassium', 'iron', 'calcium', 'vitaminB', 'magnesium', 'zinc', 'vitaminC',
        'omega3', 'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'cholesterol',
        'phosphorus', 'copper', 'selenium', 'manganese', 'vitaminA', 'vitaminE',
        'vitaminD', 'vitaminB1', 'vitaminB2', 'vitaminB3', 'vitaminB5', 'vitaminB6',
        'vitaminB7', 'vitaminB9', 'vitaminB12', 'folate'
      ];

      const scaledFood = {
        name: selectedItem.displayName || selectedItem.name,
        quantity: qty,
        unit: selectedItem.servingUnit || 'serving',
        brand: selectedItem.brand,
      };

      NUTRIENT_FIELDS.forEach(field => {
        if (selectedItem[field] !== undefined) {
          scaledFood[field] = (Number(selectedItem[field]) || 0) * qty;
        }
      });

      const newMeal = {
        name: selectedItem.displayName || selectedItem.name,
        mealType: selectedMealType,
        time: getEffectiveTime(),
        foods: [scaledFood]
      };

      const updatedMeals = [...currentMeals, newMeal];
      await api.post('/nutrition/logs', { 
        date: new Date().toISOString().split('T')[0],
        meals: updatedMeals
      });

      setShowQtyModal(false);
      Alert.alert('Success', `Logged ${qty} ${selectedItem.servingUnit || 'serving'}(s) of ${selectedItem.displayName || selectedItem.name}`);
      if (onMealLogged) onMealLogged();
    } catch (err) {
      console.error('Log food error', err);
      Alert.alert('Error', 'Failed to log food item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={themedStyles.container}>
        {/* Manual Search Section */}
        <View style={themedStyles.searchSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={themedStyles.sectionTitle}>Search Food</Text>
            <TouchableOpacity onPress={() => setShowManualModal(true)}>
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>+ Manual Entry</Text>
            </TouchableOpacity>
          </View>
          <View style={themedStyles.searchBar}>
            <Search size={20} color={COLORS.textSecondary} />
            <TextInput
              style={themedStyles.searchInput}
              placeholder="Search for food, brands, etc..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              placeholderTextColor={COLORS.textSecondary}
            />
            {isSearchLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>

          {searchResults.length > 0 && (
            <View style={themedStyles.resultsList}>
              {searchResults.map((item, idx) => (
                <TouchableOpacity key={idx} style={themedStyles.resultItem} onPress={() => handleLogFood(item)}>
                  <Utensils size={18} color={COLORS.textSecondary} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={themedStyles.resultName}>{item.displayName || item.name}</Text>
                    <Text style={themedStyles.resultMeta}>{Math.round(item.calories)} kcal • {item.protein}g P • {item.brand || 'Standard'}</Text>
                  </View>
                  <Plus size={18} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* External Search Results */}
          {(externalResults.length > 0 || isExternalLoading) && (
            <View style={[themedStyles.resultsList, { marginTop: 24 }]}>
              <Text style={[themedStyles.sectionTitle, { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 }]}>GLOBAL DATABASE & AI RESULTS</Text>
              {isExternalLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 10 }} />}
              {externalResults.map((item, idx) => (
                <View key={idx} style={[themedStyles.resultItem, { backgroundColor: COLORS.gray100 }]}>
                  <Zap size={18} color={COLORS.primary} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={themedStyles.resultName}>{item.displayName}</Text>
                    <Text style={themedStyles.resultMeta}>{item.calories} kcal • {item.source || 'AI'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      style={[themedStyles.miniBtn, { borderColor: COLORS.primary, borderWidth: 1 }]} 
                      onPress={() => handleAddToDb(item)}
                      disabled={addingToDbId === item.id}
                    >
                      {addingToDbId === item.id ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: 'bold' }}>ADD DB</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[themedStyles.miniBtn, { backgroundColor: COLORS.primary }]} onPress={() => handleLogFood(item)}>
                      <Plus size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {searchQuery.trim() !== '' && !isSearchLoading && searchResults.length === 0 && !isExternalLoading && externalResults.length === 0 && (
            <TouchableOpacity style={themedStyles.externalSearchBtn} onPress={() => handleExternalSearch()}>
              <Search size={18} color={COLORS.primary} />
              <Text style={themedStyles.externalSearchText}>Search Global Database (AI)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* AI Logging Section */}
        <View style={themedStyles.aiSection}>
          <Text style={themedStyles.sectionTitle}>AI Magic Log</Text>
          <Text style={themedStyles.sectionSubtitle}>Describe your meal naturally (e.g., "Two eggs and a slice of toast")</Text>
          <View style={themedStyles.aiInputContainer}>
            <TextInput
              style={themedStyles.aiInput}
              multiline
              placeholder="What did you eat?"
              value={aiInput}
              onChangeText={setAiInput}
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={themedStyles.aiActions}>
              <TouchableOpacity style={themedStyles.iconBtn}><Mic size={20} color={COLORS.textSecondary} /></TouchableOpacity>
              <TouchableOpacity style={themedStyles.iconBtn}><Camera size={20} color={COLORS.textSecondary} /></TouchableOpacity>
              <TouchableOpacity 
                style={[themedStyles.logBtn, !aiInput.trim() && { opacity: 0.5 }]} 
                onPress={handleAiLog}
                disabled={isAiLoading || !aiInput.trim()}
              >
                {isAiLoading ? <ActivityIndicator size="small" color={COLORS.primaryContrast} /> : <Text style={themedStyles.logBtnText}>Log with AI</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={themedStyles.modalOverlay}>
          <View style={[themedStyles.modalContent, { maxHeight: '80%' }]}>
            <View style={themedStyles.modalHeader}>
              <Text style={themedStyles.modalTitle}>Manual Log</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Smart Meal Type Selector */}
              <View style={{ marginBottom: 20 }}>
                <Text style={themedStyles.formLabel}>Meal Type</Text>
                <View style={themedStyles.typeRow}>
                  {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
                    <TouchableOpacity 
                      key={type} 
                      onPress={() => changeMealType(type)}
                      style={[themedStyles.typeBtn, selectedMealType === type && { backgroundColor: COLORS.primary }]}
                    >
                      <Text style={[themedStyles.typeBtnText, selectedMealType === type && { color: COLORS.primaryContrast }]}>{type.charAt(0).toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Time Selector */}
              <View style={[themedStyles.formGroup, { marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Clock size={14} color={COLORS.textSecondary} />
                  <Text style={themedStyles.formLabel}>Time</Text>
                </View>
                <TextInput
                  style={themedStyles.formInput}
                  value={customTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  onChangeText={handleTimeChange}
                  placeholder="08:00"
                />
              </View>

              <View style={themedStyles.formGroup}>
                <Text style={themedStyles.formLabel}>Food Name</Text>
                <TextInput
                  style={themedStyles.formInput}
                  value={manualFood.name}
                  onChangeText={(val) => setManualFood(prev => ({ ...prev, name: val }))}
                  placeholder="e.g. Grandma's Apple Pie"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[themedStyles.formGroup, { flex: 1 }]}>
                  <Text style={themedStyles.formLabel}>Calories (kcal)</Text>
                  <TextInput
                    style={themedStyles.formInput}
                    keyboardType="numeric"
                    value={manualFood.calories}
                    onChangeText={(val) => setManualFood(prev => ({ ...prev, calories: val }))}
                  />
                </View>
                <View style={[themedStyles.formGroup, { flex: 1 }]}>
                  <Text style={themedStyles.formLabel}>Protein (g)</Text>
                  <TextInput
                    style={themedStyles.formInput}
                    keyboardType="numeric"
                    value={manualFood.protein}
                    onChangeText={(val) => setManualFood(prev => ({ ...prev, protein: val }))}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[themedStyles.formGroup, { flex: 1 }]}>
                  <Text style={themedStyles.formLabel}>Carbs (g)</Text>
                  <TextInput
                    style={themedStyles.formInput}
                    keyboardType="numeric"
                    value={manualFood.carbs}
                    onChangeText={(val) => setManualFood(prev => ({ ...prev, carbs: val }))}
                  />
                </View>
                <View style={[themedStyles.formGroup, { flex: 1 }]}>
                  <Text style={themedStyles.formLabel}>Fat (g)</Text>
                  <TextInput
                    style={themedStyles.formInput}
                    keyboardType="numeric"
                    value={manualFood.fat}
                    onChangeText={(val) => setManualFood(prev => ({ ...prev, fat: val }))}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[themedStyles.modalSubmitBtn, { marginTop: 16 }]} 
                onPress={handleManualSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={themedStyles.modalSubmitText}>Save & Log Entry</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quantity Modal */}
      <Modal
        visible={showQtyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQtyModal(false)}
      >
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.modalContent}>
            <View style={themedStyles.modalHeader}>
              <Text style={themedStyles.modalTitle}>{selectedItem?.isAiResult ? 'AI Review' : 'Log Serving'}</Text>
              <TouchableOpacity onPress={() => setShowQtyModal(false)}>
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={themedStyles.modalFoodName}>{selectedItem?.displayName || selectedItem?.name}</Text>
            <Text style={themedStyles.modalFoodMeta}>{selectedItem?.brand || 'Standard'}</Text>

            {/* Smart Meal Type Selector */}
            <View style={{ marginBottom: 20 }}>
              <Text style={themedStyles.formLabel}>Meal Type</Text>
              <View style={themedStyles.typeRow}>
                {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
                    <TouchableOpacity 
                      key={type} 
                      onPress={() => changeMealType(type)}
                      style={[themedStyles.typeBtn, selectedMealType === type && { backgroundColor: COLORS.primary }]}
                    >
                      <Text style={[themedStyles.typeBtnText, selectedMealType === type && { color: COLORS.primaryContrast }]}>{type.charAt(0).toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Selector */}
            <View style={[themedStyles.formGroup, { marginBottom: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Clock size={14} color={COLORS.textSecondary} />
                <Text style={themedStyles.formLabel}>Time</Text>
              </View>
              <TextInput
                style={themedStyles.formInput}
                value={customTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                onChangeText={handleTimeChange}
                placeholder="08:00"
              />
            </View>

            <View style={themedStyles.qtyInputRow}>
              <TextInput
                style={themedStyles.qtyInput}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                autoFocus
                selectTextOnFocus
              />
              <Text style={themedStyles.qtyUnit}>{selectedItem?.servingUnit || 'servings'}</Text>
            </View>

            <View style={themedStyles.modalStats}>
              <View style={themedStyles.modalStat}>
                <Text style={themedStyles.modalStatValue}>{Math.round((selectedItem?.calories || 0) * (parseFloat(quantity) || 0))}</Text>
                <Text style={themedStyles.modalStatLabel}>kcal</Text>
              </View>
              <View style={themedStyles.modalStat}>
                <Text style={themedStyles.modalStatValue}>{((selectedItem?.protein || 0) * (parseFloat(quantity) || 0)).toFixed(1)}g</Text>
                <Text style={themedStyles.modalStatLabel}>Protein</Text>
              </View>
              <View style={themedStyles.modalStat}>
                <Text style={themedStyles.modalStatValue}>{((selectedItem?.carbs || 0) * (parseFloat(quantity) || 0)).toFixed(1)}g</Text>
                <Text style={themedStyles.modalStatLabel}>Carbs</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[themedStyles.modalSubmitBtn, isSubmitting && { opacity: 0.7 }]} 
              onPress={submitLog}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={themedStyles.modalSubmitText}>Log Item</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY) => StyleSheet.create({
  container: { padding: SPACING.md, paddingBottom: 100 },
  searchSection: { marginTop: 8 },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS },
  searchInput: { flex: 1, height: 40, marginLeft: 8, fontSize: 16, color: COLORS.text },
  resultsList: { marginTop: 16 },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  resultName: { ...TYPOGRAPHY.label, color: COLORS.text },
  resultMeta: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  externalSearchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, gap: 8 },
  externalSearchText: { color: COLORS.primary, fontWeight: '600' },
  miniBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  aiSection: { marginBottom: 24, marginTop: 24 },
  sectionSubtitle: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 12 },
  aiInputContainer: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS },
  aiInput: { minHeight: 100, fontSize: 16, color: COLORS.text, textAlignVertical: 'top', marginBottom: 12 },
  aiActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  iconBtn: { padding: 8 },
  logBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BORDER_RADIUS.md, minWidth: 100, alignItems: 'center' },
  logBtnText: { color: COLORS.primaryContrast, fontWeight: 'bold' },
  
  waterSection: { marginBottom: 40, marginTop: 8, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS },
  waterActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  waterBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: BORDER_RADIUS.md, borderWidth: 1, justifyContent: 'center' },

  // Form Styles
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  formInput: { backgroundColor: COLORS.gray100, borderRadius: BORDER_RADIUS.md, padding: 12, fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: 24, width: '100%', maxWidth: 400, ...SHADOWS },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  modalFoodName: { ...TYPOGRAPHY.h2, fontSize: 20, color: COLORS.text, marginBottom: 4 },
  modalFoodMeta: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 24 },
  qtyInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 12 },
  qtyInput: { fontSize: 48, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', width: 120, borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 4 },
  qtyUnit: { fontSize: 20, color: COLORS.textSecondary, fontWeight: '600' },
  modalStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 32, backgroundColor: COLORS.gray100, padding: 16, borderRadius: BORDER_RADIUS.lg },
  modalStat: { alignItems: 'center' },
  modalStatValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  modalStatLabel: { fontSize: 12, color: COLORS.textSecondary },
  modalSubmitBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: BORDER_RADIUS.lg, alignItems: 'center' },
  modalSubmitText: { color: COLORS.primaryContrast, fontSize: 18, fontWeight: 'bold' },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.gray100 },
  typeBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
});
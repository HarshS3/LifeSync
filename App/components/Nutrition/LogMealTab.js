import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { Search, Zap, Camera, Mic, ChevronRight, Utensils, Plus, X } from 'lucide-react-native';
import api from '../../services/api';

export default function LogMealTab({ onMealLogged, currentMeals = [], COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY }) {
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Qty Modal State
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      const newMeal = {
        name: analysis.display_name || aiInput,
        mealType: 'snack',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        foods: [{
          name: analysis.display_name || aiInput,
          calories: analysis.energy_kcal || 0,
          protein: analysis.protein_g || 0,
          carbs: analysis.carb_g || 0,
          fat: analysis.fat_g || 0,
          fiber: analysis.fibre_g || 0,
          sugar: analysis.sugar_g || 0
        }]
      };

      const updatedMeals = [...currentMeals, newMeal];
      await api.post('/nutrition/logs', { 
        date: new Date().toISOString().split('T')[0],
        meals: updatedMeals
      });

      Alert.alert('Success', `Logged: ${analysis.display_name || aiInput}`);
      setAiInput('');
      if (onMealLogged) onMealLogged();
    } catch (err) {
      console.error('AI Log error', err);
      Alert.alert('Error', 'AI logging failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchLoading(true);
    try {
      const res = await api.get(`/nutrition/search?q=${searchQuery}`);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleLogFood = (item) => {
    setSelectedItem(item);
    setQuantity('1');
    setShowQtyModal(true);
  };

  const submitLog = async () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newMeal = {
        name: selectedItem.displayName || selectedItem.name,
        mealType: 'snack',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        foods: [{
          name: selectedItem.displayName || selectedItem.name,
          calories: (selectedItem.calories || 0) * qty,
          protein: (selectedItem.protein || 0) * qty,
          carbs: (selectedItem.carbs || 0) * qty,
          fat: (selectedItem.fat || 0) * qty,
          quantity: qty,
          unit: 'serving',
          brand: selectedItem.brand
        }]
      };

      const updatedMeals = [...currentMeals, newMeal];
      await api.post('/nutrition/logs', { 
        date: new Date().toISOString().split('T')[0],
        meals: updatedMeals
      });

      setShowQtyModal(false);
      Alert.alert('Success', `Logged ${qty} serving(s) of ${selectedItem.displayName || selectedItem.name}`);
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
          <Text style={themedStyles.sectionTitle}>Search Food</Text>
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
                    <Text style={themedStyles.resultMeta}>{item.calories} kcal • {item.protein}g P • {item.brand || 'Standard'}</Text>
                  </View>
                  <Plus size={18} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </View>
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
                {isAiLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={themedStyles.logBtnText}>Log with AI</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

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
              <Text style={themedStyles.modalTitle}>Log Serving</Text>
              <TouchableOpacity onPress={() => setShowQtyModal(false)}>
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={themedStyles.modalFoodName}>{selectedItem?.displayName || selectedItem?.name}</Text>
            <Text style={themedStyles.modalFoodMeta}>{selectedItem?.brand || 'Standard'}</Text>

            <View style={themedStyles.qtyInputRow}>
              <TextInput
                style={themedStyles.qtyInput}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                autoFocus
                selectTextOnFocus
              />
              <Text style={themedStyles.qtyUnit}>servings</Text>
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
  aiSection: { marginBottom: 24, marginTop: 24 },
  sectionSubtitle: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 12 },
  aiInputContainer: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS },
  aiInput: { minHeight: 100, fontSize: 16, color: COLORS.text, textAlignVertical: 'top', marginBottom: 12 },
  aiActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  iconBtn: { padding: 8 },
  logBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BORDER_RADIUS.md, minWidth: 100, alignItems: 'center' },
  logBtnText: { color: '#fff', fontWeight: 'bold' },
  
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
  modalSubmitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

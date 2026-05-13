import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Search, Zap, Camera, Mic, ChevronRight, Utensils, Plus } from 'lucide-react-native';
import api from '../../services/api';

export default function LogMealTab({ onMealLogged, COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY }) {
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const handleAiLog = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    try {
      // 1. Analyze the food text using the advanced pipeline
      const analysisRes = await api.post('/nutrition/food/analyze', { 
        foodName: aiInput,
        includeLLM: true 
      });
      
      const analysis = analysisRes.data;
      if (!analysis) throw new Error('Analysis failed');

      // 2. Create a meal log entry from the analysis
      const newMeal = {
        name: analysis.display_name || aiInput,
        mealType: 'snack', // Default
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

      // 3. Post to logs (standard flow)
      await api.post('/nutrition/logs', { 
        date: new Date().toISOString().split('T')[0],
        meals: [newMeal] // The backend handles merging/appending if the route is set up correctly
      });

      Alert.alert('Success', `Logged: ${analysis.display_name || aiInput}`);
      setAiInput('');
      if (onMealLogged) onMealLogged();
    } catch (err) {
      console.error('AI Log error', err);
      Alert.alert('Error', 'AI logging failed. Try being more specific about portions.');
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

  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  return (
    <ScrollView contentContainerStyle={themedStyles.container}>
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
              <TouchableOpacity key={idx} style={themedStyles.resultItem} onPress={() => {/* Handle food selection */}}>
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
    </ScrollView>
  );
}

const styles = (COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY) => StyleSheet.create({
  container: { padding: SPACING.md, paddingBottom: 100 },
  aiSection: { marginBottom: 24 },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: 4 },
  sectionSubtitle: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 12 },
  aiInputContainer: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS },
  aiInput: { minHeight: 100, fontSize: 16, color: COLORS.text, textAlignVertical: 'top', marginBottom: 12 },
  aiActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  iconBtn: { padding: 8 },
  logBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BORDER_RADIUS.md, minWidth: 100, alignItems: 'center' },
  logBtnText: { color: '#fff', fontWeight: 'bold' },
  searchSection: { marginTop: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS },
  searchInput: { flex: 1, height: 40, marginLeft: 8, fontSize: 16, color: COLORS.text },
  resultsList: { marginTop: 16 },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  resultName: { ...TYPOGRAPHY.label, color: COLORS.text },
  resultMeta: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
});

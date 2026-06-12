import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { Search, ChevronLeft, Utensils, Info, Edit2, Save, X, Plus } from 'lucide-react-native';

export default function RecipeExplorerScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const router = useRouter();

  // Edit-as-meal state: editingFoods[] is the user-modifiable food list with per-ingredient
  // bestMatch nutrition (kcal/protein/carbs/fat per 100g) + a `quantity` in grams.
  const [editMode, setEditMode] = useState(false);
  const [editingFoods, setEditingFoods] = useState([]);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 3) {
        searchRecipes();
      } else {
        setResults([]);
        setSelectedRecipe(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const searchRecipes = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/recipes/search?q=${query}&limit=15`);
      setResults(res.data || []);
      setSelectedRecipe(null);
    } catch (err) {
      console.error('Recipe search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecipe = async (recipe) => {
    setDetailsLoading(true);
    setSelectedRecipe(recipe); // Optimistic selection
    setEditMode(false);
    setEditingFoods([]);
    try {
      const res = await api.get(`/recipes/details?url=${encodeURIComponent(recipe.recipe_url)}`);
      setSelectedRecipe(res.data);
      setTemplateName(res.data?.recipe_title || res.data?.food_name || 'Custom meal');
    } catch (err) {
      console.error('Failed to fetch recipe details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const enterEditMode = async () => {
    if (!selectedRecipe?.recipe_url) return;
    setResolveLoading(true);
    try {
      const res = await api.get(`/recipes/resolve-ingredients?url=${encodeURIComponent(selectedRecipe.recipe_url)}`);
      const ingredients = Array.isArray(res.data?.ingredients) ? res.data.ingredients : [];
      // Convert to editable foods. Default qty 100g; if a bestMatch exists, copy its per-100g macros.
      const foods = ingredients
        .filter(i => i.bestMatch)
        .map((i) => {
          const m = i.bestMatch;
          return {
            sourceName: i.ingredient_name || i.ingredient_text,
            originalAmountText: i.amount_text || '',
            candidates: i.candidates || [],
            // Resolved-food macros are per-100g for local DB items.
            name: m.name || m.displayName || i.ingredient_name,
            quantity: 100,
            unit: 'g',
            calories: Number(m.calories || 0),
            protein: Number(m.protein || 0),
            carbs: Number(m.carbs || 0),
            fat: Number(m.fat || 0),
            fiber: Number(m.fiber || 0),
            sourceFoodId: String(m.id || ''),
          };
        });
      setEditingFoods(foods);
      setEditMode(true);
    } catch (err) {
      console.error('Resolve ingredients failed', err);
      Alert.alert('Could not resolve ingredients', err.response?.data?.error || err.message || 'Try again later.');
    } finally {
      setResolveLoading(false);
    }
  };

  const updateFoodQty = (idx, newQty) => {
    setEditingFoods(prev => prev.map((f, i) => i === idx ? { ...f, quantity: Math.max(0, Number(newQty) || 0) } : f));
  };

  const removeFood = (idx) => {
    setEditingFoods(prev => prev.filter((_, i) => i !== idx));
  };

  const swapFood = (idx, candidate) => {
    setEditingFoods(prev => prev.map((f, i) => i === idx ? {
      ...f,
      name: candidate.name || candidate.displayName,
      calories: Number(candidate.calories || 0),
      protein: Number(candidate.protein || 0),
      carbs: Number(candidate.carbs || 0),
      fat: Number(candidate.fat || 0),
      fiber: Number(candidate.fiber || 0),
      sourceFoodId: String(candidate.id || ''),
    } : f));
  };

  // Per-ingredient macros are stored per-100g; scale to actual quantity.
  const computeFoodMacros = (food) => {
    const factor = (food.quantity || 0) / 100;
    return {
      calories: food.calories * factor,
      protein: food.protein * factor,
      carbs: food.carbs * factor,
      fat: food.fat * factor,
      fiber: food.fiber * factor,
    };
  };

  const computeTotals = () => {
    return editingFoods.reduce((acc, f) => {
      const m = computeFoodMacros(f);
      acc.calories += m.calories; acc.protein += m.protein; acc.carbs += m.carbs;
      acc.fat += m.fat; acc.fiber += m.fiber;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Name required', 'Give your meal a name before saving.');
      return;
    }
    if (editingFoods.length === 0) {
      Alert.alert('No ingredients', 'Add at least one ingredient before saving.');
      return;
    }
    setSavingTemplate(true);
    try {
      // Build foods at the user-specified quantities (snapshot the scaled macros).
      const foods = editingFoods.map(f => {
        const m = computeFoodMacros(f);
        return {
          name: f.name,
          quantity: f.quantity,
          unit: f.unit || 'g',
          calories: Math.round(m.calories),
          protein: Math.round(m.protein * 10) / 10,
          carbs: Math.round(m.carbs * 10) / 10,
          fat: Math.round(m.fat * 10) / 10,
          fiber: Math.round(m.fiber * 10) / 10,
          sourceFoodId: f.sourceFoodId,
        };
      });
      await api.post('/nutrition/saved-templates', {
        name: templateName.trim(),
        mealType: 'snack',
        foods,
        notes: `Built from recipe: ${selectedRecipe?.recipe_title || ''}`,
      });
      Alert.alert('Saved', `"${templateName.trim()}" was saved as a custom meal template. You can log it from the Log Meal screen.`);
      setEditMode(false);
    } catch (err) {
      console.error('Save template failed', err);
      Alert.alert('Save failed', err.response?.data?.error || err.message || 'Try again later.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const getIngredientsBySection = () => {
    if (!selectedRecipe?.ingredients) return {};
    const sections = {};
    selectedRecipe.ingredients.forEach(ing => {
      const section = ing.section || 'Main Ingredients';
      if (!sections[section]) sections[section] = [];
      sections[section].push(ing);
    });
    return sections;
  };

  const renderRecipeItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.recipeItem}
      onPress={() => handleSelectRecipe(item)}
    >
      <View style={styles.recipeIcon}>
        <Utensils size={20} color="#ea580c" />
      </View>
      <View style={styles.recipeInfo}>
        <Text style={styles.recipeName} numberOfLines={1}>{item.food_name}</Text>
        <Text style={styles.recipeTitle} numberOfLines={1}>{item.recipe_title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recipe Explorer</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search Indian Recipes (e.g. Dosa)..."
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {loading && !selectedRecipe ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ea580c" />
        </View>
      ) : selectedRecipe ? (
        <ScrollView style={styles.detailsContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          <TouchableOpacity 
            style={styles.backToSearch} 
            onPress={() => setSelectedRecipe(null)}
          >
            <Text style={styles.backToSearchText}>← Back to results</Text>
          </TouchableOpacity>

          {detailsLoading ? (
             <View style={styles.centeredDetails}>
               <ActivityIndicator size="large" color="#ea580c" />
             </View>
          ) : editMode ? (
            <View style={styles.recipeCard}>
              <View style={styles.recipeCardHeader}>
                <Text style={styles.detailName}>Customize as meal</Text>
                <Text style={styles.detailTitle}>Adjust grams, swap, or remove ingredients. Totals recompute live.</Text>
                <TextInput
                  style={styles.templateNameInput}
                  value={templateName}
                  onChangeText={setTemplateName}
                  placeholder="Meal name"
                />
              </View>

              <View style={styles.sectionDivider} />

              <View style={{ padding: 20 }}>
                <Text style={styles.sectionTitle}><Utensils size={18} color="#000" /> Ingredients</Text>
                {editingFoods.length === 0 ? (
                  <Text style={styles.emptyText}>No ingredients could be resolved. Try a different recipe.</Text>
                ) : editingFoods.map((f, idx) => {
                  const m = computeFoodMacros(f);
                  return (
                    <View key={idx} style={styles.editRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ingredientName}>{f.name}</Text>
                        <Text style={[styles.ingredientAmount, { fontSize: 11, color: '#9ca3af' }]} numberOfLines={1}>
                          source: {f.sourceName} {f.originalAmountText ? `(${f.originalAmountText})` : ''}
                        </Text>
                        <Text style={[styles.ingredientAmount, { fontSize: 12, marginTop: 2 }]}>
                          {Math.round(m.calories)} kcal · {Math.round(m.protein * 10) / 10}g P · {Math.round(m.carbs * 10) / 10}g C · {Math.round(m.fat * 10) / 10}g F
                        </Text>
                        {f.candidates && f.candidates.length > 1 && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                            {f.candidates.slice(0, 4).map((c, ci) => {
                              const isCurrent = String(c.id || '') === f.sourceFoodId;
                              return (
                                <TouchableOpacity
                                  key={ci}
                                  onPress={() => swapFood(idx, c)}
                                  style={[styles.swapChip, isCurrent && styles.swapChipActive]}
                                >
                                  <Text style={[styles.swapChipText, isCurrent && { color: '#fff' }]} numberOfLines={1}>
                                    {(c.name || c.displayName || '').slice(0, 24)}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                      </View>
                      <View style={styles.qtyCol}>
                        <TextInput
                          style={styles.qtyInput}
                          keyboardType="numeric"
                          value={String(f.quantity)}
                          onChangeText={(v) => updateFoodQty(idx, v)}
                        />
                        <Text style={styles.qtyUnit}>g</Text>
                        <TouchableOpacity onPress={() => removeFood(idx)} style={styles.removeBtn}>
                          <X size={14} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.sectionDivider} />

              <View style={styles.nutritionSection}>
                <Text style={styles.sectionTitle}><Info size={18} color="#000" /> Live totals</Text>
                <View style={styles.nutritionTable}>
                  {(() => {
                    const t = computeTotals();
                    return [
                      { label: 'Energy', value: `${Math.round(t.calories)} kcal` },
                      { label: 'Protein', value: `${Math.round(t.protein * 10) / 10} g` },
                      { label: 'Carbs', value: `${Math.round(t.carbs * 10) / 10} g` },
                      { label: 'Fat', value: `${Math.round(t.fat * 10) / 10} g` },
                      { label: 'Fiber', value: `${Math.round(t.fiber * 10) / 10} g` },
                    ].map((row, idx) => (
                      <View key={idx} style={styles.nutritionTableRow}>
                        <Text style={styles.nutritionLabel}>{row.label}</Text>
                        <Text style={styles.nutritionValue}>{row.value}</Text>
                      </View>
                    ));
                  })()}
                </View>
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => setEditMode(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveAsTemplate} disabled={savingTemplate} style={[styles.saveBtn, savingTemplate && { opacity: 0.6 }]}>
                  <Save size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>{savingTemplate ? 'Saving…' : 'Save as meal'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.recipeCard}>
              <View style={styles.recipeCardHeader}>
                <Text style={styles.detailName}>{selectedRecipe.food_name}</Text>
                <Text style={styles.detailTitle}>{selectedRecipe.recipe_title}</Text>

                <View style={styles.tagsRow}>
                  <View style={styles.tag}><Text style={styles.tagText}>Yield: {selectedRecipe.serving_label || '1 portion'}</Text></View>
                  <View style={styles.tag}><Text style={styles.tagText}>{selectedRecipe.ingredient_count || 0} Ingredients</Text></View>
                  {selectedRecipe.energy_value && (
                    <View style={[styles.tag, {backgroundColor: '#dcfce7'}]}><Text style={[styles.tagText, {color: '#166534'}]}>{selectedRecipe.energy_value} / serving</Text></View>
                  )}
                </View>

                <TouchableOpacity onPress={enterEditMode} disabled={resolveLoading} style={[styles.editEntryBtn, resolveLoading && { opacity: 0.6 }]}>
                  <Edit2 size={14} color="#fff" />
                  <Text style={styles.editEntryBtnText}>{resolveLoading ? 'Resolving ingredients…' : 'Edit ingredients & save as meal'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionDivider} />

              <View style={styles.recipeContentRow}>
                <View style={styles.ingredientsSection}>
                  <Text style={styles.sectionTitle}><Utensils size={18} color="#000" /> Ingredients</Text>

                  {Object.entries(getIngredientsBySection()).map(([section, ings]) => (
                    <View key={section} style={{marginBottom: 16}}>
                      <Text style={styles.ingredientSectionTitle}>{section}</Text>
                      {ings.map((ing, idx) => (
                        <View key={idx} style={styles.ingredientRow}>
                          <Text style={styles.ingredientName}>{ing.ingredient_name || ing.ingredient_text}</Text>
                          <Text style={styles.ingredientAmount}>{ing.amount_text}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.sectionDivider} />

              <View style={styles.nutritionSection}>
                <Text style={styles.sectionTitle}><Info size={18} color="#000" /> Nutritional Info</Text>
                <Text style={styles.nutritionSubtitle}>{selectedRecipe.nutrient_heading || 'Values per serving'}</Text>

                <View style={styles.nutritionTable}>
                  {[
                    { label: 'Energy', value: selectedRecipe.energy_value },
                    { label: 'Protein', value: selectedRecipe.protein_value },
                    { label: 'Carbs', value: selectedRecipe.carbohydrates_value },
                    { label: 'Fat', value: selectedRecipe.fat_value },
                    { label: 'Fiber', value: selectedRecipe.fiber_value },
                  ].map((row, idx) => (
                    <View key={idx} style={styles.nutritionTableRow}>
                      <Text style={styles.nutritionLabel}>{row.label}</Text>
                      <Text style={styles.nutritionValue}>{row.value || '-'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          renderItem={renderRecipeItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            query.length >= 3 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No recipes found for "{query}"</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  searchContainer: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#000' },
  listContent: { padding: 16 },
  recipeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  recipeIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: 16, fontWeight: '600', color: '#111' },
  recipeTitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 15 },
  detailsContainer: { flex: 1, padding: 16 },
  backToSearch: { marginBottom: 16 },
  backToSearchText: { color: '#ea580c', fontWeight: '600', fontSize: 16 },
  recipeCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  recipeCardHeader: { padding: 20, backgroundColor: '#fafafa' },
  detailName: { fontSize: 24, fontWeight: '800', color: '#000', marginBottom: 4 },
  detailTitle: { fontSize: 15, color: '#666', marginBottom: 16 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fff' },
  tagText: { fontSize: 12, fontWeight: '600', color: '#555' },
  sectionDivider: { height: 1, backgroundColor: '#eee' },
  ingredientsSection: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#000' },
  ingredientSectionTitle: { fontSize: 12, fontWeight: '700', color: '#ea580c', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
  ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  ingredientName: { fontSize: 14, color: '#333', flex: 1, fontWeight: '500' },
  ingredientAmount: { fontSize: 14, color: '#666' },
  nutritionSection: { padding: 20, backgroundColor: '#fafafa' },
  nutritionSubtitle: { fontSize: 13, color: '#666', marginBottom: 12 },
  nutritionTable: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, backgroundColor: '#fff' },
  nutritionTableRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  nutritionLabel: { fontWeight: '600', color: '#333' },
  nutritionValue: { color: '#666' },
  centeredDetails: { padding: 40, alignItems: 'center' },

  editEntryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#ea580c', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginTop: 14,
  },
  editEntryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  templateNameInput: {
    marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd',
    backgroundColor: '#fff', fontSize: 16, fontWeight: '600',
  },

  editRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 8,
  },
  qtyCol: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  qtyInput: {
    width: 56, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', textAlign: 'right', fontSize: 14, backgroundColor: '#fff',
  },
  qtyUnit: { fontSize: 12, color: '#6b7280' },
  removeBtn: { padding: 6, borderRadius: 6, backgroundColor: '#fee2e2', marginLeft: 4 },

  swapChip: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12,
    backgroundColor: '#f3f4f6', marginRight: 6, borderWidth: 1, borderColor: '#e5e7eb',
  },
  swapChipActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  swapChipText: { fontSize: 11, color: '#374151' },

  editActions: { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#374151' },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#16a34a' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});

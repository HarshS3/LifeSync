import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { Search, ChevronLeft, Utensils, Info } from 'lucide-react-native';

export default function RecipeExplorerScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const router = useRouter();

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
    try {
      const res = await api.get(`/recipes/details?url=${encodeURIComponent(recipe.recipe_url)}`);
      setSelectedRecipe(res.data);
    } catch (err) {
      console.error('Failed to fetch recipe details', err);
    } finally {
      setDetailsLoading(false);
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
  centeredDetails: { padding: 40, alignItems: 'center' }
});

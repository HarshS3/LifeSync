import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Check, Flame, Zap, Scale } from 'lucide-react-native';
import HypothesisCard from '../../components/Nutrition/HypothesisCard';

export default function LogFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const food = JSON.parse(params.food);

  const [quantity, setQuantity] = useState('1');
  const [mealType, setMealType] = useState('lunch');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hypothesis for this food — fetched after save
  const [hypothesis, setHypothesis] = useState(null);
  const [hypothesisVisible, setHypothesisVisible] = useState(false);

  const multiplier = parseFloat(quantity) || 0;
  const scaled = {
    calories: Math.round(food.calories * multiplier),
    protein: (food.protein * multiplier).toFixed(1),
    carbs: (food.carbs * multiplier).toFixed(1),
    fat: (food.fat * multiplier).toFixed(1),
  };

  const fetchHypothesisForFood = async (foodName) => {
    try {
      const res = await api.get('/nutrition/hypotheses');
      const docs = res.data || [];
      const foodKey = String(foodName).toLowerCase().replace(/\s+/g, '_');
      const match = docs.find(h =>
        (h.status === 'proposed' || h.status === 'testing') &&
        (h.canonicalId === foodKey || h.canonicalId?.includes(foodKey.split('_')[0]))
      );
      if (match) {
        setHypothesis(match);
        setHypothesisVisible(true);
      }
    } catch {
      // non-critical — don't surface errors
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const currentRes = await api.get(`/nutrition/logs/date/${dateStr}`);
      const currentLog = currentRes.data;

      const newMeal = {
        name: food.displayName || food.name,
        mealType,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        foods: [{
          ...food,
          calories: scaled.calories,
          protein: parseFloat(scaled.protein),
          carbs: parseFloat(scaled.carbs),
          fat: parseFloat(scaled.fat),
          servingQty: multiplier * (food.servingQty || 1),
        }],
      };

      await api.post('/nutrition/logs', {
        date: dateStr,
        meals: [...(currentLog.meals || []), newMeal],
      });

      setSaved(true);
      // After saving, check for an existing hypothesis to validate
      fetchHypothesisForFood(food.displayName || food.name);
    } catch (err) {
      console.error('Failed to log food', err);
      alert('Failed to save log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    router.replace('/(tabs)/nutrition');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Food</Text>
        {!saved ? (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator size="small" color="#000" /> : <Check size={24} color="#000" />}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.foodHeader}>
          <Text style={styles.foodName}>{food.displayName || food.name}</Text>
          <Text style={styles.foodBrand}>{food.brand || 'Standard Reference'}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Flame size={20} color="#ef4444" />
            <Text style={styles.statValue}>{scaled.calories}</Text>
            <Text style={styles.statLabel}>kcal</Text>
          </View>
          <View style={styles.statItem}>
            <Zap size={20} color="#3b82f6" />
            <Text style={styles.statValue}>{scaled.protein}g</Text>
            <Text style={styles.statLabel}>Protein</Text>
          </View>
          <View style={styles.statItem}>
            <Scale size={20} color="#f59e0b" />
            <Text style={styles.statValue}>{scaled.carbs}g</Text>
            <Text style={styles.statLabel}>Carbs</Text>
          </View>
        </View>

        {!saved && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Number of Servings</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.quantityInput}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="1.0"
                />
                <Text style={styles.unitText}>× {food.servingQty}{food.servingUnit || food.servingSize}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Meal Type</Text>
              <View style={styles.chipRow}>
                {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, mealType === type && styles.chipActive]}
                    onPress={() => setMealType(type)}
                  >
                    <Text style={[styles.chipText, mealType === type && styles.chipTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {saved && (
          <View style={styles.savedBanner}>
            <Check size={18} color="#10b981" />
            <Text style={styles.savedText}>Logged to {mealType}</Text>
          </View>
        )}

        {/* Hypothesis card — appears after save if a hypothesis exists for this food */}
        {hypothesisVisible && (
          <HypothesisCard
            hypothesis={hypothesis}
            onDismiss={() => setHypothesisVisible(false)}
          />
        )}

        {saved && !hypothesisVisible && (
          <TouchableOpacity style={styles.backToNutrition} onPress={handleDone}>
            <Text style={styles.backToNutritionText}>Back to Today's Log</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 4 },
  saveButton: { padding: 4 },
  doneButton: { backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  doneButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  content: { padding: 24 },
  foodHeader: { marginBottom: 24 },
  foodName: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  foodBrand: { fontSize: 13, color: '#666', marginTop: 4 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#f9fafb', borderRadius: 16, padding: 18, marginBottom: 28,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 6 },
  statLabel: { fontSize: 12, color: '#666' },
  section: { marginBottom: 22 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 16 },
  quantityInput: { flex: 1, height: 50, fontSize: 18, fontWeight: 'bold' },
  unitText: { fontSize: 15, color: '#666' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#eee' },
  chipActive: { backgroundColor: '#000', borderColor: '#000' },
  chipText: { fontSize: 14, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  savedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginBottom: 4 },
  savedText: { fontSize: 14, fontWeight: '600', color: '#065f46' },
  backToNutrition: { marginTop: 20, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  backToNutritionText: { fontSize: 14, fontWeight: '600', color: '#333' },
});

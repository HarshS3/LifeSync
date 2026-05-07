import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Check, Flame, Zap, Scale } from 'lucide-react-native';

export default function LogFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const food = JSON.parse(params.food);

  const [quantity, setQuantity] = useState('1');
  const [mealType, setMealType] = useState('lunch');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const multiplier = parseFloat(quantity) || 0;
  const scaled = {
    calories: Math.round(food.calories * multiplier),
    protein: (food.protein * multiplier).toFixed(1),
    carbs: (food.carbs * multiplier).toFixed(1),
    fat: (food.fat * multiplier).toFixed(1),
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      
      // First, get today's log to append to it
      const currentRes = await api.get(`/nutrition/logs/date/${dateStr}`);
      const currentLog = currentRes.data;

      const newMeal = {
        name: food.displayName || food.name,
        mealType: mealType,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        foods: [{
          ...food,
          calories: scaled.calories,
          protein: parseFloat(scaled.protein),
          carbs: parseFloat(scaled.carbs),
          fat: parseFloat(scaled.fat),
          servingQty: multiplier * (food.servingQty || 1)
        }]
      };

      const updatedMeals = [...(currentLog.meals || []), newMeal];

      await api.post('/nutrition/logs', {
        date: dateStr,
        meals: updatedMeals
      });

      router.replace('/(tabs)/nutrition');
    } catch (err) {
      console.error('Failed to log food', err);
      alert('Failed to save log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Food</Text>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator size="small" color="#000" /> : <Check size={24} color="#000" />}
        </TouchableOpacity>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 24,
  },
  foodHeader: {
    marginBottom: 32,
  },
  foodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  foodBrand: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  quantityInput: {
    flex: 1,
    height: 50,
    fontSize: 18,
    fontWeight: 'bold',
  },
  unitText: {
    fontSize: 16,
    color: '#666',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#eee',
  },
  chipActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

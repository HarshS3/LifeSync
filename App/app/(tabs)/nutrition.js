import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Plus, Utensils, Zap, ShieldAlert, ChevronRight } from 'lucide-react-native';
import MacroIndicator from '../../components/MacroIndicator';

export default function NutritionScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [log, setLog] = useState(null);
  const [targets, setTargets] = useState({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70
  });

  const fetchData = async () => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const [logRes, targetRes] = await Promise.all([
        api.get(`/nutrition/logs/date/${dateStr}`),
        api.get('/nutrition/clinical-targets')
      ]);
      
      setLog(logRes.data);
      if (targetRes.data?.targets) {
        setTargets(targetRes.data.targets);
      }
    } catch (err) {
      console.error('Failed to fetch nutrition data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const totals = log?.dailyTotals || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Daily Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Daily Summary</Text>
          <View style={styles.caloriesRow}>
            <View>
              <Text style={styles.caloriesValue}>{Math.round(totals.calories)}</Text>
              <Text style={styles.caloriesLabel}>Calories Consumed</Text>
            </View>
            <View style={styles.caloriesTargetBox}>
              <Text style={styles.targetValue}>{targets.calories}</Text>
              <Text style={styles.targetLabel}>Target</Text>
            </View>
          </View>
          
          <View style={styles.macrosGrid}>
            <MacroIndicator label="Protein" value={totals.protein} target={targets.protein} color="#ef4444" />
            <MacroIndicator label="Carbs" value={totals.carbs} target={targets.carbs} color="#3b82f6" />
            <MacroIndicator label="Fat" value={totals.fat} target={targets.fat} color="#f59e0b" />
          </View>
        </View>

        {/* Bioavailability/Insights Section */}
        {log?.proteinDistribution && (
          <View style={styles.insightBox}>
            <View style={styles.insightHeader}>
              <Zap size={18} color="#8b5cf6" />
              <Text style={styles.insightTitle}>Protein Timing</Text>
            </View>
            <Text style={styles.insightText}>{log.proteinDistribution.insights[0]}</Text>
          </View>
        )}

        {/* Meals List */}
        <View style={styles.mealsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Meals</Text>
            <Text style={styles.mealCount}>{log?.meals?.length || 0} logged</Text>
          </View>

          {log?.meals?.length > 0 ? (
            log.meals.map((meal, index) => (
              <TouchableOpacity key={index} style={styles.mealItem}>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{meal.name || meal.mealType}</Text>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                </View>
                <View style={styles.mealStats}>
                  <Text style={styles.mealCals}>{Math.round(meal.totalCalories)} kcal</Text>
                  <ChevronRight size={18} color="#ccc" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Utensils size={40} color="#eee" />
              <Text style={styles.emptyText}>No meals logged yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/nutrition/search')}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    marginBottom: 16,
  },
  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  caloriesValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000',
  },
  caloriesLabel: {
    fontSize: 14,
    color: '#999',
  },
  caloriesTargetBox: {
    alignItems: 'flex-end',
  },
  targetValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666',
  },
  targetLabel: {
    fontSize: 12,
    color: '#999',
  },
  macrosGrid: {
    marginTop: 8,
  },
  insightBox: {
    backgroundColor: '#f5f3ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7c3aed',
    marginLeft: 8,
  },
  insightText: {
    fontSize: 13,
    color: '#5b21b6',
    lineHeight: 18,
  },
  mealsSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  mealCount: {
    fontSize: 14,
    color: '#999',
  },
  mealItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mealTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  mealStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealCals: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    color: '#ccc',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});

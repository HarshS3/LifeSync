import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Scale, Plus, Minus, TrendingUp } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
const screenWidth = Dimensions.get('window').width;
import api from '../../services/api';

export default function WeightTrackerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState(70.0);
  const [history, setHistory] = useState([]);
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchWeightData();
  }, []);

  const fetchWeightData = async () => {
    try {
      // We use the same get pattern but for a large range to see history
      const res = await api.get(`/nutrition/weight/date/${today}`);
      if (res.data?.weights) {
        setHistory(res.data.weights.reverse());
        
        // Find today's weight if exists
        const todaysLog = res.data.weights.find(w => w.date.startsWith(today));
        if (todaysLog) {
          setWeight(Number(todaysLog.weightKg));
        } else if (res.data.weights.length > 0) {
          // prefill with latest weight
          setWeight(Number(res.data.weights[0].weightKg));
        }
      }
    } catch (err) {
      console.error('Failed to fetch weight history', err);
    } finally {
      setLoading(false);
    }
  };

  const adjustWeight = (amount) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWeight(prev => Math.round((prev + amount) * 10) / 10);
  };

  const saveWeight = async () => {
    if (!weight || isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid', 'Please enter a valid weight');
      return;
    }

    setSaving(true);
    try {
      await api.post('/nutrition/weight', {
        date: today,
        weightKg: weight
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Weight logged successfully!');
      fetchWeightData();
    } catch (err) {
      console.error('Failed to save weight', err);
      Alert.alert('Error', 'Failed to log weight');
    } finally {
      setSaving(false);
    }
  };

  const chartData = {
    labels: history.slice(-7).reverse().map(h => {
      const d = new Date(h.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [{
      data: history.slice(-7).reverse().map(h => h.weightKg)
    }]
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
        <TouchableOpacity style={{ marginTop: 20 }} onPress={fetchWeightData}>
          <Text style={{ color: '#3b82f6', fontWeight: '600' }}>Retry Loading</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weight Tracker</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {history.length > 1 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <TrendingUp size={18} color="#3b82f6" />
              <Text style={styles.chartTitle}>Weight Trend</Text>
            </View>
            <LineChart
              data={chartData}
              width={screenWidth - 72}
              height={150}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, 0.5)`,
                style: { borderRadius: 16 },
                propsForDots: { r: "4", strokeWidth: "2", stroke: "#3b82f6" }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          </View>
        )}

        <View style={styles.inputCard}>
          <View style={styles.iconContainer}>
            <Scale size={32} color="#3b82f6" />
          </View>
          <Text style={styles.label}>Log Weight</Text>
          
          <View style={styles.stepperRow}>
            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => adjustWeight(-0.1)}
              onLongPress={() => adjustWeight(-1.0)}
            >
              <Minus size={24} color="#3b82f6" />
            </TouchableOpacity>
            
            <View style={styles.weightDisplay}>
              <Text style={styles.weightValue}>{weight.toFixed(1)}</Text>
              <Text style={styles.weightUnit}>kg</Text>
            </View>

            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => adjustWeight(0.1)}
              onLongPress={() => adjustWeight(1.0)}
            >
              <Plus size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveWeight}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Confirm Entry</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent History</Text>
        
        {history.length > 0 ? (
          <View style={styles.historyList}>
            {history.map((log, idx) => {
              const d = new Date(log.date);
              return (
                <View key={idx} style={styles.historyItem}>
                  <Text style={styles.historyDate}>
                    {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Text style={styles.historyWeight}>{log.weightKg} kg</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>No weight history found.</Text>
        )}
      </ScrollView>
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
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    padding: 20,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
    marginTop: 8,
  },
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  weightValue: {
    fontSize: 64,
    fontWeight: '800',
    color: '#000',
  },
  weightUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94a3b8',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  historyList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyDate: {
    fontSize: 16,
    color: '#666',
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  }
});

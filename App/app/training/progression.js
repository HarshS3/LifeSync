import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, TrendingUp, Search, Info, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const COMMON_EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Lat Pulldown', 'Leg Press', 'Pull Up', 'Bicep Curl', 'Tricep Extension'
];

export default function ProgressionScreen() {
  const router = useRouter();
  const [exercise, setExercise] = useState('Bench Press');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetchProgression(exercise);
  }, [exercise]);

  const fetchProgression = async (exName) => {
    setLoading(true);
    try {
      const res = await api.get(`/gym/exercise-history/${encodeURIComponent(exName)}`);
      if (res.data) {
        setHistory(res.data.history || []);
        setStats({
          maxWeight: res.data.maxWeight,
          estimated1RM: res.data.estimated1RM,
          avgWeight: res.data.avgWeight
        });
      }
    } catch (err) {
      console.error('Failed to fetch progression', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: history.length > 0 ? history.slice(-5).map(h => {
      const d = new Date(h.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }) : ['No Data'],
    datasets: [
      {
        data: history.length > 0 ? history.slice(-5).map(h => h.maxWeight || 0) : [0],
        color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
        strokeWidth: 3
      }
    ]
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progression</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search an exercise..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length > 2) fetchProgression(text);
            }}
            onSubmitEditing={() => fetchProgression(searchQuery)}
          />
        </View>

        {!searchQuery && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.chipsScroll}
            contentContainerStyle={{ paddingRight: 40 }}
          >
            {COMMON_EXERCISES.map(ex => (
              <TouchableOpacity
                key={ex}
                style={[styles.chip, exercise === ex && styles.chipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExercise(ex);
                }}
              >
                <Text style={[styles.chipText, exercise === ex && styles.chipTextActive]}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <TrendingUp size={24} color="#8b5cf6" />
            <Text style={styles.chartTitle}>{exercise}</Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
          ) : history.length > 0 ? (
            <View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats?.maxWeight}kg</Text>
                  <Text style={styles.statLabel}>Max Weight</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats?.estimated1RM}kg</Text>
                  <Text style={styles.statLabel}>Est. 1RM</Text>
                </View>
              </View>
              
              <Text style={styles.chartSubtitle}>Recent Progression (Weight)</Text>
              <LineChart
                data={chartData}
                width={screenWidth - 80}
                height={220}
                yAxisLabel=""
                yAxisSuffix="kg"
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: "#8b5cf6"
                  }
                }}
                bezier
                style={styles.chart}
              />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Info size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No History Yet</Text>
              <Text style={styles.emptyDesc}>
                You haven't logged any sets for {exercise} yet. 
                Complete a workout to see your progress here!
              </Text>
              <TouchableOpacity 
                style={styles.emptyAction}
                onPress={() => router.push('/training/active')}
              >
                <Play size={16} color="#fff" />
                <Text style={styles.emptyActionText}>Start Workout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  content: { padding: 20 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, borderWidth: 1, borderColor: '#eee'
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },
  chipsScroll: { marginBottom: 24 },
  chip: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    marginRight: 8, borderWidth: 1, borderColor: '#eee',
  },
  chipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  chipText: { color: '#666', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  chartCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  chartTitle: { fontSize: 20, fontWeight: '800', color: '#000' },
  loadingContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#000' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  chartSubtitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  chart: { marginVertical: 8, borderRadius: 16 },
  emptyContainer: { 
    paddingVertical: 40,
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

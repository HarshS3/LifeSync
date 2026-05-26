import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Activity, Info, Zap, TrendingUp } from 'lucide-react-native';
import api from '../../services/api';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function InsulinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const date = params.date || new Date().toISOString().split('T')[0];

  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/nutrition/logs/date/${date}`);
        setLog(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date]);

  const analysis = log?.insulinIntelligence;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.replace(router.pathname)}>
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
        <Text style={styles.headerTitle}>Insulin Intelligence</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {!analysis ? (
          <View style={styles.emptyState}>
            <Info size={40} color="#ccc" />
            <Text style={styles.emptyText}>Log meals with a time attached to see your simulated glucose spikes.</Text>
          </View>
        ) : (
          <View>
            {/* 24h Simulated Graph */}
            <View style={styles.graphCard}>
              <View style={styles.graphHeader}>
                <TrendingUp size={20} color="#8b5cf6" />
                <Text style={styles.graphTitle}>Simulated 24h Glucose</Text>
              </View>
              <LineChart
                data={{
                  labels: analysis.labels,
                  datasets: [{ data: analysis.curveData }]
                }}
                width={screenWidth - 40}
                height={200}
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity > 0.5 ? opacity : 1})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, 0.6)`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: "0" }
                }}
                bezier
                withVerticalLines={false}
                withHorizontalLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                fromZero={false}
                yAxisLabel=""
                yAxisSuffix=""
                style={{ marginVertical: 8, borderRadius: 16, paddingRight: 40 }}
              />
              <View style={styles.graphLegend}>
                <View style={[styles.legendZone, { backgroundColor: '#f0fdf4' }]}><Text style={styles.legendText}>Optimal (70-110)</Text></View>
                <View style={[styles.legendZone, { backgroundColor: '#fef2f2' }]}><Text style={styles.legendText}>Spike Zone ({">"}140)</Text></View>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Activity size={24} color={analysis.overallLevel === 'high' ? '#ef4444' : analysis.overallLevel === 'moderate' ? '#f59e0b' : '#10b981'} />
                <Text style={styles.summaryTitle}>
                  {analysis.overallLevel === 'high' ? 'High Spikes Detected' : analysis.overallLevel === 'moderate' ? 'Moderate Spikes' : 'Well-Controlled'}
                </Text>
              </View>
              <Text style={styles.summaryDesc}>
                Based on your macro combinations and meal timing today.
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>~{analysis.avgPeak}</Text>
                  <Text style={styles.statLabel}>Avg Peak (mg/dL)</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{analysis.totalDailyFiber}g</Text>
                  <Text style={styles.statLabel}>Total Fiber</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{analysis.totalDailySugar}g</Text>
                  <Text style={styles.statLabel}>Total Sugar</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Meal Spike Analysis</Text>

            {analysis.mealAnalyses.map((meal, idx) => {
              const color = meal.spikeLevel === 'high' ? '#ef4444' : meal.spikeLevel === 'moderate' ? '#f59e0b' : '#10b981';
              const pct = Math.min(100, Math.max(0, ((meal.peakGlucose - 70) / 110) * 100));

              return (
                <View key={idx} style={styles.mealCard}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealName}>{meal.name} <Text style={styles.mealTime}>• {meal.time}</Text></Text>
                    <Text style={styles.mealMacros}>{meal.carbs}g C / {meal.protein}g P / {meal.fiber}g F</Text>
                  </View>

                  <View style={styles.barContainer}>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[styles.barLabel, { color }]}>~{meal.peakGlucose}</Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Zap size={18} color="#f59e0b" />
                <Text style={styles.tipTitle}>How to Reduce Spikes</Text>
              </View>
              <Text style={styles.tipText}>• Eat fiber (vegetables) before your carbs.</Text>
              <Text style={styles.tipText}>• Buffer carbs with at least 20g of protein.</Text>
              <Text style={styles.tipText}>• Take a 10-minute walk after carb-heavy meals.</Text>
            </View>

            <Text style={styles.disclaimer}>* Glucose values are simulated using glycemic pressure modelling — not continuous glucose monitor data.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  content: { padding: 20, paddingBottom: 60 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 16, paddingHorizontal: 32 },
  graphCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    alignItems: 'center'
  },
  graphHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 10 },
  graphTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  graphLegend: { flexDirection: 'row', gap: 10, marginTop: 10 },
  legendZone: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  legendText: { fontSize: 10, fontWeight: '600', color: '#666' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  summaryDesc: { fontSize: 14, color: '#666', marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#000' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 16 },
  mealCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  mealName: { fontSize: 16, fontWeight: '600', color: '#000' },
  mealTime: { fontWeight: '400', color: '#999', fontSize: 14 },
  mealMacros: { fontSize: 12, color: '#666' },
  barContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barBg: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barLabel: { fontSize: 14, fontWeight: '700', width: 40 },
  tipCard: { backgroundColor: '#fff7ed', padding: 16, borderRadius: 16, marginTop: 12, borderWidth: 1, borderColor: '#fed7aa' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tipTitle: { fontSize: 16, fontWeight: '700', color: '#c2410c' },
  tipText: { fontSize: 14, color: '#9a3412', marginBottom: 6 },
  disclaimer: { fontSize: 11, color: '#aaa', marginTop: 20, textAlign: 'center' }
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Activity, Info, Zap, TrendingUp, Lightbulb } from 'lucide-react-native';
import api from '../../services/api';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const LEVEL_COLORS = { high: '#ef4444', moderate: '#f59e0b', low: '#10b981' };
const LEVEL_LABELS = { high: 'High-GL Day', moderate: 'Moderate GL', low: 'Well-Controlled' };

export default function InsulinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const date = params.date || new Date().toISOString().split('T')[0];

  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState(null);

  useEffect(() => {
    api.get(`/nutrition/logs/date/${date}`)
      .then(r => setLog(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  const analysis = log?.insulinIntelligence;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Glycemic Pattern</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 60 }}>
        {!analysis ? (
          <View style={styles.emptyState}>
            <Info size={40} color="#ccc" />
            <Text style={styles.emptyText}>Log meals with a time attached to see your glycemic pattern for today.</Text>
          </View>
        ) : (
          <View>
            {/* Overall status */}
            <View style={[styles.statusCard, { borderLeftColor: LEVEL_COLORS[analysis.overallLevel] }]}>
              <View style={styles.statusHeader}>
                <Activity size={22} color={LEVEL_COLORS[analysis.overallLevel]} />
                <Text style={[styles.statusTitle, { color: LEVEL_COLORS[analysis.overallLevel] }]}>
                  {LEVEL_LABELS[analysis.overallLevel]}
                </Text>
              </View>
              <Text style={styles.patternText}>{analysis.patternSummary}</Text>
            </View>

            {/* Counterfactual tip — the main actionable insight */}
            {analysis.bestCounterfactual && (
              <View style={styles.cfCard}>
                <View style={styles.cfHeader}>
                  <Lightbulb size={16} color="#f59e0b" />
                  <Text style={styles.cfTitle}>Best change for tomorrow</Text>
                </View>
                <Text style={styles.cfAction}>{analysis.bestCounterfactual.action}</Text>
                <Text style={styles.cfImpact}>
                  Estimated improvement: ~{analysis.bestCounterfactual.reduction} point reduction in peak response
                </Text>
              </View>
            )}

            {/* 24h curve */}
            <View style={styles.graphCard}>
              <View style={styles.graphHeader}>
                <TrendingUp size={18} color="#8b5cf6" />
                <Text style={styles.graphTitle}>Estimated 24h Pattern</Text>
              </View>
              <LineChart
                data={{ labels: analysis.labels, datasets: [{ data: analysis.curveData }] }}
                width={screenWidth - 48}
                height={180}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(139, 92, 246, ${Math.max(opacity, 0.7)})`,
                  labelColor: () => 'rgba(0,0,0,0.5)',
                  propsForDots: { r: '0' },
                }}
                bezier
                withVerticalLines={false}
                withHorizontalLines
                fromZero={false}
                style={{ borderRadius: 12, marginTop: 8 }}
              />
              <Text style={styles.graphNote}>Pattern model — not CGM data. Shows relative rises, not mg/dL values.</Text>
            </View>

            {/* Day stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{analysis.totalDailyFiber}g</Text>
                <Text style={styles.statLabel}>Total Fiber</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{analysis.totalDailyCarbs}g</Text>
                <Text style={styles.statLabel}>Total Carbs</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{analysis.totalDailySugar}g</Text>
                <Text style={styles.statLabel}>Total Sugar</Text>
              </View>
            </View>

            {/* Per-meal breakdown */}
            <Text style={styles.sectionTitle}>Meal Breakdown</Text>
            {analysis.mealAnalyses.map((meal, idx) => {
              const color = LEVEL_COLORS[meal.spikeLevel];
              return (
                <View key={idx} style={styles.mealCard}>
                  <View style={styles.mealTop}>
                    <View>
                      <Text style={styles.mealName}>{meal.name}</Text>
                      <Text style={styles.mealMeta}>{meal.time} · GI ~{meal.gi} · GL {meal.glycemicLoad}</Text>
                    </View>
                    <View style={[styles.levelBadge, { backgroundColor: color + '20', borderColor: color + '60' }]}>
                      <Text style={[styles.levelText, { color }]}>{meal.spikeLevel}</Text>
                    </View>
                  </View>
                  <Text style={styles.mealMacros}>{meal.carbs}g carbs · {meal.protein}g protein · {meal.fiber}g fiber</Text>

                  {/* Modifier tags */}
                  <View style={styles.modifierRow}>
                    {meal.modifiersApplied?.mealSequence && (
                      <View style={styles.modTag}><Text style={styles.modTagText}>↓ meal sequence</Text></View>
                    )}
                    {meal.modifiersApplied?.postWorkout && (
                      <View style={[styles.modTag, { backgroundColor: '#d1fae5' }]}><Text style={[styles.modTagText, { color: '#065f46' }]}>↓ post-workout</Text></View>
                    )}
                    {meal.modifiersApplied?.circadian === 'elevated' && (
                      <View style={[styles.modTag, { backgroundColor: '#fef3c7' }]}><Text style={[styles.modTagText, { color: '#92400e' }]}>↑ evening meal</Text></View>
                    )}
                    {meal.modifiersApplied?.cumulativeFiber && (
                      <View style={[styles.modTag, { backgroundColor: '#ede9fe' }]}><Text style={[styles.modTagText, { color: '#5b21b6' }]}>↓ fiber buffer</Text></View>
                    )}
                  </View>

                  {meal.counterfactual && (
                    <Text style={styles.mealCf}>
                      💡 {meal.counterfactual.action} → estimated ~{meal.counterfactual.reduction} point improvement
                    </Text>
                  )}
                </View>
              );
            })}

            {/* Tips */}
            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Zap size={16} color="#f59e0b" />
                <Text style={styles.tipTitle}>3 things that actually work</Text>
              </View>
              <Text style={styles.tipText}>1. Eat vegetables or protein before your carbs at any meal — proven ~37% spike reduction.</Text>
              <Text style={styles.tipText}>2. Take a 10-minute walk after a high-carb meal — muscles pull glucose directly.</Text>
              <Text style={styles.tipText}>3. Shift your heavy-carb meal earlier in the day — morning insulin sensitivity is higher.</Text>
            </View>
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
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  content: { padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 16, paddingHorizontal: 32, lineHeight: 22 },

  statusCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusTitle: { fontSize: 17, fontWeight: '700' },
  patternText: { fontSize: 14, color: '#555', lineHeight: 20 },

  cfCard: {
    backgroundColor: '#fffbeb', borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#fde68a',
  },
  cfHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cfTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  cfAction: { fontSize: 14, color: '#78350f', fontWeight: '600', marginBottom: 4 },
  cfImpact: { fontSize: 12, color: '#a16207' },

  graphCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    alignItems: 'center',
  },
  graphHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 4 },
  graphTitle: { fontSize: 15, fontWeight: '700', color: '#000' },
  graphNote: { fontSize: 10, color: '#aaa', marginTop: 8, textAlign: 'center' },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 10, marginTop: 4 },

  mealCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  mealTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  mealName: { fontSize: 15, fontWeight: '600', color: '#111' },
  mealMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  levelBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  levelText: { fontSize: 11, fontWeight: '700' },
  mealMacros: { fontSize: 12, color: '#666', marginBottom: 6 },
  modifierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  modTag: { backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  modTagText: { fontSize: 10, color: '#555', fontWeight: '600' },
  mealCf: { fontSize: 12, color: '#6d28d9', marginTop: 4, fontStyle: 'italic' },

  tipCard: {
    backgroundColor: '#fff7ed', borderRadius: 16, padding: 16, marginTop: 8,
    borderWidth: 1, borderColor: '#fed7aa',
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#c2410c' },
  tipText: { fontSize: 13, color: '#9a3412', marginBottom: 6, lineHeight: 20 },
});

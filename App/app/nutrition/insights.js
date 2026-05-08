import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Info, AlertTriangle, BookOpen, MessageSquare, Dna, Activity } from 'lucide-react-native';

export default function NutritionInsightsScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams();
  const selectedDate = date || new Date().toISOString().split('T')[0];
  
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState(null);
  const [dna, setDna] = useState(null);

  const fetchInsight = async () => {
    try {
      const res = await api.get(`/insights/nutrition/review?dayKey=${selectedDate}&narrate=1`);
      setInsight(res.data);
    } catch (err) {
      console.error('Failed to fetch nutrition insight', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDna = async () => {
    try {
      const res = await api.get('/insights/nutritional-dna');
      setDna(res.data);
    } catch (err) {
      console.error('Failed to fetch nutritional DNA', err);
    }
  };

  useEffect(() => {
    fetchInsight();
    fetchDna();
  }, [selectedDate]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const review = insight?.review || {};
  const narration = insight?.narration || '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Insight</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.dateCard}>
          <Text style={styles.dateText}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {narration ? (
          <View style={styles.narrationCard}>
            <View style={styles.narrationHeader}>
              <MessageSquare size={18} color="#8b5cf6" />
              <Text style={styles.narrationTitle}>LifeSync Analysis</Text>
            </View>
            <Text style={styles.narrationText}>{narration}</Text>
            {insight.rag?.ok && (
              <View style={styles.ragBadge}>
                <BookOpen size={12} color="#8b5cf6" />
                <Text style={styles.ragBadgeText}>Grounded in medical textbooks</Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Findings</Text>
          {review.flags?.length > 0 ? (
            review.flags.map((flag, i) => (
              <View key={i} style={styles.flagCard}>
                <View style={[styles.flagIcon, { backgroundColor: flag.severity === 'high' ? '#fef2f2' : '#fff7ed' }]}>
                  <AlertTriangle size={20} color={flag.severity === 'high' ? '#ef4444' : '#f59e0b'} />
                </View>
                <View style={styles.flagInfo}>
                  <Text style={styles.flagTitle}>{flag.title}</Text>
                  <Text style={styles.flagDesc}>{flag.description}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyInsight}>
              <Text style={styles.emptyText}>No major flags identified for today.</Text>
            </View>
          )}
        </View>

        {review.questionsForClinician?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>To Discuss With Clinician</Text>
            <View style={styles.questionsCard}>
              {review.questionsForClinician.map((q, i) => (
                <View key={i} style={styles.questionRow}>
                  <Info size={16} color="#666" style={{ marginTop: 2 }} />
                  <Text style={styles.questionText}>{q}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧬 Nutritional DNA</Text>
          {dna && dna.status !== 'insufficient_data' && dna.profile ? (
            <View style={styles.dnaCard}>
              <View style={styles.dnaHeader}>
                <Text style={styles.dnaTitle}>Carbohydrate Tolerance</Text>
                <View style={[styles.dnaBadge, { backgroundColor: dna.profile.carbTolerance?.tolerance === 'high' ? '#dcfce7' : dna.profile.carbTolerance?.tolerance === 'low' ? '#fecaca' : '#f1f5f9' }]}>
                  <Text style={[styles.dnaBadgeText, { color: dna.profile.carbTolerance?.tolerance === 'high' ? '#16a34a' : dna.profile.carbTolerance?.tolerance === 'low' ? '#dc2626' : '#64748b' }]}>
                    {dna.profile.carbTolerance?.tolerance?.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.dnaReasoning}>{dna.profile.carbTolerance?.reasoning}</Text>
              
              <View style={styles.dnaStrategy}>
                <Text style={styles.dnaStrategyTitle}>Recommended Strategy</Text>
                <Text style={styles.dnaStrategyText}>{dna.profile.carbTolerance?.action}</Text>
              </View>
              
              <View style={styles.dnaDivider} />
              
              <View style={styles.dnaHeader}>
                <Text style={styles.dnaTitle}>Salt Sensitivity</Text>
                <View style={[styles.dnaBadge, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[styles.dnaBadgeText, { color: '#64748b' }]}>ANALYZING</Text>
                </View>
              </View>
              <Text style={styles.dnaReasoning}>Tracking how morning weight correlates with previous-day sodium intake.</Text>
            </View>
          ) : (
            <View style={styles.dnaCard}>
              <Activity size={32} color="#94a3b8" style={{ marginBottom: 12, alignSelf: 'center' }} />
              <Text style={[styles.dnaTitle, { textAlign: 'center' }]}>Analyzing...</Text>
              <Text style={[styles.dnaReasoning, { textAlign: 'center', marginTop: 4 }]}>Keep logging your meals. Observing how your body responds to macronutrients.</Text>
            </View>
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  dateCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  narrationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ede9fe',
    elevation: 2,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  narrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  narrationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7c3aed',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  narrationText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  ragBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 6,
  },
  ragBadgeText: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    paddingHorizontal: 4,
  },
  flagCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  flagIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  flagInfo: {
    flex: 1,
  },
  flagTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  flagDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  questionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  questionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    flex: 1,
  },
  emptyInsight: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  dnaCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dnaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dnaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  dnaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dnaBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dnaReasoning: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  dnaStrategy: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  dnaStrategyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dnaStrategyText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  dnaDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
});

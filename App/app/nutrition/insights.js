import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { Info, AlertTriangle, BookOpen, MessageSquare, Activity } from 'lucide-react-native';
import DeficiencyRadar from '../../components/Nutrition/DeficiencyRadar';
import { useTheme } from '../../constants/Theme';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H3, Body, Caption } from '../../components/ui/Typography';

export default function NutritionInsightsScreen() {
  const router = useRouter();
  const { COLORS, TYPOGRAPHY, SHADOWS } = useTheme();
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
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const review = insight?.review || {};
  const narration = insight?.narration || '';

  return (
    <ScreenWrapper title="Nutrition Insight">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.dateCard}>
          <Body secondary style={{ fontWeight: '600' }}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Body>
        </View>

        {narration ? (
          <Card style={[styles.narrationCard, { borderColor: COLORS.insight + '30', ...SHADOWS }]} padding={20}>
            <View style={styles.narrationHeader}>
              <MessageSquare size={18} color={COLORS.insight} />
              <H3 style={[styles.narrationTitle, { color: COLORS.insight }]}>LifeSync Analysis</H3>
            </View>
            <Body style={styles.narrationText}>{narration}</Body>
            {insight.rag?.ok && (
              <View style={[styles.ragBadge, { borderTopColor: COLORS.border }]}>
                <BookOpen size={12} color={COLORS.insight} />
                <Caption style={{ color: COLORS.insight, fontWeight: '600' }}>Grounded in medical textbooks</Caption>
              </View>
            )}
          </Card>
        ) : null}

        <View style={styles.section}>
          <H3 style={styles.sectionTitle}>Key Findings</H3>
          {review.flags?.length > 0 ? (
            review.flags.map((flag, i) => {
              const severityColor = flag.severity === 'high' ? COLORS.error : COLORS.warning;
              return (
                <Card key={i} style={styles.flagCard} padding={16}>
                  <View style={[styles.flagIcon, { backgroundColor: severityColor + '15' }]}>
                    <AlertTriangle size={20} color={severityColor} />
                  </View>
                  <View style={styles.flagInfo}>
                    <Body style={{ fontWeight: '700' }}>{flag.title}</Body>
                    <Caption style={{ marginTop: 2 }}>{flag.description}</Caption>
                  </View>
                </Card>
              );
            })
          ) : (
            <Card style={styles.emptyInsight} padding={30}>
              <Caption>No major flags identified for today.</Caption>
            </Card>
          )}
        </View>

        {review.questionsForClinician?.length > 0 && (
          <View style={styles.section}>
            <H3 style={styles.sectionTitle}>To Discuss With Clinician</H3>
            <Card style={styles.questionsCard} padding={20}>
              {review.questionsForClinician.map((q, i) => (
                <View key={i} style={styles.questionRow}>
                  <Info size={16} color={COLORS.textSecondary} style={{ marginTop: 2 }} />
                  <Body style={styles.questionText}>{q}</Body>
                </View>
              ))}
            </Card>
          </View>
        )}

        <DeficiencyRadar risks={review.deficiencyRisks} />

        <View style={styles.section}>
          <H3 style={styles.sectionTitle}>🧬 Nutritional DNA</H3>
          {dna && dna.status !== 'insufficient_data' && dna.profile ? (
            <Card style={styles.dnaCard} padding={20}>
              <View style={styles.dnaHeader}>
                <Body style={{ fontWeight: '700' }}>Carbohydrate Tolerance</Body>
                <View style={[styles.dnaBadge, { backgroundColor: dna.profile.carbTolerance?.tolerance === 'high' ? COLORS.success + '15' : dna.profile.carbTolerance?.tolerance === 'low' ? COLORS.error + '15' : COLORS.gray100 }]}>
                  <Caption style={{ color: dna.profile.carbTolerance?.tolerance === 'high' ? COLORS.success : dna.profile.carbTolerance?.tolerance === 'low' ? COLORS.error : COLORS.textSecondary, fontWeight: '800' }}>
                    {dna.profile.carbTolerance?.tolerance?.toUpperCase()}
                  </Caption>
                </View>
              </View>
              <Body style={styles.dnaReasoning}>{dna.profile.carbTolerance?.reasoning}</Body>
              
              <View style={[styles.dnaStrategy, { backgroundColor: COLORS.gray100, borderColor: COLORS.border }]}>
                <Caption style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Recommended Strategy</Caption>
                <Body style={{ fontWeight: '500' }}>{dna.profile.carbTolerance?.action}</Body>
              </View>
              
              <View style={[styles.dnaDivider, { backgroundColor: COLORS.border }]} />
              
              <View style={styles.dnaHeader}>
                <Body style={{ fontWeight: '700' }}>Salt Sensitivity</Body>
                <View style={[styles.dnaBadge, { backgroundColor: COLORS.gray100 }]}>
                  <Caption style={{ color: COLORS.textSecondary, fontWeight: '800' }}>ANALYZING</Caption>
                </View>
              </View>
              <Body style={styles.dnaReasoning}>Tracking how morning weight correlates with previous-day sodium intake.</Body>
            </Card>
          ) : (
            <Card style={styles.dnaCard} padding={20}>
              <Activity size={32} color={COLORS.gray400} style={{ marginBottom: 12, alignSelf: 'center' }} />
              <Body style={{ fontWeight: '700', textAlign: 'center' }}>Analyzing...</Body>
              <Body style={{ textAlign: 'center', marginTop: 4 }}>Keep logging your meals. Observing how your body responds to macronutrients.</Body>
            </Card>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  dateCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  narrationCard: {
    marginBottom: 24,
  },
  narrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  narrationTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  narrationText: {
    lineHeight: 24,
  },
  ragBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  flagCard: {
    flexDirection: 'row',
    marginBottom: 12,
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
  questionsCard: {
  },
  questionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  questionText: {
    lineHeight: 20,
    flex: 1,
  },
  emptyInsight: {
    alignItems: 'center',
  },
  dnaCard: {
  },
  dnaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dnaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dnaReasoning: {
    lineHeight: 20,
    marginBottom: 16,
  },
  dnaStrategy: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dnaDivider: {
    height: 1,
    marginVertical: 16,
  },
});

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { useTheme } from '../../constants/Theme';
import { 
  ChevronLeft, ChevronRight, Award, TrendingUp, 
  Moon, Battery, Brain, Utensils, Info 
} from 'lucide-react-native';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, H3, Body, Caption } from '../../components/ui/Typography';

const screenWidth = Dimensions.get('window').width;

export default function WeeklyReviewScreen() {
  const router = useRouter();
  const { COLORS, BORDER_RADIUS, SHADOWS } = useTheme();
  const params = useLocalSearchParams();

  // Logic to get current week key (YYYY-Wnn)
  const getWeekKey = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const [loading, setLoading] = useState(true);
  const [weekKey, setWeekKey] = useState(params.weekKey || getWeekKey());
  const [review, setReview] = useState(null);

  const fetchReview = async (key) => {
    setLoading(true);
    try {
      const res = await api.get(`/insights/weekly-review?weekKey=${key}`);
      setReview(res.data);
    } catch (err) {
      console.error('Failed to fetch weekly review', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReview(weekKey);
  }, [weekKey]);

  const changeWeek = (direction) => {
    const [year, week] = weekKey.split('-W').map(Number);
    let newWeek = week + direction;
    let newYear = year;
    if (newWeek < 1) { newWeek = 52; newYear--; }
    if (newWeek > 52) { newWeek = 1; newYear++; }
    setWeekKey(`${newYear}-W${String(newWeek).padStart(2, '0')}`);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScreenWrapper title="Weekly Deep Dive">
      <View style={[styles.weekPicker, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.pickerBtn}>
          <ChevronLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <H3>{weekKey}</H3>
        <TouchableOpacity onPress={() => changeWeek(1)} style={styles.pickerBtn}>
          <ChevronRight size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Top Wins */}
        {review?.insights?.length > 0 && (
          <View style={styles.section}>
            <Caption secondary style={styles.sectionLabel}>WEEKLY WINS & INSIGHTS</Caption>
            {review.insights.map((msg, i) => (
              <Card key={i} style={[styles.insightCard, { borderLeftColor: COLORS.success }]} padding={16}>
                <View style={styles.insightRow}>
                  <Award size={20} color={COLORS.success} style={{ marginRight: 12 }} />
                  <Body style={{ flex: 1, lineHeight: 20 }}>{msg}</Body>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Strongest Lift */}
        {review?.strongestLift && (
          <View style={styles.section}>
            <Caption secondary style={styles.sectionLabel}>PEAK PERFORMANCE</Caption>
            <Card style={styles.liftCard} padding={20}>
              <TrendingUp size={24} color={COLORS.training} />
              <View style={{ marginTop: 12 }}>
                <H2>{review.strongestLift.weight}kg</H2>
                <Body style={{ fontWeight: '700' }}>{review.strongestLift.exercise}</Body>
                <Caption secondary>{review.strongestLift.reps} reps · {new Date(review.strongestLift.date).toLocaleDateString('en-IN')}</Caption>
              </View>
            </Card>
          </View>
        )}

        {/* Biological Persona */}
        <View style={styles.section}>
          <Caption secondary style={styles.sectionLabel}>BIOLOGICAL PERSONA</Caption>
          <View style={styles.bioGrid}>
            <BioCard 
              label="Sleep" icon={<Moon size={18} color={COLORS.info} />} 
              value={review?.biologicalPersona?.sleepArchitecture?.quality || '--'} 
              sub="Quality"
            />
            <BioCard 
              label="Recovery" icon={<Battery size={18} color={COLORS.success} />} 
              value={review?.biologicalPersona?.recoveryCapacity || 'Stable'} 
              sub="Status"
            />
            <BioCard 
              label="Stress" icon={<Brain size={18} color={COLORS.wellness} />} 
              value={review?.biologicalPersona?.stressResilience || 'Good'} 
              sub="Resilience"
            />
            <BioCard 
              label="Diversity" icon={<Utensils size={18} color={COLORS.nutrition} />} 
              value={review?.biologicalPersona?.gutDiversity || 0} 
              sub="Plant Points"
            />
          </View>
        </View>

        {/* Nutrition Highlights */}
        {review?.bestDay && (
          <View style={styles.section}>
            <Caption secondary style={styles.sectionLabel}>NUTRITION SPOTLIGHT</Caption>
            <Card padding={16} style={{ marginBottom: 12 }}>
              <View style={styles.dayHeader}>
                <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                <Body style={{ fontWeight: '700' }}>Best Consistency: {new Date(review.bestDay.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</Body>
              </View>
              <Caption secondary style={{ marginTop: 4 }}>Hit {review.bestDay.proteinPercent}% of protein target.</Caption>
            </Card>
            
            {review?.worstDay && (
              <Card padding={16}>
                <View style={styles.dayHeader}>
                  <View style={[styles.dot, { backgroundColor: COLORS.warning }]} />
                  <Body style={{ fontWeight: '700' }}>Focus Required: {new Date(review.worstDay.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</Body>
                </View>
                <Caption secondary style={{ marginTop: 4 }}>{review.worstDay.explanation}</Caption>
              </Card>
            )}
          </View>
        )}

        <Card style={styles.goalCard} padding={20}>
          <H3 style={{ color: COLORS.primaryContrast }}>Next Week's Focus</H3>
          <Body style={{ color: COLORS.primaryContrast, marginTop: 8, lineHeight: 22 }}>
            {review?.nextWeekGoal}
          </Body>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

function BioCard({ label, icon, value, sub }) {
  const { COLORS } = useTheme();
  return (
    <Card style={styles.bioCard} padding={12}>
      <View style={styles.bioHeader}>
        {icon}
        <Caption secondary style={{ marginLeft: 6, fontWeight: '700' }}>{label}</Caption>
      </View>
      <Body style={{ fontWeight: '800', marginTop: 8 }}>{value}</Body>
      <Caption secondary style={{ fontSize: 10 }}>{sub}</Caption>
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  weekPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  pickerBtn: { padding: 8 },
  section: { marginBottom: 24 },
  sectionLabel: { marginBottom: 12, fontWeight: '800', marginLeft: 4 },
  insightCard: { marginBottom: 8, borderLeftWidth: 4 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start' },
  liftCard: { alignItems: 'flex-start' },
  bioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bioCard: { flex: 1, minWidth: '45%' },
  bioHeader: { flexDirection: 'row', alignItems: 'center' },
  dayHeader: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  goalCard: { backgroundColor: '#000', marginBottom: 20 },
});

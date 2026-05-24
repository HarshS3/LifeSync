import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import api from '../../services/api';
import { TrendingUp, Info, ChevronRight, FileText, Calendar as CalendarIcon } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, H3, Body, Caption } from '../../components/ui/Typography';

const screenWidth = Dimensions.get('window').width;

export default function InsightsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { COLORS, SHADOWS } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [learning, setLearning] = useState(null);
  const [metabolic, setMetabolic] = useState(null);

  const fetchData = async () => {
    try {
      const end = new Date().toLocaleDateString('en-CA');
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
      
      const [rangeRes, learningRes, metabolicRes] = await Promise.all([
        api.get(`/daily-life-state/range?start=${start}&end=${end}`).catch(() => ({ data: [] })),
        api.get('/insights/learning/overall?days=7').catch(() => ({ data: null })),
        api.get('/nutrition/metabolic-map?daysBack=30').catch(() => ({ data: null }))
      ]);
      
      setData(rangeRes.data);
      setLearning(learningRes.data);
      setMetabolic(metabolicRes.data);
    } catch (err) {
      console.error('Failed to fetch insights data', err);
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

  const chartConfig = {
    backgroundColor: COLORS.surface,
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => COLORS.text,
    labelColor: (opacity = 1) => COLORS.textSecondary,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.primary }
  };

  // Prepare chart data
  const labels = data.map(d => d.dayKey.split('-').slice(2).join('/'));
  const readinessData = data.map(d => d.metrics?.readinessScore || 50);
  const trainingLoadData = data.map(d => d.metrics?.trainingLoad || 0);
  const moodData = data.map(d => (d.signals?.mood?.value || 0.5) * 100);

  const readinessChartData = {
    labels: labels.length > 0 ? labels : ['--'],
    datasets: [
      {
        data: readinessData.length > 0 ? readinessData : [0],
        color: (opacity = 1) => COLORS.training,
        strokeWidth: 3
      },
      {
        data: trainingLoadData.length > 0 ? trainingLoadData : [0],
        color: (opacity = 1) => COLORS.load,
        strokeWidth: 2
      }
    ],
    legend: ['Readiness', 'Workload']
  };

  const moodChartData = {
    labels: labels.length > 0 ? labels : ['--'],
    datasets: [
      {
        data: moodData.length > 0 ? moodData : [0],
        color: (opacity = 1) => COLORS.wellness,
        strokeWidth: 3
      }
    ]
  };

  return (
    <ScreenWrapper 
      title="Trends & Insights" 
      showBack={false}
      headerRight={
        <TouchableOpacity onPress={() => router.push('/profile')} style={[styles.avatarMini, { backgroundColor: COLORS.primary }]}>
           <Caption style={{ color: COLORS.primaryContrast, fontWeight: 'bold' }}>{user?.name?.charAt(0)}</Caption>
        </TouchableOpacity>
      }
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Intelligence Reports Section */}
        <View style={styles.section}>
          <Caption secondary style={styles.sectionLabel}>INTELLIGENCE REPORTS</Caption>
          <View style={styles.reportRow}>
            <TouchableOpacity 
              style={[styles.reportCardSmall, { backgroundColor: COLORS.surface }]} 
              onPress={() => router.push('/insights/weekly')}
            >
              <View style={[styles.reportIcon, { backgroundColor: COLORS.training + '15' }]}>
                <TrendingUp size={20} color={COLORS.training} />
              </View>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '700', fontSize: 13 }}>Weekly Review</Body>
                <Caption secondary style={{ fontSize: 10 }}>AI Coaching</Caption>
              </View>
              <ChevronRight size={14} color={COLORS.gray300} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.reportCardSmall, { backgroundColor: COLORS.surface }]} 
              onPress={() => router.push('/insights/monthly')}
            >
              <View style={[styles.reportIcon, { backgroundColor: COLORS.success + '15' }]}>
                <FileText size={20} color={COLORS.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '700', fontSize: 13 }}>Monthly Data</Body>
                <Caption secondary style={{ fontSize: 10 }}>History Archive</Caption>
              </View>
              <ChevronRight size={14} color={COLORS.gray300} />
            </TouchableOpacity>
          </View>
        </View>

        <Caption secondary style={styles.sectionLabel}>LAST 7 DAYS TRENDS</Caption>

        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            <Card style={styles.chartCard} padding={12}>
              <Body style={styles.chartTitle}>Readiness vs. Workload</Body>
              <LineChart
                data={readinessChartData}
                width={screenWidth - 32}
                height={200}
                chartConfig={{
                  ...chartConfig,
                  backgroundGradientFrom: COLORS.surface,
                  backgroundGradientTo: COLORS.surface,
                  fillShadowGradientFrom: COLORS.training,
                  fillShadowGradientTo: COLORS.surface,
                  propsForLabels: { fontSize: 10 }
                }}
                bezier
                style={{ marginLeft: -20, marginTop: 8 }}
                withInnerLines={false}
                withOuterLines={false}
              />
            </Card>

            <Card style={styles.chartCard} padding={12}>
              <Body style={styles.chartTitle}>Mood & Mental Stability</Body>
              <LineChart
                data={moodChartData}
                width={screenWidth - 32}
                height={180}
                chartConfig={{
                   ...chartConfig, 
                   color: (opacity = 1) => COLORS.wellness,
                   backgroundGradientFrom: COLORS.surface,
                   backgroundGradientTo: COLORS.surface,
                   fillShadowGradientFrom: COLORS.wellness,
                   fillShadowGradientTo: COLORS.surface,
                   propsForLabels: { fontSize: 10 }
                }}
                bezier
                style={{ marginLeft: -20, marginTop: 8 }}
                withInnerLines={false}
                withOuterLines={false}
              />
            </Card>

            <View style={styles.section}>
              <H3 style={styles.sectionTitle}>Metabolic Analysis</H3>
              {metabolic?.status === 'success' ? (
                <Card style={styles.metabolicCard} padding={20}>
                  <View style={styles.tdeeRow}>
                    <View>
                      <Caption secondary>ADAPTIVE TDEE</Caption>
                      <H2 style={{ color: COLORS.primary, fontSize: 32 }}>{metabolic.dynamicTDEE}<Body secondary> cal</Body></H2>
                    </View>
                    <View style={[styles.phaseBadge, { backgroundColor: COLORS.nutrition + '15' }]}>
                      <Caption style={{ color: COLORS.nutrition, fontWeight: '800' }}>{metabolic.dietPhase.replace('_', ' ').toUpperCase()}</Caption>
                    </View>
                  </View>
                  
                  <Body secondary style={{ marginBottom: 16, fontStyle: 'italic', fontSize: 13 }}>
                    "{metabolic.insight}"
                  </Body>

                  <View style={styles.modifierList}>
                    <View style={styles.modifierItem}>
                      <View style={{ flex: 1 }}>
                        <Body style={{ fontWeight: '700', fontSize: 14 }}>Stress Impact</Body>
                        <Caption secondary numberOfLines={1}>{metabolic.modifiers.stress.label}</Caption>
                      </View>
                      <Body style={{ color: metabolic.modifiers.stress.value < 0 ? COLORS.error : COLORS.success, fontWeight: 'bold' }}>
                        {metabolic.modifiers.stress.value > 0 ? '+' : ''}{metabolic.modifiers.stress.value}
                      </Body>
                    </View>
                    
                    <View style={styles.modifierItem}>
                      <View style={{ flex: 1 }}>
                        <Body style={{ fontWeight: '700', fontSize: 14 }}>Training EPOC</Body>
                        <Caption secondary numberOfLines={1}>{metabolic.modifiers.training.label}</Caption>
                      </View>
                      <Body style={{ color: metabolic.modifiers.training.value < 0 ? COLORS.error : COLORS.success, fontWeight: 'bold' }}>
                        {metabolic.modifiers.training.value > 0 ? '+' : ''}{metabolic.modifiers.training.value}
                      </Body>
                    </View>

                    {metabolic.modifiers.adaptation.value !== 0 && (
                      <View style={styles.modifierItem}>
                        <View style={{ flex: 1 }}>
                          <Body style={{ fontWeight: '700', fontSize: 14 }}>Metabolic Adaptation</Body>
                          <Caption secondary numberOfLines={1}>{metabolic.modifiers.adaptation.label}</Caption>
                        </View>
                        <Body style={{ color: COLORS.error, fontWeight: 'bold' }}>
                          {metabolic.modifiers.adaptation.value}
                        </Body>
                      </View>
                    )}
                  </View>
                </Card>
              ) : (
                <Card style={styles.emptyCard} padding={20}>
                  <View style={{ alignItems: 'center' }}>
                    <Info size={24} color={COLORS.gray400} />
                    <Body secondary style={{ textAlign: 'center', marginTop: 8 }}>
                      {metabolic?.message || "Log weight and nutrition for 14+ days to unlock your Adaptive TDEE analysis."}
                    </Body>
                  </View>
                </Card>
              )}
            </View>

            <View style={styles.section}>
              <H3 style={styles.sectionTitle}>Patterns Identified</H3>
              {learning?.patterns?.length > 0 ? (
                learning.patterns.map((p, i) => (
                  <Card key={i} style={styles.patternCard} padding={12}>
                    <TrendingUp size={20} color={COLORS.training} style={styles.patternIcon} />
                    <View style={styles.patternContent}>
                      <Body style={{ fontWeight: '700' }}>{p.name}</Body>
                      <Caption secondary>{p.description}</Caption>
                    </View>
                  </Card>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Info size={20} color={COLORS.gray400} />
                  <Caption secondary style={{ marginTop: 8 }}>Keep logging to discover patterns!</Caption>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <H3 style={styles.sectionTitle}>State Summary</H3>
              <View style={styles.summaryGrid}>
                {Object.entries(learning?.stateSummary?.counts || {}).map(([label, count]) => (
                  <Card key={label} style={styles.summaryItem} padding={16}>
                    <H2 style={{ color: COLORS.primary }}>{count}</H2>
                    <Caption secondary style={{ textTransform: 'uppercase', textAlign: 'center', fontWeight: '800', fontSize: 10, marginTop: 4 }}>{label}</Caption>
                  </Card>
                ))}
              </View>
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16 },
  centered: { padding: 40, alignItems: 'center' },
  sectionLabel: { marginBottom: 12, fontWeight: '800', marginLeft: 4, letterSpacing: 1 },
  reportRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  reportCardSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  reportIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartCard: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  patternCard: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  patternIcon: {
    marginRight: 12,
  },
  patternContent: {
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metabolicCard: {
    marginBottom: 12,
  },
  tdeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  phaseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modifierList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  modifierItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  }
});

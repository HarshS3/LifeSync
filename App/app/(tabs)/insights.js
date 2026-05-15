import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import api from '../../services/api';
import { TrendingUp, Info } from 'lucide-react-native';
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

  const fetchData = async () => {
    try {
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [rangeRes, learningRes] = await Promise.all([
        api.get(`/daily-life-state/range?start=${start}&end=${end}`).catch(() => ({ data: [] })),
        api.get('/insights/learning/overall?days=7').catch(() => ({ data: null }))
      ]);
      
      setData(rangeRes.data);
      setLearning(learningRes.data);
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
        strokeWidth: 2
      },
      {
        data: trainingLoadData.length > 0 ? trainingLoadData : [0],
        color: (opacity = 1) => COLORS.wellness,
        strokeWidth: 2
      }
    ],
    legend: ['Readiness', 'Load']
  };

  const moodChartData = {
    labels: labels.length > 0 ? labels : ['--'],
    datasets: [
      {
        data: moodData.length > 0 ? moodData : [0],
        color: (opacity = 1) => COLORS.insight,
        strokeWidth: 2
      }
    ]
  };

  return (
    <ScreenWrapper 
      title="Trends & Insights" 
      showBack={false}
      headerRight={
        <TouchableOpacity onPress={() => router.push('/profile')} style={[styles.avatarMini, { backgroundColor: COLORS.primary }]}>
           <Caption style={{ color: COLORS.surface, fontWeight: 'bold' }}>{user?.name?.charAt(0)}</Caption>
        </TouchableOpacity>
      }
    >
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Caption secondary style={styles.subtitle}>Last 7 Days Analysis</Caption>

        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            <Card style={styles.chartCard}>
              <Body style={styles.chartTitle}>Readiness vs. Training Load</Body>
              <LineChart
                data={readinessChartData}
                width={screenWidth - 64}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </Card>

            <Card style={styles.chartCard}>
              <Body style={styles.chartTitle}>Mood Stability</Body>
              <LineChart
                data={moodChartData}
                width={screenWidth - 64}
                height={180}
                chartConfig={{...chartConfig, color: (opacity = 1) => COLORS.insight }}
                bezier
                style={styles.chart}
              />
            </Card>

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
                  <Card key={label} style={styles.summaryItem} padding={12}>
                    <H2 style={{ color: COLORS.primary }}>{count}</H2>
                    <Caption secondary style={{ textTransform: 'capitalize', textAlign: 'center' }}>{label}</Caption>
                  </Card>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  centered: { padding: 40, alignItems: 'center' },
  subtitle: { marginBottom: 16, textAlign: 'center' },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartCard: {
    marginBottom: 20,
    padding: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

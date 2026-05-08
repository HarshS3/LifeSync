import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import api from '../../services/api';
import { TrendingUp, Info } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';

const screenWidth = Dimensions.get('window').width;

export default function InsightsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [learning, setLearning] = useState(null);

  const fetchData = async () => {
    try {
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [rangeRes, learningRes] = await Promise.all([
        api.get(`/daily-life-state/range?start=${start}&end=${end}`),
        api.get('/insights/learning/overall?days=7')
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

  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  if (loading && !refreshing) {
    return (
      <View style={themedStyles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: COLORS.surface,
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => COLORS.text,
    labelColor: (opacity = 1) => COLORS.textSecondary,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: COLORS.warning
    }
  };

  // Prepare chart data
  const labels = data.map(d => d.dayKey.split('-').slice(2).join('/')); // Only show DD
  const readinessData = data.map(d => d.metrics?.readinessScore || 50);
  const trainingLoadData = data.map(d => d.metrics?.trainingLoad || 0);
  const moodData = data.map(d => (d.signals?.mood?.value || 0.5) * 100);

  const readinessChartData = {
    labels: labels.length > 0 ? labels : ['--'],
    datasets: [
      {
        data: readinessData.length > 0 ? readinessData : [0],
        color: (opacity = 1) => COLORS.info, // Blue
        strokeWidth: 2
      },
      {
        data: trainingLoadData.length > 0 ? trainingLoadData : [0],
        color: (opacity = 1) => COLORS.error, // Red
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
        color: (opacity = 1) => COLORS.success, // Green
        strokeWidth: 2
      }
    ]
  };

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={themedStyles.title}>Trends & Insights</Text>
          <Text style={themedStyles.subtitle}>Last 7 Days Analysis</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')} style={themedStyles.avatarMini}>
           <Text style={themedStyles.avatarTextMini}>{user?.name?.charAt(0)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={themedStyles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={themedStyles.chartCard}>
          <Text style={themedStyles.chartTitle}>Readiness vs. Training Load</Text>
          <LineChart
            data={readinessChartData}
            width={screenWidth - 48}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={themedStyles.chart}
          />
        </View>

        <View style={themedStyles.chartCard}>
          <Text style={themedStyles.chartTitle}>Mood Stability</Text>
          <LineChart
            data={moodChartData}
            width={screenWidth - 48}
            height={180}
            chartConfig={{...chartConfig, color: (opacity = 1) => COLORS.success }}
            bezier
            style={themedStyles.chart}
          />
        </View>

        <View style={themedStyles.section}>
          <Text style={themedStyles.sectionTitle}>Patterns Identified</Text>
          {learning?.patterns?.length > 0 ? (
            learning.patterns.map((p, i) => (
              <View key={i} style={themedStyles.patternCard}>
                <TrendingUp size={20} color={COLORS.info} style={themedStyles.patternIcon} />
                <View style={themedStyles.patternContent}>
                  <Text style={themedStyles.patternName}>{p.name}</Text>
                  <Text style={themedStyles.patternDesc}>{p.description}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={themedStyles.emptyCard}>
              <Info size={20} color={COLORS.gray400} />
              <Text style={themedStyles.emptyText}>Keep logging to discover patterns!</Text>
            </View>
          )}
        </View>

        <View style={themedStyles.section}>
          <Text style={themedStyles.sectionTitle}>State Summary</Text>
          <View style={themedStyles.summaryGrid}>
            {Object.entries(learning?.stateSummary?.counts || {}).map(([label, count]) => (
              <View key={label} style={themedStyles.summaryItem}>
                <Text style={themedStyles.summaryValue}>{count}</Text>
                <Text style={themedStyles.summaryLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={themedStyles.footerSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = (COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: SPACING.lg,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    ...SHADOWS,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextMini: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  chartCard: {
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS,
  },
  chartTitle: {
    ...TYPOGRAPHY.label,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  section: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    paddingHorizontal: 8,
  },
  patternCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  patternIcon: {
    marginRight: SPACING.md,
  },
  patternContent: {
    flex: 1,
  },
  patternName: {
    ...TYPOGRAPHY.label,
    fontSize: 15,
    color: COLORS.text,
  },
  patternDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray400,
    marginTop: 8,
    fontSize: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '31%',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.info,
  },
  summaryLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
    marginTop: 4,
  },
  footerSpacer: {
    height: 40,
  },
});

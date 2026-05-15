import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp, Search, Info, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, Body, Caption, H3 } from '../../components/ui/Typography';

const screenWidth = Dimensions.get('window').width;

const COMMON_EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Lat Pulldown', 'Leg Press', 'Pull Up', 'Bicep Curl', 'Tricep Extension'
];

export default function ProgressionScreen() {
  const router = useRouter();
  const { COLORS } = useTheme();
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
      const res = await api.get(`/gym/exercise-history/${encodeURIComponent(exName)}`).catch(() => ({ data: null }));
      if (res?.data) {
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
        color: (opacity = 1) => COLORS.primary,
        strokeWidth: 3
      }
    ]
  };

  return (
    <ScreenWrapper title="Progression">
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.searchContainer, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Search size={18} color={COLORS.gray400} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: COLORS.text }]}
            placeholder="Search an exercise..."
            placeholderTextColor={COLORS.gray400}
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
                style={[
                  styles.chip, 
                  { backgroundColor: COLORS.surface, borderColor: COLORS.border },
                  exercise === ex && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExercise(ex);
                }}
              >
                <Body style={[
                  { color: COLORS.textSecondary, fontWeight: '600' },
                  exercise === ex && { color: COLORS.surface }
                ]}>{ex}</Body>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Card style={styles.chartCard} padding={20}>
          <View style={styles.chartHeader}>
            <TrendingUp size={24} color={COLORS.primary} />
            <H2>{exercise}</H2>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : history.length > 0 ? (
            <View>
              <View style={[styles.statsRow, { borderBottomColor: COLORS.gray100 }]}>
                <View style={styles.statBox}>
                  <H2>{stats?.maxWeight}kg</H2>
                  <Caption secondary>Max Weight</Caption>
                </View>
                <View style={styles.statBox}>
                  <H2>{stats?.estimated1RM}kg</H2>
                  <Caption secondary>Est. 1RM</Caption>
                </View>
              </View>
              
              <Body style={{ fontWeight: '600', marginBottom: 12 }}>Recent Progression (Weight)</Body>
              <LineChart
                data={chartData}
                width={screenWidth - 72}
                height={220}
                yAxisLabel=""
                yAxisSuffix="kg"
                chartConfig={{
                  backgroundColor: COLORS.surface,
                  backgroundGradientFrom: COLORS.surface,
                  backgroundGradientTo: COLORS.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => COLORS.primary,
                  labelColor: (opacity = 1) => COLORS.textSecondary,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: COLORS.primary
                  }
                }}
                bezier
                style={styles.chart}
              />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: COLORS.gray100 }]}>
                <Info size={32} color={COLORS.gray400} />
              </View>
              <H3 style={{ marginBottom: 8 }}>No History Yet</H3>
              <Body secondary style={{ textAlign: 'center', marginBottom: 24 }}>
                You haven't logged any sets for {exercise} yet. 
                Complete a workout to see your progress here!
              </Body>
              <TouchableOpacity 
                style={[styles.emptyAction, { backgroundColor: COLORS.primary }]}
                onPress={() => router.push('/training/active')}
              >
                <Play size={16} color={COLORS.surface} />
                <Body style={{ color: COLORS.surface, fontWeight: '700' }}>Start Workout</Body>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  searchContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 16,
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    marginBottom: 16, 
    borderWidth: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  chipsScroll: { marginBottom: 24 },
  chip: {
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20,
    marginRight: 8, 
    borderWidth: 1,
  },
  chartCard: {
    marginBottom: 40,
  },
  chartHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20, 
    gap: 12 
  },
  loadingContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 24, 
    paddingBottom: 24, 
    borderBottomWidth: 1, 
  },
  statBox: { alignItems: 'center' },
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
});

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, TextInput, FlatList, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp, Search, Info, Play, ChevronRight, BarChart2, Activity, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../constants/Theme';
import { EXERCISE_LIBRARY } from '../../constants/ExerciseLibrary';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, Body, Caption, H3 } from '../../components/ui/Typography';

const screenWidth = Dimensions.get('window').width;

export default function ProgressionScreen() {
  const router = useRouter();
  const { COLORS } = useTheme();
  const [exercise, setExercise] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [namesLoading, setNamesLoading] = useState(true);
  const [allNames, setAllNames] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all');

  useEffect(() => {
    fetchExerciseNames();
  }, []);

  useEffect(() => {
    if (exercise) {
      fetchProgression(exercise);
    }
  }, [exercise]);

  const fetchExerciseNames = async () => {
    setNamesLoading(true);
    try {
      const res = await api.get('/gym/exercise-names');
      const names = Array.isArray(res.data) ? res.data : [];
      setAllNames(names);
      if (names.length > 0 && !exercise) {
        setExercise(names[0]);
      }
    } catch (err) {
      console.error('Failed to fetch exercise names', err);
    } finally {
      setNamesLoading(false);
    }
  };

  const fetchProgression = async (exName) => {
    setLoading(true);
    try {
      const res = await api.get(`/gym/exercise-history/${encodeURIComponent(exName)}`).catch(() => ({ data: null }));
      if (res?.data) {
        setHistory(res.data.history || []);
        setStats(res.data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch progression', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredNames = useMemo(() => {
    // 1. Get all unique names from history and library
    const libraryNames = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises);
    const allKnown = Array.from(new Set([...libraryNames, ...allNames])).sort();

    // 2. Filter by search
    if (searchQuery.trim()) {
      return allKnown.filter(n => n.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // 3. Filter by muscle group
    if (selectedMuscleGroup === 'all') return allKnown;
    const groupExs = EXERCISE_LIBRARY[selectedMuscleGroup]?.exercises || [];
    return allKnown.filter(ex => groupExs.includes(ex));
  }, [allNames, searchQuery, selectedMuscleGroup]);

  const chartData = useMemo(() => {
    if (history.length === 0) return null;
    const recent = [...history].slice(-7); // Correctly ordered chronological
    return {
      labels: recent.map(h => {
        const d = new Date(h.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [
        {
          data: recent.map(h => h.maxWeight || 0),
          color: (opacity = 1) => COLORS.primary,
          strokeWidth: 3
        }
      ]
    };
  }, [history, COLORS.primary]);

  const renderExerciseItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.exerciseItem,
        { borderBottomColor: COLORS.gray100 },
        exercise === item && { backgroundColor: COLORS.primary + '10' }
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExercise(item);
        setSearchQuery('');
        setShowPicker(false);
      }}
    >
      <View style={styles.exerciseItemContent}>
        <Activity size={18} color={exercise === item ? COLORS.primary : COLORS.gray400} />
        <Body style={[
          styles.exerciseName,
          { color: COLORS.text },
          exercise === item && { color: COLORS.primary, fontWeight: '700' }
        ]}>{item}</Body>
      </View>
      {exercise === item && <TrendingUp size={16} color={COLORS.primary} />}
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper title="Progression">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.selectorBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
            onPress={() => setShowPicker(true)}
          >
            <View style={{ flex: 1 }}>
              <Caption secondary>SELECT EXERCISE</Caption>
              <H3 style={{ marginTop: 2 }}>{exercise || 'No exercise selected'}</H3>
            </View>
            <View style={[styles.changeBadge, { backgroundColor: COLORS.primary + '15' }]}>
              <Search size={16} color={COLORS.primary} />
              <Body style={{ color: COLORS.primary, fontWeight: '700', marginLeft: 6, fontSize: 12 }}>Change</Body>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 16 }}>
            {exercise ? (
              <Card style={styles.chartCard} padding={20}>
                <View style={styles.chartHeader}>
                    <View style={[styles.iconBox, { backgroundColor: COLORS.primary + '15' }]}>
                      <TrendingUp size={20} color={COLORS.primary} />
                    </View>
                    <View>
                      <H2 style={{ fontSize: 20 }}>{exercise}</H2>
                      <Caption secondary>{history.length} sessions logged</Caption>
                    </View>
                  </View>
                  
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                  ) : history.length > 0 ? (
                    <View>
                      <View style={styles.statsGrid}>
                        <View style={[styles.statItem, { backgroundColor: COLORS.gray100 }]}>
                          <Caption secondary style={styles.statLabel}>MAX WEIGHT</Caption>
                          <H3 style={styles.statValue}>{stats?.maxWeight}<Body secondary>kg</Body></H3>
                        </View>
                        <View style={[styles.statItem, { backgroundColor: COLORS.gray100 }]}>
                          <Caption secondary style={styles.statLabel}>EST. 1RM</Caption>
                          <H3 style={styles.statValue}>{stats?.estimated1RM}<Body secondary>kg</Body></H3>
                        </View>
                        <View style={[styles.statItem, { backgroundColor: COLORS.gray100 }]}>
                          <Caption secondary style={styles.statLabel}>AVG RPE</Caption>
                          <H3 style={styles.statValue}>{stats?.avgRPE}</H3>
                        </View>
                        <View style={[styles.statItem, { backgroundColor: COLORS.gray100 }]}>
                          <Caption secondary style={styles.statLabel}>SESSIONS</Caption>
                          <H3 style={styles.statValue}>{stats?.totalLogs}</H3>
                        </View>
                      </View>
                      
                      <View style={styles.sectionTitleRow}>
                        <BarChart2 size={18} color={COLORS.text} />
                        <Body style={{ fontWeight: '700', marginLeft: 8 }}>Weight Progression</Body>
                      </View>

                      {chartData && (
                        <LineChart
                          data={chartData}
                          width={screenWidth - 72}
                          height={200}
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
                              r: "5",
                              strokeWidth: "2",
                              stroke: COLORS.surface
                            },
                            gridProps: {
                              strokeDasharray: "5, 5",
                              stroke: COLORS.gray200
                            }
                          }}
                          bezier
                          style={styles.chart}
                        />
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyContainer}>
                      <View style={[styles.emptyIconCircle, { backgroundColor: COLORS.gray100 }]}>
                        <Info size={32} color={COLORS.gray400} />
                      </View>
                      <H3 style={{ marginBottom: 8 }}>No History Yet</H3>
                      <Body secondary style={{ textAlign: 'center', marginBottom: 24 }}>
                        You haven't logged any sets for {exercise} yet. 
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
              ) : !namesLoading && (
                <View style={styles.noExercises}>
                  <Activity size={48} color={COLORS.gray300} />
                  <H3 style={{ marginTop: 16, marginBottom: 8 }}>No Data Found</H3>
                  <Body secondary style={{ textAlign: 'center' }}>
                    You need to log at least one workout session to see exercise progression.
                  </Body>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBody, { backgroundColor: COLORS.surface }]}>
            <View style={styles.modalHeader}>
              <H2>Select Exercise</H2>
              <TouchableOpacity onPress={() => { setShowPicker(false); setSearchQuery(''); }}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: COLORS.gray100 }]}>
              <Search size={18} color={COLORS.gray400} />
              <TextInput 
                style={[styles.modalSearchInput, { color: COLORS.text }]} 
                placeholder="Search exercises..." 
                placeholderTextColor={COLORS.gray400}
                value={searchQuery} 
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            {!searchQuery.trim() && (
              <View style={{ marginBottom: 16 }}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
                >
                  <TouchableOpacity 
                    style={[
                      styles.muscleTab, 
                      { backgroundColor: COLORS.gray100 },
                      selectedMuscleGroup === 'all' && { backgroundColor: COLORS.primary }
                    ]}
                    onPress={() => setSelectedMuscleGroup('all')}
                  >
                    <Body style={[
                      { fontSize: 13 },
                      selectedMuscleGroup === 'all' && { color: COLORS.surface, fontWeight: '700' }
                    ]}>All</Body>
                  </TouchableOpacity>
                  {Object.entries(EXERCISE_LIBRARY).map(([key, group]) => (
                    <TouchableOpacity 
                      key={key}
                      style={[
                        styles.muscleTab, 
                        { backgroundColor: COLORS.gray100 },
                        selectedMuscleGroup === key && { backgroundColor: COLORS.primary }
                      ]}
                      onPress={() => setSelectedMuscleGroup(key)}
                    >
                      <Body style={[
                        { fontSize: 13 },
                        selectedMuscleGroup === key && { color: COLORS.surface, fontWeight: '700' }
                      ]}>{group.label}</Body>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <FlatList
              data={filteredNames}
              keyExtractor={item => item}
              renderItem={renderExerciseItem}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Caption secondary>No exercises found matching "{searchQuery}"</Caption>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16 },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mainContent: { flex: 1 },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
  },
  exerciseItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseName: {
    fontSize: 16,
  },
  muscleTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySearch: {
    padding: 32,
    alignItems: 'center',
  },
  chartCard: {
    marginBottom: 40,
    borderRadius: 24,
  },
  chartHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24, 
    gap: 12 
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24, 
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 16,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: { marginVertical: 8, borderRadius: 16, marginLeft: -16 },
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
  noExercises: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBody: {
    height: '80%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    height: 48,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  }
});

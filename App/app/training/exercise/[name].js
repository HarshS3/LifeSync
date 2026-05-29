import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Dimensions, PanResponder } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../../services/api';
import { ChevronLeft, TrendingUp, Award, Clock, Calendar, BarChart2, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { useTheme } from '../../../constants/Theme';
import { LineChart } from 'react-native-chart-kit';

// UI Components
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { Card } from '../../../components/ui/Card';
import { H1, H2, H3, Body, Caption } from '../../../components/ui/Typography';
import MuscleHeatmap from '../../../components/MuscleHeatmap';
import { getHeatmapDataForExercise } from '../../../lib/muscleMapping';

const screenWidth = Dimensions.get('window').width;

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams();
  const { COLORS, BORDER_RADIUS } = useTheme();

  // Chart Layout Constants
  const chartWidth = screenWidth - 32;
  const leftMargin = 40;
  const rightMargin = 20;
  const usableWidth = chartWidth - leftMargin - rightMargin;
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [trend, setTrend] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [chartMode, setChartMode] = useState('weight'); // 'weight' or 'volume'
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [activeIdx, setActiveIdx] = useState(null);
  const [overlayWidth, setOverlayWidth] = useState(usableWidth);

  // Refs for synchronous native control
  const flatListRef = useRef(null);      // to call setNativeProps synchronously
  const chartOverlayRef = useRef(null);  // to measure absolute screen position
  const overlayPageX = useRef(0);        // overlay's absolute X on screen

  // Refs to hold latest values so PanResponder closure stays fresh
  const trendRef = useRef(trend);
  const chartModeRef = useRef(chartMode);
  const overlayWidthRef = useRef(overlayWidth);

  // Keep refs in sync with state
  useEffect(() => { trendRef.current = trend; }, [trend]);
  useEffect(() => { chartModeRef.current = chartMode; }, [chartMode]);
  useEffect(() => { overlayWidthRef.current = overlayWidth; }, [overlayWidth]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) >= Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        // setNativeProps is synchronous — disables FlatList scroll before
        // the very next move event fires, unlike setState which is async.
        flatListRef.current?.setNativeProps({ scrollEnabled: false });
        handleTouchRef.current(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt) => {
        // pageX = absolute screen position, never jumps across view boundaries
        handleTouchRef.current(evt.nativeEvent.pageX);
      },
      onPanResponderRelease: () => {
        flatListRef.current?.setNativeProps({ scrollEnabled: true });
      },
      onPanResponderTerminate: () => {
        flatListRef.current?.setNativeProps({ scrollEnabled: true });
      },
    })
  ).current;

  // Use a ref so PanResponder can always call the latest version without stale closure.
  // Accepts absolute pageX and converts to overlay-relative index.
  const handleTouchRef = useRef(null);
  handleTouchRef.current = (pageX) => {
    const currentTrend = trendRef.current;
    if (!currentTrend || currentTrend.length < 2) return;
    const currentOverlayWidth = overlayWidthRef.current;
    // Convert absolute screen X → position within the overlay
    const x = pageX - overlayPageX.current;
    const clampedX = Math.max(0, Math.min(x, currentOverlayWidth));
    const relX = clampedX / currentOverlayWidth;
    const idx = Math.round(relX * (currentTrend.length - 1));
    const currentMode = chartModeRef.current;
    setActiveIdx(idx);
    const point = currentTrend[idx];
    setSelectedPoint({ d: point.d, val: currentMode === 'weight' ? (point.r1 || point.w) : point.v });
  };

  const [selectedMuscle, setSelectedMuscle] = useState(null);

  const heatmapData = useMemo(() => {
    return getHeatmapDataForExercise(metadata);
  }, [metadata]);

  const fetchHistory = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await api.get(`/gym/exercise-history/${encodeURIComponent(name)}?page=${pageNum}&limit=10`);
      const { history: newHistory, stats: newStats, metadata: newMeta, trend: newTrend, hasMore: more } = res.data;
      
      setHistory(prev => pageNum === 1 ? newHistory : [...prev, ...newHistory]);
      if (pageNum === 1) {
        setStats(newStats);
        setMetadata(newMeta);
        setTrend(newTrend || []);
      }
      setHasMore(more);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch exercise history', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, [name]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchHistory(page + 1);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderChart = () => {
    if (!trend || trend.length < 2) return null;

    const chartData = {
      labels: trend.length > 6 
        ? [trend[0].d, trend[Math.floor(trend.length/2)].d, trend[trend.length-1].d].map(d => new Date(d).toLocaleDateString('en-IN', {month:'short', day:'numeric'}))
        : trend.map(t => new Date(t.d).toLocaleDateString('en-IN', {month:'short', day:'numeric'})),
      datasets: [
        {
          data: chartMode === 'weight' ? trend.map(t => t.r1 || t.w) : trend.map(t => t.v),
          color: (opacity = 1) => chartMode === 'weight' ? `rgba(59, 130, 246, ${opacity})` : `rgba(16, 185, 129, ${opacity})`,
          strokeWidth: 3
        }
      ]
    };

    return (
      <Card style={styles.chartCard} padding={0}>
        <View style={styles.chartHeader}>
          <View style={{ flex: 1, paddingLeft: 16, paddingTop: 16 }}>
            <H3>{chartMode === 'weight' ? 'Strength Trend' : 'Volume Trend'}</H3>
            {selectedPoint ? (
              <Caption style={{ color: COLORS.primary, fontWeight: 'bold' }}>
                {new Date(selectedPoint.d).toLocaleDateString()}: {Math.round(selectedPoint.val)}{chartMode === 'weight' ? 'kg' : ''}
              </Caption>
            ) : (
              <Caption secondary>Slide chart for details</Caption>
            )}
          </View>
          <View style={[styles.chartToggles, { marginRight: 16, marginTop: 16 }]}>
            <TouchableOpacity 
              onPress={() => { setChartMode('weight'); setSelectedPoint(null); setActiveIdx(null); }}
              style={[styles.toggleBtn, chartMode === 'weight' && { backgroundColor: COLORS.primary }]}
            >
              <Caption style={[
                { fontWeight: 'bold' },
                chartMode === 'weight' ? { color: COLORS.primaryContrast } : { color: COLORS.textSecondary }
              ]}>KG</Caption>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => { setChartMode('volume'); setSelectedPoint(null); setActiveIdx(null); }}
              style={[styles.toggleBtn, chartMode === 'volume' && { backgroundColor: COLORS.primary }]}
            >
              <Caption style={[
                { fontWeight: 'bold' },
                chartMode === 'volume' ? { color: COLORS.primaryContrast } : { color: COLORS.textSecondary }
              ]}>VOL</Caption>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={{ position: 'relative', marginTop: 10 }}>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={200}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: COLORS.surface,
              backgroundGradientTo: COLORS.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => COLORS.primary,
              labelColor: (opacity = 1) => COLORS.textSecondary,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: COLORS.primary },
              fillShadowGradientFrom: chartMode === 'weight' ? '#3b82f6' : '#10b981',
              fillShadowGradientTo: COLORS.surface,
              fillShadowGradientOpacity: 0.2,
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
            withInnerLines={false}
            withOuterLines={false}
          />
          {activeIdx !== null && (
            <View 
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: leftMargin + (activeIdx * overlayWidth / Math.max(trend.length - 1, 1)),
                top: 8,
                bottom: 40,
                // Dashed line: zero width, left border is the visible stroke
                width: 0,
                borderLeftWidth: 2,
                borderLeftColor: COLORS.primary,
                borderStyle: 'dashed',
                opacity: 0.9,
              }} 
            />
          )}
          {/*
            Overlay covers only the plot area (left: leftMargin, right: rightMargin).
            We measure its absolute screen position on layout so pageX math is accurate.
          */}
          <View 
            ref={chartOverlayRef}
            {...panResponder.panHandlers}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              setOverlayWidth(w > 0 ? w : usableWidth);
              // Measure absolute screen position so we can convert pageX → relative X
              chartOverlayRef.current?.measure((fx, fy, width, height, px) => {
                overlayPageX.current = px;
              });
            }}
            style={{
                position: 'absolute',
                top: 0,
                left: leftMargin,
                right: rightMargin,
                bottom: 0,
                backgroundColor: 'transparent'
            }} 
          />
        </View>
      </Card>
    );
  };

  const renderHeader = () => {
    const weightGain = stats?.startWeight > 0 ? ((stats.currentWeight - stats.startWeight) / stats.startWeight * 100).toFixed(1) : 0;
    
    // Provide default metadata if missing to keep UI consistent
    const displayMeta = metadata || {
      type: 'custom',
      primary: 'other',
      secondary: []
    };

    return (
      <View>
        {/* Exercise Metadata Section */}
        <Card style={styles.metaCard} padding={16}>
          <View style={styles.metaHeader}>
            <Info size={16} color={COLORS.primary} />
            <Caption style={{ marginLeft: 8, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' }}>
              Exercise Profile
            </Caption>
          </View>
          
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Caption secondary>TYPE</Caption>
              <Body style={{ fontWeight: '700', textTransform: 'capitalize' }}>{displayMeta.type}</Body>
            </View>
            <View style={styles.metaItem}>
              <Caption secondary>PRIMARY TARGET</Caption>
              <Body style={{ fontWeight: '700', textTransform: 'capitalize' }}>{displayMeta.primary}</Body>
            </View>
          </View>

          {displayMeta.secondary && displayMeta.secondary.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Caption secondary style={{ marginBottom: 4 }}>SECONDARY TARGETS</Caption>
              <View style={styles.tagContainer}>
                {displayMeta.secondary.map(m => (
                  <View key={m} style={[styles.tag, { backgroundColor: COLORS.primary + '10' }]}>
                    <Caption style={{ color: COLORS.primary, fontWeight: '700', textTransform: 'capitalize' }}>{m}</Caption>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Analytics & Charts */}
        {renderChart()}

        {/* Progression Metrics */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard} padding={12}>
            <Caption secondary style={styles.statLabel}>PERSONAL RECORD</Caption>
            <H2 style={{ color: COLORS.primary }}>{stats?.maxWeight || 0}<Caption> kg</Caption></H2>
            {weightGain !== 0 && (
              <View style={styles.gainRow}>
                {weightGain > 0 ? <ArrowUpRight size={12} color={COLORS.success} /> : <ArrowDownRight size={12} color={COLORS.error} />}
                <Caption style={{ color: weightGain > 0 ? COLORS.success : COLORS.error, fontWeight: 'bold' }}>
                  {Math.abs(weightGain)}% from start
                </Caption>
              </View>
            )}
          </Card>
          <Card style={styles.statCard} padding={12}>
            <Caption secondary style={styles.statLabel}>EST. 1RM</Caption>
            <H2 style={{ color: COLORS.success }}>{stats?.estimated1RM || 0}<Caption> kg</Caption></H2>
            <Caption secondary style={{ fontSize: 10 }}>Projected max strength</Caption>
          </Card>
        </View>

        {/* Muscle Engagement Section */}
        <View style={{ marginBottom: 16 }}>
          <H3 style={{ marginBottom: 12, marginLeft: 4 }}>Muscle Engagement</H3>
          <MuscleHeatmap
            data={heatmapData}
            height={340} // Optimized height to prevent clipping
            selectedMuscle={selectedMuscle}
            onMuscleSelect={setSelectedMuscle}
          />
          {heatmapData.length === 0 && (
            <Caption secondary style={{ textAlign: 'center', marginTop: -8 }}>
              Muscle target data unavailable for this exercise.
            </Caption>
          )}
        </View>

        <View style={[styles.statsGrid, { marginTop: -4 }]}>
          <Card style={styles.statCard} padding={12}>
            <Caption secondary style={styles.statLabel}>TOTAL SESSIONS</Caption>
            <H3>{stats?.totalSessions || 0}</H3>
          </Card>
          <Card style={styles.statCard} padding={12}>
            <Caption secondary style={styles.statLabel}>LIFETIME SETS</Caption>
            <H3>{stats?.totalSets || 0}</H3>
          </Card>
        </View>

        <H3 style={styles.sectionTitle}>Performance History</H3>
      </View>
    );
  };

  const renderFooter = () => (
    <View style={{ paddingVertical: 20 }}>
      {loadingMore ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : hasMore ? (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
          <Caption style={{ color: COLORS.primary, fontWeight: '700' }}>LOAD MORE HISTORY</Caption>
        </TouchableOpacity>
      ) : history.length > 0 ? (
        <Caption secondary style={{ textAlign: 'center' }}>End of history</Caption>
      ) : null}
      <View style={{ height: 40 }} />
    </View>
  );

  return (
    <ScreenWrapper title={name}>
      <FlatList
        ref={flatListRef}
        data={history}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: session, index: sIdx }) => (
          <Card key={sIdx} style={styles.historyCard} padding={16}>
            <View style={styles.historyHeader}>
              <View style={styles.dateBox}>
                <Calendar size={14} color={COLORS.textSecondary} />
                <Caption style={{ marginLeft: 6, fontWeight: '700' }}>
                  {new Date(session.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Caption>
              </View>
              <Caption secondary>{session.sets.length} sets</Caption>
            </View>

            <View style={styles.setsList}>
              {session.sets.map((set, setIdx) => (
                <View key={setIdx} style={styles.setRow}>
                  <View style={styles.setNumBox}>
                    <Caption style={{ fontWeight: '800', color: COLORS.gray400 }}>{setIdx + 1}</Caption>
                  </View>
                  <Body style={{ flex: 1, fontWeight: '600' }}>{set.weight} kg x {set.reps}</Body>
                  <Caption secondary>Vol: {Math.round(set.weight * set.reps)} kg</Caption>
                </View>
              ))}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <TrendingUp size={48} color={COLORS.gray200} />
            <Body secondary style={{ marginTop: 12 }}>No history found for this exercise.</Body>
          </View>
        }
      />
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
  metaCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  metaItem: {
    flex: 1,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chartCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartToggles: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 16,
    marginLeft: 4,
  },
  historyCard: {
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setsList: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setNumBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loadMoreBtn: {
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  }
});

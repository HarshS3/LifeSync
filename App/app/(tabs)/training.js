import React, { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import api from '../../services/api';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { H1, H2, H3, Body, Caption } from '../../components/ui/Typography';

// ── StatCard ──────────────────────────────────────────
function TrainingStatCard({ emoji, label, value, sublabel, color }) {
  const { COLORS } = useTheme();
  return (
    <Card style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]} padding={12}>
      <Body style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</Body>
      <H2 style={{ color, fontSize: 24 }}>{value ?? '—'}</H2>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Caption secondary style={{ fontWeight: '600' }}>{label}</Caption>
        {sublabel && <Caption secondary style={{ marginLeft: 2 }}>{sublabel}</Caption>}
      </View>
    </Card>
  );
}

// ── Readiness ring ────────────────────────────────────────────────────────────
function ReadinessRing({ readiness }) {
  const { COLORS, BORDER_RADIUS } = useTheme();
  if (!readiness) return null;
  
  const color = readiness.color || COLORS.primary;
  const statusLabel =
    readiness.status === 'push_hard'     ? '🔥 Push Hard'
    : readiness.status === 'train_normal' ? '💪 Train Normal'
    : readiness.status === 'train_light'  ? '🔄 Train Light'
    : '😴 Rest Day';

  const components = [
    { emoji: '😴', label: 'Sleep',  score: readiness.components?.sleep?.score,  detail: `${readiness.components?.sleep?.avgHours}h` },
    { emoji: '⚡', label: 'Energy', score: readiness.components?.energy?.score, detail: `${readiness.components?.energy?.avgRating}/10` },
    { emoji: '🧘', label: 'Stress', score: readiness.components?.stress?.score, detail: `${readiness.components?.stress?.avgRating}/10` },
    { emoji: '🏋️', label: 'Load',  score: readiness.components?.trainingLoad?.score, detail: `${Math.round((readiness.components?.trainingLoad?.volumeRatio || 0) * 100)}%` },
  ];

  const scoreColor = (v) => v >= 7 ? COLORS.success : v >= 5 ? COLORS.warning : COLORS.error;

  return (
    <Card style={{ borderColor: color + '40' }}>
      <View style={[styles.readinessGlow, { backgroundColor: color }]} pointerEvents="none" />

      <View style={styles.cardHeader}>
        <H3>🔥 Today's Readiness</H3>
      </View>

      <View style={styles.readinessRow}>
        <View style={[styles.ring, { borderColor: color }]}>
          <H2 style={{ fontSize: 32 }}>{readiness.readinessScore}</H2>
          <Caption secondary style={{ fontWeight: '700' }}>/10</Caption>
        </View>

        <View style={{ flex: 1, marginLeft: 20 }}>
          <Body style={{ marginBottom: 8 }}>{readiness.recommendation}</Body>
          <View style={[styles.statusBadge, { backgroundColor: color }]}>
            <Caption style={styles.statusBadgeText}>{statusLabel}</Caption>
          </View>
        </View>
      </View>

      <View style={styles.componentsGrid}>
        {components.map((c) => {
          const sc = c.score ?? 5;
          const cc = scoreColor(sc);
          return (
            <View key={c.label} style={[styles.compCard, { backgroundColor: COLORS.gray100, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md }]}>
              <View style={styles.compRow}>
                <Caption style={{ fontWeight: '700' }}>{c.emoji} {c.label}</Caption>
                <Caption style={{ fontWeight: '800', color: cc }}>{sc}/10</Caption>
              </View>
              <ProgressBar value={(sc / 10) * 100} color={cc} />
              <Caption secondary style={{ fontSize: 10, marginTop: 4 }}>{c.detail}</Caption>
            </View>
          );
        })}
      </View>

      {readiness.overtraining?.risk !== 'low' && (
        <View style={[styles.overtrain, { backgroundColor: readiness.overtraining.risk === 'high' ? COLORS.error + '10' : COLORS.warning + '10', borderColor: readiness.overtraining.risk === 'high' ? COLORS.error + '40' : COLORS.warning + '40' }]}>
          <Caption style={{ fontWeight: '800', color: readiness.overtraining.risk === 'high' ? COLORS.error : COLORS.warning, marginBottom: 4 }}>
            ⚠️ Overtraining Risk: {readiness.overtraining.risk === 'high' ? 'HIGH' : 'Moderate'}
          </Caption>
          <Caption secondary style={{ fontSize: 12 }}>{readiness.overtraining.detail}</Caption>
        </View>
      )}

      {readiness.stagnationAlerts?.length > 0 && (
        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 }}>
          <Caption style={{ color: COLORS.load, marginBottom: 8, fontWeight: '700' }}>📈 Stagnation Detected</Caption>
          {readiness.stagnationAlerts.map((alert, i) => (
            <View key={i} style={[styles.stagnationItem, { backgroundColor: COLORS.gray100, borderLeftColor: COLORS.load }]}>
              <Body style={{ fontWeight: '800', fontSize: 13 }}>{alert.exercise}</Body>
              <Caption secondary>No progress in {alert.sessionsStagnated} sessions</Caption>
              <Caption secondary style={{ marginTop: 4, fontStyle: 'italic' }}>💡 {alert.suggestion}</Caption>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export default function TrainingScreen() {
  const { COLORS, TYPOGRAPHY } = useTheme();
  const router = useRouter();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts]   = useState([]);
  const [stats, setStats]         = useState({});
  const [templates, setTemplates] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [insights, setInsights]   = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [aiWorkout, setAiWorkout]     = useState('');
  const [aiRecovery, setAiRecovery]   = useState('');
  const [aiWLoading, setAiWLoading]   = useState(false);
  const [aiRLoading, setAiRLoading]   = useState(false);

  const MUSCLE_GROUPS = [
    { key: 'chest',     label: 'Chest' },
    { key: 'back',      label: 'Back' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'biceps',    label: 'Biceps' },
    { key: 'triceps',   label: 'Triceps' },
    { key: 'quads',     label: 'Quads' },
    { key: 'hamstrings',label: 'Hamstrings' },
    { key: 'glutes',    label: 'Glutes' },
    { key: 'calves',    label: 'Calves' },
    { key: 'core',      label: 'Core' },
  ];

  const fetchData = async () => {
    try {
      const res = await api.get('/gym/summary');
      const data = res.data;

      setWorkouts(data.recentWorkouts || []);
      setStats(data.stats || {});
      setTemplates(data.templates || []);
      setReadiness(data.readiness || null);
      setInsights(Array.isArray(data.correlations) ? data.correlations : []);

    } catch (err) {
      console.error('Training fetch error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { 
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true); 
    fetchData(); 
  };

  const generateAiWorkout = async () => {
    Haptics.selectionAsync();
    setAiWLoading(true);
    try {
      const res = await api.post('/gym/ai-suggestion', { type: 'workout' });
      setAiWorkout(res.data?.suggestion || '');
    } catch { Alert.alert('Error', 'Could not get AI suggestion'); }
    setAiWLoading(false);
  };

  const generateAiRecovery = async () => {
    Haptics.selectionAsync();
    setAiRLoading(true);
    try {
      const res = await api.post('/gym/ai-suggestion', { type: 'recovery' });
      setAiRecovery(res.data?.suggestion || '');
    } catch { Alert.alert('Error', 'Could not get AI suggestion'); }
    setAiRLoading(false);
  };

  const nav = (path, params) => {
    Haptics.selectionAsync();
    router.push(params ? { pathname: path, params } : path);
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const muscleDistribution = stats.muscleDistribution || {};

  return (
    <ScreenWrapper title="Training">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statGrid}>
          <TrainingStatCard emoji="🏋️" label="Workouts" value={stats.totalWorkouts ?? workouts.length} color={COLORS.training} />
          <TrainingStatCard emoji="🔥" label="This Week" value={stats.weeklyWorkouts} color={COLORS.warning} />
          <TrainingStatCard emoji="📈" label="Volume" value={stats.totalVolume ? `${(stats.totalVolume / 1000).toFixed(1)}k` : '—'} sublabel="kg" color={COLORS.success} />
          <TrainingStatCard emoji="🎯" label="Streak" value={stats.currentStreak} sublabel="days" color={COLORS.load} />
        </View>

        <TouchableOpacity 
          style={[styles.startBtn, { backgroundColor: COLORS.primary }]} 
          onPress={() => nav('/training/active')} 
          activeOpacity={0.85}
        >
          <Body style={{ color: COLORS.surface, fontWeight: '800' }}>▶  Start Empty Workout</Body>
        </TouchableOpacity>

        {templates.length > 0 && (
          <View style={styles.section}>
            <Caption secondary style={styles.sectionLabel}>TEMPLATES</Caption>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {templates.map((t, i) => (
                <Card
                  key={t._id || i}
                  onPress={() => nav('/training/active', { template: JSON.stringify(t) })}
                  style={styles.templateCard}
                  padding={12}
                >
                  <Body style={{ fontWeight: '700' }} numberOfLines={1}>{t.name}</Body>
                  <Caption secondary style={{ marginTop: 2 }}>{t.exercises?.length || 0} exercises</Caption>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.quickRow}>
          {[
            { icon: '📅',  label: 'Calendar',    path: '/training/workout-calendar', params: { returnTo: '/(tabs)/training' } },
            { icon: '🗺️',  label: 'Heatmap',     path: '/training/heatmap' },
            { icon: '👣',  label: 'Steps',        path: '/training/steps' },
            { icon: '📊',  label: 'Progress',  path: '/training/progression' },
          ].map((item) => (
            <Card key={item.label} onPress={() => nav(item.path, item.params)} style={styles.quickBtn} padding={6}>
              <Body style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</Body>
              <Caption style={{ fontWeight: '700', fontSize: 10 }} numberOfLines={1} adjustsFontSizeToFit>{item.label}</Caption>
            </Card>
          ))}
        </View>

        {readiness
          ? <ReadinessRing readiness={readiness} />
          : (
            <Card style={{ marginBottom: 24 }}>
              <View style={styles.cardHeader}>
                <H3>🔥 Training Readiness</H3>
              </View>
              <Body secondary>Log your daily wellness check-in for 3+ days to unlock your readiness score.</Body>
            </Card>
          )
        }

        <View style={styles.section}>
          <Caption secondary style={styles.sectionLabel}>WORKOUT HISTORY</Caption>
          {workouts.length > 0 ? (
            workouts.slice(0, 10).map((w, i) => (
              <Card key={w._id || i} padding={16} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: '700' }}>{w.name}</Body>
                    <Caption secondary>{new Date(w.date).toLocaleDateString()} • {w.duration} min</Caption>
                  </View>
                  <View style={[styles.volumeBadge, { backgroundColor: COLORS.success + '10' }]}>
                    <Caption style={{ color: COLORS.success, fontWeight: '800' }}>
                      {Math.round(w.exercises?.reduce((acc, ex) => acc + ex.sets?.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0), 0) || 0)} kg
                    </Caption>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Card padding={24} style={{ alignItems: 'center' }}>
              <Caption secondary>No workouts logged yet. Start your first session!</Caption>
            </Card>
          )}
        </View>


        <TouchableOpacity 
          style={[styles.advancedToggle, { borderColor: COLORS.border }]} 
          onPress={() => { Haptics.selectionAsync(); setShowAdvanced(v => !v); }}
        >
          <Caption secondary style={{ fontWeight: '700' }}>{showAdvanced ? 'Hide Advanced ▲' : 'Show Advanced ▼'}</Caption>
        </TouchableOpacity>

        {showAdvanced && (
          <>
            <Card>
              <View style={styles.cardHeader}>
                <H3>📈 Performance Insights</H3>
              </View>
              {insights.length > 0
                ? insights.map((ins, i) => (
                  <View key={i} style={[styles.insightRow, { borderBottomColor: COLORS.border }]}>
                    <Body style={{ fontWeight: '700' }}>{ins.title}</Body>
                    <Caption secondary style={{ marginTop: 4, lineHeight: 18 }}>{ins.detail}</Caption>
                  </View>
                ))
                : <Body secondary>Log more workouts to unlock analysis.</Body>
              }
            </Card>

            <Card>
              <H3 style={{ marginBottom: 4 }}>AI Suggestions</H3>
              <Caption secondary style={{ marginBottom: 16 }}>Personalized training advice on demand.</Caption>
              <View style={styles.aiButtonRow}>
                <TouchableOpacity style={[styles.outlinedBtn, { borderColor: COLORS.primary }, aiWLoading && { opacity: 0.6 }]} onPress={generateAiWorkout} disabled={aiWLoading}>
                  <Caption style={{ fontWeight: '800' }}>{aiWLoading ? 'Thinking…' : "Workout Idea"}</Caption>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.outlinedBtn, { borderColor: COLORS.primary }, aiRLoading && { opacity: 0.6 }]} onPress={generateAiRecovery} disabled={aiRLoading}>
                  <Caption style={{ fontWeight: '800' }}>{aiRLoading ? 'Thinking…' : 'Recovery Plan'}</Caption>
                </TouchableOpacity>
              </View>
              {!!aiWorkout && (
                <View style={[styles.aiResult, { backgroundColor: COLORS.gray100, borderRadius: 12 }]}>
                  <Caption secondary style={{ marginBottom: 6 }}>Today's Workout</Caption>
                  <Body style={{ fontSize: 13, lineHeight: 20 }}>{aiWorkout}</Body>
                </View>
              )}
            </Card>

            <Card>
              <View style={styles.cardHeader}>
                <H3>Weekly Hypertrophy</H3>
                <View style={[styles.targetBadge, { backgroundColor: COLORS.gray100 }]}>
                  <Caption style={{ fontWeight: '800', fontSize: 10 }}>Target: 10 sets</Caption>
                </View>
              </View>
              {MUSCLE_GROUPS.map(({ key, label }) => {
                const count = muscleDistribution[key] || 0;
                const pct = Math.min((count / 10) * 100, 100);
                const cc  = count >= 10 ? COLORS.success : count >= 5 ? COLORS.warning : COLORS.gray400;
                return (
                  <View key={key} style={{ marginBottom: 14 }}>
                    <View style={styles.hypertrophyRow}>
                      <Body style={{ fontWeight: '600', fontSize: 14 }}>{label}</Body>
                      <Caption style={{ fontWeight: '800', color: cc }}>{count}/10</Caption>
                    </View>
                    <ProgressBar value={pct} color={cc} />
                  </View>
                );
              })}
            </Card>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { width: '48%', marginBottom: 12 },

  startBtn:     { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 24 },
  section:      { marginBottom: 24 },
  sectionLabel: { marginBottom: 12, fontWeight: '700', marginLeft: 4 },
  templateCard: { width: 140, marginBottom: 0 },
  historyCard:  { marginBottom: 12 },
  historyHeader: { flexDirection: 'row', alignItems: 'center' },
  volumeBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },

  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickBtn: { flex: 1, alignItems: 'center', marginBottom: 0 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  
  readinessGlow: { position: 'absolute', top: -60, right: -60, width: 160, height: 160, borderRadius: 80, opacity: 0.08 },
  readinessRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  ring:          { width: 90, height: 90, borderRadius: 45, borderWidth: 8, justifyContent: 'center', alignItems: 'center' },
  statusBadge:   { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  statusBadgeText:{ fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  componentsGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  compCard:      { width: '48.5%', borderWidth: 1, padding: 12 },
  compRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  overtrain:     { marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1 },
  stagnationItem:   { padding: 12, borderRadius: 12, borderLeftWidth: 4, marginBottom: 10 },

  advancedToggle:     { borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center', marginBottom: 20 },
  insightRow: { paddingVertical: 12, borderBottomWidth: 1 },
  aiButtonRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  outlinedBtn:     { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  aiResult:        { padding: 16, marginTop: 8 },
  hypertrophyRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  targetBadge:     { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});

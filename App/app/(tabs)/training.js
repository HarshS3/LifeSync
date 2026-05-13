/**
 * Training Screen — translation of:
 *   client/src/components/Gym/OverviewTab.jsx
 *   client/src/components/GymTracker.jsx (tabs + data)
 *
 * MUI → RN tokens (Paper theme):
 *   background.paper → #ffffff
 *   text.primary     → #161310
 *   text.secondary   → rgba(22,19,16,0.62)
 *   divider          → rgba(22,19,16,0.10)
 *   p:3 = 24, p:2 = 16, gap:2 = 16, borderRadius:2 = 16
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import api from '../../services/api';
import * as Haptics from 'expo-haptics';

// ── colours ─────────────────────────────────────────────────────────────────
const C = {
  bg:      '#f6f1e7',
  surface: '#ffffff',
  text:    '#161310',
  muted:   'rgba(22,19,16,0.62)',
  border:  'rgba(22,19,16,0.10)',
  dark:    '#0f172a',
};

const scoreColor = (v) => v >= 7 ? '#22c55e' : v >= 5 ? '#f59e0b' : '#ef4444';

// ── ProgressBar (LinearProgress) ─────────────────────────────────────────────
function ProgressBar({ value, color }) {
  return (
    <View style={s.trackBg}>
      <View style={[s.trackFill, { width: `${Math.min(100, value)}%`, backgroundColor: color }]} />
    </View>
  );
}

// ── StatCard (matches web StatCard) ──────────────────────────────────────────
function StatCard({ emoji, label, value, sublabel, color }) {
  return (
    <View style={[s.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</Text>
      <Text style={[s.statValue, { color }]}>{value ?? '—'}</Text>
      {sublabel && <Text style={s.statSublabel}>{sublabel}</Text>}
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ── Insight Card ──────────────────────────────────────────────────────────────
function InsightCard({ title, detail }) {
  return (
    <View style={s.insightCard}>
      <Text style={s.insightTitle}>{title}</Text>
      <Text style={s.insightDetail}>{detail}</Text>
    </View>
  );
}

// ── Readiness ring ────────────────────────────────────────────────────────────
function ReadinessRing({ readiness }) {
  if (!readiness) return null;
  const color = readiness.color || '#f59e0b';
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

  return (
    <View style={[s.card, { borderColor: color + '40' }]}>
      {/* glow tint */}
      <View style={[s.readinessGlow, { backgroundColor: color }]} />

      <View style={s.cardHeader}>
        <Text style={s.cardHeaderIcon}>🔥</Text>
        <Text style={s.cardTitle}>Today's Training Readiness</Text>
      </View>

      <View style={s.readinessRow}>
        {/* Score ring */}
        <View style={[s.ring, { borderColor: color }]}>
          <Text style={[s.ringScore, { color }]}>{readiness.readinessScore}</Text>
          <Text style={s.ringUnit}>/10</Text>
        </View>

        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={s.readinessRec}>{readiness.recommendation}</Text>
          <View style={[s.statusBadge, { backgroundColor: color }]}>
            <Text style={s.statusBadgeText}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      {/* Component scores */}
      <View style={s.componentsGrid}>
        {components.map((c) => {
          const sc = c.score ?? 5;
          const cc = scoreColor(sc);
          return (
            <View key={c.label} style={s.compCard}>
              <View style={s.compRow}>
                <Text style={s.compEmoji}>{c.emoji} {c.label}</Text>
                <Text style={[s.compScore, { color: cc }]}>{sc}/10</Text>
              </View>
              <ProgressBar value={(sc / 10) * 100} color={cc} />
              <Text style={s.compDetail}>{c.detail}</Text>
            </View>
          );
        })}
      </View>

      {/* Overtraining warning */}
      {readiness.overtraining?.risk !== 'low' && (
        <View style={[s.overtrain, { backgroundColor: readiness.overtraining.risk === 'high' ? '#fef2f2' : '#fffbeb', borderColor: readiness.overtraining.risk === 'high' ? '#fca5a5' : '#fde68a' }]}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: readiness.overtraining.risk === 'high' ? '#991b1b' : '#92400e', marginBottom: 4 }}>
            ⚠️ Overtraining Risk: {readiness.overtraining.risk === 'high' ? 'HIGH' : 'Moderate'}
          </Text>
          <Text style={{ fontSize: 12, color: C.muted }}>{readiness.overtraining.detail}</Text>
        </View>
      )}

      {/* Stagnation alerts */}
      {readiness.stagnationAlerts?.length > 0 && (
        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
          <Text style={s.stagnationHeader}>📈 Stagnation Detected — {readiness.stagnationAlerts.length} exercise{readiness.stagnationAlerts.length > 1 ? 's' : ''} plateaued</Text>
          {readiness.stagnationAlerts.map((alert, i) => (
            <View key={i} style={s.stagnationItem}>
              <Text style={s.stagnationExercise}>{alert.exercise}</Text>
              <Text style={s.stagnationDetail}>No progress in {alert.sessionsStagnated} sessions — best: {alert.currentBest}kg</Text>
              <Text style={s.stagnationSuggestion}>💡 {alert.suggestion}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function TrainingScreen() {
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

  // AI suggestions
  const [aiWorkout, setAiWorkout]     = useState('');
  const [aiRecovery, setAiRecovery]   = useState('');
  const [aiWLoading, setAiWLoading]   = useState(false);
  const [aiRLoading, setAiRLoading]   = useState(false);

  // Hypertrophy sets per muscle
  const MUSCLE_GROUPS = [
    { key: 'chest',     label: 'Chest' },
    { key: 'back',      label: 'Back' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'biceps',    label: 'Biceps' },
    { key: 'triceps',   label: 'Triceps' },
    { key: 'legs',      label: 'Legs' },
    { key: 'core',      label: 'Core' },
  ];

  const fetchData = async () => {
    try {
      const [wRes, sRes, tRes] = await Promise.all([
        api.get('/gym/workouts').catch(() => ({ data: [] })),
        api.get('/gym/stats').catch(() => ({ data: {} })),
        api.get('/gym/templates').catch(() => ({ data: [] })),
      ]);
      setWorkouts(wRes.data || []);
      setStats(sRes.data || {});
      setTemplates(tRes.data || []);

      // readiness
      try {
        const rRes = await api.get('/gym/readiness');
        setReadiness(rRes.data);
      } catch { /* optional */ }

      // training insights
      try {
        const iRes = await api.get('/gym/insights');
        setInsights(Array.isArray(iRes.data) ? iRes.data : []);
      } catch { /* optional */ }

    } catch (err) {
      console.error('Training fetch error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const generateAiWorkout = async () => {
    setAiWLoading(true);
    try {
      const res = await api.post('/gym/ai-suggestion', { type: 'workout' });
      setAiWorkout(res.data?.suggestion || '');
    } catch { Alert.alert('Error', 'Could not get AI suggestion'); }
    setAiWLoading(false);
  };

  const generateAiRecovery = async () => {
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
    return <View style={s.centered}><ActivityIndicator color={C.text} size="large" /></View>;
  }

  const muscleDistribution = stats.muscleDistribution || {};

  return (
    <View style={s.root}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── 4 Stat Cards (matches web StatCard grid) ──────────────── */}
        <View style={s.statGrid}>
          <StatCard emoji="🏋️" label="Total Workouts" value={stats.totalWorkouts ?? workouts.length} color="#2563eb" />
          <StatCard emoji="🔥" label="This Week"      value={stats.weeklyWorkouts}                  color="#f59e0b" />
          <StatCard emoji="📈" label="Total Volume"   value={stats.totalVolume ? `${(stats.totalVolume / 1000).toFixed(1)}k` : '—'} sublabel="kg" color="#15803d" />
          <StatCard emoji="🎯" label="Streak"         value={stats.currentStreak}                   sublabel="days" color="#9333ea" />
        </View>

        {/* ── Start Workout button ───────────────────────────────────── */}
        <TouchableOpacity style={s.startBtn} onPress={() => nav('/training/active')} activeOpacity={0.85}>
          <Text style={s.startBtnText}>▶  Start Empty Workout</Text>
        </TouchableOpacity>

        {/* ── Templates row ──────────────────────────────────────────── */}
        {templates.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Templates</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {templates.map((t, i) => (
                <TouchableOpacity
                  key={t._id || i}
                  style={s.templateCard}
                  onPress={() => nav('/training/active', { template: JSON.stringify(t) })}
                >
                  <Text style={s.templateName} numberOfLines={1}>{t.name}</Text>
                  <Text style={s.templateSub}>{t.exercises?.length || 0} exercises</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Quick nav ──────────────────────────────────────────────── */}
        <View style={s.quickRow}>
          {[
            { icon: '📅',  label: 'Calendar',    path: '/workout-calendar', params: { returnTo: '/(tabs)/training' } },
            { icon: '🗺️',  label: 'Heatmap',     path: '/training/heatmap' },
            { icon: '👣',  label: 'Steps',        path: '/training/steps' },
            { icon: '📊',  label: 'Progression',  path: '/training/progression' },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={s.quickBtn} onPress={() => nav(item.path, item.params)}>
              <Text style={s.quickIcon}>{item.icon}</Text>
              <Text style={s.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Readiness card ─────────────────────────────────────────── */}
        {readiness
          ? <ReadinessRing readiness={readiness} />
          : (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardHeaderIcon}>🔥</Text>
                <Text style={s.cardTitle}>Today's Training Readiness</Text>
              </View>
              <Text style={s.mutedBody}>Log your daily wellness check-in (sleep, energy, stress) for 3+ days to unlock your readiness score.</Text>
            </View>
          )
        }

        {/* ── Advanced toggle ────────────────────────────────────────── */}
        <TouchableOpacity style={s.advancedToggle} onPress={() => setShowAdvanced(v => !v)}>
          <Text style={s.advancedToggleText}>{showAdvanced ? 'Hide Advanced ▲' : 'Show Advanced ▼'}</Text>
        </TouchableOpacity>

        {showAdvanced && (
          <>
            {/* ── Performance Analysis & Insights ────────────────────── */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardHeaderIcon}>📈</Text>
                <Text style={s.cardTitle}>Performance Analysis & Insights</Text>
              </View>
              {insights.length > 0
                ? insights.map((ins, i) => <InsightCard key={i} title={ins.title} detail={ins.detail} />)
                : <Text style={s.mutedBody}>Log a few more workouts to unlock performance analysis.</Text>
              }
            </View>

            {/* ── AI Suggestions ─────────────────────────────────────── */}
            <View style={s.card}>
              <Text style={s.cardTitle}>AI Suggestions</Text>
              <Text style={s.mutedBody}>Generated only when you ask.</Text>
              <View style={s.aiButtonRow}>
                <TouchableOpacity style={[s.outlinedBtn, aiWLoading && { opacity: 0.6 }]} onPress={generateAiWorkout} disabled={aiWLoading}>
                  <Text style={s.outlinedBtnText}>{aiWLoading ? 'Thinking…' : "Today's Workout"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.outlinedBtn, aiRLoading && { opacity: 0.6 }]} onPress={generateAiRecovery} disabled={aiRLoading}>
                  <Text style={s.outlinedBtnText}>{aiRLoading ? 'Thinking…' : 'Recovery Plan'}</Text>
                </TouchableOpacity>
              </View>
              {!!aiWorkout && (
                <View style={s.aiResult}>
                  <Text style={s.aiResultLabel}>Today's Workout</Text>
                  <Text style={s.aiResultText}>{aiWorkout}</Text>
                </View>
              )}
              {!!aiRecovery && (
                <View style={s.aiResult}>
                  <Text style={s.aiResultLabel}>Recovery + Adjustment</Text>
                  <Text style={s.aiResultText}>{aiRecovery}</Text>
                </View>
              )}
            </View>

            {/* ── Weekly Hypertrophy Volume ───────────────────────────── */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>Weekly Hypertrophy Volume</Text>
                <View style={s.chip}><Text style={s.chipText}>Target: 10 sets</Text></View>
              </View>
              {MUSCLE_GROUPS.map(({ key, label }) => {
                const count = muscleDistribution[key] || 0;
                const pct = Math.min((count / 10) * 100, 100);
                const cc  = count >= 10 ? '#10b981' : count >= 5 ? '#f59e0b' : C.muted;
                return (
                  <View key={key} style={{ marginBottom: 12 }}>
                    <View style={s.hypertrophyRow}>
                      <Text style={s.hypertrophyLabel}>{label}</Text>
                      <Text style={[s.hypertrophyCount, { color: cc }]}>{count}/10</Text>
                    </View>
                    <ProgressBar value={pct} color={cc} />
                  </View>
                );
              })}
              <Text style={s.hypertrophyNote}>* 10–20 hard sets/muscle/week is optimal for growth.</Text>
            </View>

            {/* ── Recent Workouts ─────────────────────────────────────── */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Recent Workouts</Text>
              {workouts.length > 0
                ? workouts.slice(0, 5).map((w, i) => (
                  <TouchableOpacity key={w._id || i} style={s.workoutRow} onPress={() => nav(`/training/${w._id}`)}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.workoutName}>{w.name || 'Workout'}</Text>
                      <Text style={s.workoutMeta}>
                        {new Date(w.date).toLocaleDateString()} · {w.exercises?.length || 0} exercises
                        {w.duration ? ` · ${w.duration} min` : ''}
                      </Text>
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </TouchableOpacity>
                ))
                : <Text style={s.mutedBody}>No workouts logged yet.</Text>
              }
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },

  // stat grid (2×2)
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { width: '47%', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, alignItems: 'center' },
  statValue:   { fontSize: 28, fontWeight: '800', color: C.text },
  statSublabel:{ fontSize: 12, color: C.muted },
  statLabel:   { fontSize: 12, color: C.muted, marginTop: 2 },

  // start button
  startBtn:     { backgroundColor: C.text, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  startBtnText: { color: C.surface, fontSize: 16, fontWeight: '700' },

  // templates
  section:      { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  templateCard: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginRight: 12, width: 140 },
  templateName: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  templateSub:  { fontSize: 12, color: C.muted },

  // quick nav
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickBtn: { flex: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 12, alignItems: 'center' },
  quickIcon:  { fontSize: 22, marginBottom: 4 },
  quickLabel: { fontSize: 11, color: C.text, fontWeight: '600', textAlign: 'center' },

  // generic card
  card: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardHeaderIcon: { fontSize: 18, marginRight: 8 },
  cardTitle:      { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  mutedBody:      { fontSize: 13, color: C.muted, lineHeight: 20 },

  // readiness
  readinessGlow: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, opacity: 0.06 },
  readinessRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ring:          { width: 100, height: 100, borderRadius: 50, borderWidth: 8, justifyContent: 'center', alignItems: 'center' },
  ringScore:     { fontSize: 30, fontWeight: '900', lineHeight: 32 },
  ringUnit:      { fontSize: 12, color: C.muted, fontWeight: '600' },
  readinessRec:  { fontSize: 13, color: C.text, lineHeight: 20, marginBottom: 8 },
  statusBadge:   { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText:{ fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  componentsGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  compCard:      { width: '47%', backgroundColor: 'rgba(22,19,16,0.04)', borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 10 },
  compRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  compEmoji:     { fontSize: 11, fontWeight: '700', color: C.text },
  compScore:     { fontSize: 11, fontWeight: '800' },
  compDetail:    { fontSize: 10, color: C.muted, marginTop: 4 },
  overtrain:     { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  stagnationHeader: { fontSize: 12, fontWeight: '800', color: '#4c1d95', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  stagnationItem:   { padding: 10, backgroundColor: 'rgba(22,19,16,0.04)', borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#7c3aed', marginBottom: 8 },
  stagnationExercise: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 2 },
  stagnationDetail:   { fontSize: 12, color: C.muted },
  stagnationSuggestion:{ fontSize: 12, color: C.muted, marginTop: 4 },

  // advanced toggle
  advancedToggle:     { borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 12, alignItems: 'center', marginBottom: 16 },
  advancedToggleText: { fontSize: 14, fontWeight: '600', color: C.muted },

  // insight cards
  insightCard: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  insightTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  insightDetail:{ fontSize: 13, color: C.muted, lineHeight: 20 },

  // AI suggestions
  aiButtonRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 8, flexWrap: 'wrap' },
  outlinedBtn:     { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  outlinedBtnText: { fontSize: 13, fontWeight: '600', color: C.text },
  aiResult:        { backgroundColor: 'rgba(22,19,16,0.04)', borderRadius: 10, padding: 12, marginTop: 8 },
  aiResultLabel:   { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  aiResultText:    { fontSize: 13, color: C.text, lineHeight: 20 },

  // hypertrophy
  hypertrophyRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  hypertrophyLabel:{ fontSize: 13, fontWeight: '600', color: C.muted },
  hypertrophyCount:{ fontSize: 13, fontWeight: '700' },
  hypertrophyNote: { fontSize: 11, color: C.muted, fontStyle: 'italic', marginTop: 4 },
  chip:            { backgroundColor: 'rgba(22,19,16,0.06)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chipText:        { fontSize: 11, fontWeight: '700', color: C.muted },

  // progress bar
  trackBg:   { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  trackFill:  { height: 6, borderRadius: 3 },

  // recent workouts
  workoutRow:  { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(22,19,16,0.03)', borderRadius: 10, marginBottom: 8 },
  workoutName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
  workoutMeta: { fontSize: 12, color: C.muted },
  chevron:     { fontSize: 22, color: C.muted, marginLeft: 8 },
});

/**
 * Mobile Home Screen — pixel-perfect translation of:
 *   client/src/components/Dashboard.jsx
 *
 * MUI → RN colour mapping (Paper theme):
 *   background.default → #f6f1e7
 *   background.paper   → #ffffff
 *   text.primary       → #161310
 *   text.secondary     → rgba(22,19,16,0.62)
 *   divider            → rgba(22,19,16,0.10)
 *   p:3 = 24, p:4 = 32, gap:2 = 16, gap:3 = 24
 *   borderRadius:2 = 16
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, PanResponder, Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useScrollToTop } from '@react-navigation/native';

const WORKOUT_KEY = '@active_workout_draft';

// ─── colours ─────────────────────────────────────────────────────────────────
const C = {
  bg:      '#f6f1e7',
  surface: '#ffffff',
  text:    '#161310',
  muted:   'rgba(22,19,16,0.62)',
  border:  'rgba(22,19,16,0.10)',
  dark:    '#111827',
};

const getStateColor = (v) => v >= 7 ? '#15803d' : v >= 5 ? '#ca8a04' : '#dc2626';

// ─── Chip (matches MUI Chip size="small") ────────────────────────────────────
function Chip({ label, bg, color }) {
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={[s.chipText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Pure-JS Slider (works in Expo Go, no native modules) ────────────────────
const SCREEN_W = Dimensions.get('window').width;
function JSSlider({ value, min = 1, max = 10, step = 1, onChange, disabled, trackColor }) {
  const trackRef = useRef(null);
  const trackX    = useRef(0);
  const trackW    = useRef(220);

  const clamp = (v) => Math.min(max, Math.max(min, v));
  const snap  = (v) => Math.round(v / step) * step;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder:  () => !disabled,
      onPanResponderGrant: (e) => {
        if (disabled) return;
        const x = e.nativeEvent.pageX - trackX.current;
        const pct = Math.max(0, Math.min(1, x / trackW.current));
        onChange && onChange(snap(clamp(min + pct * (max - min))));
      },
      onPanResponderMove: (e) => {
        if (disabled) return;
        const x = e.nativeEvent.pageX - trackX.current;
        const pct = Math.max(0, Math.min(1, x / trackW.current));
        onChange && onChange(snap(clamp(min + pct * (max - min))));
      },
    })
  ).current;

  const pct = (value - min) / (max - min);

  return (
    <View
      ref={trackRef}
      style={s.jsTrack}
      onLayout={(e) => {
        trackW.current = e.nativeEvent.layout.width;
        trackRef.current?.measure((fx, fy, w, h, px) => { trackX.current = px; });
      }}
      {...panResponder.panHandlers}
    >
      <View style={[s.jsTrackFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: trackColor }]} />
      <View style={[s.jsThumb, { left: `${Math.round(pct * 100)}%`, backgroundColor: disabled ? C.muted : trackColor }]} />
    </View>
  );
}

// ─── Slider row (matches each MUI Slider block in Dashboard) ─────────────────
function SliderRow({ icon, label, value, onChange, min = 1, max = 10, step = 1, unit = '/10', disabled }) {
  const color = getStateColor(value);
  return (
    <View style={s.sliderBlock}>
      <View style={s.sliderHeader}>
        <Text style={s.sliderIcon}>{icon}</Text>
        <Text style={s.sliderLabel}>{label}</Text>
        <Text style={[s.sliderValue, { color }]}>{value}{unit}</Text>
      </View>
      <JSSlider value={value} min={min} max={max} step={step} onChange={onChange} disabled={disabled} trackColor={color} />
    </View>
  );
}

// ─── Quick Action tile (matches web grid items) ───────────────────────────────
function QuickTile({ icon, label, bg, onPress }) {
  return (
    <TouchableOpacity style={[s.tile, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={s.tileIcon}>{icon}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedDate = params.date || new Date().toISOString().split('T')[0];

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [stateReflection, setStateReflection] = useState(null);

  const [todayState, setTodayState] = useState({
    energy: 5, mood: 5, bodyFeel: 5, hunger: 5, sleep: 7,
  });

  const [weeklyStats, setWeeklyStats] = useState({
    avgEnergy: '—', avgMood: '—', avgSleep: '—', workouts: 0, streak: 0,
    weight: '—',
  });

  const scrollRef = React.useRef(null);
  useScrollToTop(scrollRef);

  // ── helpers ──────────────────────────────────────────────────────────────
  const moodToScore = (mood) => {
    const m = String(mood || '').toLowerCase();
    const map = { 'very-low': 2, low: 4, neutral: 5, good: 7, great: 9 };
    return map[m] ?? null;
  };

  const avgOf = (arr) => {
    const nums = arr.filter(Number.isFinite);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };

  const calcStreak = (logs) => {
    if (!logs.length) return 0;
    let streak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (logs.some(l => new Date(l.date).toDateString() === d.toDateString())) streak++;
      else if (i > 0) break;
    }
    return streak;
  };

  // ── load data ────────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      const [fitness, mental, nutrition, gymWorkouts] = await Promise.all([
        api.get('/logs/fitness').then(r => r.data).catch(() => []),
        api.get('/logs/mental').then(r => r.data).catch(() => []),
        api.get('/logs/nutrition').then(r => r.data).catch(() => []),
        api.get('/gym/workouts').then(r => r.data).catch(() => []),
      ]);

      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const recentMental  = (mental  || []).filter(m => new Date(m.date) > weekAgo);
      const recentFitness = (fitness || []).filter(f => new Date(f.date) > weekAgo);
      const recentGym     = (gymWorkouts || []).filter(w => new Date(w.date) > weekAgo);

      const avgEnergy = avgOf(recentMental.map(m => m.energyLevel).filter(v => v != null));
      const avgMood   = avgOf(recentMental.map(m => m.moodScore ?? moodToScore(m.mood)).filter(v => v != null));
      const avgSleep  = avgOf(recentMental.map(m => m.sleepHours).filter(v => v != null));

      setWeeklyStats({
        avgEnergy: avgEnergy == null ? '—' : String(Math.round(avgEnergy)),
        avgMood:   avgMood   == null ? '—' : String(Math.round(avgMood)),
        avgSleep:  avgSleep  == null ? '—' : avgSleep.toFixed(1),
        workouts:  recentGym.length + recentFitness.length,
        streak:    calcStreak(mental || []),
        weight:    user?.biologicalProfile?.weightKg || user?.weight || '—',
      });

      const todayStr = new Date().toDateString();
      const todayLog = (mental || []).find(m => new Date(m.date).toDateString() === todayStr);
      if (todayLog) {
        setHasCheckedIn(true);
        setTodayState({
          energy:   todayLog.energyLevel || 5,
          mood:     todayLog.moodScore   || 5,
          bodyFeel: todayLog.bodyFeel    || 5,
          hunger:   todayLog.hungerLevel || 5,
          sleep:    todayLog.sleepHours  || 7,
        });
      }

      // state reflection
      try {
        const dlsRes = await api.get(`/daily-life-state/${selectedDate}?refresh=1`);
        setStateReflection(dlsRes.headers?.['x-lifesync-state-reflection'] || null);
      } catch { /* no-op */ }

    } catch (err) {
      console.error('Dashboard load error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkActiveWorkout = async () => {
    try {
      const saved = await AsyncStorage.getItem(WORKOUT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (Date.now() - draft.lastSaved < 86400000) setActiveWorkout(draft);
        else setActiveWorkout(null);
      } else setActiveWorkout(null);
    } catch { setActiveWorkout(null); }
  };

  useEffect(() => { loadData(); }, [selectedDate]);
  useFocusEffect(useCallback(() => { checkActiveWorkout(); }, []));

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadData();
    checkActiveWorkout();
  };

  // ── check-in submit ──────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      await api.post('/logs/mental', {
        moodScore:    todayState.mood,
        energyLevel:  todayState.energy,
        bodyFeel:     todayState.bodyFeel,
        hungerLevel:  todayState.hunger,
        sleepHours:   todayState.sleep,
        date:         new Date(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHasCheckedIn(true);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Check-in failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setSubmitting(false);
  };

  const discardDraft = () => Alert.alert('Discard Workout?', 'Delete this saved draft?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Discard', style: 'destructive', onPress: async () => {
      await AsyncStorage.removeItem(WORKOUT_KEY);
      setActiveWorkout(null);
    }},
  ]);

  const greet = () => {
    const h = new Date().getHours();
    return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  };

  const nav = (path) => { Haptics.selectionAsync(); router.push(path); };

  if (loading && !refreshing) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={C.text} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── Active Workout Resume Banner ────────────────────────────────── */}
      {activeWorkout && (
        <TouchableOpacity style={s.resumeBanner} onPress={() => nav('/training/active')}>
          <Text style={s.resumeTitle}>🏋️ Active Workout Found</Text>
          <Text style={s.resumeSubtitle}>Continue your {activeWorkout.name}?</Text>
          <TouchableOpacity onPress={discardDraft} style={s.resumeDiscard}>
            <Text style={s.resumeDiscardText}>Discard</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* ── Greeting (CENTER header from web) ──────────────────────────── */}
      <View style={s.card}>
        <View style={s.greetRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greetText}>
              Good {greet()}, {user?.name?.split(' ')[0] || 'there'}
            </Text>
            <Text style={s.greetDate}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            {stateReflection && (
              <Text style={s.greetReflection}>{stateReflection}</Text>
            )}
          </View>
          {hasCheckedIn && (
            <View style={s.checkedBadge}>
              <Text style={s.checkedBadgeText}>✓ Checked in</Text>
            </View>
          )}
        </View>

        {/* subtitle */}
        <Text style={s.sectionSub}>
          {hasCheckedIn ? "Today's State" : 'How are you feeling?'}
        </Text>

        {/* Sliders — exact match to web Dashboard */}
        <SliderRow icon="⚡" label="Energy"    value={todayState.energy}   disabled={hasCheckedIn} onChange={v => setTodayState(p => ({ ...p, energy: v }))} />
        <SliderRow icon="😊" label="Mood"      value={todayState.mood}     disabled={hasCheckedIn} onChange={v => setTodayState(p => ({ ...p, mood: v }))} />
        <SliderRow icon="💪" label="Body Feel" value={todayState.bodyFeel} disabled={hasCheckedIn} onChange={v => setTodayState(p => ({ ...p, bodyFeel: v }))} />
        <SliderRow icon="🍽️" label="Hunger"   value={todayState.hunger}   disabled={hasCheckedIn} onChange={v => setTodayState(p => ({ ...p, hunger: v }))} />
        <SliderRow icon="🌙" label="Sleep"     value={todayState.sleep}    disabled={hasCheckedIn} onChange={v => setTodayState(p => ({ ...p, sleep: v }))} min={0} max={12} step={0.5} unit="h" />

        {!hasCheckedIn && (
          <TouchableOpacity
            style={[s.primaryBtn, submitting && { opacity: 0.6 }]}
            onPress={handleCheckIn}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>{submitting ? 'Saving…' : 'Check In'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Quick Actions (matches web 2×2 grid) ───────────────────────── */}
      <View style={s.tilesGrid}>
        <QuickTile icon="💪" label="Log Workout" bg="#eff6ff" onPress={() => nav('/training/active')} />
        <QuickTile icon="🥗" label="Log Meal"    bg="#f0fdf4" onPress={() => nav('/nutrition/search')} />
        <QuickTile icon="⚖️" label="Log Weight"  bg="#fef3c7" onPress={() => nav('/nutrition')} />
        <QuickTile icon="🤖" label="Talk to AI"  bg="#faf5ff" onPress={() => nav('/(tabs)/chat')} />
      </View>

      {/* ── LEFT card: This Week ────────────────────────────────────────── */}
      <View style={s.card}>
        <Text style={s.cardSubtitle}>This Week</Text>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Avg Energy</Text>
          <Chip label={`${weeklyStats.avgEnergy}/10`} bg="#eff6ff" color="#2563eb" />
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Avg Mood</Text>
          <Chip label={`${weeklyStats.avgMood}/10`} bg="#faf5ff" color="#9333ea" />
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Avg Sleep</Text>
          <Chip label={`${weeklyStats.avgSleep}h`} bg="#f0fdf4" color="#15803d" />
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Workouts</Text>
          <Chip label={String(weeklyStats.workouts)} bg="#fef3c7" color="#b45309" />
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Current Weight</Text>
          <Chip label={String(weeklyStats.weight)} bg="#fff7ed" color="#c2410c" />
        </View>
      </View>

      {/* ── Streak card ────────────────────────────────────────────────── */}
      <View style={s.card}>
        <Text style={s.cardSubtitle}>Check-in Streak</Text>
        <Text style={s.streakValue}>
          {weeklyStats.streak}<Text style={s.streakUnit}> days</Text>
        </Text>
        <Text style={s.streakCaption}>Keep going! Consistency builds insight.</Text>
      </View>

      {/* ── RIGHT card: Insights & Patterns ────────────────────────────── */}
      <View style={s.card}>
        <View style={s.insightsHeader}>
          <Text style={s.insightsIcon}>💡</Text>
          <Text style={s.insightsTitle}>Insights & Patterns</Text>
        </View>
        <Text style={s.insightsBody}>
          All pattern analysis and AI insights are now centralized in the Insights tab.
        </Text>
        <TouchableOpacity style={s.outlinedBtn} onPress={() => nav('/(tabs)/insights')}>
          <Text style={s.outlinedBtnText}>Open Insights</Text>
        </TouchableOpacity>
      </View>

      {/* ── AI Understanding card (dark, matches web) ──────────────────── */}
      <View style={[s.card, s.darkCard]}>
        <Text style={s.darkSubtitle}>AI Understanding</Text>
        <Text style={s.darkBody}>
          I'm learning your patterns. The more you check in, the better I understand:
        </Text>
        {[
          'When you perform best',
          'What affects your mood',
          'Your recovery patterns',
          'What motivates you',
        ].map((item, i) => (
          <View key={i} style={s.darkBulletRow}>
            <View style={s.darkBulletDot} />
            <Text style={s.darkBulletText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 60 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },

  // resume banner
  resumeBanner:      { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', padding: 16, marginBottom: 16 },
  resumeTitle:       { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  resumeSubtitle:    { fontSize: 13, color: C.muted },
  resumeDiscard:     { marginTop: 8 },
  resumeDiscardText: { fontSize: 13, color: '#dc2626', fontWeight: '600' },

  // cards (background.paper, borderRadius:2=16, border 1px divider, p:3=24)
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  // greeting
  greetRow:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  greetText:       { fontSize: 20, fontWeight: '600', color: C.text },
  greetDate:       { fontSize: 13, color: C.muted, marginTop: 2 },
  greetReflection: { fontSize: 12, color: C.muted, marginTop: 4 },
  checkedBadge:    { backgroundColor: '#f0fdf4', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  checkedBadgeText:{ fontSize: 12, color: '#15803d', fontWeight: '600' },
  sectionSub:      { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 12 },

  // slider
  sliderBlock:  { marginBottom: 16 },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sliderIcon:   { fontSize: 16, marginRight: 6 },
  sliderLabel:  { fontSize: 14, fontWeight: '500', color: C.text, flex: 1 },
  sliderValue:  { fontSize: 14, fontWeight: '600' },
  jsTrack:      { height: 6, backgroundColor: C.border, borderRadius: 3, position: 'relative', justifyContent: 'center' },
  jsTrackFill:  { height: 6, borderRadius: 3, position: 'absolute', left: 0, top: 0 },
  jsThumb:      { width: 18, height: 18, borderRadius: 9, backgroundColor: C.text, position: 'absolute', top: -6, marginLeft: -9, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 },

  // primary button (Check In)
  primaryBtn:     { backgroundColor: C.text, borderRadius: 16, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: C.surface, fontSize: 15, fontWeight: '600' },

  // quick tiles (2×2 grid matching web)
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  tile:      { width: '47%', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  tileIcon:  { fontSize: 24, marginBottom: 6 },
  tileLabel: { fontSize: 13, fontWeight: '500', color: C.text, textAlign: 'center' },

  // stat rows
  statRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 14, fontWeight: '600', color: C.text },

  // chip
  chip:     { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 12, fontWeight: '600' },

  // streak
  cardSubtitle:  { fontSize: 13, color: C.muted, fontWeight: '600', marginBottom: 8 },
  streakValue:   { fontSize: 36, fontWeight: '800', color: C.text },
  streakUnit:    { fontSize: 16, fontWeight: '400', color: C.muted },
  streakCaption: { fontSize: 12, color: C.muted, marginTop: 4 },

  // insights
  insightsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  insightsIcon:   { fontSize: 18, marginRight: 6 },
  insightsTitle:  { fontSize: 14, fontWeight: '600', color: C.text },
  insightsBody:   { fontSize: 13, color: C.muted, marginBottom: 12 },

  // outlined button
  outlinedBtn:     { borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  outlinedBtnText: { fontSize: 14, fontWeight: '600', color: C.text },

  // dark card (AI Understanding)
  darkCard:       { backgroundColor: C.dark },
  darkSubtitle:   { fontSize: 13, color: '#9ca3af', fontWeight: '600', marginBottom: 8 },
  darkBody:       { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20, marginBottom: 12 },
  darkBulletRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  darkBulletDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: '#6366f1', marginRight: 8 },
  darkBulletText: { fontSize: 12, color: '#d1d5db' },
});

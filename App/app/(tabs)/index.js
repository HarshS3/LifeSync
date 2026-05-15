/**
 * Mobile Home Screen — pixel-perfect translation of:
 *   client/src/components/Dashboard.jsx
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useScrollToTop } from '@react-navigation/native';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { MetricSlider } from '../../components/ui/MetricSlider';
import { H1, H2, H3, Body, Caption } from '../../components/ui/Typography';

const WORKOUT_KEY = '@active_workout_draft';

// ─── Chip (Standardized) ─────────────────────────────────────────────────────
function StatChip({ label, feature }) {
  const { COLORS } = useTheme();
  const bg = COLORS[`${feature}Bg`] || COLORS.gray100;
  const color = COLORS[feature] || COLORS.primary;
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Body style={[s.chipText, { color }]}>{label}</Body>
    </View>
  );
}

// ─── Quick Action tile ───────────────────────────────────────────────
function QuickTile({ icon, label, feature, onPress }) {
  const { COLORS } = useTheme();
  const bg = COLORS[`${feature}Bg`] || COLORS.gray100;
  return (
    <TouchableOpacity 
      style={[s.tile, { backgroundColor: bg, borderColor: COLORS.border }]} 
      onPress={onPress} 
      activeOpacity={0.8}
    >
      <Body style={s.tileIcon}>{icon}</Body>
      <Caption style={s.tileLabel}>{label}</Caption>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user } = useAuth();
  const { COLORS, SPACING, isDark } = useTheme();
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

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

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

      const avgOf = (arr) => {
        const nums = arr.filter(Number.isFinite);
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      };

      const avgEnergy = avgOf(recentMental.map(m => m.energyLevel).filter(v => v != null));
      const avgMood   = avgOf(recentMental.map(m => (m.moodScore || 5)).filter(v => v != null));
      const avgSleep  = avgOf(recentMental.map(m => m.sleepHours).filter(v => v != null));

      setWeeklyStats({
        avgEnergy: avgEnergy == null ? '—' : String(Math.round(avgEnergy)),
        avgMood:   avgMood   == null ? '—' : String(Math.round(avgMood)),
        avgSleep:  avgSleep  == null ? '—' : avgSleep.toFixed(1),
        workouts:  recentGym.length + recentFitness.length,
        streak:    recentMental.length, // Simplified streak logic
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
      <View style={[s.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <ScreenWrapper showBack={false} title="LifeSync">
      <ScrollView
        ref={scrollRef}
        style={s.root}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeWorkout && (
          <TouchableOpacity 
            style={[s.resumeBanner, { backgroundColor: COLORS.trainingBg, borderColor: COLORS.training }]} 
            onPress={() => nav('/training/active')}
          >
            <H3 style={{ color: COLORS.training }}>🏋️ Active Workout Found</H3>
            <Body secondary>Continue your {activeWorkout.name}?</Body>
            <TouchableOpacity onPress={discardDraft} style={s.resumeDiscard}>
              <Body style={{ color: COLORS.error, fontWeight: '600' }}>Discard</Body>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        <Card>
          <View style={s.greetRow}>
            <View style={{ flex: 1 }}>
              <H2>Good {greet()}, {user?.name?.split(' ')[0] || 'there'}</H2>
              <Caption secondary>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Caption>
              {stateReflection && (
                <Body style={s.greetReflection}>{stateReflection}</Body>
              )}
            </View>
            {hasCheckedIn && (
              <View style={[s.checkedBadge, { backgroundColor: COLORS.success + '15' }]}>
                <Caption style={{ color: COLORS.success, fontWeight: '700' }}>✓ Checked in</Caption>
              </View>
            )}
          </View>

          <Body secondary style={s.sectionSub}>
            {hasCheckedIn ? "Today's State" : 'How are you feeling?'}
          </Body>

          <MetricSlider 
            icon="⚡" label="Energy" 
            value={todayState.energy} 
            disabled={hasCheckedIn} 
            color="#fbbf24"
            onChange={v => setTodayState(p => ({ ...p, energy: v }))} 
          />
          <MetricSlider 
            icon="😊" label="Mood" 
            value={todayState.mood} 
            disabled={hasCheckedIn} 
            color="#ec4899"
            onChange={v => setTodayState(p => ({ ...p, mood: v }))} 
          />
          <MetricSlider 
            icon="💪" label="Body" 
            value={todayState.bodyFeel} 
            disabled={hasCheckedIn} 
            color="#8b5cf6"
            onChange={v => setTodayState(p => ({ ...p, bodyFeel: v }))} 
          />
          <MetricSlider 
            icon="🍽️" label="Hunger" 
            value={todayState.hunger} 
            disabled={hasCheckedIn} 
            color="#ef4444"
            onChange={v => setTodayState(p => ({ ...p, hunger: v }))} 
          />
          <MetricSlider 
            icon="🌙" label="Sleep" 
            value={todayState.sleep} 
            disabled={hasCheckedIn} 
            color="#3b82f6"
            min={0} max={12} step={0.5} unit="h"
            onChange={v => setTodayState(p => ({ ...p, sleep: v }))} 
          />

          {!hasCheckedIn && (
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: COLORS.primary }, submitting && { opacity: 0.6 }]}
              onPress={handleCheckIn}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Body style={{ color: COLORS.surface, fontWeight: '700' }}>
                {submitting ? 'Saving…' : 'Check In'}
              </Body>
            </TouchableOpacity>
          )}
        </Card>

        <View style={s.tilesGrid}>
          <QuickTile icon="💪" label="Workout" feature="training" onPress={() => nav('/training/active')} />
          <QuickTile icon="🥗" label="Log Meal" feature="nutrition" onPress={() => nav('/nutrition/search')} />
          <QuickTile icon="⚖️" label="Weight" feature="wellness" onPress={() => nav('/nutrition')} />
          <QuickTile icon="🤖" label="Talk AI" feature="insight" onPress={() => nav('/(tabs)/chat')} />
        </View>

        <Card>
          <Caption secondary style={{ marginBottom: 12 }}>THIS WEEK</Caption>
          <View style={s.statRow}>
            <Body>Avg Energy</Body>
            <StatChip label={`${weeklyStats.avgEnergy}/10`} feature="training" />
          </View>
          <View style={s.statRow}>
            <Body>Avg Mood</Body>
            <StatChip label={`${weeklyStats.avgMood}/10`} feature="wellness" />
          </View>
          <View style={s.statRow}>
            <Body>Avg Sleep</Body>
            <StatChip label={`${weeklyStats.avgSleep}h`} feature="nutrition" />
          </View>
          <View style={s.statRow}>
            <Body>Workouts</Body>
            <StatChip label={String(weeklyStats.workouts)} feature="training" />
          </View>
        </Card>

        <Card style={{ backgroundColor: COLORS.primary }}>
          <Caption style={{ color: COLORS.surface, opacity: 0.7, marginBottom: 4 }}>CHECK-IN STREAK</Caption>
          <H1 style={{ color: COLORS.surface }}>
            {weeklyStats.streak}<Body style={{ color: COLORS.surface, opacity: 0.8 }}> days</Body>
          </H1>
          <Caption style={{ color: COLORS.surface, opacity: 0.7, marginTop: 4 }}>Consistency builds insight.</Caption>
        </Card>

        <Card style={s.darkCard}>
          <View style={s.insightsHeader}>
            <Body style={{ fontSize: 18 }}>💡</Body>
            <H3 style={{ marginLeft: 8 }}>Insights & Patterns</H3>
          </View>
          <Body secondary style={{ marginBottom: 16 }}>
            Pattern analysis and AI insights are centralized in the Insights tab.
          </Body>
          <TouchableOpacity 
            style={[s.outlinedBtn, { borderColor: COLORS.border }]} 
            onPress={() => nav('/(tabs)/insights')}
          >
            <Body style={{ fontWeight: '600' }}>Open Insights</Body>
          </TouchableOpacity>
        </Card>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: 16 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center' },

  resumeBanner:      { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  resumeDiscard:     { marginTop: 8 },

  greetRow:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  greetReflection: { marginTop: 4, fontStyle: 'italic' },
  checkedBadge:    { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  sectionSub:      { marginBottom: 16 },

  primaryBtn:     { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8 },

  tilesGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  tile:      { width: '23%', padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  tileIcon:  { fontSize: 24, marginBottom: 4 },
  tileLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  statRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chip:     { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 12, fontWeight: '700' },

  insightsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  outlinedBtn:     { borderWidth: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  darkCard: { marginBottom: 16 },
});

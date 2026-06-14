/**
 * OverIntakeBanner
 *
 * Appears on the nutrition Today tab when calories logged > 120% of target.
 * Shows a calm 3-day clinical recovery protocol.
 *
 * Tone: numbers, not judgment. "High intake day" not "cheat day".
 * Dismissible per day (stored in AsyncStorage so it doesn't come back the same day).
 * Collapsible — collapsed by default once user has seen the protocol.
 */
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { X, ChevronDown, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Body, Caption, H3 } from '../ui/Typography';

const DISMISS_KEY_PREFIX = '@over_intake_dismissed_';

export default function OverIntakeBanner({ calories, targetCalories, COLORS }) {
  const [dismissed, setDismissed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const dismissKey = `${DISMISS_KEY_PREFIX}${today}`;

  useEffect(() => {
    AsyncStorage.getItem(dismissKey)
      .then(val => {
        if (val === '1') setDismissed(true);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  const dismiss = async () => {
    await AsyncStorage.setItem(dismissKey, '1');
    setDismissed(true);
  };

  if (!checked || dismissed) return null;
  if (!calories || !targetCalories || calories <= targetCalories * 1.20) return null;

  const surplus = Math.round(calories - targetCalories);
  const surplusPct = Math.round(((calories - targetCalories) / targetCalories) * 100);

  // 3-day recovery protocol — numbers only
  const recoveryCalories = targetCalories; // maintenance, not aggressive deficit
  const proteinToday = 140; // maintain protein to protect muscle

  return (
    <View style={[S.banner, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
      {/* Header */}
      <TouchableOpacity style={S.headerRow} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <View style={S.headerLeft}>
          <View style={S.dot} />
          <H3 style={{ fontSize: 13, flex: 1 }}>
            High intake day — {surplus > 0 ? `+${surplus}` : surplus} kcal over target
          </H3>
        </View>
        <View style={S.headerRight}>
          {open ? <ChevronDown size={14} color="#a16207" /> : <ChevronRight size={14} color="#a16207" />}
          <TouchableOpacity onPress={dismiss} style={S.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={14} color="#a16207" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={S.body}>
          <Caption style={S.subtext}>
            One day {surplusPct}% over doesn't matter. How the next 3 days go does.
          </Caption>

          {/* Protocol */}
          <View style={S.protocol}>
            <Caption style={S.protocolTitle}>3-DAY RECOVERY PROTOCOL</Caption>

            {[
              {
                day: 'Today',
                action: `No further eating today unless genuinely hungry. Water, not food, for the rest of the evening.`,
              },
              {
                day: 'Tomorrow',
                action: `Eat at your maintenance target (${recoveryCalories} kcal). Not a deficit — cortisol is already elevated. Hit ${proteinToday}g protein to protect muscle.`,
              },
              {
                day: 'Day after',
                action: `Back to normal. If you resume your deficit goal, do so. The surplus from today will be physiologically neutral if tomorrow and day-after are clean.`,
              },
            ].map((step, i) => (
              <View key={i} style={S.step}>
                <View style={S.stepNumBox}>
                  <Caption style={S.stepNum}>{i === 0 ? 'Now' : step.day}</Caption>
                </View>
                <Caption style={S.stepText}>{step.action}</Caption>
              </View>
            ))}
          </View>

          {/* What not to do */}
          <View style={S.avoidBox}>
            <Caption style={S.avoidTitle}>WHAT DOESN'T HELP</Caption>
            <Caption style={S.avoidText}>• Skipping tomorrow's meals — amplifies cortisol and muscle loss</Caption>
            <Caption style={S.avoidText}>• Extra cardio to "burn it off" — adds stress on top of stress</Caption>
            <Caption style={S.avoidText}>• Aggressive deficit for the week — cortisol + deficit = catabolism</Caption>
          </View>

          <TouchableOpacity onPress={dismiss} style={S.dismissFull}>
            <Caption style={{ color: '#a16207', fontWeight: '600' }}>Got it — dismiss</Caption>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  banner: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeBtn: { padding: 2 },
  body: { paddingHorizontal: 12, paddingBottom: 12 },
  subtext: { fontSize: 12, color: '#78350f', marginBottom: 10, lineHeight: 17 },

  protocol: { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 10, marginBottom: 10 },
  protocolTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, color: '#92400e', marginBottom: 8 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  stepNumBox: { backgroundColor: '#f59e0b', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, minWidth: 44, alignItems: 'center' },
  stepNum: { fontSize: 9, fontWeight: '800', color: '#fff' },
  stepText: { flex: 1, fontSize: 12, color: '#78350f', lineHeight: 18 },

  avoidBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginBottom: 10 },
  avoidTitle: { fontSize: 9, fontWeight: '800', color: '#b91c1c', letterSpacing: 0.8, marginBottom: 6 },
  avoidText: { fontSize: 11, color: '#b91c1c', marginBottom: 3, lineHeight: 17 },

  dismissFull: { alignItems: 'center', paddingTop: 4 },
});

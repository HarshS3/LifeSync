/**
 * Weekly Nutrient Report
 *
 * Full 39-nutrient breakdown for the current (or selected) week.
 * Shows averages vs targets, trend arrows, and a priority deficiency summary.
 * This is where comprehensive data lives — daily Details tab shows only the priority view.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Calendar } from 'lucide-react-native';
import api from '../../services/api';
import { useTheme } from '../../constants/Theme';

const fmt = (n, d = 1) => {
  const v = Number(n);
  return Number.isFinite(v) ? (d === 0 ? Math.round(v).toString() : v.toFixed(d)) : '0';
};

const pct = (val, target) => target > 0 ? Math.min(Math.round((val / target) * 100), 200) : 0;

// ── Nutrient groups for display ───────────────────────────────────────────────
const GROUPS = [
  {
    title: 'Macros',
    color: '#3b82f6',
    items: [
      { key: 'calories', label: 'Calories', unit: 'kcal', targetKey: 'calories' },
      { key: 'protein',  label: 'Protein',  unit: 'g',    targetKey: 'protein' },
      { key: 'carbs',    label: 'Carbs',    unit: 'g',    targetKey: 'carbs' },
      { key: 'fat',      label: 'Fat',      unit: 'g',    targetKey: 'fat' },
      { key: 'fiber',    label: 'Fiber',    unit: 'g',    targetKey: 'fiber' },
      { key: 'sugar',    label: 'Sugar',    unit: 'g',    targetKey: 'sugar' },
    ],
  },
  {
    title: 'Key Minerals',
    color: '#10b981',
    items: [
      { key: 'magnesium', label: 'Magnesium', unit: 'mg', targetKey: 'magnesium' },
      { key: 'calcium',   label: 'Calcium',   unit: 'mg', targetKey: 'calcium' },
      { key: 'iron',      label: 'Iron',      unit: 'mg', targetKey: 'iron' },
      { key: 'zinc',      label: 'Zinc',      unit: 'mg', targetKey: 'zinc' },
      { key: 'potassium', label: 'Potassium', unit: 'mg', targetKey: 'potassium' },
      { key: 'sodium',    label: 'Sodium',    unit: 'mg', targetKey: 'sodium' },
      { key: 'phosphorus',label: 'Phosphorus',unit: 'mg', targetKey: 'phosphorus' },
      { key: 'copper',    label: 'Copper',    unit: 'mg', targetKey: 'copper' },
      { key: 'selenium',  label: 'Selenium',  unit: 'mcg',targetKey: 'selenium' },
      { key: 'manganese', label: 'Manganese', unit: 'mg', targetKey: 'manganese' },
    ],
  },
  {
    title: 'Vitamins',
    color: '#f59e0b',
    items: [
      { key: 'vitaminC',  label: 'Vitamin C',  unit: 'mg',  targetKey: 'vitaminC' },
      { key: 'vitaminD',  label: 'Vitamin D',  unit: 'IU',  targetKey: 'vitaminD' },
      { key: 'vitaminA',  label: 'Vitamin A',  unit: 'IU',  targetKey: 'vitaminA' },
      { key: 'vitaminE',  label: 'Vitamin E',  unit: 'mg',  targetKey: 'vitaminE' },
      { key: 'vitaminB12',label: 'B12',        unit: 'mcg', targetKey: 'vitaminB12' },
      { key: 'folate',    label: 'Folate',     unit: 'mcg', targetKey: 'folate' },
      { key: 'vitaminB1', label: 'B1 Thiamin', unit: 'mg',  targetKey: 'vitaminB1' },
      { key: 'vitaminB2', label: 'B2 Riboflavin',unit:'mg', targetKey: 'vitaminB2' },
      { key: 'vitaminB3', label: 'B3 Niacin',  unit: 'mg',  targetKey: 'vitaminB3' },
      { key: 'vitaminB5', label: 'B5 Pantothenic',unit:'mg',targetKey: 'vitaminB5' },
      { key: 'vitaminB6', label: 'B6',         unit: 'mg',  targetKey: 'vitaminB6' },
      { key: 'vitaminB7', label: 'B7 Biotin',  unit: 'mcg', targetKey: 'vitaminB7' },
    ],
  },
  {
    title: 'Fat Quality',
    color: '#ec4899',
    items: [
      { key: 'omega3',           label: 'Omega-3',      unit: 'g',  targetKey: 'omega3' },
      { key: 'saturatedFat',     label: 'Saturated Fat',unit: 'g',  targetKey: 'saturatedFat' },
      { key: 'monounsaturatedFat',label:'MUFA',         unit: 'g',  targetKey: 'monounsaturatedFat' },
      { key: 'polyunsaturatedFat',label:'PUFA',         unit: 'g',  targetKey: 'polyunsaturatedFat' },
      { key: 'cholesterol',      label: 'Cholesterol',  unit: 'mg', targetKey: 'cholesterol' },
    ],
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function TrendIcon({ current, previous }) {
  if (!previous || previous === 0) return <Minus size={12} color="#aaa" />;
  const delta = ((current - previous) / previous) * 100;
  if (Math.abs(delta) < 3) return <Minus size={12} color="#aaa" />;
  if (delta > 0) return <TrendingUp size={12} color="#10b981" />;
  return <TrendingDown size={12} color="#ef4444" />;
}

function NutrientRow({ label, unit, weekAvg, target, color }) {
  const p = pct(weekAvg, target);
  const barColor = p >= 100 ? '#10b981' : p >= 70 ? color : p >= 40 ? '#f59e0b' : '#ef4444';
  const statusColor = p >= 90 ? '#10b981' : p >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <View style={R.row}>
      <View style={R.labelRow}>
        <Text style={R.label}>{label}</Text>
        <View style={R.valueBlock}>
          <Text style={[R.pctText, { color: statusColor }]}>{p}%</Text>
          <Text style={R.valueText}>
            {fmt(weekAvg)}{unit}
            {target > 0 ? <Text style={R.targetText}> / {fmt(target, 0)}</Text> : null}
          </Text>
        </View>
      </View>
      {target > 0 && (
        <View style={R.barBg}>
          <View style={[R.barFill, { width: `${Math.min(p, 100)}%`, backgroundColor: barColor }]} />
        </View>
      )}
    </View>
  );
}

const R = StyleSheet.create({
  row: { paddingVertical: 8, paddingHorizontal: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 13, color: '#333', flex: 1 },
  valueBlock: { alignItems: 'flex-end' },
  pctText: { fontSize: 11, fontWeight: '800' },
  valueText: { fontSize: 12, fontWeight: '600', color: '#111', marginTop: 1 },
  targetText: { fontWeight: '400', color: '#999' },
  barBg: { height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function WeeklyReportScreen() {
  const router = useRouter();
  const { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } = useTheme();
  const params = useLocalSearchParams();

  const [weekKey, setWeekKey] = useState(params.weekKey || null);
  const [macros, setMacros] = useState(null);
  const [micros, setMicros] = useState(null);
  const [targets, setTargets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weekLabel, setWeekLabel] = useState('This Week');

  const load = useCallback(async (wk) => {
    setLoading(true);
    try {
      // Always resolve the week key first if not provided
      let resolvedKey = wk;
      if (!resolvedKey) {
        const weekRes = await api.get('/nutrition/aggregation/current-week');
        resolvedKey = weekRes.data?.weekKey;
      }

      const [macroRes, microRes, targetRes] = await Promise.all([
        resolvedKey ? api.get(`/nutrition/aggregation/weekly-macros/${resolvedKey}`).catch(() => ({ data: {} })) : Promise.resolve({ data: {} }),
        resolvedKey ? api.get(`/nutrition/aggregation/weekly-micros/${resolvedKey}`).catch(() => ({ data: {} })) : Promise.resolve({ data: {} }),
        api.get('/nutrition/clinical-targets').catch(() => ({ data: {} })),
      ]);
      setWeekKey(resolvedKey);

      // Parse week label from key (format: YYYY-Www)
      if (resolvedKey) {
        const [year, week] = resolvedKey.split('-W');
        setWeekLabel(`Week ${week}, ${year}`);
      }

      setMacros(macroRes.data);
      setMicros(microRes.data);
      setTargets(targetRes.data?.targets ? {
        ...targetRes.data.targets,
        ...(targetRes.data.targets.micronutrients || {}),
      } : null);
    } catch (err) {
      console.error('Weekly report error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(weekKey); }, []);

  // Build flat avgData from actual API response shapes:
  // Macros: macros.weeklyAverages = { protein, carbs, fat, calories }
  // Micros: micros.byGroup.{group}.{nutrient}.weeklyAvg
  const avgData = {};
  if (macros?.weeklyAverages) Object.assign(avgData, macros.weeklyAverages);
  if (micros?.byGroup) {
    Object.values(micros.byGroup).forEach(group => {
      if (!group) return;
      Object.entries(group).forEach(([nutrient, data]) => {
        if (data?.weeklyAvg != null) avgData[nutrient] = data.weeklyAvg;
      });
    });
  }
  const daysLogged = macros?.dayCount ?? micros?.dayCount ?? 0;

  // Find top deficiencies (< 70% of target, sorted worst first)
  const deficiencies = [];
  if (targets) {
    GROUPS.forEach(g => g.items.forEach(item => {
      const avg = avgData[item.key] || 0;
      const target = targets[item.targetKey] || 0;
      if (target > 0 && avg / target < 0.70) {
        deficiencies.push({ label: item.label, unit: item.unit, avg, target, p: pct(avg, target) });
      }
    }));
    deficiencies.sort((a, b) => a.p - b.p);
  }

  return (
    <View style={[S.container, { backgroundColor: COLORS.background }]}>
      <View style={[S.header, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={[S.headerTitle, { color: COLORS.text }]}>Weekly Report</Text>
          <Text style={[S.headerSub, { color: COLORS.textSecondary }]}>{weekLabel}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={S.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={S.scroll}>
          {/* Logged days banner */}
          {daysLogged > 0 && (
            <View style={[S.daysBanner, { backgroundColor: COLORS.surface }]}>
              <Calendar size={14} color={COLORS.textSecondary} />
              <Text style={[S.daysText, { color: COLORS.textSecondary }]}>
                {daysLogged} of 7 days logged · averages are per logged day
              </Text>
            </View>
          )}
          {daysLogged === 0 && !loading && (
            <View style={[S.daysBanner, { backgroundColor: COLORS.surface }]}>
              <Calendar size={14} color={COLORS.textSecondary} />
              <Text style={[S.daysText, { color: COLORS.textSecondary }]}>No meals logged this week yet.</Text>
            </View>
          )}

          {/* Top deficiencies summary */}
          {deficiencies.length > 0 && (
            <View style={S.section}>
              <View style={S.sectionHeader}>
                <AlertTriangle size={14} color="#f59e0b" />
                <Text style={[S.sectionTitle, { color: COLORS.text }]}>This Week's Gaps</Text>
              </View>
              <View style={[S.card, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
                {deficiencies.slice(0, 5).map((d, i) => (
                  <View key={i} style={[S.defRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.gray100 }]}>
                    <View style={[S.defDot, { backgroundColor: d.p < 40 ? '#ef4444' : '#f59e0b' }]} />
                    <Text style={[S.defLabel, { color: COLORS.text }]}>{d.label}</Text>
                    <Text style={[S.defPct, { color: d.p < 40 ? '#ef4444' : '#f59e0b' }]}>{d.p}%</Text>
                    <Text style={[S.defValue, { color: COLORS.textSecondary }]}>
                      {fmt(d.avg)}{d.unit} / {fmt(d.target, 0)}{d.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {deficiencies.length === 0 && targets && (
            <View style={[S.allGoodCard, { backgroundColor: COLORS.surface }]}>
              <CheckCircle size={20} color="#10b981" />
              <Text style={[S.allGoodText, { color: COLORS.textSecondary }]}>
                All nutrients above 70% of target this week.
              </Text>
            </View>
          )}

          {/* Full nutrient groups */}
          {GROUPS.map((group, gi) => (
            <View key={gi} style={S.section}>
              <View style={S.sectionHeader}>
                <View style={[S.groupDot, { backgroundColor: group.color }]} />
                <Text style={[S.sectionTitle, { color: COLORS.text }]}>{group.title}</Text>
              </View>
              <View style={[S.card, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
                {group.items.map((item, ii) => (
                  <View key={item.key} style={ii < group.items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: COLORS.gray100 } : {}}>
                    <NutrientRow
                      label={item.label}
                      unit={item.unit}
                      weekAvg={avgData[item.key] || 0}
                      target={targets?.[item.targetKey] || 0}
                      color={group.color}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={S.footer}>
            <Text style={[S.footerText, { color: COLORS.textSecondary }]}>
              Averages based on logged days only. Navigate to previous weeks from the nutrition calendar.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  scroll: { padding: 16, paddingBottom: 48 },

  daysBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, marginBottom: 14 },
  daysText: { fontSize: 12 },

  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  groupDot: { width: 8, height: 8, borderRadius: 4 },

  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },

  defRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  defDot: { width: 6, height: 6, borderRadius: 3 },
  defLabel: { flex: 1, fontSize: 13 },
  defPct: { fontSize: 13, fontWeight: '800', width: 36, textAlign: 'right' },
  defValue: { fontSize: 11, width: 100, textAlign: 'right' },

  allGoodCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 16, marginBottom: 16 },
  allGoodText: { flex: 1, fontSize: 13, lineHeight: 18 },

  footer: { marginTop: 8 },
  footerText: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});

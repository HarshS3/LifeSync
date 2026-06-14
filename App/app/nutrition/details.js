import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronRight, Flame, Zap, Layers } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, d = 1) => {
  const v = Number(n);
  return Number.isFinite(v) ? (d === 0 ? Math.round(v).toString() : v.toFixed(d)) : '0';
};
const pct = (n, t) => (t > 0 ? Math.min(Math.round((Number(n) / t) * 100), 200) : 0);

// Macro target approach labels
const APPROACH_LABELS = {
  aggressive_loss: 'Aggressive Cut',
  mild_loss: 'Mild Cut',
  maintenance: 'Maintenance',
  lean_gain: 'Lean Gain',
  aggressive_gain: 'Aggressive Bulk',
};
const APPROACH_COLORS = {
  aggressive_loss: '#ef4444',
  mild_loss: '#f59e0b',
  maintenance: '#6366f1',
  lean_gain: '#10b981',
  aggressive_gain: '#0ea5e9',
};

// All-nutrients data for the expandable "Full Report" section
const ALL_NUTRIENT_GROUPS = [
  {
    title: 'Macronutrients',
    nutrients: [
      { key: 'calories', label: 'Calories', unit: 'kcal' },
      { key: 'protein', label: 'Protein', unit: 'g' },
      { key: 'carbs', label: 'Carbs', unit: 'g' },
      { key: 'fat', label: 'Fat', unit: 'g' },
      { key: 'fiber', label: 'Fiber', unit: 'g' },
      { key: 'sugar', label: 'Sugar', unit: 'g' },
    ],
  },
  {
    title: 'Fat Quality',
    nutrients: [
      { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g' },
      { key: 'monounsaturatedFat', label: 'Monounsaturated', unit: 'g' },
      { key: 'polyunsaturatedFat', label: 'Polyunsaturated', unit: 'g' },
      { key: 'omega3', label: 'Omega-3', unit: 'g' },
      { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
    ],
  },
  {
    title: 'Minerals',
    nutrients: [
      { key: 'sodium', label: 'Sodium', unit: 'mg' },
      { key: 'potassium', label: 'Potassium', unit: 'mg' },
      { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
      { key: 'calcium', label: 'Calcium', unit: 'mg' },
      { key: 'iron', label: 'Iron', unit: 'mg' },
      { key: 'zinc', label: 'Zinc', unit: 'mg' },
      { key: 'phosphorus', label: 'Phosphorus', unit: 'mg' },
      { key: 'copper', label: 'Copper', unit: 'mg' },
      { key: 'selenium', label: 'Selenium', unit: 'mcg' },
      { key: 'manganese', label: 'Manganese', unit: 'mg' },
    ],
  },
  {
    title: 'Vitamins',
    nutrients: [
      { key: 'vitaminA', label: 'Vitamin A', unit: 'IU' },
      { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
      { key: 'vitaminD', label: 'Vitamin D', unit: 'IU' },
      { key: 'vitaminE', label: 'Vitamin E', unit: 'mg' },
      { key: 'vitaminB1', label: 'Thiamin B1', unit: 'mg' },
      { key: 'vitaminB2', label: 'Riboflavin B2', unit: 'mg' },
      { key: 'vitaminB3', label: 'Niacin B3', unit: 'mg' },
      { key: 'vitaminB5', label: 'Pantothenic B5', unit: 'mg' },
      { key: 'vitaminB6', label: 'Vitamin B6', unit: 'mg' },
      { key: 'vitaminB7', label: 'Biotin B7', unit: 'mcg' },
      { key: 'vitaminB9', label: 'Folate B9', unit: 'mcg' },
      { key: 'vitaminB12', label: 'Vitamin B12', unit: 'mcg' },
    ],
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function MacroRing({ label, value, target, color }) {
  const p = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <View style={macroRingStyles.wrap}>
      <View style={[macroRingStyles.ring, { borderColor: p >= 90 ? color : '#e5e7eb' }]}>
        <View style={[macroRingStyles.fill, { height: `${p}%`, backgroundColor: color + '30' }]} />
        <Text style={macroRingStyles.value}>{fmt(value, 0)}</Text>
        <Text style={macroRingStyles.unit}>{label === 'Calories' ? 'kcal' : 'g'}</Text>
      </View>
      <Text style={macroRingStyles.label}>{label}</Text>
      {target > 0 && <Text style={macroRingStyles.target}>/ {fmt(target, 0)}</Text>}
    </View>
  );
}

const macroRingStyles = StyleSheet.create({
  wrap: { alignItems: 'center', flex: 1 },
  ring: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden', backgroundColor: '#f9fafb' },
  fill: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  value: { fontSize: 13, fontWeight: '800', color: '#111', zIndex: 1 },
  unit: { fontSize: 8, color: '#888', zIndex: 1, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '600', color: '#444', marginTop: 4 },
  target: { fontSize: 9, color: '#999' },
});

function GapCard({ gap }) {
  const [open, setOpen] = useState(false);
  const severityColor = { critical: '#ef4444', high: '#f59e0b', moderate: '#6366f1' }[gap.severity] || '#888';

  return (
    <View style={[gapStyles.card, { borderLeftColor: severityColor }]}>
      <TouchableOpacity onPress={() => setOpen(o => !o)} style={gapStyles.header} activeOpacity={0.7}>
        <View style={gapStyles.headerLeft}>
          <View style={[gapStyles.severityDot, { backgroundColor: severityColor }]} />
          <View>
            <Text style={gapStyles.name}>{gap.name}</Text>
            <Text style={gapStyles.why}>{gap.why}</Text>
          </View>
        </View>
        <View style={gapStyles.headerRight}>
          <Text style={[gapStyles.pctText, { color: severityColor }]}>{gap.avgPercent}%</Text>
          {open ? <ChevronDown size={14} color="#888" /> : <ChevronRight size={14} color="#888" />}
        </View>
      </TouchableOpacity>

      {/* progress bar */}
      <View style={gapStyles.barBg}>
        <View style={[gapStyles.barFill, { width: `${Math.min(gap.avgPercent, 100)}%`, backgroundColor: severityColor }]} />
        <View style={gapStyles.targetLine} />
      </View>
      <Text style={gapStyles.targetNote}>Target: {gap.target}{gap.unit} · Low {gap.deficientDays}/{gap.daysAnalyzed} days</Text>

      {open && gap.foodSuggestions?.length > 0 && (
        <View style={gapStyles.suggestions}>
          <Text style={gapStyles.suggestTitle}>Add to your next meal:</Text>
          {gap.foodSuggestions.map((f, i) => (
            <View key={i} style={gapStyles.foodRow}>
              <View style={gapStyles.foodDot} />
              <Text style={gapStyles.foodName}>{f.name}</Text>
              <Text style={gapStyles.foodAmount}>{fmt(f.amountPer100g, 1)}{f.unit}/100g</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const gapStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  name: { fontSize: 14, fontWeight: '700', color: '#111' },
  why: { fontSize: 11, color: '#888', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pctText: { fontSize: 15, fontWeight: '800' },
  barBg: { height: 5, backgroundColor: '#f3f4f6', marginHorizontal: 12, borderRadius: 3, overflow: 'hidden', position: 'relative' },
  barFill: { height: '100%', borderRadius: 3 },
  targetLine: { position: 'absolute', right: 0, top: -2, bottom: -2, width: 2, backgroundColor: '#d1d5db' },
  targetNote: { fontSize: 10, color: '#aaa', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  suggestions: { backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  suggestTitle: { fontSize: 11, fontWeight: '700', color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  foodRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  foodDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#d1d5db' },
  foodName: { flex: 1, fontSize: 13, color: '#333' },
  foodAmount: { fontSize: 11, color: '#10b981', fontWeight: '700' },
});

function NutrientRow({ label, value, target, unit, color }) {
  const p = pct(value, target);
  const barColor = p >= 100 ? '#10b981' : p >= 70 ? color : p >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.labelRow}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value}>{fmt(value)}{unit}{target > 0 ? <Text style={rowStyles.target}> / {fmt(target, 0)}{unit}</Text> : null}</Text>
      </View>
      {target > 0 && (
        <View style={rowStyles.barBg}>
          <View style={[rowStyles.barFill, { width: `${Math.min(p, 100)}%`, backgroundColor: barColor }]} />
        </View>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { paddingVertical: 8, paddingHorizontal: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 13, color: '#333' },
  value: { fontSize: 13, fontWeight: '600', color: '#111' },
  target: { fontWeight: '400', color: '#999' },
  barBg: { height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function DailyNutrientDetailsScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams();
  const selectedDate = date || new Date().toISOString().split('T')[0];
  const { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } = useTheme();

  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState(null);
  const [targets, setTargets] = useState({});
  const [tdeeInfo, setTdeeInfo] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [gapsLoading, setGapsLoading] = useState(true);
  const [fullReportOpen, setFullReportOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/nutrition/logs/date/${selectedDate}`),
      api.get('/nutrition/clinical-targets'),
    ]).then(([logRes, targetRes]) => {
      setLog(logRes.data);
      if (targetRes.data?.targets) {
        setTargets(targetRes.data.targets);
        setTdeeInfo({
          source: targetRes.data.tdeeSource || 'formula',
          tdee: targetRes.data.tdee,
          adaptiveTdee: targetRes.data.adaptiveTdee,
        });
      }
    }).catch(err => console.error('Failed to fetch nutrition data', err))
      .finally(() => setLoading(false));

    api.get('/nutrition/priority-gaps')
      .then(r => setGaps(r.data?.gaps || []))
      .catch(() => {})
      .finally(() => setGapsLoading(false));
  }, [selectedDate]);

  if (loading) {
    return (
      <View style={[S.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const totals = log?.dailyTotals || {};
  const metabolicGoal = log?.metabolicGoal || '';
  const approachLabel = APPROACH_LABELS[metabolicGoal];
  const approachColor = APPROACH_COLORS[metabolicGoal] || COLORS.primary;

  const displayDate = new Date(selectedDate + 'T12:00:00');

  // Build flat target lookup (combining top-level + micronutrients)
  const allTargets = { ...targets, ...(targets.micronutrients || {}) };

  return (
    <View style={[S.container, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={[S.header, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={S.backButton}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: COLORS.text }]}>Daily Nutrients</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={S.scroll}>
        <Text style={[S.dateText, { color: COLORS.textSecondary }]}>
          {displayDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {/* ── Macro Summary ─────────────────────────────────────────── */}
        <View style={[S.card, { backgroundColor: COLORS.surface }]}>
          <View style={S.cardHeaderRow}>
            <View style={S.cardTitleRow}>
              <Flame size={16} color={COLORS.primary} />
              <Text style={[S.cardTitle, { color: COLORS.text }]}>Today's Macros</Text>
            </View>
            {approachLabel && (
              <View style={[S.approachBadge, { backgroundColor: approachColor + '15', borderColor: approachColor + '40' }]}>
                <Text style={[S.approachText, { color: approachColor }]}>{approachLabel}</Text>
              </View>
            )}
          </View>

          {/* TDEE source badge */}
          {tdeeInfo && (
            <View style={S.tdeeRow}>
              <Text style={S.tdeeText}>
                {tdeeInfo.source === 'metabolic_map' && `Target based on metabolic map · TDEE ${tdeeInfo.adaptiveTdee || tdeeInfo.tdee} kcal`}
                {tdeeInfo.source === 'adaptive' && `Target based on adaptive TDEE · ${tdeeInfo.adaptiveTdee} kcal (30-day avg)`}
                {tdeeInfo.source === 'formula' && `Target based on Mifflin-St Jeor formula · TDEE ${tdeeInfo.tdee} kcal`}
                {tdeeInfo.source === 'stored' && 'Using stored clinical targets'}
              </Text>
            </View>
          )}

          {/* Calorie progress bar */}
          <View style={S.calorieSection}>
            <View style={S.calorieLabelRow}>
              <Text style={[S.calorieCurrent, { color: COLORS.text }]}>{fmt(totals.calories, 0)}</Text>
              <Text style={[S.calorieTarget, { color: COLORS.textSecondary }]}> / {fmt(targets.calories, 0)} kcal</Text>
            </View>
            <View style={[S.calorieBarBg, { backgroundColor: COLORS.gray100 }]}>
              <View style={[S.calorieBarFill, {
                width: `${Math.min(pct(totals.calories, targets.calories), 100)}%`,
                backgroundColor: pct(totals.calories, targets.calories) > 110 ? '#ef4444' : COLORS.primary,
              }]} />
            </View>
          </View>

          {/* Macro rings */}
          <View style={S.macroRingRow}>
            <MacroRing label="Protein" value={totals.protein || 0} target={targets.protein} color="#3b82f6" />
            <MacroRing label="Carbs" value={totals.carbs || 0} target={targets.carbs} color="#f59e0b" />
            <MacroRing label="Fat" value={totals.fat || 0} target={targets.fat} color="#ec4899" />
            <MacroRing label="Fiber" value={totals.fiber || 0} target={targets.fiber} color="#10b981" />
          </View>
        </View>

        {/* ── Priority Gaps ──────────────────────────────────────────── */}
        <View style={S.sectionHeader}>
          <AlertTriangle size={15} color="#f59e0b" />
          <Text style={[S.sectionTitle, { color: COLORS.text }]}>Priority Gaps (last 7 days)</Text>
        </View>

        {gapsLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : gaps.length === 0 ? (
          <View style={[S.emptyGaps, { backgroundColor: COLORS.surface }]}>
            <CheckCircle size={24} color="#10b981" />
            <Text style={[S.emptyGapsText, { color: COLORS.textSecondary }]}>
              No chronic deficiencies detected in the last 7 days. Great work.
            </Text>
          </View>
        ) : (
          <View>
            {gaps.map((gap, i) => <GapCard key={i} gap={gap} />)}
            <Text style={[S.gapNote, { color: COLORS.textSecondary }]}>
              Tap any gap to see food suggestions from your database. Suggestions exclude foods you logged recently.
            </Text>
          </View>
        )}

        {/* ── Full Report (all 39 nutrients, collapsible) ─────────────── */}
        <TouchableOpacity
          style={[S.fullReportToggle, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
          onPress={() => setFullReportOpen(o => !o)}
          activeOpacity={0.7}
        >
          <View style={S.fullReportToggleRow}>
            <Layers size={15} color={COLORS.textSecondary} />
            <Text style={[S.fullReportToggleText, { color: COLORS.text }]}>Full Nutrient Report (39 nutrients)</Text>
          </View>
          {fullReportOpen ? <ChevronDown size={16} color={COLORS.textSecondary} /> : <ChevronRight size={16} color={COLORS.textSecondary} />}
        </TouchableOpacity>

        {fullReportOpen && ALL_NUTRIENT_GROUPS.map((group, gi) => (
          <View key={gi} style={[S.fullCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            <Text style={[S.groupTitle, { color: COLORS.textSecondary }]}>{group.title.toUpperCase()}</Text>
            {group.nutrients.map((n, ni) => (
              <View key={n.key} style={ni < group.nutrients.length - 1 ? { borderBottomWidth: 1, borderBottomColor: COLORS.gray100 } : {}}>
                <NutrientRow
                  label={n.label}
                  value={totals[n.key] || 0}
                  target={allTargets[n.key] || 0}
                  unit={n.unit}
                  color={COLORS.primary}
                />
              </View>
            ))}
          </View>
        ))}

        {/* Weekly report link */}
        <TouchableOpacity
          style={[S.weeklyBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
          onPress={() => router.push('/nutrition/weekly-report')}
        >
          <Layers size={15} color={COLORS.primary} />
          <Text style={[S.weeklyBtnText, { color: COLORS.primary }]}>View Full Weekly Report →</Text>
        </TouchableOpacity>

        <View style={S.footer}>
          <Info size={12} color={COLORS.textSecondary} />
          <Text style={[S.footerText, { color: COLORS.textSecondary }]}>
            Values aggregated from all meals and supplements logged today. Priority gaps based on last 7 days.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 14,
    borderBottomWidth: 1, elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  backButton: { padding: 6 },
  scroll: { padding: 16, paddingBottom: 48 },
  dateText: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 14 },

  card: { borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  approachBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  approachText: { fontSize: 11, fontWeight: '700' },

  tdeeRow: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 8, marginBottom: 12 },
  tdeeText: { fontSize: 11, color: '#64748b' },

  calorieSection: { marginBottom: 16 },
  calorieLabelRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  calorieCurrent: { fontSize: 28, fontWeight: '900' },
  calorieTarget: { fontSize: 14 },
  calorieBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  calorieBarFill: { height: '100%', borderRadius: 4 },

  macroRingRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },

  emptyGaps: { borderRadius: 12, padding: 20, alignItems: 'center', gap: 10, marginBottom: 16 },
  emptyGapsText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  gapNote: { fontSize: 11, textAlign: 'center', marginTop: 4, marginBottom: 16, lineHeight: 16 },

  fullReportToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  fullReportToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fullReportToggleText: { fontSize: 14, fontWeight: '600' },

  fullCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  groupTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },

  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  footerText: { fontSize: 11, flex: 1, lineHeight: 16 },
  weeklyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12, justifyContent: 'center' },
  weeklyBtnText: { fontSize: 14, fontWeight: '600' },
});

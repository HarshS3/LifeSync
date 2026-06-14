/**
 * DetailsTab — embedded in the main nutrition tab bar.
 * Props from parent: log, targets, COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY
 *
 * Fetches priority-gaps and tdee-info on its own since the parent doesn't pass them.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, CheckCircle, Layers, ChevronDown, ChevronRight,
  Flame, Info
} from 'lucide-react-native';
import api from '../../services/api';

const fmt = (n, d = 1) => {
  const v = Number(n);
  return Number.isFinite(v) ? (d === 0 ? Math.round(v).toString() : v.toFixed(d)) : '0';
};
const pct = (n, t) => (t > 0 ? Math.min(Math.round((Number(n) / t) * 100), 200) : 0);

const APPROACH_LABELS = {
  aggressive_loss: 'Aggressive Cut', mild_loss: 'Mild Cut', maintenance: 'Maintenance',
  lean_gain: 'Lean Gain', aggressive_gain: 'Aggressive Bulk',
};
const APPROACH_COLORS = {
  aggressive_loss: '#ef4444', mild_loss: '#f59e0b', maintenance: '#6366f1',
  lean_gain: '#10b981', aggressive_gain: '#0ea5e9',
};

const ALL_GROUPS = [
  { title: 'Macros', color: '#3b82f6', nutrients: [
    { key: 'calories', label: 'Calories', unit: 'kcal' },
    { key: 'protein', label: 'Protein', unit: 'g' },
    { key: 'carbs', label: 'Carbs', unit: 'g' },
    { key: 'fat', label: 'Fat', unit: 'g' },
    { key: 'fiber', label: 'Fiber', unit: 'g' },
    { key: 'sugar', label: 'Sugar', unit: 'g' },
  ]},
  { title: 'Fat Quality', color: '#ec4899', nutrients: [
    { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g' },
    { key: 'monounsaturatedFat', label: 'Monounsaturated', unit: 'g' },
    { key: 'polyunsaturatedFat', label: 'Polyunsaturated', unit: 'g' },
    { key: 'omega3', label: 'Omega-3', unit: 'g' },
    { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
  ]},
  { title: 'Minerals', color: '#10b981', nutrients: [
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
  ]},
  { title: 'Vitamins', color: '#f59e0b', nutrients: [
    { key: 'vitaminA', label: 'Vitamin A', unit: 'IU' },
    { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
    { key: 'vitaminD', label: 'Vitamin D', unit: 'IU' },
    { key: 'vitaminE', label: 'Vitamin E', unit: 'mg' },
    { key: 'vitaminB1', label: 'Thiamin B1', unit: 'mg' },
    { key: 'vitaminB2', label: 'Riboflavin B2', unit: 'mg' },
    { key: 'vitaminB3', label: 'Niacin B3', unit: 'mg' },
    { key: 'vitaminB5', label: 'Pantothenic B5', unit: 'mg' },
    { key: 'vitaminB6', label: 'B6', unit: 'mg' },
    { key: 'vitaminB7', label: 'Biotin B7', unit: 'mcg' },
    { key: 'vitaminB9', label: 'Folate B9', unit: 'mcg' },
    { key: 'vitaminB12', label: 'Vitamin B12', unit: 'mcg' },
  ]},
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function NutrientRow({ label, value, target, unit, color, COLORS }) {
  const p = pct(value, target);
  const barColor = p >= 100 ? '#10b981' : p >= 70 ? color : p >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <View style={S.nRow}>
      <View style={S.nLabelRow}>
        <Text style={[S.nLabel, { color: COLORS.text }]}>{label}</Text>
        <Text style={[S.nValue, { color: COLORS.text }]}>
          {fmt(value)}{unit}
          {target > 0 ? <Text style={{ color: COLORS.textSecondary, fontWeight: '400' }}> / {fmt(target, 0)}{unit}</Text> : null}
        </Text>
      </View>
      {target > 0 && (
        <View style={[S.barBg, { backgroundColor: COLORS.gray100 }]}>
          <View style={[S.barFill, { width: `${Math.min(p, 100)}%`, backgroundColor: barColor }]} />
        </View>
      )}
    </View>
  );
}

function GapCard({ gap, COLORS }) {
  const [open, setOpen] = useState(false);
  const sevColor = { critical: '#ef4444', high: '#f59e0b', moderate: '#6366f1' }[gap.severity] || '#888';
  return (
    <View style={[S.gapCard, { borderLeftColor: sevColor }]}>
      <TouchableOpacity style={S.gapHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <View style={S.gapHeaderLeft}>
          <View style={[S.gapDot, { backgroundColor: sevColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={[S.gapName, { color: COLORS.text }]}>{gap.name}</Text>
            <Text style={[S.gapWhy, { color: COLORS.textSecondary }]}>{gap.why}</Text>
          </View>
        </View>
        <View style={S.gapRight}>
          <Text style={[S.gapPct, { color: sevColor }]}>{gap.avgPercent}%</Text>
          {open ? <ChevronDown size={13} color={COLORS.textSecondary} /> : <ChevronRight size={13} color={COLORS.textSecondary} />}
        </View>
      </TouchableOpacity>
      <View style={[S.gapBarBg, { backgroundColor: COLORS.gray100 }]}>
        <View style={[S.gapBarFill, { width: `${Math.min(gap.avgPercent, 100)}%`, backgroundColor: sevColor }]} />
        <View style={S.gapTargetLine} />
      </View>
      <Text style={[S.gapNote, { color: COLORS.textSecondary }]}>
        Target: {gap.target}{gap.unit} · Low {gap.deficientDays}/{gap.daysAnalyzed} days
      </Text>
      {open && gap.foodSuggestions?.length > 0 && (
        <View style={[S.gapSuggestions, { borderTopColor: COLORS.gray100 }]}>
          <Text style={[S.suggestTitle, { color: COLORS.textSecondary }]}>Add to next meal:</Text>
          {gap.foodSuggestions.map((f, i) => (
            <View key={i} style={S.foodRow}>
              <View style={S.foodDot} />
              <Text style={[S.foodName, { color: COLORS.text }]}>{f.name}</Text>
              <Text style={S.foodAmt}>{fmt(f.amountPer100g, 1)}{f.unit}/100g</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DetailsTab({ log, targets, COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY }) {
  const router = useRouter();
  const totals = log?.dailyTotals || {};

  // Fetch priority gaps independently
  const [gaps, setGaps] = useState([]);
  const [gapsLoading, setGapsLoading] = useState(true);
  const [tdeeInfo, setTdeeInfo] = useState(null);
  const [fullOpen, setFullOpen] = useState(false);

  useEffect(() => {
    api.get('/nutrition/priority-gaps')
      .then(r => setGaps(r.data?.gaps || []))
      .catch(() => {})
      .finally(() => setGapsLoading(false));

    api.get('/nutrition/clinical-targets')
      .then(r => {
        if (r.data?.tdeeSource) {
          setTdeeInfo({ source: r.data.tdeeSource, tdee: r.data.tdee, adaptiveTdee: r.data.adaptiveTdee });
        }
      })
      .catch(() => {});
  }, []);

  // Flat target lookup combining top-level + micronutrients
  const allTargets = { ...targets, ...(targets?.micronutrients || {}) };

  const metabolicGoal = log?.metabolicGoal || '';
  const approachLabel = APPROACH_LABELS[metabolicGoal];
  const approachColor = APPROACH_COLORS[metabolicGoal] || COLORS.primary;

  const TDEE_LABELS = {
    metabolic_map: 'Metabolic map (stress+training adjusted)',
    adaptive: 'Adaptive TDEE (30-day trend)',
    formula: 'Mifflin-St Jeor formula',
    stored: 'Stored targets',
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.background }} contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}>

      {/* ── Macro summary card ─────────────────────────────────── */}
      <View style={[S.card, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <View style={S.cardHeader}>
          <View style={S.cardTitleRow}>
            <Flame size={15} color={COLORS.primary} />
            <Text style={[S.cardTitle, { color: COLORS.text }]}>Today's Macros</Text>
          </View>
          {approachLabel && (
            <View style={[S.approachBadge, { backgroundColor: approachColor + '18', borderColor: approachColor + '50' }]}>
              <Text style={[S.approachText, { color: approachColor }]}>{approachLabel}</Text>
            </View>
          )}
        </View>

        {tdeeInfo && (
          <View style={[S.tdeeBanner, { backgroundColor: COLORS.gray100 }]}>
            <Text style={[S.tdeeText, { color: COLORS.textSecondary }]}>
              {TDEE_LABELS[tdeeInfo.source] || tdeeInfo.source}
              {tdeeInfo.adaptiveTdee ? ` · ${tdeeInfo.adaptiveTdee} kcal` : tdeeInfo.tdee ? ` · ${tdeeInfo.tdee} kcal` : ''}
            </Text>
          </View>
        )}

        {/* Calorie bar */}
        <View style={S.calRow}>
          <Text style={[S.calCurrent, { color: COLORS.text }]}>{fmt(totals.calories, 0)}</Text>
          <Text style={[S.calTarget, { color: COLORS.textSecondary }]}> / {fmt(targets?.calories, 0)} kcal</Text>
        </View>
        <View style={[S.calBarBg, { backgroundColor: COLORS.gray100 }]}>
          <View style={[S.calBarFill, {
            width: `${Math.min(pct(totals.calories, targets?.calories), 100)}%`,
            backgroundColor: pct(totals.calories, targets?.calories) > 110 ? '#ef4444' : COLORS.primary,
          }]} />
        </View>

        {/* Macro rows */}
        {[
          { key: 'protein', label: 'Protein', unit: 'g', color: '#3b82f6' },
          { key: 'carbs',   label: 'Carbs',   unit: 'g', color: '#f59e0b' },
          { key: 'fat',     label: 'Fat',      unit: 'g', color: '#ec4899' },
          { key: 'fiber',   label: 'Fiber',    unit: 'g', color: '#10b981' },
        ].map(m => (
          <View key={m.key} style={{ borderTopWidth: 1, borderTopColor: COLORS.gray100 }}>
            <NutrientRow label={m.label} value={totals[m.key] || 0} target={targets?.[m.key] || 0} unit={m.unit} color={m.color} COLORS={COLORS} />
          </View>
        ))}
      </View>

      {/* ── Priority Gaps ──────────────────────────────────────── */}
      <View style={S.sectionHeaderRow}>
        <AlertTriangle size={14} color="#f59e0b" />
        <Text style={[S.sectionTitle, { color: COLORS.text }]}>Priority Gaps (last 7 days)</Text>
      </View>

      {gapsLoading ? (
        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 16 }} />
      ) : gaps.length === 0 ? (
        <View style={[S.allGoodCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <CheckCircle size={18} color="#10b981" />
          <Text style={[S.allGoodText, { color: COLORS.textSecondary }]}>No chronic deficiencies in the last 7 days.</Text>
        </View>
      ) : (
        gaps.map((gap, i) => <GapCard key={i} gap={gap} COLORS={COLORS} />)
      )}

      {/* ── Weekly Report link ─────────────────────────────────── */}
      <TouchableOpacity
        style={[S.weeklyBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
        onPress={() => router.push('/nutrition/weekly-report')}
      >
        <Layers size={14} color={COLORS.primary} />
        <Text style={[S.weeklyBtnText, { color: COLORS.primary }]}>View Full Weekly Report →</Text>
      </TouchableOpacity>

      {/* ── Full nutrient report (collapsible) ────────────────── */}
      <TouchableOpacity
        style={[S.fullToggle, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
        onPress={() => setFullOpen(o => !o)}
        activeOpacity={0.7}
      >
        <View style={S.fullToggleRow}>
          <Layers size={13} color={COLORS.textSecondary} />
          <Text style={[S.fullToggleText, { color: COLORS.text }]}>All 39 Nutrients</Text>
        </View>
        {fullOpen ? <ChevronDown size={15} color={COLORS.textSecondary} /> : <ChevronRight size={15} color={COLORS.textSecondary} />}
      </TouchableOpacity>

      {fullOpen && ALL_GROUPS.map((group, gi) => (
        <View key={gi} style={{ marginBottom: SPACING.md }}>
          <Text style={[S.groupTitle, { color: COLORS.textSecondary }]}>{group.title.toUpperCase()}</Text>
          <View style={[S.card, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            {group.nutrients.map((n, ni) => (
              <View key={n.key} style={ni < group.nutrients.length - 1 ? { borderBottomWidth: 1, borderBottomColor: COLORS.gray100 } : {}}>
                <NutrientRow
                  label={n.label} value={totals[n.key] || 0}
                  target={allTargets[n.key] || 0} unit={n.unit}
                  color={group.color} COLORS={COLORS}
                />
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={S.footer}>
        <Info size={11} color={COLORS.textSecondary} />
        <Text style={[S.footerText, { color: COLORS.textSecondary }]}>
          Values from all meals logged today. Priority gaps based on last 7 days.
        </Text>
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  approachBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  approachText: { fontSize: 10, fontWeight: '700' },
  tdeeBanner: { marginHorizontal: 14, marginBottom: 10, borderRadius: 8, padding: 8 },
  tdeeText: { fontSize: 10 },
  calRow: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 14, marginBottom: 6 },
  calCurrent: { fontSize: 26, fontWeight: '900' },
  calTarget: { fontSize: 13 },
  calBarBg: { height: 7, marginHorizontal: 14, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  calBarFill: { height: '100%', borderRadius: 4 },

  nRow: { paddingVertical: 8, paddingHorizontal: 14 },
  nLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nLabel: { fontSize: 13 },
  nValue: { fontSize: 13, fontWeight: '600' },
  barBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },

  allGoodCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14 },
  allGoodText: { flex: 1, fontSize: 13 },

  gapCard: { borderLeftWidth: 4, borderRadius: 10, marginBottom: 8, backgroundColor: '#fff', overflow: 'hidden' },
  gapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, paddingBottom: 6 },
  gapHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  gapDot: { width: 7, height: 7, borderRadius: 4 },
  gapName: { fontSize: 13, fontWeight: '700' },
  gapWhy: { fontSize: 10, marginTop: 1 },
  gapRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gapPct: { fontSize: 14, fontWeight: '800' },
  gapBarBg: { height: 4, marginHorizontal: 10, borderRadius: 2, overflow: 'hidden', position: 'relative' },
  gapBarFill: { height: '100%', borderRadius: 2 },
  gapTargetLine: { position: 'absolute', right: 0, top: -2, bottom: -2, width: 2, backgroundColor: '#d1d5db' },
  gapNote: { fontSize: 9, paddingHorizontal: 10, paddingTop: 3, paddingBottom: 6 },
  gapSuggestions: { borderTopWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  suggestTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  foodDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' },
  foodName: { flex: 1, fontSize: 12 },
  foodAmt: { fontSize: 11, color: '#10b981', fontWeight: '700' },

  weeklyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  weeklyBtnText: { fontSize: 13, fontWeight: '600' },

  fullToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  fullToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  fullToggleText: { fontSize: 13, fontWeight: '600' },

  groupTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, paddingHorizontal: 4, marginBottom: 6 },

  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 8 },
  footerText: { fontSize: 10, flex: 1, lineHeight: 15 },
});

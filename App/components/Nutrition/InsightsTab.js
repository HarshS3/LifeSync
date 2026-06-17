/**
 * InsightsTab — Nutrition screen "Insights" tab (mobile).
 * Shows: adaptive TDEE status, metabolic map, 7-day macro trend, weekly review link.
 * Mirrors the key content from web's "Deep Analysis" tab, adapted for mobile.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  TrendingUp, TrendingDown, Minus, Zap, Activity, ChevronRight, Info
} from 'lucide-react-native';
import api from '../../services/api';

const fmt = (n, d = 0) => {
  const v = Number(n);
  return Number.isFinite(v) ? (d === 0 ? Math.round(v).toString() : v.toFixed(d)) : '—';
};

const TDEE_LABELS = {
  metabolic_map: 'Metabolic map (stress + training adjusted)',
  adaptive: 'Adaptive TDEE (30-day trend)',
  formula: 'Mifflin-St Jeor formula',
  stored: 'Stored targets',
};

const PHASE_COLORS = {
  cut: '#ef4444', cutting: '#ef4444',
  bulk: '#0ea5e9', bulking: '#0ea5e9',
  maintenance: '#6366f1', recomp: '#10b981',
  deficit: '#f59e0b', surplus: '#0ea5e9',
};

function TrendArrow({ value, COLORS }) {
  if (value > 2) return <TrendingUp size={14} color="#10b981" />;
  if (value < -2) return <TrendingDown size={14} color="#ef4444" />;
  return <Minus size={14} color={COLORS.textSecondary} />;
}

function MetricCard({ label, value, unit, sub, color, icon, COLORS, SPACING }) {
  return (
    <View style={[S.metricCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border, flex: 1 }]}>
      <Text style={[S.metricLabel, { color: COLORS.textSecondary }]}>{label}</Text>
      <Text style={[S.metricValue, { color: color || COLORS.text }]}>
        {value}<Text style={[S.metricUnit, { color: COLORS.textSecondary }]}> {unit}</Text>
      </Text>
      {sub ? <Text style={[S.metricSub, { color: COLORS.textSecondary }]}>{sub}</Text> : null}
    </View>
  );
}

export default function InsightsTab({ COLORS, SPACING, BORDER_RADIUS }) {
  const router = useRouter();
  const [tdeeData, setTdeeData] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [weeklyMacros, setWeeklyMacros] = useState(null);
  const [loading, setLoading] = useState(true);

  const getISOWeekKey = () => {
    const d = new Date();
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  };

  useEffect(() => {
    const weekKey = getISOWeekKey();
    Promise.all([
      api.get('/nutrition/adaptive-tdee').catch(() => null),
      api.get('/nutrition/metabolic-map').catch(() => null),
      api.get(`/nutrition/aggregation/weekly-macros/${weekKey}`).catch(() => null),
    ]).then(([tdee, map, macros]) => {
      if (tdee?.data) setTdeeData(tdee.data);
      if (map?.data) setMapData(map.data);
      if (macros?.data) setWeeklyMacros(macros.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[S.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.nutrition} />
      </View>
    );
  }

  const adaptiveTdee = tdeeData?.adaptiveTdee;
  const formulaTdee = tdeeData?.formulaTdee || tdeeData?.estimatedTdee;
  const tdeeStatus = tdeeData?.status;

  const dietPhase = mapData?.dietPhase;
  const dynamicTdee = mapData?.dynamicTDEE;
  const modifiers = mapData?.modifiers || {};
  const mapInsight = mapData?.insight;

  const weekAvg = weeklyMacros?.averages || {};
  const weekTargets = weeklyMacros?.targets || {};
  const daysLogged = weeklyMacros?.daysLogged || 0;

  const macroPct = (key) => {
    const t = Number(weekTargets[key]);
    const v = Number(weekAvg[key]);
    return t > 0 ? Math.round((v / t) * 100) : 0;
  };

  const phaseColor = PHASE_COLORS[dietPhase] || COLORS.primary;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ── TDEE Status ─────────────────────────────────────────── */}
      <Text style={[S.sectionTitle, { color: COLORS.text }]}>Energy Balance</Text>

      {tdeeStatus === 'success' ? (
        <View style={[S.card, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <View style={S.cardRow}>
            <Zap size={15} color={COLORS.nutrition} />
            <Text style={[S.cardTitle, { color: COLORS.text }]}>Adaptive TDEE</Text>
          </View>

          <View style={[S.tdeeRow]}>
            <View style={S.tdeeMain}>
              <Text style={[S.tdeeBig, { color: COLORS.nutrition }]}>{fmt(dynamicTdee || adaptiveTdee)}</Text>
              <Text style={[S.tdeeUnit, { color: COLORS.textSecondary }]}> kcal/day</Text>
            </View>
            {formulaTdee ? (
              <View style={S.tdeeFormula}>
                <Text style={[S.tdeeFormulaLabel, { color: COLORS.textSecondary }]}>Formula</Text>
                <Text style={[S.tdeeFormulaVal, { color: COLORS.textSecondary }]}>{fmt(formulaTdee)} kcal</Text>
              </View>
            ) : null}
          </View>

          <Text style={[S.tdeeSub, { color: COLORS.textSecondary }]}>
            {dynamicTdee ? TDEE_LABELS.metabolic_map : TDEE_LABELS.adaptive}
          </Text>

          {/* Modifiers */}
          {Object.keys(modifiers).length > 0 && (
            <View style={[S.modifiersBox, { backgroundColor: COLORS.gray100, borderRadius: BORDER_RADIUS.sm }]}>
              {Object.entries(modifiers).map(([key, val]) => (
                <View key={key} style={S.modRow}>
                  <Text style={[S.modKey, { color: COLORS.textSecondary }]}>{key}</Text>
                  <Text style={[S.modVal, { color: val > 0 ? '#10b981' : val < 0 ? '#ef4444' : COLORS.textSecondary }]}>
                    {val > 0 ? '+' : ''}{fmt(val, 0)} kcal
                  </Text>
                </View>
              ))}
            </View>
          )}

          {mapInsight ? (
            <Text style={[S.insight, { color: COLORS.textSecondary }]}>{mapInsight}</Text>
          ) : null}

          {/* Diet phase badge */}
          {dietPhase && (
            <View style={[S.phaseBadge, { backgroundColor: phaseColor + '18', borderColor: phaseColor + '50' }]}>
              <Text style={[S.phaseText, { color: phaseColor }]}>
                {dietPhase.charAt(0).toUpperCase() + dietPhase.slice(1)} phase
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={[S.emptyCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Info size={16} color={COLORS.textSecondary} />
          <Text style={[S.emptyText, { color: COLORS.textSecondary }]}>
            Log at least 7 days of food + weight to unlock adaptive TDEE.
          </Text>
        </View>
      )}

      {/* ── This Week's Macros ──────────────────────────────────── */}
      <Text style={[S.sectionTitle, { color: COLORS.text, marginTop: SPACING.md }]}>This Week's Averages</Text>

      {daysLogged > 0 ? (
        <View style={[S.card, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <View style={S.cardRow}>
            <Activity size={15} color={COLORS.nutrition} />
            <Text style={[S.cardTitle, { color: COLORS.text }]}>Daily Average ({daysLogged} days logged)</Text>
          </View>

          {[
            { key: 'calories', label: 'Calories', unit: 'kcal', color: COLORS.nutrition },
            { key: 'protein',  label: 'Protein',  unit: 'g',    color: '#3b82f6' },
            { key: 'carbs',    label: 'Carbs',    unit: 'g',    color: '#f59e0b' },
            { key: 'fat',      label: 'Fat',      unit: 'g',    color: '#ec4899' },
          ].map(({ key, label, unit, color }) => {
            const avg = Number(weekAvg[key] || 0);
            const target = Number(weekTargets[key] || 0);
            const p = macroPct(key);
            const barColor = p >= 95 ? '#10b981' : p >= 70 ? color : p >= 40 ? '#f59e0b' : '#ef4444';
            return (
              <View key={key} style={[S.macroRow, { borderTopColor: COLORS.gray100 }]}>
                <View style={S.macroLabelRow}>
                  <Text style={[S.macroLabel, { color: COLORS.text }]}>{label}</Text>
                  <Text style={[S.macroVal, { color: COLORS.text }]}>
                    {fmt(avg)}{unit}
                    {target > 0 ? <Text style={{ color: COLORS.textSecondary, fontWeight: '400' }}> / {fmt(target)}{unit}</Text> : null}
                  </Text>
                </View>
                {target > 0 && (
                  <View style={[S.barBg, { backgroundColor: COLORS.gray100 }]}>
                    <View style={[S.barFill, { width: `${Math.min(p, 100)}%`, backgroundColor: barColor }]} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[S.emptyCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Text style={[S.emptyText, { color: COLORS.textSecondary }]}>No meals logged this week yet.</Text>
        </View>
      )}

      {/* ── Links ───────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[S.linkBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
        onPress={() => router.push('/nutrition/weekly-report')}
        activeOpacity={0.75}
      >
        <Text style={[S.linkText, { color: COLORS.nutrition }]}>Full Weekly Report →</Text>
        <ChevronRight size={16} color={COLORS.nutrition} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[S.linkBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
        onPress={() => router.push('/nutrition/insights')}
        activeOpacity={0.75}
      >
        <Text style={[S.linkText, { color: COLORS.primary }]}>Deficiency Radar →</Text>
        <ChevronRight size={16} color={COLORS.primary} />
      </TouchableOpacity>

      <View style={S.footer}>
        <Info size={11} color={COLORS.textSecondary} />
        <Text style={[S.footerText, { color: COLORS.textSecondary }]}>
          Adaptive TDEE requires 7+ days of food and weight logs. Metabolic map requires 14+ days.
        </Text>
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },

  card: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden', padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700' },

  tdeeRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  tdeeMain: { flexDirection: 'row', alignItems: 'baseline' },
  tdeeBig: { fontSize: 34, fontWeight: '900' },
  tdeeUnit: { fontSize: 14 },
  tdeeFormula: { alignItems: 'flex-end' },
  tdeeFormulaLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tdeeFormulaVal: { fontSize: 13, fontWeight: '600' },
  tdeeSub: { fontSize: 10, marginBottom: 10 },

  modifiersBox: { padding: 10, marginBottom: 10 },
  modRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  modKey: { fontSize: 11, textTransform: 'capitalize' },
  modVal: { fontSize: 11, fontWeight: '700' },

  insight: { fontSize: 12, lineHeight: 17, fontStyle: 'italic', marginBottom: 8 },
  phaseBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  phaseText: { fontSize: 10, fontWeight: '700' },

  macroRow: { paddingVertical: 9, borderTopWidth: 1 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  macroLabel: { fontSize: 13 },
  macroVal: { fontSize: 13, fontWeight: '600' },
  barBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },

  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  emptyText: { fontSize: 13, flex: 1 },

  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, padding: 13, marginBottom: 8 },
  linkText: { fontSize: 13, fontWeight: '600' },

  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 8 },
  footerText: { fontSize: 10, flex: 1, lineHeight: 15 },
});

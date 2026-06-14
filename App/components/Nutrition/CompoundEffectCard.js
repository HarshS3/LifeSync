/**
 * CompoundEffectCard
 *
 * Shows on the nutrition Today tab — what your current vs target behavior
 * actually produces over 30 / 90 / 180 days. The "small consistent actions
 * compounding" number made concrete.
 *
 * Collapsed by default — user opens it when motivated.
 * Self-fetching, no parent dependencies.
 */
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { TrendingDown, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react-native';
import { Body, Caption, H3 } from '../ui/Typography';
import api from '../../services/api';

const HORIZON_LABELS = { 30: '1 month', 90: '3 months', 180: '6 months' };

function sign(n) { return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1); }
function signRound(n) { return n > 0 ? `+${Math.round(n)}` : String(Math.round(n)); }

export default function CompoundEffectCard({ COLORS }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(true); // collapsed by default
  const [horizon, setHorizon] = useState(90); // default to 3-month view

  useEffect(() => {
    api.get('/insights/compound-effect')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <View style={[S.card, { backgroundColor: COLORS?.surface || '#fff', borderColor: COLORS?.border || '#e5e7eb' }]}>
      <View style={S.loadingRow}>
        <ActivityIndicator size="small" color={COLORS?.primary || '#6366f1'} />
        <Caption secondary style={{ marginLeft: 8 }}>Calculating your trajectory…</Caption>
      </View>
    </View>
  );

  if (!data || data.status === 'insufficient_data') {
    return (
      <View style={[S.card, { backgroundColor: COLORS?.surface || '#fff', borderColor: COLORS?.border || '#e5e7eb' }]}>
        <View style={S.headerRow}>
          <TrendingDown size={15} color={COLORS?.primary || '#6366f1'} />
          <Caption secondary style={{ marginLeft: 6 }}>
            {data?.message || 'Log 5+ days to see your trajectory.'}
          </Caption>
        </View>
      </View>
    );
  }

  const isFatMetric = data.metric === 'body_fat';
  const isLoss = data.metabolicGoal?.includes('loss');

  const currentH = data.currentTrajectory?.find(t => t.days === horizon);
  const targetH = data.targetTrajectory?.find(t => t.days === horizon);

  // Pick the delta that matters
  const currentVal = isFatMetric
    ? (isLoss ? currentH?.fatChange : currentH?.leanChange)
    : currentH?.weightChange;
  const targetVal = isFatMetric
    ? (isLoss ? targetH?.fatChange : targetH?.leanChange)
    : targetH?.weightChange;

  const metricLabel = isFatMetric
    ? (isLoss ? 'fat' : 'lean mass')
    : 'weight';
  const unit = 'kg';

  const diff = targetVal != null && currentVal != null ? Math.abs(targetVal - currentVal) : null;
  const isGap = diff != null && diff > 0.2;

  // Color: fat loss = good when negative, lean gain = good when positive
  const currentColor = isFatMetric && isLoss
    ? (currentVal < -0.3 ? '#10b981' : '#f59e0b')
    : (currentVal > 0.1 ? '#10b981' : '#f59e0b');

  return (
    <View style={[S.card, { backgroundColor: COLORS?.surface || '#fff', borderColor: COLORS?.border || '#e5e7eb' }]}>
      {/* Header — always visible */}
      <TouchableOpacity style={S.headerRow} onPress={() => setCollapsed(c => !c)} activeOpacity={0.8}>
        <TrendingDown size={15} color={COLORS?.primary || '#6366f1'} />
        <H3 style={{ marginLeft: 7, fontSize: 13, flex: 1 }}>Compound Effect</H3>
        {!collapsed && currentVal != null && (
          <Caption style={{ color: currentColor, fontWeight: '800', marginRight: 6 }}>
            {sign(currentVal)}{unit} {metricLabel} in {HORIZON_LABELS[horizon]}
          </Caption>
        )}
        {collapsed ? <ChevronRight size={15} color="#aaa" /> : <ChevronDown size={15} color="#aaa" />}
      </TouchableOpacity>

      {!collapsed && (
        <View style={S.body}>
          {/* Gap narrative */}
          <Body secondary style={S.narrative}>{data.gapNarrative}</Body>

          {/* Horizon selector */}
          <View style={S.horizonRow}>
            {[30, 90, 180].map(h => (
              <TouchableOpacity
                key={h}
                style={[S.horizonBtn, horizon === h && { backgroundColor: (COLORS?.primary || '#6366f1') + '20', borderColor: COLORS?.primary || '#6366f1' }]}
                onPress={() => setHorizon(h)}
              >
                <Caption style={[S.horizonText, horizon === h && { color: COLORS?.primary || '#6366f1', fontWeight: '700' }]}>
                  {HORIZON_LABELS[h]}
                </Caption>
              </TouchableOpacity>
            ))}
          </View>

          {/* Two-column comparison */}
          {currentH && targetH && (
            <View style={S.compareRow}>
              <View style={[S.compareBox, { backgroundColor: '#f9fafb' }]}>
                <Caption secondary style={S.compareLabel}>Current pace</Caption>
                <Body style={[S.compareValue, { color: currentColor }]}>
                  {sign(currentVal ?? 0)}{unit}
                </Body>
                <Caption secondary style={S.compareMetric}>{metricLabel}</Caption>
                <Caption secondary style={{ marginTop: 4 }}>
                  ~{signRound(data.currentBehavior?.dailyBalance)} kcal/day
                </Caption>
              </View>

              <View style={S.compareDivider} />

              <View style={[S.compareBox, { backgroundColor: '#f0fdf4' }]}>
                <Caption secondary style={S.compareLabel}>At your targets</Caption>
                <Body style={[S.compareValue, { color: '#10b981' }]}>
                  {sign(targetVal ?? 0)}{unit}
                </Body>
                <Caption secondary style={S.compareMetric}>{metricLabel}</Caption>
                <Caption secondary style={{ marginTop: 4 }}>
                  ~{signRound(data.targetBehavior?.dailyBalance)} kcal/day
                </Caption>
              </View>
            </View>
          )}

          {/* The gap sentence */}
          {isGap && (
            <View style={S.gapBox}>
              <Caption style={S.gapText}>
                The gap between these two outcomes in {HORIZON_LABELS[horizon]} is {diff.toFixed(1)}kg {metricLabel}.
                That's your daily average × {horizon} days.
              </Caption>
            </View>
          )}

          {/* Current metrics */}
          <View style={S.metricsRow}>
            <View style={S.metricChip}>
              <Caption secondary>Avg intake</Caption>
              <Caption style={{ fontWeight: '700' }}>{data.currentBehavior?.avgCalories} kcal</Caption>
            </View>
            <View style={S.metricChip}>
              <Caption secondary>Avg protein</Caption>
              <Caption style={{ fontWeight: '700' }}>{data.currentBehavior?.avgProtein}g</Caption>
            </View>
            <View style={S.metricChip}>
              <Caption secondary>Days logged</Caption>
              <Caption style={{ fontWeight: '700' }}>{data.daysLogged}</Caption>
            </View>
          </View>

          <Caption secondary style={S.disclaimer}>
            Projection uses adaptive TDEE + protein synthesis estimate. Not a guarantee — individual variation applies.
          </Caption>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 12 },
  body: { paddingHorizontal: 14, paddingBottom: 14 },

  narrative: { fontSize: 13, lineHeight: 20, marginBottom: 12 },

  horizonRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  horizonBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  horizonText: { fontSize: 11, color: '#888' },

  compareRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 10 },
  compareBox: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  compareLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  compareValue: { fontSize: 22, fontWeight: '900' },
  compareMetric: { fontSize: 11 },
  compareDivider: { width: 1, backgroundColor: '#e5e7eb', marginHorizontal: 8 },

  gapBox: { backgroundColor: '#fffbeb', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#fde68a' },
  gapText: { fontSize: 12, color: '#92400e', lineHeight: 18 },

  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  metricChip: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 8, alignItems: 'center', gap: 2 },

  disclaimer: { fontSize: 10, textAlign: 'center', opacity: 0.5 },
});

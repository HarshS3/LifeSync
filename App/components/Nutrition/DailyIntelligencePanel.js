/**
 * DailyIntelligencePanel
 *
 * The "Today's Intelligence" card at the top of the nutrition Today tab.
 * Shows: mode badge, dynamic target delta, up to 2 time-sensitive actions,
 * and the top cross-domain insight.
 *
 * Designed to be non-intrusive — collapsible, loads async, never blocks the meal list.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated
} from 'react-native';
import {
  Zap, AlertTriangle, Moon, TrendingUp, Brain,
  ChevronDown, ChevronRight, Activity, Flame, Clock
} from 'lucide-react-native';
import api from '../../services/api';

// ── Mode config ───────────────────────────────────────────────────────────────
const MODE_CONFIG = {
  fueling:    { label: 'Fueling',    color: '#3b82f6', bg: '#eff6ff', icon: Zap },
  recovering: { label: 'Recovering', color: '#f59e0b', bg: '#fffbeb', icon: Moon },
  cutting:    { label: 'Cutting',    color: '#ef4444', bg: '#fef2f2', icon: TrendingUp },
  maintaining:{ label: 'Maintaining',color: '#6366f1', bg: '#f5f3ff', icon: Activity },
  bulking:    { label: 'Building',   color: '#10b981', bg: '#f0fdf4', icon: Flame },
};

const URGENCY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#6366f1' };
const URGENCY_BG    = { high: '#fef2f2', medium: '#fffbeb', low: '#f5f3ff' };

const ACTION_ICONS = {
  post_workout:    { icon: Zap,           color: '#3b82f6' },
  pre_sleep_protein: { icon: Moon,        color: '#6366f1' },
  recovery_debt:   { icon: AlertTriangle, color: '#f59e0b' },
  stress_preempt:  { icon: Brain,         color: '#8b5cf6' },
  underfueling:    { icon: Flame,         color: '#ef4444' },
  supplement_timing: { icon: Clock,       color: '#10b981' },
};

// ── Action card ───────────────────────────────────────────────────────────────
function ActionCard({ action }) {
  const [expanded, setExpanded] = useState(action.urgency === 'high');
  const cfg = ACTION_ICONS[action.type] || { icon: AlertTriangle, color: '#888' };
  const IconComp = cfg.icon;
  const urgencyColor = URGENCY_COLOR[action.urgency] || '#888';
  const urgencyBg = URGENCY_BG[action.urgency] || '#f9fafb';

  return (
    <TouchableOpacity
      style={[S.actionCard, { backgroundColor: urgencyBg, borderLeftColor: urgencyColor }]}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.8}
    >
      <View style={S.actionHeader}>
        <View style={S.actionHeaderLeft}>
          <IconComp size={15} color={cfg.color} />
          <Text style={[S.actionTitle, { color: '#111' }]}>{action.title}</Text>
        </View>
        {expanded ? <ChevronDown size={14} color="#aaa" /> : <ChevronRight size={14} color="#aaa" />}
      </View>

      {expanded && (
        <>
          <Text style={S.actionBody}>{action.body}</Text>
          {action.suggestion && (
            <View style={S.suggestionRow}>
              <Text style={S.suggestionLabel}>→ </Text>
              <Text style={S.suggestionText}>{action.suggestion}</Text>
            </View>
          )}
          {action.windowClosesMins != null && (
            <View style={[S.windowBadge, { backgroundColor: urgencyColor + '20' }]}>
              <Clock size={10} color={urgencyColor} />
              <Text style={[S.windowText, { color: urgencyColor }]}>
                Window closes in {action.windowClosesMins} min
              </Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Insight card ──────────────────────────────────────────────────────────────
function InsightCard({ insight }) {
  if (!insight) return null;
  return (
    <View style={S.insightCard}>
      <View style={S.insightHeader}>
        <Brain size={13} color="#8b5cf6" />
        <Text style={S.insightLabel}>Cross-domain insight</Text>
        <View style={[S.impactBadge, {
          backgroundColor: insight.impact === 'high' ? '#fef2f2' : '#f5f3ff'
        }]}>
          <Text style={[S.impactText, {
            color: insight.impact === 'high' ? '#ef4444' : '#7c3aed'
          }]}>{insight.impact}</Text>
        </View>
      </View>
      <Text style={S.insightTitle}>{insight.title}</Text>
      {insight.detail && <Text style={S.insightDetail}>{insight.detail}</Text>}
      {insight.action && (
        <Text style={S.insightAction}>→ {insight.action}</Text>
      )}
    </View>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function DailyIntelligencePanel({ COLORS }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    api.get('/nutrition/daily-intelligence')
      .then(r => setData(r.data))
      .catch(() => {}) // non-critical
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={S.loadingRow}>
        <ActivityIndicator size="small" color="#6366f1" />
        <Text style={S.loadingText}>Loading today's intelligence…</Text>
      </View>
    );
  }

  if (!data) return null;

  const modeCfg = MODE_CONFIG[data.mode] || MODE_CONFIG.maintaining;
  const ModeIcon = modeCfg.icon;
  const hasActions = data.actions?.length > 0;
  const hasDelta = data.targetDelta?.calories !== 0 || data.targetDelta?.protein !== 0;

  return (
    <View style={S.panel}>
      {/* Header — mode + collapse toggle */}
      <TouchableOpacity style={S.panelHeader} onPress={() => setCollapsed(c => !c)} activeOpacity={0.8}>
        <View style={[S.modeBadge, { backgroundColor: modeCfg.bg }]}>
          <ModeIcon size={14} color={modeCfg.color} />
          <Text style={[S.modeLabel, { color: modeCfg.color }]}>{modeCfg.label}</Text>
        </View>

        <View style={S.headerRight}>
          {data.recoveryDebt >= 5 && (
            <View style={S.debtBadge}>
              <AlertTriangle size={11} color="#f59e0b" />
              <Text style={S.debtText}>debt {data.recoveryDebt}/10</Text>
            </View>
          )}
          {collapsed ? <ChevronRight size={16} color="#aaa" /> : <ChevronDown size={16} color="#aaa" />}
        </View>
      </TouchableOpacity>

      {!collapsed && (
        <>
          {/* Dynamic target delta */}
          {hasDelta && data.targetDelta?.reason && (
            <View style={S.deltaCard}>
              <Text style={S.deltaTitle}>Today's adjusted target</Text>
              <View style={S.deltaRow}>
                {data.targetDelta.calories > 0 && (
                  <View style={S.deltaChip}>
                    <Text style={S.deltaChipText}>+{data.targetDelta.calories} kcal</Text>
                  </View>
                )}
                {data.targetDelta.protein > 0 && (
                  <View style={S.deltaChip}>
                    <Text style={S.deltaChipText}>+{data.targetDelta.protein}g protein</Text>
                  </View>
                )}
              </View>
              <Text style={S.deltaReason}>{data.targetDelta.reason}</Text>
            </View>
          )}

          {/* Time-sensitive actions */}
          {hasActions && data.actions.map((action, i) => (
            <ActionCard key={i} action={action} />
          ))}

          {/* Cross-domain insight */}
          <InsightCard insight={data.insight} />

          {!hasActions && !data.insight && !hasDelta && (
            <Text style={S.allClearText}>Looking good — no urgent actions for now.</Text>
          )}
        </>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, opacity: 0.6 },
  loadingText: { fontSize: 12, color: '#888' },

  panel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  modeLabel: { fontSize: 13, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  debtBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fffbeb', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#fde68a' },
  debtText: { fontSize: 10, fontWeight: '700', color: '#92400e' },

  deltaCard: { marginHorizontal: 12, marginBottom: 10, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10 },
  deltaTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  deltaRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  deltaChip: { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  deltaChipText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  deltaReason: { fontSize: 11, color: '#64748b', lineHeight: 16 },

  actionCard: {
    marginHorizontal: 12, marginBottom: 8, borderRadius: 10,
    padding: 10, borderLeftWidth: 3,
  },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  actionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionTitle: { fontSize: 13, fontWeight: '600' },
  actionBody: { fontSize: 12, color: '#555', lineHeight: 18, marginTop: 6 },
  suggestionRow: { flexDirection: 'row', marginTop: 4 },
  suggestionLabel: { fontSize: 12, color: '#10b981', fontWeight: '700' },
  suggestionText: { fontSize: 12, color: '#374151', flex: 1, lineHeight: 18 },
  windowBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  windowText: { fontSize: 10, fontWeight: '700' },

  insightCard: {
    marginHorizontal: 12, marginBottom: 12, backgroundColor: '#faf5ff',
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e9d5ff',
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  insightLabel: { fontSize: 10, fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  impactBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  impactText: { fontSize: 9, fontWeight: '700' },
  insightTitle: { fontSize: 13, fontWeight: '600', color: '#3b0764', lineHeight: 18, marginBottom: 3 },
  insightDetail: { fontSize: 12, color: '#6d28d9', lineHeight: 17, marginBottom: 4 },
  insightAction: { fontSize: 12, color: '#7c3aed', fontWeight: '600', fontStyle: 'italic' },

  allClearText: { fontSize: 12, color: '#888', textAlign: 'center', paddingVertical: 12 },
});

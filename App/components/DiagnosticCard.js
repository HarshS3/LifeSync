/**
 * DiagnosticCard
 *
 * "Why do I feel like this?" — shows on the home dashboard when
 * readiness is low. Surfaces the top cause + protocol. Collapsible.
 *
 * Appears only when hasDiagnosis === true. Stays invisible when things are fine.
 */
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { AlertTriangle, ChevronDown, ChevronRight, Stethoscope } from 'lucide-react-native';
import { Card } from './ui/Card';
import { Body, Caption, H3 } from './ui/Typography';
import api from '../services/api';

const SEV_COLOR = { high: '#ef4444', moderate: '#f59e0b', low: '#6366f1' };
const SEV_BG    = { high: '#fef2f2', moderate: '#fffbeb', low: '#f5f3ff' };

function CauseRow({ cause, COLORS }) {
  const [open, setOpen] = useState(cause.severity === 'high');
  const color = SEV_COLOR[cause.severity] || '#888';
  const bg = SEV_BG[cause.severity] || '#f9fafb';

  return (
    <TouchableOpacity
      style={[styles.causeCard, { backgroundColor: bg, borderLeftColor: color }]}
      onPress={() => setOpen(o => !o)}
      activeOpacity={0.8}
    >
      <View style={styles.causeHeader}>
        <View style={[styles.sevDot, { backgroundColor: color }]} />
        <Body style={[styles.causeTitle, { flex: 1, color: COLORS?.text || '#111' }]}>{cause.title}</Body>
        <View style={[styles.confBadge, { backgroundColor: color + '20' }]}>
          <Caption style={{ color, fontWeight: '700' }}>{Math.round(cause.confidence * 100)}%</Caption>
        </View>
        {open ? <ChevronDown size={14} color="#aaa" style={{ marginLeft: 4 }} /> : <ChevronRight size={14} color="#aaa" style={{ marginLeft: 4 }} />}
      </View>

      {open && (
        <>
          <Body secondary style={styles.mechanism}>{cause.mechanism}</Body>
          <View style={styles.protocolBox}>
            <Caption style={styles.protocolLabel}>TODAY'S PROTOCOL</Caption>
            <Body style={styles.protocol}>{cause.protocol}</Body>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function DiagnosticCard({ readiness, COLORS }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Only fetch if readiness is low enough to warrant a diagnosis
  useEffect(() => {
    if (readiness == null || readiness >= 7) return;
    setLoading(true);
    api.get('/insights/diagnostic')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [readiness]);

  if (readiness >= 7) return null;
  if (loading) return (
    <View style={styles.loadingRow}>
      <ActivityIndicator size="small" color="#f59e0b" />
      <Caption secondary style={{ marginLeft: 8 }}>Analysing your data…</Caption>
    </View>
  );
  if (!data?.hasDiagnosis) return null;

  const topCause = data.topCauses[0];

  return (
    <Card style={[styles.card, { borderColor: COLORS?.border || '#e5e7eb' }]} padding={0}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={() => setCollapsed(c => !c)} activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <Stethoscope size={16} color="#f59e0b" />
          <H3 style={{ marginLeft: 8, fontSize: 14 }}>Why you feel like this</H3>
        </View>
        {collapsed ? <ChevronRight size={16} color="#aaa" /> : <ChevronDown size={16} color="#aaa" />}
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.body}>
          {/* Top causes */}
          {data.topCauses.map((cause, i) => (
            <CauseRow key={cause.id} cause={cause} COLORS={COLORS} />
          ))}

          {/* Compound protocol if multiple causes */}
          {data.compoundProtocol?.length > 0 && data.topCauses.length > 1 && (
            <View style={[styles.compoundBox, { backgroundColor: COLORS?.surface || '#f9fafb' }]}>
              <Caption style={[styles.protocolLabel, { marginBottom: 6 }]}>COMBINED PROTOCOL FOR TODAY</Caption>
              {data.compoundProtocol.map((step, i) => (
                <View key={i} style={styles.compoundRow}>
                  <Caption style={styles.stepNum}>{i + 1}</Caption>
                  <Body secondary style={{ flex: 1, lineHeight: 20 }}>{step}</Body>
                </View>
              ))}
            </View>
          )}

          {data.context?.dataQuality === 'partial' && (
            <Caption secondary style={styles.dataNote}>
              Based on partial data — log more consistently for better accuracy.
            </Caption>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 8 },
  card: { marginBottom: 12, overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  body: { paddingHorizontal: 12, paddingBottom: 14 },

  causeCard: {
    borderLeftWidth: 3, borderRadius: 10, padding: 12,
    marginBottom: 8,
  },
  causeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  sevDot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  causeTitle: { fontSize: 13, fontWeight: '600' },
  confBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  mechanism: { fontSize: 12, lineHeight: 18, marginTop: 8, color: '#555' },
  protocolBox: { marginTop: 8, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: 10 },
  protocolLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, color: '#888', marginBottom: 4 },
  protocol: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: '#333' },

  compoundBox: { borderRadius: 10, padding: 12, marginTop: 4 },
  compoundRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  stepNum: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#6366f1', color: '#fff', textAlign: 'center', fontWeight: '800', fontSize: 10, lineHeight: 16 },

  dataNote: { fontSize: 10, textAlign: 'center', marginTop: 8, opacity: 0.6 },
});

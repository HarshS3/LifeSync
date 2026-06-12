import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useTheme } from '../../constants/Theme';
import {
  FileText, Download, TrendingUp, TrendingDown, Minus,
  Dumbbell, Utensils, Calendar, ChevronLeft, ChevronRight, Sparkles, AlertCircle,
} from 'lucide-react-native';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, H3, Body, Caption } from '../../components/ui/Typography';

const fmt = (n, digits = 0) => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  return digits === 0 ? Math.round(v).toString() : v.toFixed(digits);
};

function DeltaBadge({ delta, deltaPct, COLORS, invert = false }) {
  if (delta == null) {
    return (
      <View style={[styles.deltaBadge, { backgroundColor: COLORS.gray100 }]}>
        <Minus size={12} color={COLORS.gray400} />
        <Caption secondary style={{ marginLeft: 2, fontSize: 10 }}>—</Caption>
      </View>
    );
  }
  const positive = invert ? delta < 0 : delta > 0;
  const color = delta === 0 ? COLORS.gray400 : (positive ? COLORS.success : COLORS.error);
  const Icon = delta === 0 ? Minus : (delta > 0 ? TrendingUp : TrendingDown);
  return (
    <View style={[styles.deltaBadge, { backgroundColor: color + '15' }]}>
      <Icon size={12} color={color} />
      <Caption style={{ color, fontSize: 10, fontWeight: '700', marginLeft: 2 }}>
        {deltaPct != null ? `${deltaPct > 0 ? '+' : ''}${deltaPct}%` : `${delta > 0 ? '+' : ''}${delta}`}
      </Caption>
    </View>
  );
}

export default function MonthlyReportScreen() {
  const router = useRouter();
  const { COLORS } = useTheme();

  const today = new Date();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  const [report, setReport] = useState(null);

  const fetchReport = async (month) => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/monthly?month=${month}&format=json`);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to fetch monthly report', err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedMonth);
  }, [selectedMonth]);

  const changeMonth = (direction) => {
    let [year, month] = selectedMonth.split('-').map(Number);
    month += direction;
    if (month < 1) { month = 12; year--; }
    if (month > 12) { month = 1; year++; }
    setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const formatMonth = (mStr) => {
    const [y, m] = mStr.split('-');
    return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const downloadCsv = async () => {
    try {
      // The /reports/monthly?format=csv endpoint streams the CSV; api client returns it as a blob/text.
      // We can't write to disk directly from RN without expo-file-system; show the URL the user can hit.
      const base = api.defaults?.baseURL || '';
      const url = `${base}/reports/monthly?month=${selectedMonth}&format=csv`;
      Alert.alert(
        'CSV export',
        'Open the CSV URL in your browser (with auth) to download the full month dataset.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open URL', onPress: () => Linking.openURL(url).catch(() => {}) },
        ]
      );
    } catch (err) {
      Alert.alert('Export failed', err.message || 'Try again later.');
    }
  };

  if (loading && !report) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const summary = report?.summary || {};
  const mom = report?.monthOverMonth;
  const correlations = Array.isArray(report?.correlations) ? report.correlations : [];
  const bestWorst = report?.bestWorstDays;

  return (
    <ScreenWrapper title="Monthly Insights">
      <View style={[styles.picker, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.pickerBtn}>
          <ChevronLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <H3>{formatMonth(selectedMonth)}</H3>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.pickerBtn}>
          <ChevronRight size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!report || !summary ? (
          <View style={styles.empty}>
            <FileText size={48} color={COLORS.gray200} />
            <Body secondary style={{ marginTop: 12 }}>No data archived for this month.</Body>
          </View>
        ) : (
          <>
            {/* High-level totals */}
            <View style={styles.totalsGrid}>
              <Card style={styles.totalCard} padding={16}>
                <Dumbbell size={20} color={COLORS.training} />
                <H2 style={{ marginTop: 8 }}>{fmt(summary.totalWorkouts)}</H2>
                <Caption secondary style={{ fontWeight: '700' }}>WORKOUTS</Caption>
                {mom && <DeltaBadge {...mom.totalWorkouts} COLORS={COLORS} />}
              </Card>
              <Card style={styles.totalCard} padding={16}>
                <TrendingUp size={20} color={COLORS.success} />
                <H2 style={{ marginTop: 8 }}>{fmt(summary.totalVolume / 1000, 1)}<Caption>k kg</Caption></H2>
                <Caption secondary style={{ fontWeight: '700' }}>TOTAL VOLUME</Caption>
                {mom && <DeltaBadge {...mom.totalVolume} COLORS={COLORS} />}
              </Card>
              <Card style={styles.totalCard} padding={16}>
                <Utensils size={20} color={COLORS.nutrition} />
                <H2 style={{ marginTop: 8 }}>{fmt(summary.avgCalories)}<Caption> kcal</Caption></H2>
                <Caption secondary style={{ fontWeight: '700' }}>AVG CALORIES</Caption>
                {mom && <DeltaBadge {...mom.avgCalories} COLORS={COLORS} />}
              </Card>
              <Card style={styles.totalCard} padding={16}>
                <Calendar size={20} color={COLORS.info} />
                <H2 style={{ marginTop: 8 }}>{fmt(report.days?.length)}<Caption> days</Caption></H2>
                <Caption secondary style={{ fontWeight: '700' }}>LOGGED</Caption>
              </Card>
            </View>

            {/* Aggregates with month-over-month deltas */}
            <H3 style={styles.sectionTitle}>vs. previous month</H3>
            <Card padding={16} style={styles.summaryCard}>
              {!mom ? (
                <Body secondary>Not enough data in {report?.monthOverMonth?.priorMonth || 'prior month'} to compare.</Body>
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    <Body>Avg Daily Protein</Body>
                    <View style={styles.deltaRowRight}>
                      <Body style={{ fontWeight: '700' }}>{fmt(summary.avgProtein)} g</Body>
                      <DeltaBadge {...mom.avgProtein} COLORS={COLORS} />
                    </View>
                  </View>
                  <View style={styles.summaryRow}>
                    <Body>Avg Daily Sleep</Body>
                    <View style={styles.deltaRowRight}>
                      <Body style={{ fontWeight: '700' }}>{fmt(summary.avgSleep, 1)} h</Body>
                      <DeltaBadge {...mom.avgSleep} COLORS={COLORS} />
                    </View>
                  </View>
                  <View style={styles.summaryRow}>
                    <Body>Avg Body Weight</Body>
                    <View style={styles.deltaRowRight}>
                      <Body style={{ fontWeight: '700' }}>{fmt(summary.avgWeight, 1)} kg</Body>
                      {/* invert: weight loss is positive when goal is fat loss; UI stays neutral by passing invert=false */}
                      <DeltaBadge {...mom.avgWeight} COLORS={COLORS} />
                    </View>
                  </View>
                </>
              )}
            </Card>

            {/* Correlations */}
            {correlations.length > 0 && (
              <>
                <H3 style={styles.sectionTitle}>Cross-domain patterns</H3>
                <Card padding={16} style={styles.summaryCard}>
                  {correlations.slice(0, 5).map((c, idx) => {
                    const impactColor = c.impact === 'high' ? COLORS.error : c.impact === 'moderate' ? COLORS.warning : COLORS.info;
                    return (
                      <View key={idx} style={[styles.insightItem, idx === 0 && { borderTopWidth: 0 }]}>
                        <View style={styles.insightTitleRow}>
                          <View style={[styles.impactDot, { backgroundColor: impactColor }]} />
                          <Body style={{ fontWeight: '700', flex: 1 }}>{c.title}</Body>
                        </View>
                        <Body secondary style={{ marginTop: 4, lineHeight: 20 }}>{c.detail}</Body>
                        {c.action && (
                          <View style={[styles.actionBox, { backgroundColor: COLORS.primaryBg || COLORS.surface, borderLeftColor: COLORS.primary }]}>
                            <Caption secondary style={{ fontWeight: '700', marginBottom: 2 }}>WHAT TO DO</Caption>
                            <Body>{c.action}</Body>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </Card>
              </>
            )}

            {/* Best / worst days */}
            {bestWorst && (
              <>
                <H3 style={styles.sectionTitle}>Best & worst days</H3>
                <Card padding={16} style={styles.summaryCard}>
                  <Caption secondary style={{ fontWeight: '700', marginBottom: 6 }}>TOP 3</Caption>
                  {bestWorst.best.map((d, i) => (
                    <View key={`b-${i}`} style={styles.dayRow}>
                      <Sparkles size={14} color={COLORS.success} />
                      <Body style={{ flex: 1, marginLeft: 8 }}>{d.dayKey}</Body>
                      <Caption secondary>{d.label} · score {d.score}</Caption>
                    </View>
                  ))}
                  <Caption secondary style={{ fontWeight: '700', marginTop: 12, marginBottom: 6 }}>BOTTOM 3</Caption>
                  {bestWorst.worst.map((d, i) => (
                    <View key={`w-${i}`} style={styles.dayRow}>
                      <AlertCircle size={14} color={COLORS.error} />
                      <Body style={{ flex: 1, marginLeft: 8 }}>{d.dayKey}</Body>
                      <Caption secondary>{d.label} · score {d.score}</Caption>
                    </View>
                  ))}
                </Card>
              </>
            )}

            {/* Top reasons */}
            {report?.aggregates?.topReasons?.length > 0 && (
              <>
                <H3 style={styles.sectionTitle}>Most common reasons</H3>
                <Card padding={16} style={styles.summaryCard}>
                  {report.aggregates.topReasons.map((r, idx) => (
                    <View key={idx} style={styles.summaryRow}>
                      <Body>{r.reason}</Body>
                      <Caption secondary>{r.count} day{r.count === 1 ? '' : 's'}</Caption>
                    </View>
                  ))}
                </Card>
              </>
            )}

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: COLORS.primary }]}
              onPress={downloadCsv}
            >
              <Download size={20} color={COLORS.primaryContrast} />
              <Body style={{ color: COLORS.primaryContrast, fontWeight: '700', marginLeft: 10 }}>Export CSV</Body>
            </TouchableOpacity>

            <Caption secondary style={{ textAlign: 'center', marginTop: 12 }}>
              {report.days?.length || 0} days of granular data in this month.
            </Caption>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  pickerBtn: { padding: 8 },
  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  totalCard: { flex: 1, minWidth: '45%' },
  sectionTitle: { marginBottom: 12, marginLeft: 4 },
  summaryCard: { marginBottom: 24 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  deltaRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deltaBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 6,
  },
  insightItem: {
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  insightTitleRow: { flexDirection: 'row', alignItems: 'center' },
  impactDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  actionBox: {
    marginTop: 10, padding: 10, borderRadius: 8, borderLeftWidth: 3,
  },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
  },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 16, marginTop: 10,
  },
  empty: { alignItems: 'center', padding: 80 },
});

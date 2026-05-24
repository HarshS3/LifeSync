import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useTheme } from '../../constants/Theme';
import { 
  FileText, Download, TrendingUp, Dumbbell, 
  Utensils, Calendar, ChevronLeft, ChevronRight 
} from 'lucide-react-native';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, H3, Body, Caption } from '../../components/ui/Typography';

export default function MonthlyReportScreen() {
  const router = useRouter();
  const { COLORS, SHADOWS } = useTheme();
  
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
      Alert.alert('No Data', 'No logs found for the selected month.');
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

  if (loading && !report) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScreenWrapper title="Monthly Data Archive">
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
        
        {report && report.summary ? (
          <>
            {/* High Level Totals */}
            <View style={styles.totalsGrid}>
              <TotalCard 
                label="Workouts" value={report.summary.totalWorkouts || 0} 
                icon={<Dumbbell size={20} color={COLORS.training} />} 
              />
              <TotalCard 
                label="Total Vol" value={`${Math.round((report.summary.totalVolume || 0)/1000)}k`} 
                unit="kg" icon={<TrendingUp size={20} color={COLORS.success} />} 
              />
              <TotalCard 
                label="Avg Calories" value={Math.round(report.summary.avgCalories || 0)} 
                unit="kcal" icon={<Utensils size={20} color={COLORS.nutrition} />} 
              />
              <TotalCard 
                label="Logs" value={report.days?.length || 0} 
                unit="days" icon={<Calendar size={20} color={COLORS.info} />} 
              />
            </View>

            <H3 style={styles.sectionTitle}>Monthly Aggregates</H3>
            <Card padding={16} style={styles.summaryCard}>
               <View style={styles.summaryRow}>
                 <Body>Avg Daily Protein</Body>
                 <Body style={{ fontWeight: '700' }}>{Math.round(report.summary.avgProtein || 0)} g</Body>
               </View>
               <View style={styles.summaryRow}>
                 <Body>Avg Daily Sleep</Body>
                 <Body style={{ fontWeight: '700' }}>{(report.summary.avgSleep || 0).toFixed(1)} hrs</Body>
               </View>
               <View style={styles.summaryRow}>
                 <Body>Avg Body Weight</Body>
                 <Body style={{ fontWeight: '700' }}>{(report.summary.avgWeight || 0).toFixed(1)} kg</Body>
               </View>
            </Card>

            <TouchableOpacity 
              style={[styles.exportBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => Alert.alert('Export', 'CSV Export will be sent to your email.')}
            >
              <Download size={20} color={COLORS.primaryContrast} />
              <Body style={{ color: COLORS.primaryContrast, fontWeight: '700', marginLeft: 10 }}>Email Full CSV Report</Body>
            </TouchableOpacity>

            <Caption secondary style={{ textAlign: 'center', marginTop: 12 }}>
              Contains {report.days?.length || 0} days of granular data.
            </Caption>
          </>
        ) : (
          <View style={styles.empty}>
            <FileText size={48} color={COLORS.gray200} />
            <Body secondary style={{ marginTop: 12 }}>No data archived for this month.</Body>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

function TotalCard({ label, value, unit, icon }) {
  const { COLORS } = useTheme();
  return (
    <Card style={styles.totalCard} padding={16}>
      {icon}
      <H2 style={{ marginTop: 8 }}>{value}<Caption>{unit}</Caption></H2>
      <Caption secondary style={{ fontWeight: '700' }}>{label.toUpperCase()}</Caption>
    </Card>
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
  sectionTitle: { marginBottom: 16, marginLeft: 4 },
  summaryCard: { marginBottom: 24 },
  summaryRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.05)' 
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
  },
  empty: { alignItems: 'center', padding: 80 },
});

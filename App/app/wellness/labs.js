import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Plus, FileText, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H3, Body, Caption } from '../../components/ui/Typography';

export default function LabsScreen() {
  const router = useRouter();
  const { COLORS, SHADOWS } = useTheme();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  const fetchReports = async () => {
    try {
      const res = await api.get('/labs');
      setReports(res.data || []);
    } catch (err) {
      console.error('Failed to fetch labs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const getFlagColor = (flag) => {
    switch (flag) {
      case 'high':
      case 'low': return COLORS.error;
      case 'normal': return COLORS.success;
      default: return COLORS.gray400;
    }
  };

  return (
    <ScreenWrapper title="Biomarkers & Labs">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {reports.length > 0 ? (
          reports.map((report) => (
            <Card key={report._id} style={styles.reportCard} padding={20}>
              <View style={[styles.reportHeader, { borderBottomColor: COLORS.gray100 }]}>
                <View>
                  <H3>{report.panelName}</H3>
                  <Caption secondary style={{ marginTop: 4 }}>
                    {new Date(report.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Caption>
                </View>
                {report.results.some(r => r.flag === 'high' || r.flag === 'low') && (
                  <AlertTriangle size={20} color={COLORS.warning} />
                )}
              </View>

              <View style={styles.resultsList}>
                {report.results.slice(0, 5).map((res, i) => (
                  <View key={i} style={styles.resultRow}>
                    <Body style={{ flex: 1 }}>{res.name}</Body>
                    <View style={styles.resultValueBox}>
                      <Body style={{ fontWeight: '700', color: getFlagColor(res.flag) }}>
                        {res.value} {res.unit}
                      </Body>
                      <Caption secondary style={{ fontSize: 10 }}>
                        {res.refRangeLow}-{res.refRangeHigh}
                      </Caption>
                    </View>
                  </View>
                ))}
                {report.results.length > 5 && (
                  <TouchableOpacity onPress={() => {}}>
                    <Caption style={{ color: COLORS.info, textAlign: 'center', marginTop: 8, fontWeight: '700' }}>
                      + {report.results.length - 5} MORE MARKERS
                    </Caption>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FileText size={60} color={COLORS.gray100} />
            <Body secondary style={{ marginTop: 20, textAlign: 'center' }}>No lab reports uploaded yet.</Body>
            <TouchableOpacity style={[styles.uploadButton, { backgroundColor: COLORS.primary }]}>
              <Body style={{ color: COLORS.primaryContrast, fontWeight: 'bold' }}>Upload first report</Body>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: COLORS.primary, ...SHADOWS }]} 
        onPress={() => Alert.alert('Add', 'Manual entry coming soon')}
      >
        <Plus size={24} color={COLORS.primaryContrast} />
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  reportCard: {
    marginBottom: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  resultsList: {
    gap: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultValueBox: {
    alignItems: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    marginTop: 40,
  },
  uploadButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
});


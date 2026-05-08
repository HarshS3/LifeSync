import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Plus, FileText, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react-native';

export default function LabsScreen() {
  const router = useRouter();
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const getFlagColor = (flag) => {
    switch (flag) {
      case 'high':
      case 'low': return '#ef4444';
      case 'normal': return '#10b981';
      default: return '#999';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biomarkers & Labs</Text>
        <TouchableOpacity onPress={() => Alert.alert('OCR', 'OCR feature coming soon to mobile')}>
          <FileText size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {reports.length > 0 ? (
          reports.map((report) => (
            <View key={report._id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View>
                  <Text style={styles.reportTitle}>{report.panelName}</Text>
                  <Text style={styles.reportDate}>
                    {new Date(report.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                {report.results.some(r => r.flag === 'high' || r.flag === 'low') && (
                  <AlertTriangle size={20} color="#f59e0b" />
                )}
              </View>

              <View style={styles.resultsList}>
                {report.results.slice(0, 5).map((res, i) => (
                  <View key={i} style={styles.resultRow}>
                    <Text style={styles.resultName}>{res.name}</Text>
                    <View style={styles.resultValueBox}>
                      <Text style={[styles.resultValue, { color: getFlagColor(res.flag) }]}>
                        {res.value} {res.unit}
                      </Text>
                      <Text style={styles.resultRange}>
                        {res.refRangeLow}-{res.refRangeHigh}
                      </Text>
                    </View>
                  </View>
                ))}
                {report.results.length > 5 && (
                  <Text style={styles.moreResults}>+ {report.results.length - 5} more markers</Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FileText size={60} color="#eee" />
            <Text style={styles.emptyText}>No lab reports uploaded yet.</Text>
            <TouchableOpacity style={styles.uploadButton}>
              <Text style={styles.uploadButtonText}>Upload first report</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => Alert.alert('Add', 'Manual entry coming soon')}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 12,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  resultsList: {
    gap: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultName: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  resultValueBox: {
    alignItems: 'flex-end',
  },
  resultValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  resultRange: {
    fontSize: 10,
    color: '#9ca3af',
  },
  moreResults: {
    fontSize: 12,
    color: '#3b82f6',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    marginTop: 40,
  },
  emptyText: {
    marginTop: 20,
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  uploadButton: {
    marginTop: 24,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});

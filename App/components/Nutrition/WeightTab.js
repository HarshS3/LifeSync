import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Scale, TrendingUp, History, Plus } from 'lucide-react-native';
import api from '../../services/api';

const { width } = Dimensions.get('window');

export default function WeightTab({ COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY }) {
  const [weight, setWeight] = useState('');
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      // Fetch last 30 days of history
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      
      const res = await api.get(`/nutrition/weight/range/${start.toISOString()}/${end.toISOString()}`);
      // Sort desc for the list view
      const sorted = (res.data || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      setHistory(sorted);
    } catch (err) {
      console.error('Weight history error', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleLogWeight = async () => {
    if (!weight || isNaN(weight)) {
      Alert.alert('Error', 'Please enter a valid weight.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/nutrition/weight', { 
        date: new Date().toISOString(),
        weightKg: parseFloat(weight) 
      });
      Alert.alert('Success', 'Weight logged successfully.');
      setWeight('');
      fetchHistory();
    } catch (err) {
      console.error('Log weight error', err);
      Alert.alert('Error', 'Failed to log weight.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  return (
    <ScrollView contentContainerStyle={themedStyles.container}>
      {/* Log Weight Card */}
      <View style={themedStyles.logCard}>
        <View style={themedStyles.cardHeader}>
          <Scale size={20} color={COLORS.info} style={{ marginRight: 8 }} />
          <Text style={themedStyles.cardTitle}>Log Today's Weight</Text>
        </View>
        <View style={themedStyles.inputRow}>
          <TextInput
            style={themedStyles.weightInput}
            keyboardType="numeric"
            placeholder="0.0"
            value={weight}
            onChangeText={setWeight}
            placeholderTextColor={COLORS.textSecondary}
          />
          <Text style={themedStyles.unitText}>kg</Text>
          <TouchableOpacity 
            style={[themedStyles.addBtn, isSubmitting && { opacity: 0.7 }]} 
            onPress={handleLogWeight}
            disabled={isSubmitting}
          >
            {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Plus size={24} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={themedStyles.statsRow}>
        <View style={themedStyles.statBox}>
          <Text style={themedStyles.statLabel}>Current</Text>
          <Text style={themedStyles.statValue}>{history[0]?.weightKg || '--'} <Text style={themedStyles.statUnit}>kg</Text></Text>
        </View>
        <View style={themedStyles.statBox}>
          <Text style={themedStyles.statLabel}>Avg (7d)</Text>
          <Text style={themedStyles.statValue}>-- <Text style={themedStyles.statUnit}>kg</Text></Text>
        </View>
      </View>

      {/* History List */}
      <View style={themedStyles.historySection}>
        <View style={themedStyles.sectionHeader}>
          <History size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
          <Text style={themedStyles.sectionTitle}>Recent History</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          history.map((item, idx) => (
            <View key={idx} style={themedStyles.historyItem}>
              <Text style={themedStyles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
              <Text style={themedStyles.historyWeight}>{item.weightKg} kg</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = (COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY) => StyleSheet.create({
  container: { padding: SPACING.md, paddingBottom: 100 },
  logCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: 20, ...SHADOWS },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { ...TYPOGRAPHY.label, color: COLORS.text, fontWeight: 'bold' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weightInput: { flex: 1, height: 50, backgroundColor: COLORS.gray100, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 16, fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  unitText: { fontSize: 18, color: COLORS.textSecondary, fontWeight: 'bold' },
  addBtn: { backgroundColor: COLORS.info, width: 50, height: 50, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS },
  statLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statUnit: { fontSize: 14, fontWeight: '400', color: COLORS.textSecondary },
  historySection: { marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, fontWeight: 'bold' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyDate: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  historyWeight: { ...TYPOGRAPHY.label, color: COLORS.text, fontWeight: 'bold' },
});

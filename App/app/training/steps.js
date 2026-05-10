import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Footprints, Plus, Minus, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../constants/Theme';

const screenWidth = Dimensions.get('window').width;

export default function StepTrackerScreen() {
  const router = useRouter();
  const { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState('');
  const [history, setHistory] = useState([]);
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchSteps();
  }, []);

  const adjustSteps = (amount) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSteps(prev => {
      const current = parseInt(prev) || 0;
      return Math.max(0, current + amount).toString();
    });
  };

  const fetchSteps = async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [todayRes, historyRes] = await Promise.all([
        api.get(`/gym/steps/date/${today}`),
        api.get(`/gym/steps/range/${sevenDaysAgo}/${today}`)
      ]);

      if (todayRes.data?.stepsCount) {
        setSteps(todayRes.data.stepsCount.toString());
      }
      
      if (historyRes.data) {
        setHistory(historyRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch steps', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSteps = async () => {
    if (!steps || isNaN(steps)) {
      Alert.alert('Invalid', 'Please enter a valid step count');
      return;
    }

    setSaving(true);
    try {
      await api.post('/gym/steps', {
        date: today,
        stepsCount: Number(steps)
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Steps logged successfully!');
      fetchSteps(); // Refresh both today and history
    } catch (err) {
      console.error('Failed to save steps', err);
      Alert.alert('Error', 'Failed to log steps');
    } finally {
      setSaving(false);
    }
  };

  const chartData = {
    labels: history.length > 0 ? history.map(h => {
      const d = new Date(h.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }) : ['No Data'],
    datasets: [{
      data: history.length > 0 ? history.map(h => h.stepsCount || 0) : [0]
    }]
  };

  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, isDark);

  if (loading) {
    return (
      <View style={themedStyles.centered}>
        <ActivityIndicator size="large" color={COLORS.success} />
        <TouchableOpacity style={{ marginTop: 20 }} onPress={fetchSteps}>
          <Text style={{ color: COLORS.success, fontWeight: '600' }}>Retry Loading</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={themedStyles.backButton}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={themedStyles.headerTitle}>Step Tracker</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={themedStyles.content}>
        {history.length > 1 && (
          <View style={themedStyles.chartCard}>
            <View style={themedStyles.chartHeader}>
              <TrendingUp size={18} color={COLORS.success} />
              <Text style={themedStyles.chartTitle}>7-Day Trend</Text>
            </View>
            <LineChart
              data={chartData}
              width={screenWidth - 72}
              height={180}
              chartConfig={{
                backgroundColor: COLORS.surface,
                backgroundGradientFrom: COLORS.surface,
                backgroundGradientTo: COLORS.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(${isDark ? '52, 211, 153' : '16, 185, 129'}, ${opacity})`,
                labelColor: (opacity = 1) => COLORS.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: { r: "4", strokeWidth: "2", stroke: COLORS.success }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          </View>
        )}

        <View style={themedStyles.inputCard}>
          <View style={themedStyles.iconContainer}>
            <Footprints size={32} color={COLORS.success} />
          </View>
          <Text style={themedStyles.label}>Today's Steps</Text>
          
          <View style={themedStyles.inputWrapper}>
            <TouchableOpacity 
              style={themedStyles.stepButton} 
              onPress={() => adjustSteps(-500)}
            >
              <Minus size={24} color={COLORS.success} />
            </TouchableOpacity>

            <TextInput
              style={themedStyles.input}
              value={steps}
              onChangeText={setSteps}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.gray400}
            />

            <TouchableOpacity 
              style={themedStyles.stepButton} 
              onPress={() => adjustSteps(500)}
            >
              <Plus size={24} color={COLORS.success} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[themedStyles.saveButton, saving && themedStyles.saveButtonDisabled]}
            onPress={saveSteps}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Text style={themedStyles.saveButtonText}>Confirm Steps</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={themedStyles.infoCard}>
          <Text style={themedStyles.infoTitle}>Why Track Steps?</Text>
          <Text style={themedStyles.infoText}>
            Walking is the foundation of Non-Exercise Activity Thermogenesis (NEAT). 
            A baseline of 8,000 to 10,000 steps per day significantly improves metabolic 
            health and cardiovascular endurance without adding systemic fatigue to your workouts.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: COLORS.surface,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  content: { padding: 20 },
  inputCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, alignItems: 'center',
    marginBottom: 24, ...SHADOWS,
  },
  iconContainer: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.success + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  label: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 16 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1, fontSize: 56, fontWeight: '800', color: COLORS.text, textAlign: 'center',
    paddingHorizontal: 10,
  },
  saveButton: { backgroundColor: COLORS.primary, paddingVertical: 18, paddingHorizontal: 32, borderRadius: 30, width: '100%', alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: COLORS.surface, fontSize: 16, fontWeight: '700' },
  infoCard: { backgroundColor: COLORS.gray100, padding: 20, borderRadius: 16 },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  infoTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  infoText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 }
});

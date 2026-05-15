import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Footprints, Plus, Minus, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, Body, Caption } from '../../components/ui/Typography';

const screenWidth = Dimensions.get('window').width;

export default function StepTrackerScreen() {
  const router = useRouter();
  const { COLORS } = useTheme();
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
        api.get(`/gym/steps/date/${today}`).catch(() => ({ data: null })),
        api.get(`/gym/steps/range/${sevenDaysAgo}/${today}`).catch(() => ({ data: [] }))
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
      fetchSteps();
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

  return (
    <ScreenWrapper title="Step Tracker">
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {history.length > 1 && (
          <Card style={styles.chartCard} padding={16}>
            <View style={styles.chartHeader}>
              <TrendingUp size={18} color={COLORS.success} />
              <Body style={{ fontWeight: '700' }}>7-Day Trend</Body>
            </View>
            <LineChart
              data={chartData}
              width={screenWidth - 64}
              height={180}
              chartConfig={{
                backgroundColor: COLORS.surface,
                backgroundGradientFrom: COLORS.surface,
                backgroundGradientTo: COLORS.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => COLORS.success,
                labelColor: (opacity = 1) => COLORS.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: { r: "4", strokeWidth: "2", stroke: COLORS.success }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          </Card>
        )}

        <Card style={styles.inputCard} padding={24}>
          <View style={[styles.iconContainer, { backgroundColor: COLORS.success + '15' }]}>
            <Footprints size={32} color={COLORS.success} />
          </View>
          <Body secondary style={{ marginBottom: 16, fontWeight: '600' }}>Today's Steps</Body>
          
          <View style={styles.inputWrapper}>
            <TouchableOpacity 
              style={[styles.stepButton, { backgroundColor: COLORS.gray100 }]} 
              onPress={() => adjustSteps(-500)}
            >
              <Minus size={24} color={COLORS.success} />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: COLORS.text }]}
              value={steps}
              onChangeText={setSteps}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.gray400}
            />

            <TouchableOpacity 
              style={[styles.stepButton, { backgroundColor: COLORS.gray100 }]} 
              onPress={() => adjustSteps(500)}
            >
              <Plus size={24} color={COLORS.success} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: COLORS.primary }, saving && { opacity: 0.7 }]}
            onPress={saveSteps}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Body style={{ color: COLORS.surface, fontWeight: '700' }}>Confirm Steps</Body>
            )}
          </TouchableOpacity>
        </Card>

        <Card style={{ backgroundColor: COLORS.gray100 }} padding={20}>
          <H2 style={{ fontSize: 16, marginBottom: 8 }}>Why Track Steps?</H2>
          <Body secondary style={{ lineHeight: 22 }}>
            Walking is the foundation of Non-Exercise Activity Thermogenesis (NEAT). 
            A baseline of 8,000 to 10,000 steps per day significantly improves metabolic 
            health and cardiovascular endurance without adding systemic fatigue to your workouts.
          </Body>
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  inputCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1, fontSize: 56, fontWeight: '800', textAlign: 'center',
    paddingHorizontal: 10,
  },
  saveButton: { 
    paddingVertical: 18, 
    paddingHorizontal: 32, 
    borderRadius: 30, 
    width: '100%', 
    alignItems: 'center' 
  },
  chartCard: {
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Footprints, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';

export default function StepTrackerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState('');
  
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
      const res = await api.get(`/gym/steps/date/${today}`);
      if (res.data?.steps) {
        setSteps(res.data.steps.toString());
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
        steps: Number(steps)
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Steps logged successfully!');
    } catch (err) {
      console.error('Failed to save steps', err);
      Alert.alert('Error', 'Failed to log steps');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
        <TouchableOpacity style={{ marginTop: 20 }} onPress={fetchSteps}>
          <Text style={{ color: '#10b981', fontWeight: '600' }}>Retry Loading</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Step Tracker</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputCard}>
          <View style={styles.iconContainer}>
            <Footprints size={32} color="#10b981" />
          </View>
          <Text style={styles.label}>Today's Steps</Text>
          
          <View style={styles.inputWrapper}>
            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => adjustSteps(-500)}
            >
              <Minus size={24} color="#10b981" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={steps}
              onChangeText={setSteps}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#ccc"
            />

            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => adjustSteps(500)}
            >
              <Plus size={24} color="#10b981" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveSteps}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Confirm Steps</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Why Track Steps?</Text>
          <Text style={styles.infoText}>
            Walking is the foundation of Non-Exercise Activity Thermogenesis (NEAT). 
            A baseline of 8,000 to 10,000 steps per day significantly improves metabolic 
            health and cardiovascular endurance without adding systemic fatigue to your workouts.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  content: { padding: 20 },
  inputCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center',
    marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10,
  },
  iconContainer: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#dcfce7',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  label: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 16 },
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
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1, fontSize: 56, fontWeight: '800', color: '#000', textAlign: 'center',
    paddingHorizontal: 10,
  },
  saveButton: { backgroundColor: '#000', paddingVertical: 18, paddingHorizontal: 32, borderRadius: 30, width: '100%', alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  infoCard: { backgroundColor: '#f3f4f6', padding: 20, borderRadius: 16 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#666', lineHeight: 22 }
});

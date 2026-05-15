import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { Check, ShieldAlert, Thermometer, Wind, Zap } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { MetricSlider } from '../../components/ui/MetricSlider';
import { H1, H2, H3, Body, Caption } from '../../components/ui/Typography';

const COMMON_SYMPTOMS = [
  { name: 'Bloating', icon: ShieldAlert, feature: 'wellness' },
  { name: 'Headache', icon: Zap, feature: 'load' },
  { name: 'Brain Fog', icon: Wind, feature: 'training' },
  { name: 'Fatigue', icon: Thermometer, feature: 'wellness' },
];

export default function LogSymptomsScreen() {
  const router = useRouter();
  const { COLORS, SPACING } = useTheme();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');

  const toggleSymptom = (name) => {
    Haptics.selectionAsync();
    setSelected(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one symptom');
      return;
    }
    setLoading(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      await api.post('/symptoms', {
        date: dateStr,
        symptoms: selected.map(s => ({
          name: s,
          severity: severity,
          notes: notes
        }))
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error('Failed to log symptoms', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper 
      title="Symptom Log"
      headerRight={
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Check size={24} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      }
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <H2 style={styles.introText}>What's bothering you?</H2>

        <View style={styles.symptomsGrid}>
          {COMMON_SYMPTOMS.map((s) => {
            const isSelected = selected.includes(s.name);
            const activeColor = COLORS[s.feature] || COLORS.primary;
            return (
              <TouchableOpacity 
                key={s.name}
                style={[
                  styles.symptomCard,
                  { 
                    borderColor: isSelected ? activeColor : COLORS.border,
                    backgroundColor: isSelected ? COLORS[`${s.feature}Bg`] || COLORS.gray100 : COLORS.surface
                  }
                ]}
                onPress={() => toggleSymptom(s.name)}
              >
                <s.icon size={24} color={isSelected ? activeColor : COLORS.gray400} />
                <Body style={[
                  styles.symptomName,
                  isSelected && { color: activeColor, fontWeight: '700' }
                ]}>{s.name}</Body>
              </TouchableOpacity>
            );
          })}
        </View>

        {selected.length > 0 && (
          <Card style={styles.severityCard}>
            <MetricSlider 
              label="Overall Severity"
              value={severity}
              onChange={setSeverity}
              color={COLORS.wellness}
              icon="🌡️"
            />
            
            <H3 style={styles.sectionLabel}>Notes</H3>
            <TextInput
              style={[styles.notesInput, { 
                backgroundColor: COLORS.gray100, 
                color: COLORS.text,
                borderRadius: 12
              }]}
              placeholder="Any specific details?"
              placeholderTextColor={COLORS.gray400}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </Card>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  introText: {
    marginBottom: 24,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  symptomCard: {
    width: '48%',
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  symptomName: {
    marginTop: 12,
  },
  severityCard: {
    marginTop: 8,
  },
  sectionLabel: {
    marginTop: 16,
    marginBottom: 12,
  },
  notesInput: {
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
  },
});

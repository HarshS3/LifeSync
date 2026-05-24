import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Moon, Sun, Battery, Brain, Check } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H1, H2, H3, Body, Caption } from '../../components/ui/Typography';
import { MetricSlider } from '../../components/ui/MetricSlider';

export default function LogWellnessScreen() {
  const router = useRouter();
  const { COLORS, SHADOWS } = useTheme();
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [sleepHours, setSleep] = useState('8');
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    setLoading(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      await api.post('/logs/mental', {
        date: dateStr,
        moodRating: mood,
        energyLevel: energy,
        sleepHours: parseFloat(sleepHours),
        notes
      });
      router.back();
    } catch (err) {
      console.error('Failed to log wellness', err);
      Alert.alert('Error', 'Failed to save wellness data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper 
      title="Wellness Log"
      headerRight={
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Check size={24} color={COLORS.primary} />}
        </TouchableOpacity>
      }
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <H2 style={styles.introText}>How are you feeling today?</H2>

        <Card style={styles.card}>
          <MetricSlider 
            label="Current Mood"
            value={mood}
            onChange={setMood}
            color={COLORS.wellness}
            icon="🧠"
          />
        </Card>
        
        <Card style={styles.card}>
          <MetricSlider 
            label="Energy Level"
            value={energy}
            onChange={setEnergy}
            color={COLORS.warning}
            icon="⚡"
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.labelRow}>
            <Moon size={18} color={COLORS.info} />
            <H3 style={{ marginLeft: 8 }}>Sleep Duration</H3>
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: COLORS.gray100 }]}>
            <TextInput
              style={[styles.textInput, { color: COLORS.text }]}
              keyboardType="numeric"
              value={sleepHours}
              onChangeText={setSleep}
              placeholder="8"
              placeholderTextColor={COLORS.gray400}
            />
            <Body secondary>hours</Body>
          </View>
        </Card>

        <Card style={styles.card}>
          <H3 style={{ marginBottom: 12 }}>Daily Notes</H3>
          <TextInput
            style={[styles.textInput, styles.textArea, { backgroundColor: COLORS.gray100, color: COLORS.text }]}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything specific on your mind today?"
            placeholderTextColor={COLORS.gray400}
            textAlignVertical="top"
          />
        </Card>
        
        <View style={{ height: 40 }} />
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
  card: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  textArea: {
    height: 120,
    padding: 16,
    borderRadius: 12,
  },
});


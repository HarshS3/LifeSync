import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Moon, Sun, Battery, Brain, Check } from 'lucide-react-native';

export default function LogWellnessScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [sleepHours, setSleep] = useState('8');
  const [notes, setNotes] = useState('');

  const RatingBar = ({ label, value, onChange, icon: Icon, color }) => (
    <View style={styles.ratingSection}>
      <View style={styles.ratingHeader}>
        <View style={styles.labelRow}>
          <Icon size={18} color={color} />
          <Text style={styles.ratingLabel}>{label}</Text>
        </View>
        <Text style={styles.ratingValue}>{value}/10</Text>
      </View>
      <View style={styles.optionsRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <TouchableOpacity
            key={num}
            style={[
              styles.optionCircle,
              value === num && { backgroundColor: color, borderColor: color }
            ]}
            onPress={() => onChange(num)}
          >
            <Text style={[styles.optionText, value === num && styles.optionTextActive]}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

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
      alert('Error saving wellness data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wellness Log</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#000" /> : <Check size={24} color="#000" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.introText}>How are you feeling today?</Text>

        <RatingBar 
          label="Mood" 
          value={mood} 
          onChange={setMood} 
          icon={Brain} 
          color="#8b5cf6" 
        />
        
        <RatingBar 
          label="Energy Level" 
          value={energy} 
          onChange={setEnergy} 
          icon={Battery} 
          color="#f59e0b" 
        />

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Moon size={18} color="#3b82f6" />
            <Text style={styles.sectionLabel}>Sleep Duration</Text>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={sleepHours}
              onChangeText={setSleep}
              placeholder="8"
            />
            <Text style={styles.unitText}>hours</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Daily Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything specific on your mind today?"
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 24,
  },
  introText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#000',
  },
  ratingSection: {
    marginBottom: 32,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  optionTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 8,
    color: '#333',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  unitText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
});

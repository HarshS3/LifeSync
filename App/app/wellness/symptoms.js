import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Check, ShieldAlert, Thermometer, Wind, Zap } from 'lucide-react-native';

const COMMON_SYMPTOMS = [
  { name: 'Bloating', icon: ShieldAlert, color: '#f59e0b' },
  { name: 'Headache', icon: Zap, color: '#ef4444' },
  { name: 'Brain Fog', icon: Wind, color: '#3b82f6' },
  { name: 'Fatigue', icon: Thermometer, color: '#8b5cf6' },
];

export default function LogSymptomsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');

  const toggleSymptom = (name) => {
    setSelected(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      alert('Select at least one symptom');
      return;
    }
    setLoading(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      await api.post('/log/symptoms', {
        date: dateStr,
        symptoms: selected.map(s => ({
          name: s,
          severity: severity,
          notes: notes
        }))
      });
      router.back();
    } catch (err) {
      console.error('Failed to log symptoms', err);
      alert('Error saving symptoms.');
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
        <Text style={styles.headerTitle}>Symptom Log</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#000" /> : <Check size={24} color="#000" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.introText}>What's bothering you?</Text>

        <View style={styles.symptomsGrid}>
          {COMMON_SYMPTOMS.map((s) => (
            <TouchableOpacity 
              key={s.name}
              style={[
                styles.symptomCard,
                selected.includes(s.name) && { borderColor: s.color, backgroundColor: s.color + '08' }
              ]}
              onPress={() => toggleSymptom(s.name)}
            >
              <s.icon size={24} color={selected.includes(s.name) ? s.color : '#999'} />
              <Text style={[
                styles.symptomName,
                selected.includes(s.name) && { color: s.color, fontWeight: '700' }
              ]}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selected.length > 0 && (
          <View style={styles.severitySection}>
            <Text style={styles.sectionLabel}>Average Severity: {severity}/10</Text>
            <View style={styles.severityRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.numBox,
                    severity === num && styles.numBoxActive
                  ]}
                  onPress={() => setSeverity(num)}
                >
                  <Text style={[styles.numText, severity === num && styles.numTextActive]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe any patterns (e.g., 'started 30 mins after eating lentils')"
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
    marginBottom: 24,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  symptomCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  symptomName: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  severitySection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numBoxActive: {
    backgroundColor: '#000',
  },
  numText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  numTextActive: {
    color: '#fff',
  },
  textArea: {
    height: 100,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
});

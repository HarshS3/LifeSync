import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Plus, Trash2, Check, Clock } from 'lucide-react-native';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const [name, setName] = useState('Empty Workout');
  const [exercises, setExercises] = useState([]);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addExercise = () => {
    const newEx = {
      id: Date.now().toString(),
      name: '',
      sets: [{ weight: '', reps: '' }]
    };
    setExercises([...exercises, newEx]);
  };

  const updateExerciseName = (id, text) => {
    setExercises(exercises.map(ex => ex.id === id ? { ...ex, name: text } : ex));
  };

  const addSet = (exId) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { weight: lastSet.weight, reps: lastSet.reps }]
        };
      }
      return ex;
    }));
  };

  const updateSet = (exId, setIdx, field, value) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exId) {
        const newSets = [...ex.sets];
        newSets[setIdx] = { ...newSets[setIdx], [field]: value };
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  };

  const removeExercise = (id) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleFinish = async () => {
    if (exercises.length === 0) {
      alert('Add at least one exercise!');
      return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        name,
        duration: Math.floor(elapsed / 60),
        date: new Date(),
        exercises: exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets.map(s => ({
            weight: parseFloat(s.weight) || 0,
            reps: parseInt(s.reps) || 0
          }))
        }))
      };

      await api.post('/gym/workouts', payload);
      router.replace('/(tabs)/training');
    } catch (err) {
      console.error('Failed to save workout', err);
      alert('Error saving workout.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.timerContainer}>
          <Clock size={16} color="#666" />
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        </View>
        <TouchableOpacity 
          style={styles.finishButton} 
          onPress={handleFinish}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.finishButtonText}>Finish</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TextInput
            style={styles.workoutNameInput}
            value={name}
            onChangeText={setName}
            placeholder="Workout Name"
          />

          {exercises.map((ex, exIdx) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <TextInput
                  style={styles.exerciseNameInput}
                  value={ex.name}
                  onChangeText={(text) => updateExerciseName(ex.id, text)}
                  placeholder="Exercise Name"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                  <Trash2 size={18} color="#ff3b30" />
                </TouchableOpacity>
              </View>

              <View style={styles.setsHeader}>
                <Text style={[styles.setHeaderLabel, { flex: 0.5 }]}>Set</Text>
                <Text style={styles.setHeaderLabel}>kg</Text>
                <Text style={styles.setHeaderLabel}>Reps</Text>
              </View>

              {ex.sets.map((set, sIdx) => (
                <View key={sIdx} style={styles.setRow}>
                  <View style={styles.setNumber}>
                    <Text style={styles.setNumberText}>{sIdx + 1}</Text>
                  </View>
                  <TextInput
                    style={styles.setInput}
                    keyboardType="numeric"
                    value={set.weight.toString()}
                    onChangeText={(v) => updateSet(ex.id, sIdx, 'weight', v)}
                    placeholder="0"
                  />
                  <TextInput
                    style={styles.setInput}
                    keyboardType="numeric"
                    value={set.reps.toString()}
                    onChangeText={(v) => updateSet(ex.id, sIdx, 'reps', v)}
                    placeholder="0"
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.addSetButton} onPress={() => addSet(ex.id)}>
                <Plus size={16} color="#000" />
                <Text style={styles.addSetText}>Add Set</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addExerciseButton} onPress={addExercise}>
            <Plus size={20} color="#000" />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    color: '#000',
    fontVariant: ['tabular-nums'],
  },
  finishButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  finishButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  workoutNameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#000',
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseNameInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  setHeaderLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    flex: 0.5,
    alignItems: 'center',
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ccc',
  },
  setInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    height: 40,
    marginHorizontal: 4,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  addSetText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  addExerciseText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});

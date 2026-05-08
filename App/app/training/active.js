import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Plus, Trash2, Check, Clock, Search, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const STORAGE_KEY = '@active_workout_draft';

const COMMON_EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Dumbbell Press', 'Lateral Raise', 'Bicep Curl', 'Tricep Extension',
  'Lat Pulldown', 'Leg Press', 'Leg Extension', 'Leg Curl', 'Calf Raise',
  'Pull Up', 'Push Up', 'Dip', 'Plank', 'Lunges', 'Face Pull'
];

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [name, setName] = useState('Empty Workout');
  const [exercises, setExercises] = useState([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedToBatch, setSelectedToBatch] = useState([]);

  // Save progress whenever name, exercises or startTime changes
  const saveProgress = useCallback(async (currentName, currentExercises, currentStartTime) => {
    try {
      const draft = JSON.stringify({
        name: currentName,
        exercises: currentExercises,
        startTime: currentStartTime,
        lastSaved: Date.now()
      });
      await AsyncStorage.setItem(STORAGE_KEY, draft);
    } catch (e) {
      console.error('Failed to save workout draft', e);
    }
  }, []);

  const clearProgress = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear workout draft', e);
    }
  };

  useEffect(() => {
    const initWorkout = async () => {
      // 1. Check for template
      if (params.template) {
        try {
          const t = JSON.parse(params.template);
          if (t.name) setName(t.name);
          if (t.exercises && Array.isArray(t.exercises)) {
            const loadedEx = t.exercises.map((ex, i) => ({
              id: Date.now().toString() + i,
              name: ex.name || '',
              sets: (ex.sets && ex.sets.length > 0) 
                ? ex.sets.map(s => ({ weight: s.weight?.toString() || '', reps: s.reps?.toString() || '' }))
                : [{ weight: '', reps: '' }]
            }));
            setExercises(loadedEx);
          }
          setIsReady(true);
          return;
        } catch(e) {
          console.error('Failed to parse template param', e);
        }
      }

      // 2. Check for saved draft if no template
      try {
        const savedDraft = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          // Only prompt if it's recent (e.g., within last 24 hours)
          const isRecent = (Date.now() - draft.lastSaved) < 24 * 60 * 60 * 1000;
          
          if (isRecent) {
            Alert.alert(
              "Continue Workout?",
              `You have a saved draft: ${draft.name}. Would you like to resume?`,
              [
                {
                  text: "Start New",
                  style: "destructive",
                  onPress: async () => {
                    await clearProgress();
                    setIsReady(true);
                  }
                },
                {
                  text: "Resume",
                  onPress: () => {
                    setName(draft.name);
                    setExercises(draft.exercises);
                    setStartTime(draft.startTime);
                    setIsReady(true);
                  }
                }
              ]
            );
            return;
          }
        }
      } catch (e) {
        console.error('Failed to load draft', e);
      }
      
      setIsReady(true);
    };

    initWorkout();

    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [params.template]);

  // Save changes effect
  useEffect(() => {
    if (isReady && !isSaving) {
      saveProgress(name, exercises, startTime);
    }
  }, [name, exercises, startTime, isReady, isSaving, saveProgress]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleBatchExercise = (exerciseName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedToBatch.includes(exerciseName)) {
      setSelectedToBatch(selectedToBatch.filter(e => e !== exerciseName));
    } else {
      setSelectedToBatch([...selectedToBatch, exerciseName]);
    }
  };

  const addBatchExercises = () => {
    const newExs = selectedToBatch.map((name, i) => ({
      id: (Date.now() + i).toString(),
      name: name,
      sets: [{ weight: '', reps: '' }]
    }));
    setExercises([...exercises, ...newExs]);
    setSelectedToBatch([]);
    setShowPicker(false);
    setSearch('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addCustomExercise = () => {
    if (search.trim()) {
      handleToggleBatchExercise(search.trim());
    }
  };

  const updateExerciseName = (id, text) => {
    setExercises(exercises.map(ex => ex.id === id ? { ...ex, name: text } : ex));
  };

  const addSet = (exId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      await clearProgress();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/training');
    } catch (err) {
      console.error('Failed to save workout', err);
      alert('Error saving workout.');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (exercises.length > 0) {
      Alert.alert(
        "Discard Workout?",
        "Are you sure you want to discard this workout? Progress will be lost.",
        [
          { text: "Keep Working", style: "cancel" },
          { 
            text: "Discard", 
            style: "destructive",
            onPress: async () => {
              await clearProgress();
              router.back();
            }
          }
        ]
      );
    } else {
      router.back();
    }
  };

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const filteredExercises = COMMON_EXERCISES.filter(ex => 
    ex.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
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

          <TouchableOpacity style={styles.addExerciseButton} onPress={() => setShowPicker(true)}>
            <Plus size={20} color="#000" />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercises</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {selectedToBatch.length > 0 && (
                  <TouchableOpacity style={styles.batchDoneButton} onPress={addBatchExercises}>
                    <Text style={styles.batchDoneText}>Add ({selectedToBatch.length})</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <X size={24} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.searchContainer}>
              <Search size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search or add custom..."
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
            </View>

            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.exerciseOption, selectedToBatch.includes(item) && styles.exerciseOptionSelected]}
                  onPress={() => handleToggleBatchExercise(item)}
                >
                  <Text style={[styles.exerciseOptionText, selectedToBatch.includes(item) && styles.exerciseOptionTextSelected]}>{item}</Text>
                  {selectedToBatch.includes(item) && <Check size={18} color="#8b5cf6" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                search.trim() ? (
                  <TouchableOpacity 
                    style={styles.exerciseOption}
                    onPress={addCustomExercise}
                  >
                    <Text style={styles.exerciseOptionText}>Add "{search}"</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.emptySearchText}>No exercises found</Text>
                )
              }
            />
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  exerciseOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  exerciseOptionText: {
    fontSize: 16,
    color: '#333',
  },
  exerciseOptionSelected: {
    backgroundColor: '#f5f3ff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  exerciseOptionTextSelected: {
    color: '#8b5cf6',
    fontWeight: '700',
  },
  batchDoneButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
  },
  batchDoneText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptySearchText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
});

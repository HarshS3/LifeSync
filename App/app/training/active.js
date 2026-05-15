import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { Plus, Trash2, Check, Clock, Search, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, H3, Body, Caption } from '../../components/ui/Typography';

const STORAGE_KEY = '@active_workout_draft';

const COMMON_EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Dumbbell Press', 'Lateral Raise', 'Bicep Curl', 'Tricep Extension',
  'Lat Pulldown', 'Leg Press', 'Leg Extension', 'Leg Curl', 'Calf Raise',
  'Pull Up', 'Push Up', 'Dip', 'Plank', 'Lunges', 'Face Pull'
];

export default function ActiveWorkoutScreen() {
  const { COLORS } = useTheme();
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
  }, [params.template, startTime]);

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
      Alert.alert('Empty Workout', 'Add at least one exercise!');
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
      Alert.alert('Error', 'Failed to save workout.');
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

  const filteredExercises = COMMON_EXERCISES.filter(ex => 
    ex.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScreenWrapper 
      title={name} 
      onBack={handleCancel}
      headerRight={
        <TouchableOpacity 
          style={[styles.finishButton, { backgroundColor: COLORS.primary }]} 
          onPress={handleFinish}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Body style={{ color: '#fff', fontWeight: 'bold' }}>Finish</Body>}
        </TouchableOpacity>
      }
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Timer and Name Input */}
          <View style={styles.topSection}>
            <View style={[styles.timerContainer, { backgroundColor: COLORS.gray100 }]}>
              <Clock size={16} color={COLORS.textSecondary} />
              <Body style={[styles.timerText, { color: COLORS.text }]}>{formatTime(elapsed)}</Body>
            </View>
            <TextInput
              style={[styles.workoutNameInput, { color: COLORS.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Workout Name"
              placeholderTextColor={COLORS.gray400}
            />
            <Caption secondary style={{ marginTop: 4 }}>Tap the name to edit</Caption>
          </View>

          {/* Exercises List */}
          {exercises.length === 0 ? (
            <View style={styles.emptyWorkoutState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: COLORS.gray100 }]}>
                <Plus size={32} color={COLORS.gray400} />
              </View>
              <H3 style={{ marginBottom: 8 }}>Ready to work?</H3>
              <Body secondary style={{ textAlign: 'center', marginBottom: 24 }}>
                Your workout is currently empty. Add exercises to start tracking your progress.
              </Body>
              <TouchableOpacity 
                style={[styles.startEmptyAction, { backgroundColor: COLORS.primary }]}
                onPress={() => setShowPicker(true)}
              >
                <Plus size={20} color={COLORS.surface} />
                <Body style={{ color: COLORS.surface, fontWeight: '700', marginLeft: 8 }}>Add Exercise</Body>
              </TouchableOpacity>
            </View>
          ) : exercises.map((ex, exIdx) => (
              <Card key={ex.id} style={styles.exerciseCard} padding={16}>
              <View style={styles.exerciseHeader}>
                <TextInput
                  style={[styles.exerciseNameInput, { color: COLORS.text }]}
                  value={ex.name}
                  onChangeText={(text) => updateExerciseName(ex.id, text)}
                  placeholder="Exercise Name"
                  placeholderTextColor={COLORS.gray400}
                />
                <TouchableOpacity onPress={() => removeExercise(ex.id)} style={styles.iconButton}>
                  <Trash2 size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.setsHeader}>
                <Caption secondary style={[styles.setHeaderLabel, { flex: 0.5 }]}>Set</Caption>
                <Caption secondary style={styles.setHeaderLabel}>kg</Caption>
                <Caption secondary style={styles.setHeaderLabel}>Reps</Caption>
              </View>

              {ex.sets.map((set, sIdx) => (
                <View key={sIdx} style={styles.setRow}>
                  <View style={styles.setNumber}>
                    <Body style={{ color: COLORS.gray400, fontWeight: '700' }}>{sIdx + 1}</Body>
                  </View>
                  <TextInput
                    style={[styles.setInput, { backgroundColor: COLORS.gray100, color: COLORS.text }]}
                    keyboardType="numeric"
                    value={set.weight.toString()}
                    onChangeText={(v) => updateSet(ex.id, sIdx, 'weight', v)}
                    placeholder="0"
                  />
                  <TextInput
                    style={[styles.setInput, { backgroundColor: COLORS.gray100, color: COLORS.text }]}
                    keyboardType="numeric"
                    value={set.reps.toString()}
                    onChangeText={(v) => updateSet(ex.id, sIdx, 'reps', v)}
                    placeholder="0"
                  />
                </View>
              ))}

              <TouchableOpacity 
                style={[styles.addSetButton, { backgroundColor: COLORS.gray100 }]} 
                onPress={() => addSet(ex.id)}
              >
                <Plus size={16} color={COLORS.text} />
                <Body style={{ marginLeft: 6, fontWeight: '600' }}>Add Set</Body>
              </TouchableOpacity>
            </Card>
          ))}

          <TouchableOpacity 
            style={[styles.addExerciseButton, { borderColor: COLORS.border }]} 
            onPress={() => setShowPicker(true)}
          >
            <Plus size={20} color={COLORS.primary} />
            <Body style={{ marginLeft: 8, fontWeight: '700' }}>Add Exercise</Body>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.surface }]}>
            <View style={styles.modalHeader}>
              <H2>Add Exercises</H2>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {selectedToBatch.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.batchDoneButton, { backgroundColor: COLORS.primary }]} 
                    onPress={addBatchExercises}
                  >
                    <Caption style={{ color: COLORS.surface, fontWeight: 'bold' }}>Add ({selectedToBatch.length})</Caption>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={[styles.searchContainer, { backgroundColor: COLORS.gray100 }]}>
              <Search size={18} color={COLORS.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: COLORS.text }]}
                placeholder="Search or add custom..."
                value={search}
                onChangeText={setSearch}
                autoFocus
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.exerciseOption, 
                    selectedToBatch.includes(item) && { backgroundColor: COLORS.primary + '10' }
                  ]}
                  onPress={() => handleToggleBatchExercise(item)}
                >
                  <Body style={[
                    selectedToBatch.includes(item) && { color: COLORS.primary, fontWeight: 'bold' }
                  ]}>{item}</Body>
                  {selectedToBatch.includes(item) && <Check size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                search.trim() ? (
                  <TouchableOpacity 
                    style={styles.exerciseOption}
                    onPress={addCustomExercise}
                  >
                    <Body>Add "{search}"</Body>
                  </TouchableOpacity>
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Caption secondary>No exercises found</Caption>
                  </View>
                )
              }
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  topSection: {
    marginBottom: 24,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  timerText: {
    fontWeight: '700',
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
  workoutNameInput: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  finishButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseCard: {
    marginBottom: 20,
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
    flex: 1,
    marginRight: 12,
  },
  iconButton: {
    padding: 4,
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  setHeaderLabel: {
    flex: 1,
    textAlign: 'center',
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
  setInput: {
    flex: 1,
    height: 40,
    marginHorizontal: 4,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  batchDoneText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyWorkoutState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  startEmptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 12,
    borderRadius: 10,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
  },
  batchDoneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
  },
});

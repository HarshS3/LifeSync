import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, StyleSheet, ScrollView, TextInput, TouchableOpacity, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, 
  FlatList, Alert, Animated, Dimensions 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { 
  Plus, Trash2, Check, Clock, Search, X, 
  ChevronRight, Timer, RotateCcw, Save, MoreHorizontal 
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, H3, Body, Caption } from '../../components/ui/Typography';

const { width } = Dimensions.get('window');
const STORAGE_KEY = '@active_workout_draft';

const COMMON_EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Dumbbell Press', 'Lateral Raise', 'Bicep Curl', 'Tricep Extension',
  'Lat Pulldown', 'Leg Press', 'Leg Extension', 'Leg Curl', 'Calf Raise',
  'Pull Up', 'Push Up', 'Dip', 'Plank', 'Lunges', 'Face Pull'
];

// ── Rest Timer Component ──────────────────────────────────────────
function RestTimer({ onReset }) {
  const { COLORS } = useTheme();
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.restTimer, { backgroundColor: COLORS.primary }]}>
      <View style={styles.restTimerContent}>
        <Timer size={16} color="#fff" />
        <Body style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>
          REST: {formatTime(seconds)}
        </Body>
      </View>
      <TouchableOpacity onPress={onReset} style={styles.restReset}>
        <RotateCcw size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function ActiveWorkoutScreen() {
  const { COLORS, BORDER_RADIUS } = useTheme();
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
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerKey, setRestTimerKey] = useState(0);

  const timerRef = useRef(null);

  // Save progress logic
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
      if (params.template) {
        try {
          const t = JSON.parse(params.template);
          if (t.name) setName(t.name);
          if (t.exercises && Array.isArray(t.exercises)) {
            const loadedEx = t.exercises.map((ex, i) => ({
              id: (Date.now() + i).toString(),
              name: ex.name || '',
              sets: (ex.sets && ex.sets.length > 0) 
                ? ex.sets.map(s => ({ weight: s.weight?.toString() || '', reps: s.reps?.toString() || '', completed: false }))
                : [{ weight: '', reps: '', completed: false }]
            }));
            setExercises(loadedEx);
          }
          setIsReady(true);
          return;
        } catch(e) { console.error(e); }
      }

      try {
        const savedDraft = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          const isRecent = (Date.now() - draft.lastSaved) < 24 * 60 * 60 * 1000;
          if (isRecent) {
            Alert.alert("Resume Workout?", `Continue your draft: ${draft.name}?`, [
              { text: "Start New", style: "destructive", onPress: async () => { await clearProgress(); setIsReady(true); } },
              { text: "Resume", onPress: () => {
                setName(draft.name);
                setExercises(draft.exercises);
                setStartTime(draft.startTime);
                setIsReady(true);
              }}
            ]);
            return;
          }
        }
      } catch (e) { console.error(e); }
      setIsReady(true);
    };

    initWorkout();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [params.template, startTime]);

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

  const addBatchExercises = () => {
    const newExs = selectedToBatch.map((name, i) => ({
      id: (Date.now() + i).toString(),
      name: name,
      sets: [{ weight: '', reps: '', completed: false }]
    }));
    setExercises([...exercises, ...newExs]);
    setSelectedToBatch([]);
    setShowPicker(false);
    setSearch('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addSet = (exId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExercises(exercises.map(ex => {
      if (ex.id === exId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { weight: lastSet.weight, reps: lastSet.reps, completed: false }]
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

  const toggleSetComplete = (exId, setIdx) => {
    const ex = exercises.find(e => e.id === exId);
    const set = ex.sets[setIdx];
    const isNowComplete = !set.completed;

    if (isNowComplete) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRestTimerKey(prev => prev + 1);
      setShowRestTimer(true);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setExercises(exercises.map(e => {
      if (e.id === exId) {
        const newSets = [...e.sets];
        newSets[setIdx] = { ...newSets[setIdx], completed: isNowComplete };
        return { ...e, sets: newSets };
      }
      return e;
    }));
  };

  const removeSet = (exId, setIdx) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exId) {
        const newSets = ex.sets.filter((_, i) => i !== setIdx);
        return { ...ex, sets: newSets.length > 0 ? newSets : [{ weight: '', reps: '', completed: false }] };
      }
      return ex;
    }));
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
            reps: parseInt(s.reps) || 0,
            completed: s.completed
          }))
        }))
      };
      await api.post('/gym/workouts', payload);
      await clearProgress();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/training');
    } catch (err) {
      Alert.alert('Error', 'Failed to save workout.');
      setIsSaving(false);
    }
  };

  return (
    <ScreenWrapper 
      title={name} 
      onBack={() => {
        if (exercises.length > 0) {
          Alert.alert("Discard Workout?", "Progress will be lost.", [
            { text: "Keep Working", style: "cancel" },
            { text: "Discard", style: "destructive", onPress: async () => { await clearProgress(); router.back(); } }
          ]);
        } else router.back();
      }}
      headerRight={
        <TouchableOpacity 
          style={[styles.finishBtn, { backgroundColor: COLORS.primary }]} 
          onPress={handleFinish}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Body style={{ color: '#fff', fontWeight: 'bold' }}>Finish</Body>}
        </TouchableOpacity>
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.topSection}>
            <View style={[styles.timerPill, { backgroundColor: COLORS.gray100 }]}>
              <Clock size={14} color={COLORS.textSecondary} />
              <Body style={styles.timerText}>{formatTime(elapsed)}</Body>
            </View>
            <TextInput
              style={[styles.workoutNameInput, { color: COLORS.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Workout Name"
            />
          </View>

          {exercises.map((ex, exIdx) => (
            <Card key={ex.id} style={styles.exCard} padding={0}>
              <View style={styles.exHeader}>
                <H3 style={{ flex: 1 }}>{exIdx + 1}. {ex.name}</H3>
                <TouchableOpacity onPress={() => setExercises(exercises.filter(e => e.id !== ex.id))}>
                  <MoreHorizontal size={20} color={COLORS.gray400} />
                </TouchableOpacity>
              </View>

              <View style={styles.setsTable}>
                <View style={styles.tableHeader}>
                  <Caption secondary style={styles.col1}>SET</Caption>
                  <Caption secondary style={styles.col2}>KG</Caption>
                  <Caption secondary style={styles.col3}>REPS</Caption>
                  <View style={styles.col4} />
                </View>

                {ex.sets.map((set, sIdx) => (
                  <View 
                    key={sIdx} 
                    style={[
                      styles.setRow, 
                      set.completed && { backgroundColor: COLORS.success + '10' }
                    ]}
                  >
                    <View style={styles.col1}>
                      <Body style={{ fontWeight: 'bold', color: COLORS.gray400 }}>{sIdx + 1}</Body>
                    </View>
                    
                    <TextInput
                      style={[styles.setInput, styles.col2, { color: COLORS.text }]}
                      keyboardType="numeric"
                      value={set.weight}
                      onChangeText={(v) => updateSet(ex.id, sIdx, 'weight', v)}
                      placeholder="0"
                    />

                    <TextInput
                      style={[styles.setInput, styles.col3, { color: COLORS.text }]}
                      keyboardType="numeric"
                      value={set.reps}
                      onChangeText={(v) => updateSet(ex.id, sIdx, 'reps', v)}
                      placeholder="0"
                    />

                    <TouchableOpacity 
                      style={[
                        styles.checkBtn, 
                        { backgroundColor: set.completed ? COLORS.success : COLORS.gray100 }
                      ]}
                      onPress={() => toggleSetComplete(ex.id, sIdx)}
                    >
                      <Check size={18} color={set.completed ? '#fff' : COLORS.gray400} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ex.id)}>
                <Plus size={16} color={COLORS.primary} />
                <Body style={{ color: COLORS.primary, fontWeight: '700', marginLeft: 6 }}>Add Set</Body>
              </TouchableOpacity>
            </Card>
          ))}

          <TouchableOpacity 
            style={[styles.addExBtn, { borderColor: COLORS.primary }]} 
            onPress={() => setShowPicker(true)}
          >
            <Plus size={20} color={COLORS.primary} />
            <Body style={{ color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 }}>Add Exercise</Body>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {showRestTimer && (
        <RestTimer key={restTimerKey} onReset={() => setShowRestTimer(false)} />
      )}

      {/* Exercise Picker Modal */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBody, { backgroundColor: COLORS.surface }]}>
            <View style={styles.modalHeader}>
              <H2>Add Exercises</H2>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: COLORS.gray100 }]}>
              <Search size={18} color={COLORS.gray400} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Search exercises..." 
                value={search} 
                onChangeText={setSearch}
                autoFocus
              />
            </View>

            <FlatList
              data={COMMON_EXERCISES.filter(e => e.toLowerCase().includes(search.toLowerCase()))}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.pickerItem, selectedToBatch.includes(item) && { backgroundColor: COLORS.primary + '10' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedToBatch(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
                  }}
                >
                  <Body style={selectedToBatch.includes(item) && { color: COLORS.primary, fontWeight: 'bold' }}>{item}</Body>
                  {selectedToBatch.includes(item) && <Check size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
              ListFooterComponent={search.trim() && (
                <TouchableOpacity 
                  style={styles.pickerItem} 
                  onPress={() => {
                    handleToggleBatchExercise(search.trim());
                    setSearch('');
                  }}
                >
                  <Body>Add custom: "{search}"</Body>
                </TouchableOpacity>
              )}
            />

            {selectedToBatch.length > 0 && (
              <TouchableOpacity style={[styles.modalDoneBtn, { backgroundColor: COLORS.primary }]} onPress={addBatchExercises}>
                <Body style={{ color: '#fff', fontWeight: 'bold' }}>Add {selectedToBatch.length} Exercises</Body>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 100 },
  topSection: { marginBottom: 20 },
  timerPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  timerText: { fontWeight: 'bold', marginLeft: 4, fontSize: 13 },
  workoutNameInput: { fontSize: 24, fontWeight: 'bold' },
  finishBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  
  exCard: { marginBottom: 16, overflow: 'hidden' },
  exHeader: { flexDirection: 'row', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  
  setsTable: { width: '100%' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.02)' },
  col1: { width: 40, textAlign: 'center' },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'center' },
  col4: { width: 50 },

  setRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  setInput: { height: 36, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  checkBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  
  addSetBtn: { padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  addExBtn: { borderStyle: 'dashed', borderWidth: 2, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },

  restTimer: { position: 'absolute', bottom: 30, alignSelf: 'center', width: '80%', height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  restTimerContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  restReset: { padding: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBody: { height: '80%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12, marginBottom: 16, height: 44 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  modalDoneBtn: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 }
});

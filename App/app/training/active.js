import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  View, StyleSheet, ScrollView, TextInput, TouchableOpacity, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, 
  FlatList, Alert, Animated, Dimensions 
} from 'react-native';
import { 
  GestureHandlerRootView, 
  Swipeable 
} from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { 
  Plus, Trash2, Check, Clock, Search, X, 
  ChevronRight, Timer, RotateCcw, Save, MoreHorizontal 
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';
import { EXERCISE_LIBRARY } from '../../constants/ExerciseLibrary';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, H3, Body, Caption } from '../../components/ui/Typography';

const { width } = Dimensions.get('window');
const STORAGE_KEY = '@active_workout_draft';

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

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
        <Timer size={16} color={COLORS.primaryContrast} />
        <Body style={{ color: COLORS.primaryContrast, fontWeight: 'bold', marginLeft: 8 }}>
          REST: {formatTime(seconds)}
        </Body>
      </View>
      <TouchableOpacity onPress={onReset} style={styles.restReset}>
        <RotateCcw size={16} color={COLORS.primaryContrast} />
      </TouchableOpacity>
    </View>
  );
}

// ── Swipeable Row Component ────────────────────────────────────────
function SwipeableRow({ children, onDelete }) {
  const { COLORS } = useTheme();
  const renderRightActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
    });
    return (
      <TouchableOpacity 
        style={[styles.swipeDelete, { backgroundColor: COLORS.error }]} 
        onPress={onDelete}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ translateX: trans }] }}>
          <Trash2 size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable 
      renderRightActions={renderRightActions} 
      friction={2} 
      rightThreshold={40}
    >
      {children}
    </Swipeable>
  );
}

// ── Set Input Component (Fixes RN view recycling bug) ─────────────
const SetInput = React.memo(({ value, onChange, placeholder, style, textColor, placeholderColor }) => {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <TextInput
      style={style}
      keyboardType="numeric"
      value={text}
      onChangeText={setText}
      onEndEditing={() => onChange(text)}
      placeholder={placeholder}
      placeholderTextColor={placeholderColor}
    />
  );
});

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
  const [preSessionTargets, setPreSessionTargets] = useState({}); // exerciseName -> target
  const [startRecommendation, setStartRecommendation] = useState(null); // { neglectedMuscles, daysSinceLastWorkout }
  
  const [showPicker, setShowPicker] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customExerciseData, setCustomExerciseData] = useState({
    name: '',
    primaryMuscle: 'chest',
    type: 'compound',
    secondaryMuscles: []
  });
  const [search, setSearch] = useState('');
  const [selectedToBatch, setSelectedToBatch] = useState([]);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all');
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerKey, setRestTimerKey] = useState(0);
  const [allNames, setAllNames] = useState([]);
  const [prFlash, setPrFlash] = useState(null); // { exercise, newBest } shown briefly

  const timerRef = useRef(null);

  const filteredExercises = React.useMemo(() => {
    // 1. Combine library and history unique names
    const libraryNames = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises);
    const allKnown = Array.from(new Set([...libraryNames, ...allNames])).sort();

    // 2. Filter by search
    if (search.trim()) {
      return allKnown.filter(ex => ex.toLowerCase().includes(search.toLowerCase()));
    }

    // 3. Filter by muscle group
    if (selectedMuscleGroup === 'all') return allKnown;
    const groupExs = EXERCISE_LIBRARY[selectedMuscleGroup]?.exercises || [];
    return allKnown.filter(ex => groupExs.includes(ex));
  }, [allNames, search, selectedMuscleGroup]);

  const initRunRef = useRef(false);

  useEffect(() => {
    fetchExerciseNames();
  }, []);

  const fetchExerciseNames = async () => {
    try {
      const res = await api.get('/gym/exercise-names');
      const historyNames = Array.isArray(res.data) ? res.data : [];
      const libraryNames = Object.values(EXERCISE_LIBRARY).flatMap(g => g.exercises);
      const merged = Array.from(new Set([...libraryNames, ...historyNames])).sort();
      setAllNames(merged);
    } catch (err) {
      console.error('Failed to fetch names', err);
    }
  };

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
      if (initRunRef.current) return;
      initRunRef.current = true;

      if (params.template) {
        try {
          const t = JSON.parse(params.template);
          if (t.name) setName(t.name);
          if (t.exercises && Array.isArray(t.exercises)) {
            const loadedEx = await Promise.all(t.exercises.map(async (ex, i) => {
              let historySets = [];
              let prBest = 0;
              try {
                const res = await api.get(`/gym/exercise-history/${encodeURIComponent(ex.name)}`);
                const history = res.data?.history;
                if (history && history.length > 0) {
                  historySets = history[0].sets || [];
                }
                if (res.data?.stats?.maxWeight) prBest = res.data.stats.maxWeight;
              } catch (e) { console.error(e); }

              const cleanValue = (v) => (v === undefined || v === null || v === '') ? '' : v.toString();

              return {
                id: generateId(),
                name: ex.name || '',
                historySets,
                prBest,
                sets: (ex.sets && ex.sets.length > 0)
                  ? ex.sets.map((s, si) => ({
                      id: generateId(),
                      weight: cleanValue(s.weight),
                      reps: cleanValue(s.reps),
                      completed: false
                    }))
                  : [{ id: generateId(), weight: '', reps: '', completed: false }]
              };
            }));
            setExercises(loadedEx);

            // Fetch pre-session targets for all exercises in parallel
            const names = t.exercises.map(e => e.name).filter(Boolean);
            if (names.length > 0) {
              api.post('/gym/pre-session-targets', { exercises: names })
                .then(r => {
                  const map = {};
                  (r.data?.targets || []).forEach(t => { map[t.exercise] = t; });
                  setPreSessionTargets(map);
                })
                .catch(() => {});
            }
          }
          setIsReady(true);
          return;
        } catch(e) { console.error(e); }
      }

      // Fetch workout start recommendation (neglected muscles, days since last workout)
      api.get('/gym/summary').then(r => {
        const data = r.data || {};
        const neglected = data.stats?.neglectedMuscles || [];
        const lastWorkout = data.recentWorkouts?.[0];
        const daysSince = lastWorkout
          ? Math.floor((Date.now() - new Date(lastWorkout.date).getTime()) / 86400000)
          : null;
        if (neglected.length > 0 || daysSince !== null) {
          setStartRecommendation({ neglectedMuscles: neglected, daysSinceLastWorkout: daysSince, lastWorkoutName: lastWorkout?.name });
        }
      }).catch(() => {});

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
  }, [params.template]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [startTime]);

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

  const addBatchExercises = async () => {
    setIsSaving(true); 
    try {
      const newExs = await Promise.all(selectedToBatch.map(async (name, i) => {
        let historySets = [];
        let prBest = 0; // all-time best weight for this exercise
        try {
          const res = await api.get(`/gym/exercise-history/${encodeURIComponent(name)}`);
          const history = res.data?.history;
          if (history && history.length > 0) {
            historySets = history[0].sets || [];
          }
          if (res.data?.stats?.maxWeight) {
            prBest = res.data.stats.maxWeight;
          }
        } catch (e) {
          console.error(`Failed to fetch history for ${name}`, e);
        }

        return {
          id: generateId(),
          name: name,
          historySets,
          prBest,
          sets: [{ id: generateId(), weight: '', reps: '', completed: false }]
        };
      }));
      setExercises([...exercises, ...newExs]);
    } catch (err) {
      console.error('Failed to add batch exercises', err);
    } finally {
      setIsSaving(false);
      setSelectedToBatch([]);
      setShowPicker(false);
      setSearch('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const addSet = (exId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: [...ex.sets, { id: generateId(), weight: '', reps: '', completed: false }]
        };
      }
      return ex;
    }));
  };

  const updateSet = (exId, setId, field, value) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        const lastUsedUpdate = field === 'weight'
          ? { lastUsedWeight: value }
          : field === 'reps'
            ? { lastUsedReps: value }
            : {};
        return {
          ...ex,
          ...lastUsedUpdate,
          sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
        };
      }
      return ex;
    }));
  };

  const getSetPlaceholder = (ex, sIdx, field) => {
    const cleanValue = (v) => (v === undefined || v === null || v === '') ? '' : v.toString();
    
    // 1. Priority: Historical match at same index
    const histMatch = ex.historySets?.[sIdx]?.[field];
    if (cleanValue(histMatch) !== '') return cleanValue(histMatch);

    // 2. Priority: Last entered value in CURRENT session
    const lastSessionValue = ex.sets.slice(0, sIdx).reverse().find(ls => cleanValue(ls[field]) !== '')?.[field];
    if (cleanValue(lastSessionValue) !== '') return cleanValue(lastSessionValue);

    // 3. Priority: Last used value anywhere in this session
    const storedLastUsed = ex[field === 'weight' ? 'lastUsedWeight' : 'lastUsedReps'];
    if (cleanValue(storedLastUsed) !== '') return cleanValue(storedLastUsed);

    // 4. Priority: Very last known performance from history
    const finalHist = ex.historySets?.[ex.historySets.length - 1]?.[field];
    if (cleanValue(finalHist) !== '') return cleanValue(finalHist);

    // 5. Absolute Fallback
    return "0";
  };

  const toggleSetComplete = (exId, setId) => {
    setExercises(prevExercises => {
      const targetEx = prevExercises.find(e => e.id === exId);
      if (targetEx) {
        const targetSet = targetEx.sets.find(s => s.id === setId);
        if (targetSet && !targetSet.completed) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setRestTimerKey(prev => prev + 1);
          setShowRestTimer(true);

          // Live PR detection: compare this set's weight against the all-time best
          const setWeight = parseFloat(targetSet.weight) || 0;
          const historicalBest = targetEx.prBest || 0;
          // Also compare vs best weight logged so far in this session for this exercise
          const sessionBest = Math.max(0, ...targetEx.sets
            .filter(s => s.completed && s.id !== setId)
            .map(s => parseFloat(s.weight) || 0));
          const currentBest = Math.max(historicalBest, sessionBest);
          if (setWeight > 0 && setWeight > currentBest) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPrFlash({ exercise: targetEx.name, newBest: setWeight, previous: currentBest });
            setTimeout(() => setPrFlash(null), 3000);
          }
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      return prevExercises.map(ex => {
        if (ex.id === exId) {
          let lastUsedW = ex.lastUsedWeight;
          let lastUsedR = ex.lastUsedReps;

          const newSets = ex.sets.map((s, i) => {
            if (s.id === setId) {
              const isNowComplete = !s.completed;
              let newWeight = s.weight;
              let newReps = s.reps;

              if (isNowComplete) {
                if (!newWeight || newWeight.trim() === "") {
                  newWeight = getSetPlaceholder(ex, i, 'weight');
                }
                if (!newReps || newReps.trim() === "") {
                  newReps = getSetPlaceholder(ex, i, 'reps');
                }
                lastUsedW = newWeight;
                lastUsedR = newReps;
              }
              return { ...s, weight: newWeight, reps: newReps, completed: isNowComplete };
            }
            return s;
          });
          return { ...ex, sets: newSets, lastUsedWeight: lastUsedW, lastUsedReps: lastUsedR };
        }
        return ex;
      });
    });
  };

  const removeSet = (exId, setId) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        const newSets = ex.sets.filter(s => s.id !== setId);
        return { ...ex, sets: newSets.length > 0 ? newSets : [{ id: generateId(), weight: '', reps: '', completed: false }] };
      }
      return ex;
    }));
  };

  const handleCreateCustom = () => {
    if (!customExerciseData.name.trim()) return;
    const newEx = {
      id: generateId(),
      name: customExerciseData.name.trim(),
      muscleGroup: customExerciseData.primaryMuscle,
      metadata: {
        type: customExerciseData.type,
        primary: customExerciseData.primaryMuscle,
        secondary: customExerciseData.secondaryMuscles
      },
      sets: [{ id: generateId(), weight: '', reps: '', completed: false }]
    };
    setExercises(prev => [...prev, newEx]);
    setShowCustomForm(false);
    setShowPicker(false);
    setSearch('');
    setCustomExerciseData({
      name: '',
      primaryMuscle: 'chest',
      type: 'compound',
      secondaryMuscles: []
    });
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
        exercises: exercises.map(ex => {
          // Use attached muscleGroup/metadata if it exists (custom exercises)
          // otherwise fallback to library lookup
          let muscleGroup = ex.muscleGroup;
          if (!muscleGroup || muscleGroup === 'other') {
            for (const [group, data] of Object.entries(EXERCISE_LIBRARY)) {
              if (data.exercises.includes(ex.name)) {
                muscleGroup = group;
                break;
              }
            }
          }

          return {
            name: ex.name,
            muscleGroup: muscleGroup || 'other',
            metadata: ex.metadata,
            sets: ex.sets.map(s => ({
              weight: parseFloat(s.weight) || 0,
              reps: parseInt(s.reps) || 0,
              completed: s.completed,
              ...(parseFloat(s.rpe) ? { rpe: parseFloat(s.rpe) } : {})
            }))
          };
        })
      };
      const { data } = await api.post('/gym/workouts', payload);
      await clearProgress();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const prs = data?.prsHit || [];
      const progressions = data?.progressionSuggestions || [];
      const deloadStamped = data?.deloadStamped || false;

      // Build post-workout alert: PRs first, then progression nudges, then deload note
      const lines = [];
      if (prs.length > 0) {
        lines.push('🏆 Personal Records:');
        prs.forEach(pr => lines.push(
          pr.type === 'weight'
            ? `  ${pr.exercise}: ${pr.newBest}kg (was ${pr.previous}kg)`
            : `  ${pr.exercise}: est. 1RM ${pr.newBest}kg`
        ));
      }
      if (progressions.length > 0) {
        if (lines.length > 0) lines.push('');
        lines.push('📈 Ready to progress:');
        progressions.forEach(p => lines.push(`  ${p.exercise}: try ${p.suggestedWeight}kg next session`));
      }
      if (deloadStamped) {
        if (lines.length > 0) lines.push('');
        lines.push('✅ Deload logged — clock reset. Good recovery work.');
      }

      if (lines.length > 0) {
        Alert.alert('Workout Complete', lines.join('\n'), [
          { text: 'Got it!', onPress: () => router.replace('/(tabs)/training') }
        ]);
      } else {
        router.replace('/(tabs)/training');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save workout.');
      setIsSaving(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
          {isSaving ? <ActivityIndicator size="small" color={COLORS.primaryContrast} /> : <Body style={{ color: COLORS.primaryContrast, fontWeight: 'bold' }}>Finish</Body>}
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
              placeholderTextColor={COLORS.gray400}
            />
          </View>

          {/* Workout start recommendation — only shown when no exercises yet */}
          {exercises.length === 0 && startRecommendation && (
            <View style={[styles.startRec, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
              {startRecommendation.daysSinceLastWorkout !== null && (
                <Body style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 }}>
                  {startRecommendation.daysSinceLastWorkout === 0
                    ? `Last trained today (${startRecommendation.lastWorkoutName || 'workout'})`
                    : startRecommendation.daysSinceLastWorkout === 1
                      ? `Last trained yesterday`
                      : `Last trained ${startRecommendation.daysSinceLastWorkout} days ago`}
                </Body>
              )}
              {startRecommendation.neglectedMuscles.length > 0 && (
                <>
                  <Body style={{ fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>
                    💡 Consider training today:
                  </Body>
                  <Body style={{ fontSize: 12, color: COLORS.primary }}>
                    {startRecommendation.neglectedMuscles.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(' · ')}
                  </Body>
                  <Body style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>
                    Not trained in 5+ days and below weekly volume target
                  </Body>
                </>
              )}
            </View>
          )}

          {exercises.map((ex, exIdx) => (
            <Card key={ex.id} style={styles.exCard} padding={0}>
              <View style={styles.exHeader}>
                <H3 style={{ flex: 1 }}>{exIdx + 1}. {ex.name}</H3>
                <TouchableOpacity onPress={() => setExercises(exercises.filter(e => e.id !== ex.id))}>
                  <MoreHorizontal size={20} color={COLORS.gray400} />
                </TouchableOpacity>
              </View>

              {/* Pre-session target banner */}
              {preSessionTargets[ex.name] && preSessionTargets[ex.name].status !== 'new' && preSessionTargets[ex.name].targetSets && (
                <View style={[styles.preSessionBanner, {
                  backgroundColor: preSessionTargets[ex.name].status === 'progress' ? COLORS.success + '12' : COLORS.gray100,
                  borderLeftColor: preSessionTargets[ex.name].status === 'progress' ? COLORS.success : COLORS.primary,
                }]}>
                  <Body style={{ fontSize: 11, fontWeight: '700', color: preSessionTargets[ex.name].status === 'progress' ? COLORS.success : COLORS.primary }}>
                    {preSessionTargets[ex.name].status === 'progress' ? '📈 ' : '🎯 '}
                    Target: {preSessionTargets[ex.name].targetWeight}kg
                    {preSessionTargets[ex.name].targetSets?.[0]?.reps ? ` × ${preSessionTargets[ex.name].targetSets[0].reps} reps` : ''}
                  </Body>
                  <Body style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 1 }}>
                    {preSessionTargets[ex.name].note}
                  </Body>
                </View>
              )}

              <View style={styles.setsTable}>
                <View style={styles.tableHeader}>
                  <Caption secondary style={styles.col1}>SET</Caption>
                  <Caption secondary style={styles.col2}>KG</Caption>
                  <Caption secondary style={styles.col3}>REPS</Caption>
                  <Caption secondary style={styles.col_rpe}>RPE</Caption>
                  <View style={styles.col4} />
                </View>

                {ex.sets.map((set, sIdx) => {
                  const weightPlaceholder = getSetPlaceholder(ex, sIdx, 'weight');
                  const repsPlaceholder = getSetPlaceholder(ex, sIdx, 'reps');

                  return (
                    <SwipeableRow key={`${set.id}-${sIdx}`} onDelete={() => removeSet(ex.id, set.id)}>
                      <View 
                        style={[
                          styles.setRow, 
                          set.completed && { backgroundColor: COLORS.success + '10' }
                        ]}
                      >
                        <View style={styles.col1}>
                          <Body style={{ fontWeight: 'bold', color: COLORS.gray400 }}>{sIdx + 1}</Body>
                        </View>
                        
                        <SetInput
                          key={`kg-${set.id}-${weightPlaceholder}`}
                          value={set.weight || ''}
                          onChange={(v) => updateSet(ex.id, set.id, 'weight', v)}
                          placeholder={weightPlaceholder}
                          style={[styles.setInput, styles.col2, { color: COLORS.text }]}
                          textColor={COLORS.text}
                          placeholderColor={COLORS.gray400}
                        />

                        <SetInput
                          key={`reps-${set.id}-${repsPlaceholder}`}
                          value={set.reps || ''}
                          onChange={(v) => updateSet(ex.id, set.id, 'reps', v)}
                          placeholder={repsPlaceholder}
                          style={[styles.setInput, styles.col3, { color: COLORS.text }]}
                          textColor={COLORS.text}
                          placeholderColor={COLORS.gray400}
                        />

                        <SetInput
                          key={`rpe-${set.id}`}
                          value={set.rpe || ''}
                          onChange={(v) => updateSet(ex.id, set.id, 'rpe', v)}
                          placeholder="RPE"
                          style={[styles.setInput, styles.col_rpe, { color: COLORS.text }]}
                          textColor={COLORS.text}
                          placeholderColor={COLORS.gray400}
                        />

                      <TouchableOpacity 
                        style={[
                          styles.checkBtn, 
                          { backgroundColor: set.completed ? COLORS.success : COLORS.gray100 }
                        ]}
                        onPress={() => toggleSetComplete(ex.id, set.id)}
                      >
                        <Check size={18} color={set.completed ? '#fff' : COLORS.gray400} />
                      </TouchableOpacity>
                    </View>
                  </SwipeableRow>
                  );
                })}
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

      {prFlash && (
        <View style={[styles.prBanner, { backgroundColor: '#f59e0b' }]}>
          <Body style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>
            PR — {prFlash.exercise}: {prFlash.newBest}kg{prFlash.previous > 0 ? ` (was ${prFlash.previous}kg)` : ' (first log)'}
          </Body>
        </View>
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
                style={[styles.searchInput, { color: COLORS.text }]} 
                placeholder="Search exercises..." 
                placeholderTextColor={COLORS.gray400}
                value={search} 
                onChangeText={setSearch}
                autoFocus
              />
            </View>

            {!search.trim() && (
              <View style={{ marginBottom: 12 }}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
                >
                  <TouchableOpacity 
                    style={[
                      styles.muscleTab, 
                      { backgroundColor: COLORS.gray100 },
                      selectedMuscleGroup === 'all' && { backgroundColor: COLORS.primary }
                    ]}
                    onPress={() => setSelectedMuscleGroup('all')}
                  >
                    <Body style={[
                      { fontSize: 13 },
                      selectedMuscleGroup === 'all' && { color: COLORS.surface, fontWeight: '700' }
                    ]}>All</Body>
                  </TouchableOpacity>
                  {Object.entries(EXERCISE_LIBRARY).map(([key, group]) => (
                    <TouchableOpacity 
                      key={key}
                      style={[
                        styles.muscleTab, 
                        { backgroundColor: COLORS.gray100 },
                        selectedMuscleGroup === key && { backgroundColor: COLORS.primary }
                      ]}
                      onPress={() => setSelectedMuscleGroup(key)}
                    >
                      <Body style={[
                        { fontSize: 13 },
                        selectedMuscleGroup === key && { color: COLORS.surface, fontWeight: '700' }
                      ]}>{group.label}</Body>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <FlatList
              data={filteredExercises}
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
              ListFooterComponent={search.trim() && !allNames.some(n => n.toLowerCase() === search.toLowerCase().trim()) && (
                <TouchableOpacity 
                  style={styles.pickerItem} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCustomExerciseData(prev => ({ ...prev, name: search.trim() }));
                    setShowCustomForm(true);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Body>Add custom: "{search}"</Body>
                    <Caption style={{ color: COLORS.primary }}>Tap to specify muscle groups & type</Caption>
                  </View>
                  <Plus size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            />

            {selectedToBatch.length > 0 && (
              <TouchableOpacity 
                style={[styles.modalDoneBtn, { backgroundColor: COLORS.primary }]} 
                onPress={addBatchExercises}
                disabled={isSaving}
              >
                {isSaving 
                  ? <ActivityIndicator color={COLORS.primaryContrast} />
                  : <Body style={{ color: COLORS.primaryContrast, fontWeight: 'bold' }}>Add {selectedToBatch.length} Exercises</Body>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      {/* Custom Exercise Detail Form Modal */}
      <Modal visible={showCustomForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBody, { backgroundColor: COLORS.surface, height: '70%' }]}>
            <View style={styles.modalHeader}>
              <H2>Exercise Details</H2>
              <TouchableOpacity onPress={() => setShowCustomForm(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 20 }}>
                <Caption style={{ marginBottom: 8, fontWeight: '700', color: COLORS.textSecondary }}>NAME</Caption>
                <TextInput 
                  style={[styles.modalInput, { color: COLORS.text, backgroundColor: COLORS.gray100 }]}
                  value={customExerciseData.name}
                  onChangeText={(v) => setCustomExerciseData(prev => ({ ...prev, name: v }))}
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <Caption style={{ marginBottom: 8, fontWeight: '700', color: COLORS.textSecondary }}>EXERCISE TYPE</Caption>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['compound', 'isolation'].map(t => (
                    <TouchableOpacity 
                      key={t}
                      style={[
                        styles.formTab, 
                        { backgroundColor: COLORS.gray100 },
                        customExerciseData.type === t && { backgroundColor: COLORS.primary }
                      ]}
                      onPress={() => setCustomExerciseData(prev => ({ ...prev, type: t }))}
                    >
                      <Body style={[
                        { fontSize: 13, textTransform: 'capitalize' },
                        customExerciseData.type === t && { color: COLORS.surface, fontWeight: '700' }
                      ]}>{t}</Body>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Caption style={{ marginBottom: 8, fontWeight: '700', color: COLORS.textSecondary }}>PRIMARY MUSCLE</Caption>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {Object.keys(EXERCISE_LIBRARY).map(m => (
                    <TouchableOpacity 
                      key={m}
                      style={[
                        styles.formTab, 
                        { backgroundColor: COLORS.gray100 },
                        customExerciseData.primaryMuscle === m && { backgroundColor: COLORS.primary }
                      ]}
                      onPress={() => setCustomExerciseData(prev => ({ ...prev, primaryMuscle: m }))}
                    >
                      <Body style={[
                        { fontSize: 12, textTransform: 'capitalize' },
                        customExerciseData.primaryMuscle === m && { color: COLORS.surface, fontWeight: '700' }
                      ]}>{m}</Body>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: 40 }}>
                <Caption style={{ marginBottom: 8, fontWeight: '700', color: COLORS.textSecondary }}>SECONDARY MUSCLES (OPTIONAL)</Caption>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {Object.keys(EXERCISE_LIBRARY).map(m => (
                    <TouchableOpacity 
                      key={m}
                      style={[
                        styles.formTab, 
                        { backgroundColor: COLORS.gray100 },
                        customExerciseData.secondaryMuscles.includes(m) && { backgroundColor: COLORS.primary + '40' },
                        customExerciseData.primaryMuscle === m && { opacity: 0.3 }
                      ]}
                      disabled={customExerciseData.primaryMuscle === m}
                      onPress={() => {
                        setCustomExerciseData(prev => {
                          const exists = prev.secondaryMuscles.includes(m);
                          if (exists) return { ...prev, secondaryMuscles: prev.secondaryMuscles.filter(x => x !== m) };
                          return { ...prev, secondaryMuscles: [...prev.secondaryMuscles, m] };
                        });
                      }}
                    >
                      <Body style={[
                        { fontSize: 12, textTransform: 'capitalize' },
                        customExerciseData.secondaryMuscles.includes(m) && { fontWeight: '700' }
                      ]}>{m}</Body>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.modalDoneBtn, { backgroundColor: COLORS.primary }]} 
              onPress={handleCreateCustom}
            >
              <Body style={{ color: COLORS.primaryContrast, fontWeight: 'bold' }}>Create & Add Exercise</Body>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
    </GestureHandlerRootView>
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
  preSessionBanner: { paddingHorizontal: 14, paddingVertical: 8, borderLeftWidth: 3 },
  startRec: { marginHorizontal: 0, marginBottom: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  
  setsTable: { width: '100%' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.02)' },
  col1: { width: 40, textAlign: 'center' },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'center' },
  col4: { width: 50 },
  col_rpe: { width: 40, textAlign: 'center' },

  setRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  setInput: { height: 44, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  swipeDelete: { width: 80, justifyContent: 'center', alignItems: 'center', height: '100%' },
  checkBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  
  addSetBtn: { padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  addExBtn: { borderStyle: 'dashed', borderWidth: 2, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },

  restTimer: { position: 'absolute', bottom: 30, alignSelf: 'center', width: '80%', height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  prBanner: { position: 'absolute', top: 12, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, elevation: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8 },
  restTimerContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  restReset: { padding: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBody: { height: '80%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12, marginBottom: 16, height: 44 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  muscleTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDoneBtn: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  modalInput: { padding: 12, borderRadius: 12, fontSize: 16, fontWeight: '600' },
  formTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

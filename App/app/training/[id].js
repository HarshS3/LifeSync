import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Dumbbell, Clock, Calendar, BarChart, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, H3, Body, Caption } from '../../components/ui/Typography';

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { COLORS, SHADOWS } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState(null);

  const fetchWorkout = async () => {
    try {
      const res = await api.get(`/gym/workouts/${id}`);
      setWorkout(res.data);
    } catch (err) {
      console.error('Failed to fetch workout', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkout();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!workout) {
    return (
      <ScreenWrapper title="Error">
        <View style={styles.centered}>
          <Body>Workout not found</Body>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Body style={{ color: COLORS.primary }}>Go back</Body>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const totalVolume = (workout.exercises || []).reduce((acc, ex) => {
    return acc + (ex.sets || []).reduce((acc2, set) => acc2 + (set.weight || 0) * (set.reps || 0), 0);
  }, 0);

  // Calculate unique muscles trained in this workout
  const muscleFocus = Array.from(new Set((workout.exercises || []).map(ex => ex.muscleGroup).filter(Boolean)));

  const handleDelete = async () => {
    Alert.alert(
      "Delete Workout",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await api.delete(`/gym/workouts/${id}`);
              router.back();
            } catch (e) {
              Alert.alert("Error", "Failed to delete workout");
            }
          } 
        }
      ]
    );
  };

  return (
    <ScreenWrapper 
      title="Workout Details"
      headerRight={
        <TouchableOpacity onPress={handleDelete}>
          <Caption style={{ color: COLORS.error, fontWeight: '700' }}>DELETE</Caption>
        </TouchableOpacity>
      }
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={[styles.workoutHeader, { borderColor: COLORS.border }]} padding={20}>
          <H2 style={{ marginBottom: 12 }}>{workout.name || 'Untitled Workout'}</H2>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={COLORS.textSecondary} />
              <Caption style={{ fontWeight: '600', marginLeft: 4 }}>{new Date(workout.date).toLocaleDateString('en-IN')}</Caption>
            </View>
            <View style={styles.metaItem}>
              <Clock size={14} color={COLORS.textSecondary} />
              <Caption style={{ fontWeight: '600', marginLeft: 4 }}>{workout.duration || 0} min</Caption>
            </View>
            <View style={styles.metaItem}>
              <BarChart size={14} color={COLORS.textSecondary} />
              <Caption style={{ fontWeight: '600', marginLeft: 4 }}>{Math.round(totalVolume)} kg total</Caption>
            </View>
          </View>

          {muscleFocus.length > 0 && (
            <View style={styles.muscleRow}>
              {muscleFocus.map(m => (
                <View key={m} style={[styles.muscleTag, { backgroundColor: COLORS.primary + '10' }]}>
                  <Caption style={{ color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase', fontSize: 10 }}>{m}</Caption>
                </View>
              ))}
            </View>
          )}
        </Card>

        {workout.notes && (
          <Card style={styles.notesCard} padding={16}>
            <Caption secondary style={{ marginBottom: 6, fontWeight: '800' }}>SESSION NOTES</Caption>
            <Body>{workout.notes}</Body>
          </Card>
        )}

        <Caption secondary style={styles.sectionLabel}>EXERCISES</Caption>

        {workout.exercises.map((ex, exIdx) => (
          <Card key={exIdx} style={styles.exerciseCard} padding={16}>
            <TouchableOpacity 
              style={styles.exTitleRow}
              onPress={() => router.push(`/training/exercise/${encodeURIComponent(ex.name)}`)}
            >
              <View style={{ flex: 1 }}>
                <H3>{ex.name}</H3>
                {ex.muscleGroup && <Caption secondary style={{ textTransform: 'capitalize' }}>{ex.muscleGroup}</Caption>}
              </View>
              <ChevronRight size={18} color={COLORS.gray400} />
            </TouchableOpacity>

              <View style={[styles.tableHeader, { borderBottomColor: COLORS.gray100 }]}>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Caption secondary style={{ fontWeight: '700' }}>SET</Caption>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Caption secondary style={{ fontWeight: '700' }}>DETAILS</Caption>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Caption secondary style={{ fontWeight: '700' }}>1RM / STAT</Caption>
                </View>
              </View>

              {ex.sets.map((set, setIdx) => {
                const isCardio = !set.weight && (set.distance || set.duration);
                const oneRm = Math.round((set.weight || 0) * (1 + (set.reps || 0) / 30));
                
                return (
                  <View key={setIdx} style={[styles.setRow, { borderBottomColor: COLORS.gray100 + '50' }]}>
                    <View style={{ width: 40, alignItems: 'center' }}>
                      <Caption style={{ fontWeight: '600' }}>{setIdx + 1}</Caption>
                    </View>
                    
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      {isCardio ? (
                        <Body style={{ fontWeight: '600' }}>
                          {set.distance ? `${set.distance}km ` : ''}
                          {set.duration ? `${Math.floor(set.duration/60)}m ${set.duration%60}s` : ''}
                        </Body>
                      ) : (
                        <Body style={{ fontWeight: '600' }}>{set.weight || 0}kg x {set.reps || 0}</Body>
                      )}
                    </View>

                    <View style={{ flex: 1, alignItems: 'center' }}>
                      {isCardio ? (
                        <Caption secondary>{set.pace || (set.speed ? `${set.speed}km/h` : '--')}</Caption>
                      ) : (
                        <Body style={{ fontWeight: '600', color: COLORS.success }}>{oneRm > 0 ? `${oneRm}kg` : '--'}</Body>
                      )}
                    </View>
                  </View>
                );
              })}
          </Card>
        ))}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  workoutHeader: {
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muscleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16,
  },
  muscleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  notesCard: {
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b', // Warning/Gold color for notes
  },
  sectionLabel: {
    fontWeight: '800',
    marginBottom: 12,
    marginLeft: 4,
  },
  exerciseCard: {
    marginBottom: 16,
  },
  exTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  setsTable: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
  },
  columnHeader: {
    flex: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  setNum: {
    fontWeight: '600',
    textAlign: 'center',
  },
  setValue: {
    flex: 1,
    fontWeight: '600',
    textAlign: 'center',
  },
});

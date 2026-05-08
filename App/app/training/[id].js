import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Dumbbell, Clock, Calendar, BarChart } from 'lucide-react-native';

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.centered}>
        <Text>Workout not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#3b82f6', marginTop: 16 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalVolume = (workout.exercises || []).reduce((acc, ex) => {
    return acc + (ex.sets || []).reduce((acc2, set) => acc2 + (set.weight || 0) * (set.reps || 0), 0);
  }, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.workoutHeader}>
          <Text style={styles.workoutName}>{workout.name || 'Untitled Workout'}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar size={14} color="#666" />
              <Text style={styles.metaText}>{new Date(workout.date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={14} color="#666" />
              <Text style={styles.metaText}>{workout.duration || 0} min</Text>
            </View>
            <View style={styles.metaItem}>
              <BarChart size={14} color="#666" />
              <Text style={styles.metaText}>{Math.round(totalVolume)} kg total</Text>
            </View>
          </View>
        </View>

        {workout.exercises.map((ex, exIdx) => (
          <View key={exIdx} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{ex.name}</Text>
            <View style={styles.setsTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.columnHeader, { width: 40 }]}>Set</Text>
                <Text style={styles.columnHeader}>Weight (kg)</Text>
                <Text style={styles.columnHeader}>Reps</Text>
                <Text style={styles.columnHeader}>1RM Est</Text>
              </View>
              {ex.sets.map((set, setIdx) => {
                const oneRm = Math.round((set.weight || 0) * (1 + (set.reps || 0) / 30));
                return (
                  <View key={setIdx} style={styles.setRow}>
                    <Text style={[styles.setNum, { width: 40 }]}>{setIdx + 1}</Text>
                    <Text style={styles.setValue}>{set.weight || '--'}</Text>
                    <Text style={styles.setValue}>{set.reps || '--'}</Text>
                    <Text style={styles.setValue}>{oneRm || '--'}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  workoutHeader: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  workoutName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
  },
  setsTable: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 8,
    marginBottom: 8,
  },
  columnHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  setNum: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
  },
  setValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
});

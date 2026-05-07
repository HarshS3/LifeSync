import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Plus, FitnessCenter, Calendar, ChevronRight, Play, History } from 'lucide-react-native';

export default function TrainingScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [stats, setStats] = useState(null);

  const fetchData = async () => {
    try {
      const [workoutsRes, statsRes] = await Promise.all([
        api.get('/gym/workouts'),
        api.get('/gym/stats')
      ]);
      setWorkouts(workoutsRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch training data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.totalWorkouts || workouts.length}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.weeklyVolume || '--'}</Text>
            <Text style={styles.statLabel}>Volume (kg)</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#000' }]}
            onPress={() => router.push('/training/active')}
          >
            <Play size={20} color="#fff" />
            <Text style={styles.actionText}>Start Empty Workout</Text>
          </TouchableOpacity>
        </View>

        {/* History Section */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <History size={18} color="#666" />
            <Text style={styles.sectionTitle}>Recent History</Text>
          </View>

          {workouts.length > 0 ? (
            workouts.map((workout) => (
              <TouchableOpacity key={workout._id} style={styles.workoutItem}>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>{workout.name || 'Untitled Workout'}</Text>
                  <Text style={styles.workoutDate}>
                    {new Date(workout.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {workout.duration ? ` • ${workout.duration} min` : ''}
                  </Text>
                </View>
                <View style={styles.workoutRight}>
                  <View style={styles.exerciseCount}>
                    <Text style={styles.exerciseCountText}>{workout.exercises?.length || 0} ex</Text>
                  </View>
                  <ChevronRight size={18} color="#ccc" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <FitnessCenter size={48} color="#eee" />
              <Text style={styles.emptyText}>No workouts recorded yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button for Templates */}
      <TouchableOpacity style={styles.fab}>
        <Calendar size={24} color="#fff" />
      </TouchableOpacity>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionRow: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  historySection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    marginLeft: 8,
  },
  workoutItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  workoutDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  workoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseCount: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  exerciseCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  },
  emptyText: {
    marginTop: 16,
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});

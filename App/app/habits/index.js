import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, CheckCircle2, Circle, Trophy, Flame, Plus } from 'lucide-react-native';

export default function HabitTrackerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState({});

  const fetchData = async () => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const [habitsRes, logsRes] = await Promise.all([
        api.get('/habits'),
        api.get(`/habits/logs/${dateStr}`)
      ]);
      
      setHabits(habitsRes.data || []);
      
      // Map logs to habit IDs for easy lookup
      const logMap = {};
      (logsRes.data || []).forEach(l => {
        logMap[l.habitId] = l.completed;
      });
      setLogs(logMap);
    } catch (err) {
      console.error('Failed to fetch habits', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleHabit = async (habitId) => {
    const isCompleted = !!logs[habitId];
    const dateStr = new Date().toISOString().split('T')[0];

    // Optimistic UI update
    setLogs(prev => ({ ...prev, [habitId]: !isCompleted }));

    try {
      await api.post('/habits/log', {
        habitId,
        date: dateStr,
        completed: !isCompleted
      });
    } catch (err) {
      console.error('Failed to toggle habit', err);
      // Revert on error
      setLogs(prev => ({ ...prev, [habitId]: isCompleted }));
    }
  };

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Habits</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Trophy size={20} color="#f59e0b" />
            <Text style={styles.statValue}>{habits.length}</Text>
            <Text style={styles.statLabel}>Total Habits</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Flame size={20} color="#ef4444" />
            <Text style={styles.statValue}>
              {Object.values(logs).filter(v => v).length}
            </Text>
            <Text style={styles.statLabel}>Done Today</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Track Your Progress</Text>

        {habits.length > 0 ? (
          habits.map((habit) => (
            <TouchableOpacity 
              key={habit._id} 
              style={[
                styles.habitItem,
                logs[habit._id] && styles.habitItemCompleted
              ]}
              onPress={() => toggleHabit(habit._id)}
            >
              <View style={styles.habitInfo}>
                <Text style={[
                  styles.habitName,
                  logs[habit._id] && styles.habitTextCompleted
                ]}>
                  {habit.name}
                </Text>
                <Text style={styles.habitCategory}>{habit.category || 'Lifestyle'}</Text>
              </View>
              {logs[habit._id] ? (
                <CheckCircle2 size={28} color="#10b981" />
              ) : (
                <Circle size={28} color="#e5e7eb" />
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No habits set up yet.</Text>
            <TouchableOpacity style={styles.setupButton}>
              <Text style={styles.setupButtonText}>Add your first habit</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  divider: {
    width: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    marginBottom: 16,
    marginLeft: 4,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  habitItemCompleted: {
    borderColor: '#10b98120',
    backgroundColor: '#f0fdf4',
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  habitTextCompleted: {
    color: '#059669',
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  habitCategory: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 20,
  },
  setupButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  setupButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

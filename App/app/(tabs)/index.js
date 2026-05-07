import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useRouter } from 'expo-router';
import { Activity, Flame, Trophy, Utensils, FitnessCenter, Brain, CheckSquare, ChevronRight, Plus } from 'lucide-react-native';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [habits, setHabits] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const [stateRes, habitsRes, logsRes] = await Promise.all([
        api.get(`/daily-life-state/${dateStr}`),
        api.get('/habits'),
        api.get(`/habits/logs/${dateStr}`)
      ]);
      
      setSummary(stateRes.data);
      
      // Calculate habit progress
      const completedIds = (logsRes.data || []).filter(l => l.completed).map(l => l.habitId);
      const habitList = (habitsRes.data || []).map(h => ({
        ...h,
        completed: completedIds.includes(h._id)
      }));
      setHabits(habitList);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const QuickAction = ({ label, icon: Icon, color, onPress }) => (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
        <Icon size={22} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Hello, {user?.name || 'Friend'}</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatarMini}>
           <Text style={styles.avatarTextMini}>{user?.name?.charAt(0)}</Text>
        </TouchableOpacity>
      </View>

      {/* Readiness & Load Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#f0f9ff' }]}>
          <Flame size={20} color="#0284c7" />
          <Text style={styles.statValue}>{summary?.metrics?.readinessScore || '--'}</Text>
          <Text style={styles.statLabel}>Readiness</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fdf2f8' }]}>
          <Activity size={20} color="#db2777" />
          <Text style={styles.statValue}>{summary?.metrics?.trainingLoad || '--'}</Text>
          <Text style={styles.statLabel}>Load</Text>
        </View>
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction label="Log Food" icon={Utensils} color="#ef4444" onPress={() => router.push('/nutrition/search')} />
          <QuickAction label="Workout" icon={FitnessCenter} color="#3b82f6" onPress={() => router.push('/training/active')} />
          <QuickAction label="Wellness" icon={Brain} color="#8b5cf6" onPress={() => router.push('/wellness/log')} />
          <QuickAction label="Symptoms" icon={ShieldAlert} color="#f59e0b" onPress={() => router.push('/wellness/symptoms')} />
        </View>
      </View>

      {/* Daily Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Morning Insight</Text>
        <View style={styles.insightCard}>
          <Text style={styles.insightText}>
            {summary?.summary || 'No data logged for today yet. Start by checking off your morning habits!'}
          </Text>
        </View>
      </View>

      {/* Habit Preview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Habits</Text>
          <TouchableOpacity onPress={() => router.push('/habits')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.habitsPreview}>
          {habits.slice(0, 3).map((h, i) => (
            <View key={i} style={styles.habitPreviewItem}>
              <View style={[styles.habitStatus, h.completed && styles.habitStatusDone]} />
              <Text style={[styles.habitPreviewText, h.completed && styles.habitTextDone]}>{h.name}</Text>
            </View>
          ))}
          {habits.length === 0 && <Text style={styles.emptyText}>No habits set up yet.</Text>}
        </View>
      </View>

      <View style={styles.footerSpacer} />
    </ScrollView>
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
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextMini: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    margin: 8,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '23%',
    alignItems: 'center',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  insightCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  insightText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  habitsPreview: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  habitPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  habitStatusDone: {
    backgroundColor: '#10b981',
  },
  habitPreviewText: {
    fontSize: 14,
    color: '#4b5563',
  },
  habitTextDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
  },
  footerSpacer: {
    height: 40,
  },
});


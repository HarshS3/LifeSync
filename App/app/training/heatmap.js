import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Info, Play, Activity } from 'lucide-react-native';
import api from '../../services/api';
import MuscleHeatmap from '../../components/MuscleHeatmap';

export default function HeatmapScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gym/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats for heatmap', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // Map muscle distribution to heatmap slugs
  const muscleHeatmapData = stats?.muscleDistribution ? Object.entries(stats.muscleDistribution).map(([muscle, count]) => {
    const slugMap = {
      'chest': 'chest',
      'back': 'upper-back',
      'shoulders': 'deltoids',
      'biceps': 'biceps',
      'triceps': 'triceps',
      'legs': 'quadriceps',
      'abs': 'abs',
      'glutes': 'gluteal',
      'hamstrings': 'hamstring',
      'calves': 'calves',
      'forearms': 'forearms',
    };
    
    return {
      slug: slugMap[muscle.toLowerCase()] || muscle.toLowerCase(),
      intensity: Math.min(count, 5)
    };
  }) : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Muscle Distribution</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Activity size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            This heatmap shows your training intensity across different muscle groups based on your workout history.
          </Text>
        </View>

        {muscleHeatmapData.length > 0 ? (
          <MuscleHeatmap data={muscleHeatmapData} />
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Info size={32} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No Data Available</Text>
            <Text style={styles.emptyDesc}>
              Log some workouts with exercises to see your muscle distribution heatmap!
            </Text>
            <TouchableOpacity 
              style={styles.emptyAction}
              onPress={() => router.push('/training/active')}
            >
              <Play size={16} color="#fff" />
              <Text style={styles.emptyActionText}>Start Workout</Text>
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
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  emptyContainer: { 
    paddingVertical: 60,
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

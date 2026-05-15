import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Info, Play, Activity as ActivityIcon } from 'lucide-react-native';
import api from '../../services/api';
import MuscleHeatmap from '../../components/MuscleHeatmap';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Body, Caption, H3 } from '../../components/ui/Typography';

export default function HeatmapScreen() {
  const router = useRouter();
  const { COLORS } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gym/stats').catch(() => ({ data: null }));
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
    <ScreenWrapper title="Muscle Distribution">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={[styles.infoCard, { backgroundColor: COLORS.training + '10' }]} padding={16}>
          <ActivityIcon size={20} color={COLORS.training} />
          <Body style={{ color: COLORS.training, flex: 1 }}>
            This heatmap shows your training intensity across different muscle groups based on your workout history.
          </Body>
        </Card>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : muscleHeatmapData.length > 0 ? (
          <View style={styles.heatmapContainer}>
            <MuscleHeatmap data={muscleHeatmapData} />
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: COLORS.gray100 }]}>
              <Info size={32} color={COLORS.gray400} />
            </View>
            <H3 style={{ marginBottom: 8 }}>No Data Available</H3>
            <Body secondary style={{ textAlign: 'center', paddingHorizontal: 40, marginBottom: 24 }}>
              Log some workouts with exercises to see your muscle distribution heatmap!
            </Body>
            <TouchableOpacity 
              style={[styles.emptyAction, { backgroundColor: COLORS.primary }]}
              onPress={() => router.push('/training/active')}
            >
              <Play size={16} color={COLORS.surface} />
              <Body style={{ color: COLORS.surface, fontWeight: '700' }}>Start Workout</Body>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    padding: 60,
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  heatmapContainer: {
    paddingBottom: 40,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
});

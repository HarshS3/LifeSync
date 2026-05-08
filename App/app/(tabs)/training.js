import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Plus, Dumbbell, Calendar, ChevronRight, Play, History, Footprints, TrendingUp, Copy, Layout } from 'lucide-react-native';
import { SkeletonTraining } from '../../components/SkeletonLoader';
import { useScrollToTop } from '@react-navigation/native';
import { useTheme } from '../../constants/Theme';

export default function TrainingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedDate = params.date || new Date().toISOString().split('T')[0];
  const { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [templates, setTemplates] = useState([]);
  
  const scrollRef = React.useRef(null);
  useScrollToTop(scrollRef);

  const fetchData = async () => {
    try {
      const [workoutsRes, statsRes, templatesRes] = await Promise.all([
        api.get('/gym/workouts'),
        api.get('/gym/stats'),
        api.get('/gym/templates')
      ]);
      
      setWorkouts(workoutsRes.data || []);
      setStats(statsRes.data);
      setTemplates(templatesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch training data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return <SkeletonTraining />;
  }

  const displayDate = new Date(selectedDate + 'T12:00:00');
  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <View>
          <Text style={themedStyles.headerTitle}>Training</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/calendar', params: { returnTo: '/(tabs)/training' } })} style={themedStyles.dateSelector}>
            <Calendar size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={themedStyles.dateText}>
              {displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')} style={themedStyles.avatarMini}>
           <Text style={themedStyles.avatarTextMini}>{user?.name?.charAt(0)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={themedStyles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Stats */}
        <View style={themedStyles.statsRow}>
          <View style={themedStyles.statCard}>
            <Text style={themedStyles.statValue}>{stats?.totalWorkouts || workouts.length}</Text>
            <Text style={themedStyles.statLabel}>Workouts</Text>
          </View>
          <View style={themedStyles.statCard}>
            <Text style={themedStyles.statValue}>{stats?.totalVolume ? Math.round(stats.totalVolume / 1000) : '--'}k</Text>
            <Text style={themedStyles.statLabel}>Volume (tn)</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={themedStyles.quickActionsRow}>
          <TouchableOpacity 
            style={themedStyles.quickAction}
            onPress={() => router.push('/training/heatmap')}
          >
            <View style={[themedStyles.actionIcon, { backgroundColor: COLORS.info + '25' }]}>
              <Layout size={20} color={COLORS.info} />
            </View>
            <Text style={themedStyles.actionLabel}>Heatmap</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={themedStyles.quickAction}
            onPress={() => router.push('/training/steps')}
          >
            <View style={[themedStyles.actionIcon, { backgroundColor: COLORS.success + '25' }]}>
              <Footprints size={20} color={COLORS.success} />
            </View>
            <Text style={themedStyles.actionLabel}>Steps</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={themedStyles.quickAction}
            onPress={() => router.push('/training/progression')}
          >
            <View style={[themedStyles.actionIcon, { backgroundColor: COLORS.wellness + '25' }]}>
              <TrendingUp size={20} color={COLORS.wellness} />
            </View>
            <Text style={themedStyles.actionLabel}>Progression</Text>
          </TouchableOpacity>
        </View>

        {/* Templates Section */}
        {templates.length > 0 && (
          <View style={themedStyles.templatesSection}>
            <View style={themedStyles.sectionHeader}>
              <Copy size={18} color={COLORS.textSecondary} />
              <Text style={themedStyles.sectionTitle}>Templates</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={themedStyles.templatesScroll}
              contentContainerStyle={{ paddingRight: 40 }}
            >
              {templates.map((t, idx) => (
                <TouchableOpacity
                  key={t._id || idx}
                  style={themedStyles.templateCard}
                  onPress={() => router.push({ pathname: '/training/active', params: { template: JSON.stringify(t) } })}
                >
                  <Text style={themedStyles.templateName} numberOfLines={1}>{t.name}</Text>
                  <Text style={themedStyles.templateStats}>{t.exercises?.length || 0} exercises</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={themedStyles.actionRow}>
          <TouchableOpacity 
            style={[themedStyles.actionButton, { backgroundColor: COLORS.primary }]}
            onPress={() => router.push('/training/active')}
          >
            <Play size={20} color={COLORS.surface} />
            <Text style={themedStyles.actionText}>Start Empty Workout</Text>
          </TouchableOpacity>
        </View>

        {/* History Section */}
        <View style={themedStyles.historySection}>
          <View style={themedStyles.sectionHeader}>
            <History size={18} color={COLORS.textSecondary} />
            <Text style={themedStyles.sectionTitle}>Recent History</Text>
          </View>

          {workouts.length > 0 ? (
            workouts.map((workout) => (
              <TouchableOpacity 
                key={workout._id} 
                style={themedStyles.workoutItem}
                onPress={() => router.push(`/training/${workout._id}`)}
              >
                <View style={themedStyles.workoutInfo}>
                  <Text style={themedStyles.workoutName}>{workout.name || 'Untitled Workout'}</Text>
                  <Text style={themedStyles.workoutDate}>
                    {new Date(workout.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {workout.duration ? ` • ${workout.duration} min` : ''}
                  </Text>
                </View>
                <View style={themedStyles.workoutRight}>
                  <View style={themedStyles.exerciseCount}>
                    <Text style={themedStyles.exerciseCountText}>{workout.exercises?.length || 0} ex</Text>
                  </View>
                  <ChevronRight size={18} color={COLORS.gray400} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={themedStyles.emptyState}>
              <Dumbbell size={48} color={COLORS.gray100} />
              <Text style={themedStyles.emptyText}>No workouts recorded yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button for History/Calendar */}
      <TouchableOpacity 
        style={themedStyles.fab}
        onPress={() => router.push({ pathname: '/calendar', params: { returnTo: '/(tabs)/training' } })}
      >
        <Calendar size={24} color={COLORS.surface} />
      </TouchableOpacity>
    </View>
  );
}

const styles = (COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    ...SHADOWS,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextMini: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS,
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    marginBottom: SPACING.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS,
  },
  actionText: {
    color: COLORS.surface,
    ...TYPOGRAPHY.label,
    fontSize: 16,
    marginLeft: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 13,
    color: COLORS.text,
  },
  templatesSection: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  templatesScroll: {
    paddingLeft: 4,
  },
  templateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: 140,
    justifyContent: 'center',
    ...SHADOWS,
  },
  templateName: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
    marginBottom: 4,
  },
  templateStats: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  historySection: {
    marginTop: SPACING.md,
  },
  workoutItem: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    ...TYPOGRAPHY.label,
    fontSize: 16,
    color: COLORS.text,
  },
  workoutDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  workoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseCount: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  exerciseCountText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.gray400,
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
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS,
  },
});

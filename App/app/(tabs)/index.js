import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Activity, Flame, Utensils, Dumbbell, Brain, ChevronRight, Plus, Calendar, ShieldAlert, FileText, Package, BarChart, X } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import ProgressRing from '../../components/ProgressRing';
import { SkeletonDashboard } from '../../components/SkeletonLoader';
import { AnimatedCard } from '../../components/AnimatedCard';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScrollToTop } from '@react-navigation/native';

const WORKOUT_STORAGE_KEY = '@active_workout_draft';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedDate = params.date || new Date().toISOString().split('T')[0];
  const { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = React.useRef(null);
  useScrollToTop(scrollRef);
  const [summary, setSummary] = useState(null);
  const [activeWorkoutDraft, setActiveWorkoutDraft] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const [stateRes] = await Promise.all([
        api.get(`/daily-life-state/${selectedDate}`)
      ]);
      
      setSummary(stateRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkActiveWorkout = async () => {
    try {
      const savedDraft = await AsyncStorage.getItem(WORKOUT_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        // Only show if it's within last 24 hours
        const isRecent = (Date.now() - draft.lastSaved) < 24 * 60 * 60 * 1000;
        if (isRecent) {
          setActiveWorkoutDraft(draft);
        } else {
          setActiveWorkoutDraft(null);
        }
      } else {
        setActiveWorkoutDraft(null);
      }
    } catch (e) {
      console.error('Failed to check active workout draft', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      checkActiveWorkout();
    }, [])
  );

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchDashboardData();
    checkActiveWorkout();
  };

  const handleActionPress = (path) => {
    Haptics.selectionAsync();
    router.push(path);
  };

  const discardDraft = async () => {
    Alert.alert(
      "Discard Workout?",
      "Are you sure you want to delete this saved workout draft?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Discard", 
          style: "destructive", 
          onPress: async () => {
            await AsyncStorage.removeItem(WORKOUT_STORAGE_KEY);
            setActiveWorkoutDraft(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return <SkeletonDashboard />;
  }

  const QuickAction = ({ label, icon: Icon, color, onPress }) => (
    <TouchableOpacity 
      style={styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY).actionItem} 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={[styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY).actionIcon, { backgroundColor: color + '25' }]}>
        <Icon size={22} color={color} />
      </View>
      <Text style={styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY).actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const displayDate = new Date(selectedDate + 'T12:00:00');
  const readiness = summary?.metrics?.readinessScore || 0;
  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  return (
    <ScrollView 
      ref={scrollRef}
      style={themedStyles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={themedStyles.header}>
        <View style={themedStyles.headerInfo}>
          <Text style={themedStyles.welcome}>Hello, {user?.name || 'Friend'}</Text>
          <TouchableOpacity 
            onPress={() => handleActionPress({ pathname: '/calendar', params: { returnTo: '/(tabs)' } })} 
            style={themedStyles.dateSelector}
          >
            <Calendar size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={themedStyles.date}>{displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => handleActionPress('/profile')} style={themedStyles.avatarMini}>
           <Text style={themedStyles.avatarTextMini}>{user?.name?.charAt(0)}</Text>
        </TouchableOpacity>
      </View>

      {/* Active Workout Resume Banner */}
      {activeWorkoutDraft && (
        <TouchableOpacity 
          style={themedStyles.resumeBanner} 
          onPress={() => handleActionPress('/training/active')}
        >
          <View style={themedStyles.resumeContent}>
            <View style={themedStyles.resumeIcon}>
              <Dumbbell size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={themedStyles.resumeTitle}>Active Workout Found</Text>
              <Text style={themedStyles.resumeSubtitle}>Continue your {activeWorkoutDraft.name}?</Text>
            </View>
            <TouchableOpacity onPress={discardDraft} style={themedStyles.resumeClose}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}


      {/* Hero Readiness Section */}
      <AnimatedCard index={0}>
        <View style={themedStyles.heroSection}>
            <ProgressRing 
            size={160} 
            strokeWidth={15} 
            progress={readiness} 
            color={COLORS.readiness}
            backgroundColor={COLORS.gray100}
            >
            <View style={themedStyles.heroContent}>
                <Text style={themedStyles.heroValue}>{readiness || '--'}</Text>
                <Text style={themedStyles.heroLabel}>Readiness</Text>
            </View>
            </ProgressRing>
            
            <View style={themedStyles.heroStats}>
            <View style={themedStyles.heroStatItem}>
                <Activity size={18} color={COLORS.load} />
                <View style={{ marginLeft: 8 }}>
                <Text style={themedStyles.heroStatValue}>{summary?.metrics?.trainingLoad || '--'}</Text>
                <Text style={themedStyles.heroStatLabel}>Training Load</Text>
                </View>
            </View>
            <View style={[themedStyles.heroStatItem, { marginTop: SPACING.md }]}>
                <Flame size={18} color={COLORS.warning} />
                <View style={{ marginLeft: 8 }}>
                <Text style={themedStyles.heroStatValue}>{summary?.metrics?.metabolicRate || '--'}</Text>
                <Text style={themedStyles.heroStatLabel}>Metabolic Rate</Text>
                </View>
            </View>
            </View>
        </View>
      </AnimatedCard>

      {/* Quick Actions Grid */}
      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Quick Actions</Text>
        <AnimatedCard index={1}>
            <View style={themedStyles.actionsGrid}>
            <QuickAction label="Log Food" icon={Utensils} color={COLORS.nutrition} onPress={() => handleActionPress('/nutrition/search')} />
            <QuickAction label="Workout" icon={Dumbbell} color={COLORS.training} onPress={() => handleActionPress('/training/active')} />
            <QuickAction label="Wellness" icon={Brain} color={COLORS.wellness} onPress={() => handleActionPress('/wellness/log')} />
            <QuickAction label="Symptoms" icon={ShieldAlert} color={COLORS.warning} onPress={() => handleActionPress('/wellness/symptoms')} />
            <QuickAction label="Labs" icon={FileText} color={COLORS.success} onPress={() => handleActionPress('/wellness/labs')} />
            <QuickAction label="Pantry" icon={Package} color={COLORS.success} onPress={() => handleActionPress('/nutrition/inventory')} />
            <QuickAction label="Trends" icon={BarChart} color={COLORS.info} onPress={() => handleActionPress('/insights')} />
            </View>
        </AnimatedCard>
      </View>

      {/* Daily Insights */}
      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Morning Insight</Text>
        <AnimatedCard index={2}>
            <View style={themedStyles.insightCard}>
            <Text style={themedStyles.insightText}>
                {summary?.summary || 'No data logged for today yet. Use the quick actions above to track your day!'}
            </Text>
            </View>
        </AnimatedCard>
      </View>

      <View style={themedStyles.footerSpacer} />
    </ScrollView>
  );
}


const styles = (COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: SPACING.lg,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS,
  },
  headerInfo: {
    flex: 1,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  welcome: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  date: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
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
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
    ...SHADOWS,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroValue: {
    ...TYPOGRAPHY.h1,
    fontSize: 32,
    color: COLORS.readiness,
  },
  heroLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroStats: {
    justifyContent: 'center',
  },
  heroStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatValue: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
    color: COLORS.text,
  },
  heroStatLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  insightCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS,
  },
  insightText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  footerSpacer: {
    height: 40,
  },
  resumeBanner: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.training + '50',
    padding: SPACING.md,
    ...SHADOWS,
  },
  resumeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.training,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.training,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  resumeSubtitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  resumeClose: {
    padding: SPACING.xs,
  },
});

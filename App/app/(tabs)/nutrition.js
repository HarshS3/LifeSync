import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Plus, Utensils, Zap, ShieldAlert, ChevronRight, Package, History, Calendar, Trash2, Scale, Activity } from 'lucide-react-native';
import MacroIndicator from '../../components/MacroIndicator';
import ProgressRing from '../../components/ProgressRing';
import { useTheme } from '../../constants/Theme';
import { SkeletonNutrition } from '../../components/SkeletonLoader';
import { AnimatedCard } from '../../components/AnimatedCard';
import * as Haptics from 'expo-haptics';
import { useScrollToTop } from '@react-navigation/native';

export default function NutritionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedDate = params.date || new Date().toISOString().split('T')[0];
  const { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = React.useRef(null);
  useScrollToTop(scrollRef);
  const [log, setLog] = useState(null);
  const [targets, setTargets] = useState({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70
  });
  const [templates, setTemplates] = useState([]);
  const [reloggingId, setReloggingId] = useState(null);
  const [deletingIdx, setDeletingIdx] = useState(null);

  const fetchData = async () => {
    try {
      const [logRes, targetRes, templateRes] = await Promise.all([
        api.get(`/nutrition/logs/date/${selectedDate}`),
        api.get('/nutrition/clinical-targets'),
        api.get('/nutrition/meal-templates')
      ]);
      
      let logData = logRes.data;
      
      // Ensure meal totals are calculated if missing (for seeded data)
      if (logData?.meals) {
        logData.meals = logData.meals.map(meal => {
          if (!meal.totalCalories && meal.foods) {
            return {
              ...meal,
              totalCalories: meal.foods.reduce((sum, f) => sum + (f.calories || 0), 0),
              totalProtein: meal.foods.reduce((sum, f) => sum + (f.protein || 0), 0),
              totalCarbs: meal.foods.reduce((sum, f) => sum + (f.carbs || 0), 0),
              totalFat: meal.foods.reduce((sum, f) => sum + (f.fat || 0), 0),
            };
          }
          return meal;
        });
      }

      setLog(logData);
      if (targetRes.data?.targets) {
        setTargets(targetRes.data.targets);
      }
      if (templateRes.data?.templates) {
        setTemplates(templateRes.data.templates);
      }
    } catch (err) {
      console.error('Failed to fetch nutrition data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchData();
  };

  const handleActionPress = (path) => {
    Haptics.selectionAsync();
    router.push(path);
  };

  const handleRelog = async (template, idx) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReloggingId(idx);
    try {
      await api.post('/nutrition/meal-templates/relog', {
        mealName: template.mealName,
        mealType: template.mealType,
        foods: template.foods
      });
      fetchData(); // Refresh to show new log
    } catch (err) {
      console.error('Relog error', err);
    } finally {
      setReloggingId(null);
    }
  };

  const handleDeleteMeal = async (index) => {
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setDeletingIdx(index);
            try {
              const updatedMeals = log.meals.filter((_, i) => i !== index);
              await api.post('/nutrition/logs', {
                date: selectedDate,
                meals: updatedMeals
              });
              fetchData();
            } catch (err) {
              console.error('Delete meal error', err);
              Alert.alert('Error', 'Failed to delete meal');
            } finally {
              setDeletingIdx(null);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return <SkeletonNutrition />;
  }

  const totals = log?.dailyTotals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const displayDate = new Date(selectedDate + 'T12:00:00');
  const calorieProgress = (totals.calories / targets.calories) * 100;
  const remainingCals = Math.max(0, targets.calories - totals.calories);
  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <View>
          <Text style={themedStyles.headerTitle}>Nutrition</Text>
          <TouchableOpacity onPress={() => handleActionPress({ pathname: '/calendar', params: { returnTo: '/(tabs)/nutrition' } })} style={themedStyles.dateSelector}>
            <Calendar size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={themedStyles.dateText}>
              {displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => handleActionPress('/profile')} style={themedStyles.avatarMini}>
           <Text style={themedStyles.avatarTextMini}>{user?.name?.charAt(0)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={themedStyles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Daily Summary Card with Progress Ring */}
        <AnimatedCard index={0}>
            <View style={themedStyles.summaryCard}>
            <View style={themedStyles.ringRow}>
                <ProgressRing 
                size={140} 
                strokeWidth={12} 
                progress={calorieProgress} 
                color={COLORS.nutrition}
                backgroundColor={COLORS.gray100}
                >
                <View style={themedStyles.ringContent}>
                    <Text style={themedStyles.ringValue}>{Math.round(remainingCals)}</Text>
                    <Text style={themedStyles.ringLabel}>Left</Text>
                </View>
                </ProgressRing>
                
                <View style={themedStyles.ringStats}>
                <View style={themedStyles.statItem}>
                    <Text style={themedStyles.statValueSmall}>{Math.round(totals.calories)}</Text>
                    <Text style={themedStyles.statLabelSmall}>Eaten</Text>
                </View>
                <View style={[themedStyles.statItem, { marginTop: SPACING.md }]}>
                    <Text style={themedStyles.statValueSmall}>{targets.calories}</Text>
                    <Text style={themedStyles.statLabelSmall}>Goal</Text>
                </View>
                </View>
            </View>
            
            <View style={themedStyles.macrosContainer}>
                <MacroIndicator label="Protein" value={totals.protein} target={targets.protein} color={COLORS.nutrition} />
                <MacroIndicator label="Carbs" value={totals.carbs} target={targets.carbs} color={COLORS.training} />
                <MacroIndicator label="Fat" value={totals.fat} target={targets.fat} color={COLORS.warning} />
            </View>
            
            <TouchableOpacity 
                style={themedStyles.viewAllNutrients}
                onPress={() => handleActionPress({ pathname: '/nutrition/details', params: { date: selectedDate } })}
            >
                <Text style={themedStyles.viewAllNutrientsText}>View Detailed Breakdown</Text>
                <ChevronRight size={16} color={COLORS.info} />
            </TouchableOpacity>
            </View>
        </AnimatedCard>

        {/* Quick Actions Grid */}
        <AnimatedCard index={1}>
            <View style={themedStyles.quickActionsRow}>
            <TouchableOpacity 
                style={themedStyles.quickAction}
                onPress={() => handleActionPress('/nutrition/inventory')}
            >
                <View style={[themedStyles.actionIcon, { backgroundColor: COLORS.success + '25' }]}>
                <Package size={20} color={COLORS.success} />
                </View>
                <Text style={themedStyles.actionLabel}>Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={themedStyles.quickAction}
                onPress={() => handleActionPress('/nutrition/recipes')}
            >
                <View style={[themedStyles.actionIcon, { backgroundColor: COLORS.warning + '25' }]}>
                <Utensils size={20} color={COLORS.warning} />
                </View>
                <Text style={themedStyles.actionLabel}>Recipes</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={themedStyles.quickAction}
                onPress={() => handleActionPress('/nutrition/weight')}
            >
                <View style={[themedStyles.actionIcon, { backgroundColor: COLORS.info + '25' }]}>
                <Scale size={20} color={COLORS.info} />
                </View>
                <Text style={themedStyles.actionLabel}>Weight</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={themedStyles.quickAction}
                onPress={() => handleActionPress({ pathname: '/nutrition/insulin', params: { date: selectedDate } })}
            >
                <View style={[themedStyles.actionIcon, { backgroundColor: COLORS.nutrition + '25' }]}>
                <Activity size={20} color={COLORS.nutrition} />
                </View>
                <Text style={themedStyles.actionLabel}>Insulin</Text>
            </TouchableOpacity>
            </View>
        </AnimatedCard>

        {/* Bioavailability/Insights Section */}
        {log?.proteinDistribution && (
          <AnimatedCard index={2}>
            <TouchableOpacity 
                style={themedStyles.insightBox}
                onPress={() => handleActionPress('/nutrition/insights')}
            >
                <View style={themedStyles.insightHeader}>
                <Zap size={18} color={COLORS.wellness} />
                <Text style={themedStyles.insightTitle}>Protein Timing</Text>
                </View>
                <Text style={themedStyles.insightText}>{log.proteinDistribution.insights[0]}</Text>
                <Text style={themedStyles.tapForMore}>Analysis Report →</Text>
            </TouchableOpacity>
          </AnimatedCard>
        )}

        {/* Quick Relog (Meal Templates) */}
        {templates.length > 0 && (
          <View style={themedStyles.templatesSection}>
            <View style={themedStyles.sectionHeader}>
              <Text style={themedStyles.sectionTitle}><History size={18} color={COLORS.primary} /> Quick Relog</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={themedStyles.templatesScroll}>
              {templates.map((t, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={themedStyles.templateCard}
                  onPress={() => handleRelog(t, idx)}
                  disabled={reloggingId !== null}
                >
                  {reloggingId === idx && (
                    <View style={themedStyles.relogOverlay}>
                      <ActivityIndicator color={COLORS.success} />
                    </View>
                  )}
                  <View style={themedStyles.templateHeader}>
                    <View style={themedStyles.freqBadge}>
                      <Zap size={12} color={COLORS.success} />
                      <Text style={themedStyles.freqText}>{t.frequency}×</Text>
                    </View>
                    <Text style={themedStyles.mealTypeLabel}>{t.mealType}</Text>
                  </View>
                  <Text style={themedStyles.templateName} numberOfLines={1}>{t.mealName}</Text>
                  <Text style={themedStyles.templateStats}>
                    {Math.round(t.totalCalories)} kcal • {Math.round(t.totalProtein)}g P
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Meals List */}
        <View style={themedStyles.mealsSection}>
          <View style={themedStyles.sectionHeader}>
            <Text style={themedStyles.sectionTitle}>Daily Log</Text>
            <Text style={themedStyles.mealCount}>{log?.meals?.length || 0} items</Text>
          </View>

          {log?.meals?.length > 0 ? (
            log.meals.map((meal, index) => (
              <AnimatedCard key={index} index={index}>
                <View style={themedStyles.mealItem}>
                    <TouchableOpacity 
                    style={themedStyles.mealInfo}
                    onPress={() => {/* View meal details */}}
                    >
                    <Text style={themedStyles.mealName}>{meal.name || meal.mealType}</Text>
                    <Text style={themedStyles.mealTime}>{meal.time}</Text>
                    </TouchableOpacity>
                    <View style={themedStyles.mealStats}>
                    <Text style={themedStyles.mealCals}>{Math.round(meal.totalCalories)} kcal</Text>
                    <TouchableOpacity 
                        onPress={() => handleDeleteMeal(index)}
                        style={themedStyles.deleteButton}
                        disabled={deletingIdx === index}
                    >
                        {deletingIdx === index ? (
                        <ActivityIndicator size="small" color={COLORS.error} />
                        ) : (
                        <Trash2 size={18} color={COLORS.error} />
                        )}
                    </TouchableOpacity>
                    </View>
                </View>
              </AnimatedCard>
            ))
          ) : (
            <View style={themedStyles.emptyState}>
              <Utensils size={40} color={COLORS.gray200} />
              <Text style={themedStyles.emptyText}>No entries yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={themedStyles.fab}
        onPress={() => handleActionPress('/nutrition/search')}
      >
        <Plus size={24} color={COLORS.background} />
      </TouchableOpacity>
    </View>
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
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
  },
  ringContent: {
    alignItems: 'center',
  },
  ringValue: {
    ...TYPOGRAPHY.h1,
    fontSize: 24,
    color: COLORS.text,
  },
  ringLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ringStats: {
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statValueSmall: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    color: COLORS.text,
  },
  statLabelSmall: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  macrosContainer: {
    marginTop: SPACING.sm,
  },
  viewAllNutrients: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: 4,
  },
  viewAllNutrientsText: {
    ...TYPOGRAPHY.label,
    color: COLORS.info,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickAction: {
    width: '48%',
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
    color: COLORS.textSecondary,
  },
  insightBox: {
    backgroundColor: COLORS.insightBg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  insightTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.insight,
    marginLeft: SPACING.sm,
  },
  insightText: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.text,
  },
  tapForMore: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.insight,
    marginTop: SPACING.sm,
    textAlign: 'right',
  },
  templatesSection: {
    marginBottom: SPACING.md,
  },
  templatesScroll: {
    flexDirection: 'row',
  },
  templateCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginRight: SPACING.sm,
    width: 180,
    overflow: 'hidden',
    ...SHADOWS,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  freqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '25',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  freqText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '700',
    marginLeft: 2,
  },
  mealTypeLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  templateName: {
    ...TYPOGRAPHY.label,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  templateStats: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  relogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  mealsSection: {
    marginTop: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  mealCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  mealItem: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    ...TYPOGRAPHY.label,
    fontSize: 16,
    color: COLORS.text,
  },
  mealTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mealStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealCals: {
    ...TYPOGRAPHY.label,
    fontSize: 14,
    color: COLORS.text,
    marginRight: SPACING.md,
  },
  deleteButton: {
    padding: SPACING.sm,
    marginRight: -SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: SPACING.md,
    color: COLORS.gray400,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS,
  },
});

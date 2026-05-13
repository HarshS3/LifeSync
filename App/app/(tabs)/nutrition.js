import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Calendar, Search } from 'lucide-react-native';
import api from '../../services/api';
import { useTheme } from '../../constants/Theme';

// Tab Components
import TodayTab from '../../components/Nutrition/TodayTab';
import LogMealTab from '../../components/Nutrition/LogMealTab';
import WeightTab from '../../components/Nutrition/WeightTab';
import DetailsTab from '../../components/Nutrition/DetailsTab';

const TABS = ['Today', 'Log Meal', 'Weight', 'Details'];

export default function NutritionScreen() {
  const router = useRouter();
  const { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } = useTheme();
  
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data State
  const [log, setLog] = useState({ meals: [], dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
  const [targets, setTargets] = useState({ calories: 2500, protein: 150, carbs: 300, fat: 80 });
  const [templates, setTemplates] = useState([]);
  
  // Interaction State
  const [reloggingId, setReloggingId] = useState(null);
  const [deletingIdx, setDeletingIdx] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [logRes, targetRes, templateRes] = await Promise.all([
        api.get(`/nutrition/logs/date/${selectedDate}`).catch(() => ({ data: null })),
        api.get('/nutrition/clinical-targets').catch(() => ({ data: null })),
        api.get('/nutrition/meal-templates').catch(() => ({ data: { templates: [] } }))
      ]);

      if (logRes.data) setLog(logRes.data);
      if (targetRes.data?.targets) setTargets(targetRes.data.targets);
      if (templateRes.data?.templates) setTemplates(templateRes.data.templates);
    } catch (err) {
      console.error('Failed to fetch nutrition data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const changeDate = (days) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleRelog = async (template, idx) => {
    setReloggingId(idx);
    try {
      const newMeal = {
        name: template.mealName,
        mealType: template.mealType,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        foods: template.foods
      };
      const updatedMeals = [...(log.meals || []), newMeal];
      await api.post('/nutrition/logs', { date: selectedDate, meals: updatedMeals });
      fetchData(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to relog meal');
    } finally {
      setReloggingId(null);
    }
  };

  const handleDeleteMeal = async (index) => {
    setDeletingIdx(index);
    try {
      const updatedMeals = log.meals.filter((_, i) => i !== index);
      await api.post('/nutrition/logs', { date: selectedDate, meals: updatedMeals });
      fetchData(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to delete meal');
    } finally {
      setDeletingIdx(null);
    }
  };

  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  return (
    <SafeAreaView style={themedStyles.container}>
      {/* Header with Date Picker */}
      <View style={themedStyles.header}>
        <View style={themedStyles.headerTop}>
          <Text style={themedStyles.headerTitle}>Nutrition</Text>
          <TouchableOpacity onPress={() => router.push('/nutrition/search')} style={themedStyles.searchButton}>
            <Search size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={themedStyles.datePicker}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={themedStyles.dateNav}>
            <ChevronLeft size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View style={themedStyles.dateInfo}>
            <Calendar size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={themedStyles.dateText}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => changeDate(1)} style={themedStyles.dateNav}>
            <ChevronRight size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Tab Bar */}
      <View style={themedStyles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={themedStyles.tabScroll}>
          {TABS.map((tab, i) => (
            <TouchableOpacity 
              key={i} 
              onPress={() => setActiveTab(i)}
              style={[themedStyles.tabItem, activeTab === i && themedStyles.activeTabItem]}
            >
              <Text style={[themedStyles.tabText, activeTab === i && themedStyles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={themedStyles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {activeTab === 0 && (
              <TodayTab 
                log={log} 
                targets={targets} 
                templates={templates} 
                selectedDate={selectedDate}
                refreshing={refreshing}
                onRefresh={onRefresh}
                handleActionPress={(path) => router.push(path)}
                handleRelog={handleRelog}
                handleDeleteMeal={handleDeleteMeal}
                reloggingId={reloggingId}
                deletingIdx={deletingIdx}
                COLORS={COLORS} SPACING={SPACING} BORDER_RADIUS={BORDER_RADIUS} SHADOWS={SHADOWS} TYPOGRAPHY={TYPOGRAPHY}
              />
            )}
            {activeTab === 1 && (
              <LogMealTab 
                onMealLogged={() => fetchData(true)}
                COLORS={COLORS} SPACING={SPACING} BORDER_RADIUS={BORDER_RADIUS} SHADOWS={SHADOWS} TYPOGRAPHY={TYPOGRAPHY}
              />
            )}
            {activeTab === 2 && (
              <WeightTab 
                COLORS={COLORS} SPACING={SPACING} BORDER_RADIUS={BORDER_RADIUS} SHADOWS={SHADOWS} TYPOGRAPHY={TYPOGRAPHY}
              />
            )}
            {activeTab === 3 && (
              <DetailsTab 
                log={log} 
                targets={targets}
                COLORS={COLORS} SPACING={SPACING} BORDER_RADIUS={BORDER_RADIUS} SHADOWS={SHADOWS} TYPOGRAPHY={TYPOGRAPHY}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = (COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: COLORS.surface, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  headerTitle: { ...TYPOGRAPHY.h2, color: COLORS.text },
  searchButton: { padding: 8 },
  datePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm },
  dateNav: { padding: 10 },
  dateInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray100, paddingHorizontal: 16, paddingVertical: 6, borderRadius: BORDER_RADIUS.full },
  dateText: { ...TYPOGRAPHY.label, color: COLORS.text, fontSize: 14 },
  tabContainer: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabScroll: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  tabItem: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: BORDER_RADIUS.full, marginRight: 8 },
  activeTabItem: { backgroundColor: COLORS.primary + '15' },
  tabText: { ...TYPOGRAPHY.label, color: COLORS.textSecondary, fontSize: 14 },
  activeTabText: { color: COLORS.primary, fontWeight: 'bold' },
});

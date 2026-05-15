import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Calendar, Search } from 'lucide-react-native';
import api from '../../services/api';
import { useTheme } from '../../constants/Theme';
import { useAuth } from '../../context/AuthContext';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { H2, Body, Caption } from '../../components/ui/Typography';

// Tab Components
import TodayTab from '../../components/Nutrition/TodayTab';
import LogMealTab from '../../components/Nutrition/LogMealTab';
import WeightTab from '../../components/Nutrition/WeightTab';
import DetailsTab from '../../components/Nutrition/DetailsTab';

const TABS = ['Today', 'Log Meal', 'Weight', 'Details'];

export default function NutritionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } = useTheme();
  
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [log, setLog] = useState({ meals: [], dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
  const [targets, setTargets] = useState({ calories: 2500, protein: 150, carbs: 300, fat: 80 });
  const [templates, setTemplates] = useState([]);
  
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

  return (
    <ScreenWrapper 
      title="Nutrition" 
      showBack={false}
      headerRight={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.push('/nutrition/search')} style={styles.searchButton}>
            <Search size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/profile')} 
            style={[styles.avatarMini, { backgroundColor: COLORS.primary }]}
          >
            <Caption style={{ color: COLORS.surface, fontWeight: 'bold' }}>{user?.name ? user.name.charAt(0) : 'U'}</Caption>
          </TouchableOpacity>
        </View>
      }
    >
      {/* Date Picker (Sub-header) */}
      <View style={[styles.datePickerContainer, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
        <View style={styles.datePicker}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNav}>
            <ChevronLeft size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View style={[styles.dateInfo, { backgroundColor: COLORS.gray100 }]}>
            <Calendar size={14} color={COLORS.nutrition} style={{ marginRight: 6 }} />
            <Caption style={{ fontWeight: '700' }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Caption>
          </View>
          <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateNav}>
            <ChevronRight size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {TABS.map((tab, i) => (
              <TouchableOpacity 
                key={i} 
                onPress={() => setActiveTab(i)}
                style={[
                  styles.tabItem, 
                  activeTab === i && { backgroundColor: COLORS.nutrition + '15' }
                ]}
              >
                <Caption style={[
                  styles.tabText, 
                  activeTab === i && { color: COLORS.nutrition, fontWeight: 'bold' }
                ]}>{tab}</Caption>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.nutrition} />
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
                COLORS={COLORS} SPACING={SPACING} BORDER_RADIUS={BORDER_RADIUS} SHADOWS={{}} TYPOGRAPHY={TYPOGRAPHY}
              />
            )}
            {activeTab === 1 && (
              <LogMealTab 
                onMealLogged={() => fetchData(true)}
                currentMeals={log.meals}
                COLORS={COLORS} SPACING={SPACING} BORDER_RADIUS={BORDER_RADIUS} SHADOWS={{}} TYPOGRAPHY={TYPOGRAPHY}
              />
            )}
            {activeTab === 2 && (
              <WeightTab 
                COLORS={COLORS} SPACING={SPACING} BORDER_RADIUS={BORDER_RADIUS} SHADOWS={{}} TYPOGRAPHY={TYPOGRAPHY}
              />
            )}
            {activeTab === 3 && (
              <DetailsTab 
                log={log} 
                targets={targets}
                COLORS={COLORS} SPACING={SPACING} BORDER_RADIUS={BORDER_RADIUS} SHADOWS={{}} TYPOGRAPHY={TYPOGRAPHY}
              />
            )}
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchButton: { padding: 4 },
  datePickerContainer: { borderBottomWidth: 1 },
  datePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  dateNav: { padding: 8 },
  dateInfo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  tabContainer: { paddingBottom: 8 },
  tabScroll: { paddingHorizontal: 16 },
  tabItem: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  tabText: { fontSize: 13 },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

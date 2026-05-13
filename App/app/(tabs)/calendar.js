import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, TouchableOpacity, Text, SafeAreaView, 
  ScrollView, ActivityIndicator, Dimensions 
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, ChevronLeft, ChevronRight, Activity, Zap, Utensils, CheckCircle } from 'lucide-react-native';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const COLORS = {
  workout: '#2563eb',
  mental: '#9333ea',
  nutrition: '#15803d',
  habit: '#6366f1',
  today: '#3b82f6',
  bg: '#f6f1e7',
  surface: '#ffffff',
  text: '#161310',
  muted: 'rgba(22,19,16,0.62)',
  border: 'rgba(22,19,16,0.10)',
};

export default function CalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo || '/(tabs)';
  const today = new Date().toISOString().split('T')[0];

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(params.date || today);
  const [events, setEvents] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [visibleMonth, setVisibleMonth] = useState(new Date(selectedDate));

  const fetchEvents = async (date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth();

      // Range: 1 month before and 1 month after current visible month
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month + 2, 0);
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      const [workoutsRes, mentalRes, nutritionRes, habitsRes] = await Promise.all([
        api.get('/gym/workouts').catch(() => ({ data: [] })),
        api.get(`/logs/mental/range/${encodeURIComponent(startStr)}/${encodeURIComponent(endStr)}`).catch(() => ({ data: [] })),
        api.get(`/nutrition/logs/range/${encodeURIComponent(startStr)}/${encodeURIComponent(endStr)}`).catch(() => ({ data: [] })),
        api.get(`/habits/logs/range?start=${startStr}&end=${endStr}`).catch(() => ({ data: [] })),
      ]);

      const allEvents = [];

      // Workouts
      const workouts = Array.isArray(workoutsRes.data) ? workoutsRes.data : [];
      workouts.forEach(w => {
        const d = new Date(w.date).toISOString().split('T')[0];
        allEvents.push({
          date: d,
          type: 'workout',
          title: w.name || 'Workout',
          icon: <Activity size={16} color={COLORS.workout} />,
          details: `${w.exercises?.length || 0} exercises`,
          original: w
        });
      });

      // Mental
      const mental = Array.isArray(mentalRes.data) ? mentalRes.data : [];
      mental.forEach(m => {
        const d = new Date(m.date).toISOString().split('T')[0];
        allEvents.push({
          date: d,
          type: 'mental',
          title: 'Wellness Log',
          icon: <Zap size={16} color={COLORS.mental} />,
          details: `Mood ${m.moodScore || 5}/10 • Energy ${m.energyLevel || 5}/10`,
          original: m
        });
      });

      // Nutrition
      const nutrition = Array.isArray(nutritionRes.data) ? nutritionRes.data : (Array.isArray(nutritionRes.data?.logs) ? nutritionRes.data.logs : []);
      nutrition.forEach(n => {
        const d = new Date(n.date).toISOString().split('T')[0];
        const calories = n.totalCalories || n.dailyTotals?.calories || 0;
        allEvents.push({
          date: d,
          type: 'nutrition',
          title: 'Nutrition Log',
          icon: <Utensils size={16} color={COLORS.nutrition} />,
          details: calories ? `${Math.round(calories)} kcal` : 'Meals logged',
          original: n
        });
      });

      // Habits
      const habits = Array.isArray(habitsRes.data) ? habitsRes.data : [];
      habits.forEach(h => {
        if (h.completed) {
          const d = new Date(h.date).toISOString().split('T')[0];
          allEvents.push({
            date: d,
            type: 'habit',
            title: h.habit?.name || 'Habit',
            icon: <CheckCircle size={16} color={h.habit?.color || COLORS.habit} />,
            details: 'Completed',
            original: h
          });
        }
      });

      setEvents(allEvents);
      processMarkedDates(allEvents, selectedDate);
    } catch (err) {
      console.error('Calendar fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const processMarkedDates = (allEvents, selected) => {
    const marks = {};
    
    // Add dots for events
    allEvents.forEach(event => {
      if (!marks[event.date]) {
        marks[event.date] = { dots: [] };
      }
      
      const typeColor = COLORS[event.type] || COLORS.muted;
      const dotExists = marks[event.date].dots.some(d => d.color === typeColor);
      
      if (!dotExists && marks[event.date].dots.length < 4) {
        marks[event.date].dots.push({ key: event.type, color: typeColor });
      }
    });

    // Mark today
    if (!marks[today]) marks[today] = { dots: marks[today]?.dots || [] };
    marks[today].today = true;

    // Mark selected
    if (!marks[selected]) marks[selected] = { dots: marks[selected]?.dots || [] };
    marks[selected].selected = true;
    marks[selected].selectedColor = COLORS.today;

    setMarkedDates(marks);
  };

  useEffect(() => {
    fetchEvents(visibleMonth);
  }, [visibleMonth]);

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    processMarkedDates(events, day.dateString);
  };

  const selectedDayEvents = events.filter(e => e.date === selectedDate);

  const handleEventClick = (event) => {
    if (event.type === 'workout' && event.original?._id) {
      router.push(`/training/${event.original._id}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.title}>Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={handleDayPress}
            onMonthChange={(month) => setVisibleMonth(new Date(month.dateString))}
            markedDates={markedDates}
            markingType={'multi-dot'}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: COLORS.muted,
              selectedDayBackgroundColor: COLORS.today,
              selectedDayTextColor: '#ffffff',
              todayTextColor: COLORS.today,
              dayTextColor: COLORS.text,
              textDisabledColor: '#d1d5db',
              dotColor: COLORS.today,
              selectedDotColor: '#ffffff',
              arrowColor: COLORS.today,
              disabledArrowColor: '#d1d5db',
              monthTextColor: COLORS.text,
              indicatorColor: COLORS.today,
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12
            }}
          />
          {loading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator color={COLORS.today} />
            </View>
          )}
        </View>

        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', month: 'long', day: 'numeric' 
              })}
            </Text>
            {selectedDate === today && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>TODAY</Text>
              </View>
            )}
          </View>

          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.map((event, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.eventCard, { borderLeftColor: COLORS[event.type] || COLORS.border }]}
                onPress={() => handleEventClick(event)}
              >
                <View style={styles.eventIconContainer}>
                  {event.icon}
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDetails}>{event.details}</Text>
                </View>
                <ChevronRight size={18} color={COLORS.muted} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No activities logged for this day</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {selectedDate !== today && (
        <TouchableOpacity 
          style={styles.todayButton}
          onPress={() => {
            setSelectedDate(today);
            setVisibleMonth(new Date(today));
            processMarkedDates(events, today);
          }}
        >
          <Text style={styles.todayButtonText}>Go to Today</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
    marginTop: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollContent: {
    padding: 16,
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  eventsSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  todayBadge: {
    backgroundColor: COLORS.today + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.today,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  eventDetails: {
    fontSize: 12,
    color: COLORS.muted,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  todayButton: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.text,
    borderRadius: 16,
    alignItems: 'center',
  },
  todayButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

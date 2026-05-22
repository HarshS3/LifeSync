import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView 
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Activity, Zap, Utensils, CheckCircle } from 'lucide-react-native';
import api from '../../services/api';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H3, Body, Caption } from '../../components/ui/Typography';

export default function CalendarScreen() {
  const router = useRouter();
  const { COLORS } = useTheme();
  const params = useLocalSearchParams();
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

      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month + 2, 0);
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      const res = await api.get(`/logs/calendar-summary?start=${startStr}&end=${endStr}`);
      const summaryMap = res.data;

      const allEvents = [];

      Object.entries(summaryMap).forEach(([dateKey, dayData]) => {
        const d = new Date(dateKey).toISOString().split('T')[0];

        // Training (workouts)
        dayData.workouts?.forEach(w => {
          allEvents.push({
            date: d,
            type: 'training',
            title: w.name || 'Workout',
            icon: <Activity size={16} color={COLORS.training} />,
            details: `${w.exercises?.length || 0} exercises`,
            original: w
          });
        });

        // Wellness (mental)
        dayData.mental?.forEach(m => {
          allEvents.push({
            date: d,
            type: 'wellness',
            title: 'Wellness Log',
            icon: <Zap size={16} color={COLORS.wellness} />,
            details: `Mood ${m.moodScore || 5}/10 • Energy ${m.energyLevel || 5}/10`,
            original: m
          });
        });

        // Nutrition
        dayData.nutrition?.forEach(n => {
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
        dayData.habits?.forEach(h => {
          if (h.completed) {
            allEvents.push({
              date: d,
              type: 'insight',
              title: h.habit?.name || 'Habit',
              icon: <CheckCircle size={16} color={h.habit?.color || COLORS.insight} />,
              details: 'Completed',
              original: h
            });
          }
        });
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
    allEvents.forEach(event => {
      if (!marks[event.date]) {
        marks[event.date] = { dots: [] };
      }
      const typeColor = COLORS[event.type] || COLORS.gray400;
      const dotExists = marks[event.date].dots.some(d => d.color === typeColor);
      if (!dotExists && marks[event.date].dots.length < 4) {
        marks[event.date].dots.push({ key: event.type, color: typeColor });
      }
    });

    if (!marks[today]) marks[today] = { dots: marks[today]?.dots || [] };
    marks[today].today = true;

    if (!marks[selected]) marks[selected] = { dots: marks[selected]?.dots || [] };
    marks[selected].selected = true;
    marks[selected].selectedColor = COLORS.primary;

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

  return (
    <ScreenWrapper title="Calendar" showBack={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card padding={8} style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={handleDayPress}
            onMonthChange={(month) => setVisibleMonth(new Date(month.dateString))}
            markedDates={markedDates}
            markingType={'multi-dot'}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: COLORS.textSecondary,
              selectedDayBackgroundColor: COLORS.primary,
              selectedDayTextColor: COLORS.surface,
              todayTextColor: COLORS.primary,
              dayTextColor: COLORS.text,
              textDisabledColor: COLORS.gray300,
              dotColor: COLORS.primary,
              selectedDotColor: COLORS.surface,
              arrowColor: COLORS.primary,
              disabledArrowColor: COLORS.gray300,
              monthTextColor: COLORS.text,
              indicatorColor: COLORS.primary,
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
              <ActivityIndicator color={COLORS.primary} />
            </View>
          )}
        </Card>

        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <H3>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { 
                weekday: 'long', month: 'long', day: 'numeric' 
              })}
            </H3>
            {selectedDate === today && (
              <View style={[styles.todayBadge, { backgroundColor: COLORS.primary + '15' }]}>
                <Caption style={{ color: COLORS.primary, fontWeight: '800' }}>TODAY</Caption>
              </View>
            )}
          </View>

          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.map((event, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.eventCard, { borderLeftColor: COLORS[event.type] || COLORS.border, backgroundColor: COLORS.surface }]}
                onPress={() => event.type === 'training' && router.push(`/training/${event.original?._id}`)}
              >
                <View style={[styles.eventIconContainer, { backgroundColor: COLORS.gray100 }]}>
                  {event.icon}
                </View>
                <View style={styles.eventInfo}>
                  <Body style={{ fontWeight: '700' }}>{event.title}</Body>
                  <Caption secondary>{event.details}</Caption>
                </View>
                <ChevronRight size={18} color={COLORS.gray400} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Body secondary>No activities logged for this day</Body>
            </View>
          )}
        </View>
        
        {selectedDate !== today && (
          <TouchableOpacity 
            style={[styles.todayButton, { backgroundColor: COLORS.primary }]}
            onPress={() => {
              setSelectedDate(today);
              setVisibleMonth(new Date(today));
              processMarkedDates(events, today);
            }}
          >
            <Body style={{ color: COLORS.surface, fontWeight: '700' }}>Go to Today</Body>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  calendarCard: {
    marginBottom: 24,
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
    gap: 12,
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
});

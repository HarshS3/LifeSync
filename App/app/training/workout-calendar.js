import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, TouchableOpacity, SafeAreaView, 
  ScrollView, ActivityIndicator, Dimensions 
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Activity, Dumbbell } from 'lucide-react-native';
import api from '../../services/api';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H3, Body, Caption } from '../../components/ui/Typography';

const { width } = Dimensions.get('window');

export default function WorkoutCalendarScreen() {
  const router = useRouter();
  const { COLORS, SHADOWS } = useTheme();
  const params = useLocalSearchParams();
  const today = new Date().toISOString().split('T')[0];

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(params.date || today);
  const [workouts, setWorkouts] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [visibleMonth, setVisibleMonth] = useState(new Date(selectedDate));

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gym/workouts');
      const workoutData = Array.isArray(res.data) ? res.data : [];
      setWorkouts(workoutData);
      processMarkedDates(workoutData, selectedDate);
    } catch (err) {
      console.error('Workout calendar fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const processMarkedDates = (workoutList, selected) => {
    const marks = {};
    
    workoutList.forEach(w => {
      const d = new Date(w.date).toISOString().split('T')[0];
      marks[d] = {
        selected: true,
        selectedColor: COLORS.training + '30',
        selectedTextColor: COLORS.text,
      };
    });

    if (!marks[selected]) {
        marks[selected] = {};
    }
    marks[selected] = {
        ...marks[selected],
        selected: true,
        selectedColor: COLORS.training,
        selectedTextColor: COLORS.primaryContrast,
    };

    setMarkedDates(marks);
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    processMarkedDates(workouts, day.dateString);
  };

  const selectedDayWorkouts = workouts.filter(w => {
    const d = new Date(w.date).toISOString().split('T')[0];
    return d === selectedDate;
  });

  return (
    <ScreenWrapper title="Workout History">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card padding={10} style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={handleDayPress}
            onMonthChange={(month) => setVisibleMonth(new Date(month.dateString))}
            markedDates={markedDates}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: COLORS.textSecondary,
              selectedDayBackgroundColor: COLORS.training,
              selectedDayTextColor: COLORS.primaryContrast,
              todayTextColor: COLORS.info,
              dayTextColor: COLORS.text,
              textDisabledColor: COLORS.gray400,
              arrowColor: COLORS.training,
              disabledArrowColor: COLORS.gray300,
              monthTextColor: COLORS.text,
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '700',
              textDayFontSize: 14,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 12
            }}
          />
          {loading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator color={COLORS.training} />
            </View>
          )}
        </Card>

        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <H3>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', { 
                weekday: 'long', month: 'long', day: 'numeric' 
              })}
            </H3>
            {selectedDate === today && (
              <View style={[styles.todayBadge, { backgroundColor: COLORS.training + '15' }]}>
                <Caption style={{ color: COLORS.training, fontWeight: '800' }}>TODAY</Caption>
              </View>
            )}
          </View>

          {selectedDayWorkouts.length > 0 ? (
            selectedDayWorkouts.map((w, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.workoutCard, { backgroundColor: COLORS.surface, borderLeftColor: COLORS.training }]}
                onPress={() => router.push(`/training/${w._id}`)}
              >
                <View style={[styles.iconContainer, { backgroundColor: COLORS.training + '15' }]}>
                  <Dumbbell size={20} color={COLORS.training} />
                </View>
                <View style={styles.info}>
                  <Body style={{ fontWeight: '700' }}>{w.name || 'Workout'}</Body>
                  <Caption secondary>
                    {w.exercises?.length || 0} exercises · {w.duration || 0} min
                  </Caption>
                </View>
                <ChevronRight size={18} color={COLORS.gray400} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Body secondary style={{ marginBottom: 16 }}>No workouts recorded for this day</Body>
              <TouchableOpacity 
                style={[styles.startBtn, { backgroundColor: COLORS.training + '15' }]}
                onPress={() => router.push('/training/active')}
              >
                <Body style={{ color: COLORS.training, fontWeight: '700' }}>Start a Workout</Body>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {selectedDate !== today && (
        <TouchableOpacity 
          style={[styles.todayButton, { backgroundColor: COLORS.primary }]}
          onPress={() => {
            setSelectedDate(today);
            setVisibleMonth(new Date(today));
            processMarkedDates(workouts, today);
          }}
        >
          <Body style={{ color: COLORS.primaryContrast, fontWeight: '700' }}>Go to Today</Body>
        </TouchableOpacity>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  calendarCard: {
    marginBottom: 24,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
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
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  workoutCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  todayButton: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
});


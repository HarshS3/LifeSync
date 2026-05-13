import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, TouchableOpacity, Text, SafeAreaView, 
  ScrollView, ActivityIndicator, Dimensions 
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Activity, Dumbbell } from 'lucide-react-native';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const COLORS = {
  workout: '#3b82f6', // Blue for workouts
  bg: '#f6f1e7',
  surface: '#ffffff',
  text: '#161310',
  muted: 'rgba(22,19,16,0.62)',
  border: 'rgba(22,19,16,0.10)',
};

export default function WorkoutCalendarScreen() {
  const router = useRouter();
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
        selectedColor: COLORS.workout + '30',
        selectedTextColor: COLORS.text,
      };
    });

    if (!marks[selected]) {
        marks[selected] = {};
    }
    marks[selected] = {
        ...marks[selected],
        selected: true,
        selectedColor: COLORS.workout,
        selectedTextColor: '#ffffff',
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Workout History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={handleDayPress}
            onMonthChange={(month) => setVisibleMonth(new Date(month.dateString))}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: COLORS.muted,
              selectedDayBackgroundColor: COLORS.workout,
              selectedDayTextColor: '#ffffff',
              todayTextColor: COLORS.workout,
              dayTextColor: COLORS.text,
              textDisabledColor: '#d1d5db',
              arrowColor: COLORS.workout,
              disabledArrowColor: '#d1d5db',
              monthTextColor: COLORS.text,
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
              <ActivityIndicator color={COLORS.workout} />
            </View>
          )}
        </View>

        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { 
                weekday: 'long', month: 'long', day: 'numeric' 
              })}
            </Text>
            {selectedDate === today && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>TODAY</Text>
              </View>
            )}
          </View>

          {selectedDayWorkouts.length > 0 ? (
            selectedDayWorkouts.map((w, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.workoutCard}
                onPress={() => router.push(`/training/${w._id}`)}
              >
                <View style={styles.iconContainer}>
                  <Dumbbell size={20} color={COLORS.workout} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.workoutName}>{w.name || 'Workout'}</Text>
                  <Text style={styles.workoutDetails}>
                    {w.exercises?.length || 0} exercises · {w.duration || 0} min
                  </Text>
                </View>
                <ChevronRight size={18} color={COLORS.muted} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No workouts recorded for this day</Text>
              <TouchableOpacity 
                style={styles.startBtn}
                onPress={() => router.push('/training/active')}
              >
                <Text style={styles.startBtnText}>Start a Workout</Text>
              </TouchableOpacity>
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
            processMarkedDates(workouts, today);
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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  backButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 16,
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 10,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    backgroundColor: COLORS.workout + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.workout,
  },
  workoutCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.workout,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.workout + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  workoutName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  workoutDetails: {
    fontSize: 13,
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
    marginBottom: 16,
  },
  startBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.workout + '15',
  },
  startBtnText: {
    color: COLORS.workout,
    fontWeight: '700',
    fontSize: 14,
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

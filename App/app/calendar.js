import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';

export default function CalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo || '/(tabs)';
  const today = new Date().toISOString().split('T')[0];

  const handleSelect = (dateStr) => {
    router.replace({
      pathname: returnTo,
      params: { date: dateStr }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Date</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={(day) => handleSelect(day.dateString)}
          maxDate={today}
          markedDates={{
            [today]: { selected: true, selectedColor: '#e5e7eb', selectedTextColor: '#000' }
          }}
          theme={{
            todayTextColor: '#3b82f6',
            arrowColor: '#3b82f6',
            selectedDayBackgroundColor: '#3b82f6',
            selectedDayTextColor: '#ffffff',
          }}
        />
      </View>
      
      <TouchableOpacity 
        style={styles.todayButton}
        onPress={() => handleSelect(today)}
      >
        <Text style={styles.todayButtonText}>Go to Today</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  calendarContainer: {
    padding: 10,
  },
  todayButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  todayButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

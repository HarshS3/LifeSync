import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Info, Play, Activity as ActivityIcon } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import api from '../../services/api';
import MuscleHeatmap from '../../components/MuscleHeatmap';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Body, Caption, H3 } from '../../components/ui/Typography';

export default function HeatmapScreen() {
  const router = useRouter();
  const { COLORS } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const [selectedRange, setSelectedRange] = useState('7'); // '7' | '15' | '30' | 'custom'
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectingState, setSelectingState] = useState('start'); // 'start' | 'end'

  const fetchStats = async (range, start = null, end = null) => {
    setLoading(true);
    try {
      let url = '/gym/stats';
      if (range === 'custom') {
        if (start && end) {
          url += `?startDate=${start}&endDate=${end}`;
        } else {
          // If no custom range selected yet, default to last 30 days
          const defaultEnd = new Date().toISOString().split('T')[0];
          const defaultStartD = new Date();
          defaultStartD.setDate(defaultStartD.getDate() - 30);
          const defaultStart = defaultStartD.toISOString().split('T')[0];
          url += `?startDate=${defaultStart}&endDate=${defaultEnd}`;
        }
      } else {
        url += `?days=${range}`;
      }
      const res = await api.get(url).catch(() => ({ data: null }));
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats for heatmap', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRange !== 'custom') {
      fetchStats(selectedRange);
    } else {
      if (startDate && endDate) {
        fetchStats('custom', startDate, endDate);
      } else {
        const defaultEnd = new Date().toISOString().split('T')[0];
        const defaultStartD = new Date();
        defaultStartD.setDate(defaultStartD.getDate() - 30);
        const defaultStart = defaultStartD.toISOString().split('T')[0];
        fetchStats('custom', defaultStart, defaultEnd);
      }
    }
  }, [selectedRange]);

  const handleDayPress = (day) => {
    const dateStr = day.dateString;
    if (selectingState === 'start') {
      setStartDate(dateStr);
      setEndDate(null);
      setSelectingState('end');
    } else {
      if (new Date(dateStr) < new Date(startDate)) {
        setStartDate(dateStr);
        setEndDate(null);
        setSelectingState('end');
      } else {
        setEndDate(dateStr);
        setSelectingState('start');
        fetchStats('custom', startDate, dateStr);
      }
    }
  };

  const getMarkedDates = () => {
    const marks = {};
    if (startDate) {
      marks[startDate] = { startingDay: true, color: COLORS.primary, textColor: '#ffffff' };
    }
    if (endDate) {
      marks[endDate] = { endingDay: true, color: COLORS.primary, textColor: '#ffffff' };
      
      let current = new Date(startDate);
      const end = new Date(endDate);
      while (current < end) {
        current.setDate(current.getDate() + 1);
        const yyyymmdd = current.toISOString().split('T')[0];
        if (yyyymmdd !== endDate) {
          marks[yyyymmdd] = { color: COLORS.primary + '30', textColor: COLORS.text };
        }
      }
    } else if (startDate && selectingState === 'end') {
      marks[startDate] = { startingDay: true, endingDay: true, color: COLORS.primary, textColor: '#ffffff' };
    }
    return marks;
  };

  // Map muscle distribution to heatmap slugs.
  // Some muscles (back, shoulders) produce multiple SVG entries so all relevant
  // paths are highlighted at the correct intensity.
  const muscleHeatmapData = stats?.muscleDistribution ? (() => {
    // slug(s) per API muscle key — arrays are expanded to multiple heatmap entries
    const slugMap = {
      'chest':      ['chest'],
      'back':       ['upper-back', 'lower-back', 'trapezius'],   // back includes upper-back, lower-back, and trapezius
      'shoulders':  ['front-deltoids', 'back-deltoids'],
      'biceps':     ['biceps'],
      'triceps':    ['triceps'],
      'legs':       ['quadriceps', 'hamstring'],    // generic 'legs' hits both
      'quads':      ['quadriceps'],
      'hamstrings': ['hamstring'],
      'abs':        ['abs', 'obliques'],
      'core':       ['abs', 'obliques'],
      'glutes':     ['gluteal'],
      'calves':     ['calves'],
      'forearms':   ['forearms'],
      'traps':      ['trapezius'],
      'lats':       ['upper-back'],
      'adductors':  ['adductors'],
    };

    const entries = [];
    const seen = {};  // track duplicates and keep max intensity

    for (const [muscle, count] of Object.entries(stats.muscleDistribution)) {
      // Scale intensity: 1 set = 1, 3 sets = 2, 6 sets = 3, 10+ sets = 4
      let intensity = 1;
      if (count > 10) intensity = 4;
      else if (count > 6) intensity = 3;
      else if (count > 2) intensity = 2;

      const slugs = slugMap[muscle.toLowerCase()] || [muscle.toLowerCase()];
      for (const slug of slugs) {
        // If the same slug appears twice (e.g. 'legs' and 'quads' → quadriceps)
        // keep the higher intensity so the colour is accurate
        if (seen[slug] !== undefined) {
          if (intensity > seen[slug]) {
            seen[slug] = intensity;
            const idx = entries.findIndex(e => e.slug === slug);
            if (idx !== -1) entries[idx].intensity = intensity;
          }
        } else {
          seen[slug] = intensity;
          entries.push({ slug, intensity });
        }
      }
    }

    return entries;
  })() : [];

  return (
    <ScreenWrapper title="Muscle Distribution">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={[styles.infoCard, { backgroundColor: COLORS.training + '10' }]} padding={16}>
          <ActivityIcon size={20} color={COLORS.training} />
          <Body style={{ color: COLORS.training, flex: 1 }}>
            This heatmap shows your training intensity across different muscle groups based on your workout history.
          </Body>
        </Card>

        <Card style={styles.filterCard} padding={12}>
          <Caption style={{ marginBottom: 8, fontWeight: '700', color: COLORS.textSecondary }}>SELECT RANGE</Caption>
          <View style={styles.btnRow}>
            {[
              { label: '7 Days', value: '7' },
              { label: '15 Days', value: '15' },
              { label: '30 Days', value: '30' },
              { label: 'Custom', value: 'custom' }
            ].map((btn) => (
              <TouchableOpacity
                key={btn.value}
                style={[
                  styles.filterBtn,
                  selectedRange === btn.value
                    ? { backgroundColor: COLORS.primary }
                    : { backgroundColor: COLORS.gray100 }
                ]}
                onPress={() => {
                  setSelectedRange(btn.value);
                  if (btn.value === 'custom') {
                    if (!startDate || !endDate) {
                      const end = new Date().toISOString().split('T')[0];
                      const startD = new Date();
                      startD.setDate(startD.getDate() - 30);
                      const start = startD.toISOString().split('T')[0];
                      setStartDate(start);
                      setEndDate(end);
                      setSelectingState('start');
                    }
                  }
                }}
              >
                <Body
                  style={[
                    styles.btnText,
                    selectedRange === btn.value
                      ? { color: COLORS.surface, fontWeight: '700' }
                      : { color: COLORS.textSecondary }
                  ]}
                >
                  {btn.label}
                </Body>
              </TouchableOpacity>
            ))}
          </View>

          {selectedRange === 'custom' && (
            <View style={styles.calendarContainer}>
              <Body style={{ marginVertical: 8, fontWeight: '600', color: COLORS.text }}>
                {startDate && endDate 
                  ? `Range: ${startDate} to ${endDate}` 
                  : startDate 
                    ? `Select End Date (Start: ${startDate})` 
                    : 'Select Start Date'}
              </Body>
              <Calendar
                markingType={'period'}
                onDayPress={handleDayPress}
                markedDates={getMarkedDates()}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'transparent',
                  textSectionTitleColor: COLORS.textSecondary,
                  selectedDayBackgroundColor: COLORS.primary,
                  selectedDayTextColor: COLORS.surface,
                  todayTextColor: COLORS.primary,
                  dayTextColor: COLORS.text,
                  textDisabledColor: COLORS.gray300,
                  arrowColor: COLORS.primary,
                  disabledArrowColor: COLORS.gray300,
                  monthTextColor: COLORS.text,
                  indicatorColor: COLORS.primary,
                  textDayFontWeight: '400',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '600',
                  textDayFontSize: 13,
                  textMonthFontSize: 15,
                  textDayHeaderFontSize: 11
                }}
              />
            </View>
          )}
        </Card>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : muscleHeatmapData.length > 0 ? (
          <View style={styles.heatmapContainer}>
            <MuscleHeatmap data={muscleHeatmapData} />
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: COLORS.gray100 }]}>
              <Info size={32} color={COLORS.gray400} />
            </View>
            <H3 style={{ marginBottom: 8 }}>No Data Available</H3>
            <Body secondary style={{ textAlign: 'center', paddingHorizontal: 40, marginBottom: 24 }}>
              Log some workouts with exercises in this range to see your muscle distribution heatmap!
            </Body>
            <TouchableOpacity 
              style={[styles.emptyAction, { backgroundColor: COLORS.primary }]}
              onPress={() => router.push('/training/active')}
            >
              <Play size={16} color={COLORS.surface} />
              <Body style={{ color: COLORS.surface, fontWeight: '700' }}>Start Workout</Body>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    padding: 60,
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  filterCard: {
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterBtn: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 13,
  },
  calendarContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(22,19,16,0.05)',
    paddingTop: 8,
  },
  heatmapContainer: {
    paddingBottom: 40,
  },
  emptyContainer: { 
    paddingVertical: 60,
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
});

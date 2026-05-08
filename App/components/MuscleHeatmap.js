import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Body from 'react-native-body-highlighter';
import { useTheme } from '../constants/Theme';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Stable heatmap color palette with a 6th color (blue) for selection
const HEATMAP_COLORS = ['#e5e7eb', '#fed7aa', '#fb923c', '#ea580c', '#9a3412', '#3b82f6'];

export default function MuscleHeatmap({ data = [], gender = 'male' }) {
  const { COLORS, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, SPACING } = useTheme();
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [side, setSide] = useState('front');

  // Memoize data and inject highlight intensity (index 5) for selected muscle
  const heatmapData = useMemo(() => {
    // 1. Mark existing data if selected
    const updatedData = data.map(item => ({
      ...item,
      intensity: item.slug === selectedMuscle ? 5 : item.intensity
    }));

    // 2. If selected muscle has no training data, add it as a highlight
    if (selectedMuscle && !updatedData.some(d => d.slug === selectedMuscle)) {
      updatedData.push({ slug: selectedMuscle, intensity: 5 });
    }

    return updatedData;
  }, [data, selectedMuscle]);

  const handleMusclePress = (bodyPart) => {
    if (!bodyPart || !bodyPart.slug) return;
    
    // Trigger haptics non-blockingly
    Haptics.selectionAsync().catch(() => {});
    
    setSelectedMuscle(prev => prev === bodyPart.slug ? null : bodyPart.slug);
  };

  const muscleStyles = styles(COLORS, BORDER_RADIUS, SHADOWS, SPACING);

  return (
    <View style={muscleStyles.container}>
      <View style={muscleStyles.header}>
        <View>
          <Text style={[TYPOGRAPHY.h3, { color: COLORS.text }]}>Muscle Heatmap</Text>
          <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>Training volume distribution</Text>
        </View>
        <TouchableOpacity
          style={muscleStyles.toggleButton}
          onPress={() => setSide(side === 'front' ? 'back' : 'front')}
        >
          <Text style={[TYPOGRAPHY.label, { color: COLORS.primary }]}>
            {side === 'front' ? 'Back View' : 'Front View'}
          </Text>
          {side === 'front' ? <ChevronRight size={14} color={COLORS.primary} /> : <ChevronLeft size={14} color={COLORS.primary} />}
        </TouchableOpacity>
      </View>

      <View style={muscleStyles.bodyContainer}>
        <View style={muscleStyles.visualizer}>
          <Body
            data={heatmapData}
            gender={gender}
            side={side}
            scale={1.0}
            width={width - 40}
            height={320}
            onBodyPartPress={handleMusclePress}
            colors={HEATMAP_COLORS}
          />
        </View>

        <View style={muscleStyles.infoPanel}>
          {selectedMuscle ? (
            <View style={muscleStyles.selectionCard}>
              <View style={muscleStyles.selectionHeader}>
                <Text style={[TYPOGRAPHY.label, { color: COLORS.textSecondary, textTransform: 'uppercase' }]}>Selected</Text>
                <TouchableOpacity onPress={() => setSelectedMuscle(null)}>
                  <X size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[TYPOGRAPHY.h2, { color: COLORS.primary, textTransform: 'capitalize', marginTop: 4 }]}>
                {selectedMuscle.replace(/-/g, ' ')}
              </Text>
              <View style={muscleStyles.tag}>
                <Text style={[TYPOGRAPHY.caption, { color: COLORS.training, fontWeight: '700' }]}>Targeted</Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={[TYPOGRAPHY.label, { color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8 }]}>Legend</Text>
              <View style={muscleStyles.legendRow}>
                <View style={[muscleStyles.legendBox, { backgroundColor: HEATMAP_COLORS[0] }]} />
                <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>Resting</Text>
              </View>
              <View style={muscleStyles.legendRow}>
                <View style={[muscleStyles.legendBox, { backgroundColor: HEATMAP_COLORS[2] }]} />
                <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>Active</Text>
              </View>
              <View style={muscleStyles.legendRow}>
                <View style={[muscleStyles.legendBox, { backgroundColor: HEATMAP_COLORS[4] }]} />
                <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>High Intensity</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = (COLORS, BORDER_RADIUS, SHADOWS, SPACING) => StyleSheet.create({
  container: {
    backgroundColor: COLORS?.surface || '#fff',
    borderRadius: BORDER_RADIUS?.lg || 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS?.border || '#eee',
    ...SHADOWS,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS?.gray100 || '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  bodyContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    height: 450,
    marginTop: 10,
  },
  visualizer: {
    width: '100%',
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPanel: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  selectionCard: {
    backgroundColor: COLORS?.gray100 || '#f3f4f6',
    padding: 12,
    borderRadius: 12,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS?.trainingBg || '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  }
});

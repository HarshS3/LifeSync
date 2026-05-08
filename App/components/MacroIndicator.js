import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../constants/Theme';

export default function MacroIndicator({ label, value, target, color, unit = 'g' }) {
  const { COLORS, SPACING, TYPOGRAPHY } = useTheme();
  const percentage = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  
  return (
    <View style={styles(SPACING).container}>
      <View style={styles(SPACING).header}>
        <Text style={[TYPOGRAPHY.label, { fontSize: 14, color: COLORS.textSecondary }]}>{label}</Text>
        <Text style={[TYPOGRAPHY.label, { fontSize: 14, color: COLORS.text }]}>
          {Math.round(value)}{unit} <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary, fontWeight: '400' }]}>/ {target}{unit}</Text>
        </Text>
      </View>
      <View style={[styles(SPACING).barBackground, { backgroundColor: COLORS.gray100 }]}>
        <View 
          style={[
            styles(SPACING).barForeground, 
            { width: `${percentage}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = (SPACING) => StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.xs,
  },
  barBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barForeground: {
    height: '100%',
    borderRadius: 4,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MacroIndicator({ label, value, target, color, unit = 'g' }) {
  const percentage = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{Math.round(value)}{unit} <Text style={styles.target}>/ {target}{unit}</Text></Text>
      </View>
      <View style={styles.barBackground}>
        <View 
          style={[
            styles.barForeground, 
            { width: `${percentage}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  target: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  barBackground: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barForeground: {
    height: '100%',
    borderRadius: 4,
  },
});

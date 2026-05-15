import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../constants/Theme';

export function ProgressBar({ value, color, height = 6 }) {
  const { COLORS } = useTheme();
  
  return (
    <View style={[
      styles.track, 
      { 
        backgroundColor: COLORS.gray200,
        height,
        borderRadius: height / 2
      }
    ]}>
      <View style={[
        styles.fill, 
        { 
          width: `${Math.max(0, Math.min(100, value))}%`, 
          backgroundColor: color || COLORS.primary,
          height,
          borderRadius: height / 2
        }
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

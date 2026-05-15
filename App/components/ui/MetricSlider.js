import React, { useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';

const SCREEN_W = Dimensions.get('window').width;

export function MetricSlider({ 
  value, 
  min = 1, 
  max = 10, 
  step = 1, 
  onChange, 
  disabled, 
  label, 
  icon, 
  unit = '/10',
  color
}) {
  const { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } = useTheme();
  const trackRef = useRef(null);
  const trackX    = useRef(0);
  const trackW    = useRef(220);

  const clamp = (v) => Math.min(max, Math.max(min, v));
  const snap  = (v) => Math.round(v / step) * step;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder:  () => !disabled,
      onPanResponderGrant: (e) => {
        if (disabled) return;
        handlePositionChange(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e) => {
        if (disabled) return;
        handlePositionChange(e.nativeEvent.pageX);
      },
    })
  ).current;

  const handlePositionChange = (pageX) => {
    const x = pageX - trackX.current;
    const pct = Math.max(0, Math.min(1, x / trackW.current));
    const newValue = snap(clamp(min + pct * (max - min)));
    if (newValue !== value) {
      Haptics.selectionAsync();
      onChange && onChange(newValue);
    }
  };

  const pct = (value - min) / (max - min);
  const activeColor = color || COLORS.primary;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.label, { color: COLORS.text }]}>{label}</Text>
        <Text style={[styles.value, { color: activeColor }]}>{value}{unit}</Text>
      </View>
      
      <View
        ref={trackRef}
        style={[styles.track, { backgroundColor: COLORS.gray200 }]}
        onLayout={(e) => {
          trackW.current = e.nativeEvent.layout.width;
          trackRef.current?.measure((fx, fy, w, h, px) => { trackX.current = px; });
        }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.trackFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: activeColor }]} />
        <View style={[
          styles.thumb, 
          { 
            left: `${Math.round(pct * 100)}%`, 
            backgroundColor: disabled ? COLORS.gray400 : activeColor,
            ...SHADOWS
          }
        ]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  trackFill: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -7,
    marginLeft: -10,
  },
});

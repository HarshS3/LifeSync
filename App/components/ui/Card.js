import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../constants/Theme';

export function Card({ children, style, padding, onPress }) {
  const { COLORS, BORDER_RADIUS, SHADOWS, SPACING } = useTheme();
  
  const cardStyle = [
    styles.card,
    {
      backgroundColor: COLORS.surface,
      borderRadius: BORDER_RADIUS.lg,
      borderColor: COLORS.border,
      padding: padding !== undefined ? padding : SPACING.lg,
      ...SHADOWS
    },
    style
  ];

  if (onPress) {
    return (
      <TouchableOpacity 
        style={cardStyle} 
        onPress={onPress} 
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    marginBottom: 16,
  },
});

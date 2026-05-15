import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../constants/Theme';

export function H1({ children, style, color, selectable = true }) {
  const { TYPOGRAPHY, COLORS } = useTheme();
  return (
    <Text 
      selectable={selectable}
      style={[
        TYPOGRAPHY.h1, 
        { color: color || COLORS.text }, 
        style
      ]}
    >
      {children}
    </Text>
  );
}

export function H2({ children, style, color, selectable = true }) {
  const { TYPOGRAPHY, COLORS } = useTheme();
  return (
    <Text 
      selectable={selectable}
      style={[
        TYPOGRAPHY.h2, 
        { color: color || COLORS.text }, 
        style
      ]}
    >
      {children}
    </Text>
  );
}

export function H3({ children, style, color, selectable = true }) {
  const { TYPOGRAPHY, COLORS } = useTheme();
  return (
    <Text 
      selectable={selectable}
      style={[
        TYPOGRAPHY.h3, 
        { color: color || COLORS.text }, 
        style
      ]}
    >
      {children}
    </Text>
  );
}

export function Body({ children, style, color, secondary, selectable = true }) {
  const { TYPOGRAPHY, COLORS } = useTheme();
  return (
    <Text 
      selectable={selectable}
      style={[
        TYPOGRAPHY.body, 
        { color: color || (secondary ? COLORS.textSecondary : COLORS.text) }, 
        style
      ]}
    >
      {children}
    </Text>
  );
}

export function Caption({ children, style, color, selectable = true }) {
  const { TYPOGRAPHY, COLORS } = useTheme();
  return (
    <Text 
      selectable={selectable}
      style={[
        TYPOGRAPHY.caption, 
        { color: color || COLORS.textSecondary }, 
        style
      ]}
    >
      {children}
    </Text>
  );
}

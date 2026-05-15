import { useColorScheme } from 'react-native';

export const COLORS = {
  light: {
    primary: '#000000',
    secondary: '#666666',
    background: '#f6f1e7',
    surface: '#ffffff',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
    
    // Feature Specific
    readiness: '#0284c7',
    readinessBg: '#f0f9ff',
    load: '#db2777',
    loadBg: '#fdf2f8',
    nutrition: '#ef4444',
    nutritionBg: '#fef2f2',
    training: '#3b82f6',
    trainingBg: '#eff6ff',
    wellness: '#8b5cf6',
    wellnessBg: '#f5f3ff',
    insight: '#7c3aed',
    insightBg: '#f5f3ff',
    
    // Grays
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    border: '#eeeeee',
    text: '#000000',
    textSecondary: '#666666',
  },
  dark: {
    primary: '#ffffff',
    secondary: '#a1a1aa',
    background: '#000000',
    surface: '#121212',
    error: '#f87171',
    success: '#34d399',
    warning: '#fbbf24',
    info: '#60a5fa',
    
    // Feature Specific
    readiness: '#38bdf8',
    readinessBg: '#0c4a6e',
    load: '#f472b6',
    loadBg: '#500724',
    nutrition: '#f87171',
    nutritionBg: '#450a0a',
    training: '#60a5fa',
    trainingBg: '#1e3a8a',
    wellness: '#a78bfa',
    wellnessBg: '#2e1065',
    insight: '#a78bfa',
    insightBg: '#2e1065',
    
    // Grays
    gray100: '#1f2937',
    gray200: '#374151',
    gray300: '#4b5563',
    gray400: '#9ca3af',
    gray500: '#d1d5db',
    gray600: '#e5e7eb',
    gray700: '#f3f4f6',
    border: '#27272a',
    text: '#ffffff',
    textSecondary: '#a1a1aa',
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 0, // Shadows are less prominent in dark mode
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  h3: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
};

export const useTheme = () => {
  const theme = 'light'; // Force light theme for consistency with cream branding
  
  return {
    COLORS: COLORS[theme],
    SPACING,
    BORDER_RADIUS,
    SHADOWS: SHADOWS[theme],
    TYPOGRAPHY,
    isDark: theme === 'dark',
  };
};

export default {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  TYPOGRAPHY,
};

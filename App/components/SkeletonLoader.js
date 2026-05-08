import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../constants/Theme';

export default function SkeletonLoader({ width, height, style, borderRadius }) {
  const { COLORS, BORDER_RADIUS } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        { backgroundColor: COLORS.gray100 },
        { width, height, borderRadius: borderRadius || BORDER_RADIUS.md, opacity },
        style,
      ]}
    />
  );
}

export const SkeletonDashboard = () => {
  const { COLORS, BORDER_RADIUS } = useTheme();
  const themedStyles = styles(COLORS, BORDER_RADIUS);
  return (
    <View style={themedStyles.container}>
        <View style={themedStyles.header}>
        <SkeletonLoader width={150} height={30} />
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        </View>
        <View style={themedStyles.heroSection}>
        <SkeletonLoader width={160} height={160} borderRadius={80} />
        <View style={{ marginLeft: 20 }}>
            <SkeletonLoader width={100} height={20} style={{ marginBottom: 10 }} />
            <SkeletonLoader width={100} height={20} />
        </View>
        </View>
        <View style={themedStyles.grid}>
        {[...Array(4)].map((_, i) => (
            <SkeletonLoader key={i} width="22%" height={80} style={{ marginBottom: 10 }} />
        ))}
        </View>
    </View>
  );
};

export const SkeletonNutrition = () => {
  const { COLORS, BORDER_RADIUS } = useTheme();
  const themedStyles = styles(COLORS, BORDER_RADIUS);
  return (
    <View style={themedStyles.container}>
        <View style={themedStyles.header}>
        <SkeletonLoader width={120} height={30} />
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        </View>
        <View style={themedStyles.card}>
        <SkeletonLoader width="100%" height={200} borderRadius={20} />
        </View>
        <View style={themedStyles.grid}>
        {[...Array(2)].map((_, i) => (
            <SkeletonLoader key={i} width="48%" height={60} />
        ))}
        </View>
        <View style={themedStyles.card}>
        <SkeletonLoader width="100%" height={80} borderRadius={16} />
        </View>
    </View>
  );
};

export const SkeletonTraining = () => {
  const { COLORS, BORDER_RADIUS } = useTheme();
  const themedStyles = styles(COLORS, BORDER_RADIUS);
  return (
    <View style={themedStyles.container}>
        <View style={themedStyles.header}>
          <SkeletonLoader width={140} height={30} />
          <SkeletonLoader width={40} height={40} borderRadius={20} />
        </View>
        <SkeletonLoader width="100%" height={200} borderRadius={20} style={{ marginBottom: 24 }} />
        <View style={themedStyles.grid}>
          {[...Array(3)].map((_, i) => (
              <SkeletonLoader key={i} width="30%" height={80} style={{ marginBottom: 10 }} />
          ))}
        </View>
        <SkeletonLoader width="100%" height={100} borderRadius={16} style={{ marginBottom: 12 }} />
        <SkeletonLoader width="100%" height={100} borderRadius={16} />
    </View>
  );
};

const styles = (COLORS, BORDER_RADIUS) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  card: {
    marginBottom: 24,
  }
});

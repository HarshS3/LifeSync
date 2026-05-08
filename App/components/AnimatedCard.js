import React, { useEffect } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  FadeInDown,
  Layout
} from 'react-native-reanimated';

export const AnimatedCard = ({ children, index = 0, delay = 100, style }) => {
  return (
    <Animated.View 
      entering={FadeInDown.delay(index * delay).duration(500)}
      layout={Layout.springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
};

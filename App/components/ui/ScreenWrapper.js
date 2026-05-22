import React from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

export function ScreenWrapper({ 
  children, 
  title, 
  headerRight, 
  onBack, 
  showBack = true,
  backgroundColor
}) {
  const { COLORS, TYPOGRAPHY, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const defaultHeaderRight = (
    <TouchableOpacity 
      onPress={() => router.push('/profile')} 
      style={[styles.avatarMini, { backgroundColor: COLORS.primary }]}
    >
      <Text style={[styles.avatarText, { color: COLORS.primaryContrast }]}>
        {user?.name?.charAt(0) || 'U'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[
      styles.container, 
      { backgroundColor: backgroundColor || COLORS.background }
    ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} transparent backgroundColor="transparent" />
      
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          paddingTop: Math.max(insets.top, 20) + 10,
          backgroundColor: backgroundColor || COLORS.background,
          borderBottomColor: COLORS.gray100 
        }
      ]}>
        <View style={styles.headerLeft}>
          {showBack && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ChevronLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.headerTitleContainer}>
          {title && (
            <Text style={[TYPOGRAPHY.h3, { color: COLORS.text }]} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          {headerRight || defaultHeaderRight}
        </View>
      </View>

      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: Platform.OS === 'ios' ? 100 : 110,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  backButton: {
    padding: 8,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Moon, Sun, Bell, LogOut, Shield, Info, Smartphone } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../constants/Theme';
import { useThemeContext } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { COLORS, BORDER_RADIUS } = useTheme();
  const { isDark, toggleTheme } = useThemeContext();
  
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await SecureStore.getItemAsync('lifesync_push');
        if (saved !== null) setPushEnabled(JSON.parse(saved));
      } catch (e) {}
    };
    loadSettings();
  }, []);

  const togglePush = async (value) => {
    setPushEnabled(value);
    try {
      await SecureStore.setItemAsync('lifesync_push', JSON.stringify(value));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error('Failed to save push settings', err);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: logout }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <View style={[styles.header, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={[styles.settingCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            <TouchableOpacity 
              style={styles.settingRow} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleTheme();
              }}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: COLORS.primary + '15' }]}>
                  {isDark ? <Sun size={20} color={COLORS.primary} /> : <Moon size={20} color={COLORS.primary} />}
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: COLORS.text }]}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
                  <Text style={[styles.settingDesc, { color: COLORS.textSecondary }]}>Change app appearance</Text>
                </View>
              </View>
              <Switch 
                value={isDark}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme();
                }}
                trackColor={{ true: COLORS.primary }}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={[styles.settingCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#3b82f615' }]}>
                  <Bell size={20} color="#3b82f6" />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: COLORS.text }]}>Push Notifications</Text>
                  <Text style={[styles.settingDesc, { color: COLORS.textSecondary }]}>Reminders for logging</Text>
                </View>
              </View>
              <Switch 
                value={pushEnabled}
                onValueChange={togglePush}
                trackColor={{ true: '#3b82f6' }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={[styles.settingCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#10b98115' }]}>
                  <Shield size={20} color="#10b981" />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: COLORS.text }]}>Security</Text>
                  <Text style={[styles.settingDesc, { color: COLORS.textSecondary }]}>Password and privacy</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <View style={[styles.divider, { backgroundColor: COLORS.border }]} />

            <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: COLORS.error + '15' }]}>
                  <LogOut size={20} color={COLORS.error} />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: COLORS.error }]}>Sign Out</Text>
                  <Text style={[styles.settingDesc, { color: COLORS.textSecondary }]}>Exit your session</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={[styles.settingCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: COLORS.gray200 }]}>
                  <Smartphone size={20} color={COLORS.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: COLORS.text }]}>Version</Text>
                  <Text style={[styles.settingDesc, { color: COLORS.textSecondary }]}>1.2.0 (Alpha)</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 1,
  },
  settingCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  settingTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  settingDesc: { fontSize: 13 },
  divider: { height: 1, marginHorizontal: 16 },
});

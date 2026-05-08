import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Moon, Sun, Monitor, Bell, Palette } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';

export default function SettingsScreen() {
  const router = useRouter();
  const [themeMode, setThemeMode] = useState('paper'); // 'paper' or 'noir'
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedTheme = await SecureStore.getItemAsync('lifesync_theme');
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
      
      const savedPush = await SecureStore.getItemAsync('lifesync_push');
      if (savedPush !== null) {
        setPushEnabled(JSON.parse(savedPush));
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const toggleTheme = async () => {
    const newTheme = themeMode === 'paper' ? 'noir' : 'paper';
    setThemeMode(newTheme);
    try {
      await SecureStore.setItemAsync('lifesync_theme', newTheme);
      Alert.alert('Theme Changed', `App theme set to ${newTheme === 'noir' ? 'Noir (Dark)' : 'Paper (Light)'}.\n\nNote: Full dark mode implementation requires app restart or context provider.`);
    } catch (err) {
      console.error('Failed to save theme', err);
    }
  };

  const togglePush = async (value) => {
    setPushEnabled(value);
    try {
      await SecureStore.setItemAsync('lifesync_push', JSON.stringify(value));
    } catch (err) {
      console.error('Failed to save push settings', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#f3f4f6' }]}>
                  {themeMode === 'noir' ? <Moon size={20} color="#000" /> : <Sun size={20} color="#000" />}
                </View>
                <View>
                  <Text style={styles.settingTitle}>Color Theme</Text>
                  <Text style={styles.settingDesc}>Current: {themeMode === 'noir' ? 'Noir' : 'Paper'}</Text>
                </View>
              </View>
              <Switch 
                value={themeMode === 'noir'}
                onValueChange={toggleTheme}
                trackColor={{ false: '#e5e7eb', true: '#000' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                  <Bell size={20} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingDesc}>Reminders for logging</Text>
                </View>
              </View>
              <Switch 
                value={pushEnabled}
                onValueChange={togglePush}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 13,
    color: '#666',
  },
});

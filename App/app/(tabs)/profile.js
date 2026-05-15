import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { LogOut, User, Settings, Shield, HelpCircle, Activity, Heart, Scale } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, Body, Caption } from '../../components/ui/Typography';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { COLORS } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const res = await api.get('/users/profile').catch(() => ({ data: null }));
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch profile stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const bio = stats?.biologicalProfile || {};

  return (
    <ScreenWrapper title="Profile" showBack={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={[styles.avatarLarge, { backgroundColor: COLORS.primary }]}>
            <H2 style={{ color: COLORS.surface }}>{user?.name?.charAt(0) || 'U'}</H2>
          </View>
          <H2 style={{ marginTop: 16 }}>{user?.name || 'User'}</H2>
          <Body secondary>{user?.email || 'email@example.com'}</Body>
        </View>

        {/* Bio Stats Grid */}
        <View style={styles.bioGrid}>
          <Card style={styles.bioItem} padding={12}>
            <Scale size={20} color={COLORS.primary} />
            <Body style={{ fontWeight: '700', marginTop: 8 }}>{bio.weight || '--'} kg</Body>
            <Caption secondary>Weight</Caption>
          </Card>
          <Card style={styles.bioItem} padding={12}>
            <Activity size={20} color={COLORS.primary} />
            <Body style={{ fontWeight: '700', marginTop: 8 }}>{bio.height || '--'} cm</Body>
            <Caption secondary>Height</Caption>
          </Card>
          <Card style={styles.bioItem} padding={12}>
            <Heart size={20} color={COLORS.primary} />
            <Body style={{ fontWeight: '700', marginTop: 8 }}>{bio.age || '--'}</Body>
            <Caption secondary>Age</Caption>
          </Card>
        </View>

        {/* Menu Section */}
        <View style={styles.section}>
          <Caption secondary style={styles.sectionTitle}>Preferences</Caption>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/edit')}>
            <User size={22} color={COLORS.text} />
            <Body style={styles.menuText}>Biological Profile</Body>
          </TouchableOpacity>
          
          <Caption secondary style={[styles.sectionTitle, { marginTop: 24 }]}>Settings</Caption>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/settings')}>
            <Settings size={22} color={COLORS.text} />
            <Body style={styles.menuText}>App Settings</Body>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Shield size={22} color={COLORS.text} />
            <Body style={styles.menuText}>Privacy & Security</Body>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <HelpCircle size={22} color={COLORS.text} />
            <Body style={styles.menuText}>Help & Support</Body>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: COLORS.error + '10' }]} 
          onPress={logout}
        >
          <LogOut size={22} color={COLORS.error} />
          <Body style={[styles.logoutText, { color: COLORS.error }]}>Sign Out</Body>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Caption secondary>LifeSync v1.0.0 (Mobile Alpha)</Caption>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  bioItem: {
    flex: 1,
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    marginLeft: 8,
    marginBottom: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  menuText: {
    marginLeft: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 32,
    borderRadius: 16,
    justifyContent: 'center',
  },
  logoutText: {
    marginLeft: 12,
    fontWeight: '700',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
});

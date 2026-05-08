import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { LogOut, User, Settings, Shield, HelpCircle, Target, Activity, Heart, Scale } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const res = await api.get('/users/profile');
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'User'}</Text>
        <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
      </View>

      {/* Bio Stats Grid */}
      <View style={styles.bioGrid}>
        <View style={styles.bioItem}>
          <Scale size={18} color="#666" />
          <Text style={styles.bioValue}>{bio.weight || '--'} kg</Text>
          <Text style={styles.bioLabel}>Weight</Text>
        </View>
        <View style={styles.bioItem}>
          <Activity size={18} color="#666" />
          <Text style={styles.bioValue}>{bio.height || '--'} cm</Text>
          <Text style={styles.bioLabel}>Height</Text>
        </View>
        <View style={styles.bioItem}>
          <Heart size={18} color="#666" />
          <Text style={styles.bioValue}>{bio.age || '--'}</Text>
          <Text style={styles.bioLabel}>Age</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/edit')}>
          <User size={20} color="#333" />
          <Text style={styles.menuText}>Biological Profile</Text>
        </TouchableOpacity>
        
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Settings</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/settings')}>
          <Settings size={20} color="#333" />
          <Text style={styles.menuText}>App Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Shield size={20} color="#333" />
          <Text style={styles.menuText}>Privacy & Security</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <HelpCircle size={20} color="#333" />
          <Text style={styles.menuText}>Help & Support</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <LogOut size={20} color="#ff3b30" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.version}>LifeSync v1.0.0 (Mobile Alpha)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  bioGrid: {
    flexDirection: 'row',
    padding: 24,
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
  },
  bioItem: {
    alignItems: 'center',
    flex: 1,
  },
  bioValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  bioLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    marginLeft: 16,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: '#fff1f0',
  },
  logoutText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#ff3b30',
    fontWeight: '600',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    color: '#ccc',
  },
});

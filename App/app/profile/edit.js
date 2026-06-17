import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform, Switch, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Save, Plus, X, User, Heart, Activity, Utensils, Dumbbell, Brain, Scale, Calendar, Clock, MapPin, Zap } from 'lucide-react-native';
import api from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const SECTION_CONFIG = {
  basic: { title: 'Basic Info', icon: User, color: '#3b82f6', bg: '#eff6ff' },
  body: { title: 'Body Stats', icon: Scale, color: '#10b981', bg: '#ecfdf5' },
  health: { title: 'Health', icon: Heart, color: '#ef4444', bg: '#fef2f2' },
  diet: { title: 'Nutrition', icon: Utensils, color: '#f59e0b', bg: '#fffbeb' },
  training: { title: 'Fitness', icon: Dumbbell, color: '#8b5cf6', bg: '#f5f3ff' },
  mind: { title: 'Mind & Sleep', icon: Brain, color: '#06b6d4', bg: '#ecfeff' },
};

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');

  const [profile, setProfile] = useState({
    name: '',
    age: '',
    gender: '',
    dob: '',
    height: '',
    weight: '',
    bodyFat: '',
    restingHeartRate: '',
    bloodType: '',
    conditions: [],
    allergies: [],
    injuries: [],
    medications: [],
    supplements: [],
    dietType: 'omnivore',
    mealsPerDay: 3,
    avoidFoods: [],
    favoriteFoods: [],
    hydrationGoal: 8,
    trainingExperience: 'intermediate',
    workoutFrequency: 4,
    workoutDuration: 60,
    gymAccess: true,
    trainingPhase: '',
    trainingPhaseStartDate: '',
    chronotype: 'neutral',
    averageSleep: 7,
    defaultSleepTime: '22:30',
    activityLevel: 'moderately_active',
    metabolicGoal: 'maintenance',
  });

  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newInjury, setNewInjury] = useState('');
  const [newAvoidFood, setNewAvoidFood] = useState('');
  const [newFavFood, setNewFavFood] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get('/users/profile');
      const data = res.data;
      
      setProfile(prev => ({
        ...prev,
        ...data,
        gender: data.gender || data.biologicalProfile?.biologicalSex || prev.gender,
        height: String(data.height || data.biologicalProfile?.heightCm || ''),
        weight: String(data.weight || data.biologicalProfile?.weightKg || ''),
        bodyFat: String(data.bodyFat || data.biologicalProfile?.bodyFatPercentage || ''),
        age: String(data.age || data.biologicalProfile?.age || ''),
        dob: data.biologicalProfile?.dob ? data.biologicalProfile.dob.split('T')[0] : (data.dob ? data.dob.split('T')[0] : ''),
        conditions: data.conditions || [],
        allergies: data.allergies || [],
        injuries: data.injuries || [],
        medications: data.medications || [],
        supplements: data.supplements || [],
        avoidFoods: data.avoidFoods || [],
        favoriteFoods: data.favoriteFoods || [],
        dietType: data.biologicalProfile?.dietaryPreference || data.dietType || 'omnivore',
        activityLevel: data.biologicalProfile?.activityLevel || prev.activityLevel || 'moderately_active',
        metabolicGoal: data.biologicalProfile?.metabolicGoal || prev.metabolicGoal || 'maintenance',
        trainingPhase: data.biologicalProfile?.trainingPhase || '',
        trainingPhaseStartDate: data.biologicalProfile?.trainingPhaseStartDate || '',
      }));
    } catch (err) {
      console.error('Failed to load profile', err);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...profile,
        height: profile.height ? Number(profile.height) : undefined,
        weight: profile.weight ? Number(profile.weight) : undefined,
        bodyFat: profile.bodyFat ? Number(profile.bodyFat) : undefined,
        age: profile.age ? Number(profile.age) : undefined,
        biologicalProfile: {
          biologicalSex: profile.gender === 'male' || profile.gender === 'female' ? profile.gender : undefined,
          heightCm: profile.height ? Number(profile.height) : undefined,
          weightKg: profile.weight ? Number(profile.weight) : undefined,
          bodyFatPercentage: profile.bodyFat ? Number(profile.bodyFat) : undefined,
          dob: profile.dob,
          dietaryPreference: profile.dietType,
          activityLevel: profile.activityLevel,
          metabolicGoal: profile.metabolicGoal,
          trainingPhase: profile.trainingPhase || undefined,
          trainingPhaseStartDate: profile.trainingPhaseStartDate || undefined,
        }
      };

      await api.put('/users/profile', payload);
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (err) {
      console.error('Failed to save profile', err);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addChipItem = (field, value, setter) => {
    if (!value.trim()) return;
    if (profile[field].includes(value.trim())) return;
    setProfile(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));
    setter('');
  };

  const removeChipItem = (field, index) => {
    setProfile(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
        <ChevronLeft size={24} color="#000" />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Profile Details</Text>
        <Text style={styles.headerSubtitle}>Refine your biological engine</Text>
      </View>
      <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
        {Object.keys(SECTION_CONFIG).map((key) => {
          const config = SECTION_CONFIG[key];
          const Icon = config.icon;
          const isActive = activeSection === key;
          return (
            <TouchableOpacity 
              key={key} 
              style={[styles.tab, isActive && { backgroundColor: config.color }]}
              onPress={() => setActiveSection(key)}
            >
              <Icon size={18} color={isActive ? '#fff' : config.color} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {config.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const InputLabel = ({ text, icon: Icon, color }) => (
    <View style={styles.labelContainer}>
      {Icon && <Icon size={14} color={color || '#666'} style={{ marginRight: 6 }} />}
      <Text style={styles.label}>{text}</Text>
    </View>
  );

  const SectionHeader = ({ title, subtitle, color, bg }) => {
    const Config = SECTION_CONFIG[activeSection];
    const Icon = Config.icon;
    return (
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconBox, { backgroundColor: Config.bg }]}>
          <Icon size={24} color={Config.color} />
        </View>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderTabs()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {activeSection === 'basic' && (
          <View style={styles.card}>
            <SectionHeader title="Identity" subtitle="Basic identity and demographics" />
            <View style={styles.inputGroup}>
              <InputLabel text="Full Name" />
              <TextInput
                style={styles.input}
                value={profile.name}
                onChangeText={(v) => setProfile(p => ({ ...p, name: v }))}
                placeholder="How should we call you?"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <InputLabel text="Age" />
                <TextInput
                  style={styles.input}
                  value={profile.age}
                  onChangeText={(v) => setProfile(p => ({ ...p, age: v }))}
                  keyboardType="numeric"
                  placeholder="25"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <InputLabel text="Biological Sex" />
                <View style={styles.segmentedControl}>
                  {['male', 'female'].map(g => (
                    <TouchableOpacity 
                      key={g}
                      style={[styles.segmentedItem, profile.gender === g && styles.activeSegmentedItem]}
                      onPress={() => setProfile(p => ({ ...p, gender: g }))}
                    >
                      <Text style={[styles.segmentedText, profile.gender === g && styles.activeSegmentedText]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <InputLabel text="Birth Date" icon={Calendar} />
              <TextInput
                style={styles.input}
                value={profile.dob}
                onChangeText={(v) => setProfile(p => ({ ...p, dob: v }))}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>
        )}

        {activeSection === 'body' && (
          <View style={styles.card}>
            <SectionHeader title="Biometrics" subtitle="Physical dimensions for metabolism" />
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <InputLabel text="Height (cm)" />
                <TextInput
                  style={styles.input}
                  value={profile.height}
                  onChangeText={(v) => setProfile(p => ({ ...p, height: v }))}
                  keyboardType="numeric"
                  placeholder="175"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <InputLabel text="Weight (kg)" />
                <TextInput
                  style={styles.input}
                  value={profile.weight}
                  onChangeText={(v) => setProfile(p => ({ ...p, weight: v }))}
                  keyboardType="numeric"
                  placeholder="70"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <InputLabel text="Body Fat % (Optional)" />
                <TextInput
                  style={styles.input}
                  value={profile.bodyFat}
                  onChangeText={(v) => setProfile(p => ({ ...p, bodyFat: v }))}
                  keyboardType="numeric"
                  placeholder="15"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <InputLabel text="Resting HR" icon={Heart} color="#ef4444" />
                <TextInput
                  style={styles.input}
                  value={profile.restingHeartRate}
                  onChangeText={(v) => setProfile(p => ({ ...p, restingHeartRate: v }))}
                  keyboardType="numeric"
                  placeholder="60"
                />
              </View>
            </View>
          </View>
        )}

        {activeSection === 'health' && (
          <View>
            <View style={styles.card}>
              <SectionHeader title="Medical Profile" subtitle="Allergies and conditions" />
              <View style={styles.inputGroup}>
                <InputLabel text="Conditions" />
                <View style={styles.chipInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={newCondition}
                    onChangeText={setNewCondition}
                    placeholder="Add (e.g. Asthma)"
                  />
                  <TouchableOpacity 
                    style={[styles.plusButton, { backgroundColor: '#ef4444' }]}
                    onPress={() => addChipItem('conditions', newCondition, setNewCondition)}
                  >
                    <Plus size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.chipContainer}>
                  {profile.conditions.map((item, idx) => (
                    <View key={idx} style={[styles.chip, { backgroundColor: '#fee2e2' }]}>
                      <Text style={styles.chipText}>{typeof item === 'object' ? item.name : item}</Text>
                      <TouchableOpacity onPress={() => removeChipItem('conditions', idx)}>
                        <X size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <InputLabel text="Allergies" />
                <View style={styles.chipInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={newAllergy}
                    onChangeText={setNewAllergy}
                    placeholder="Add (e.g. Peanuts)"
                  />
                  <TouchableOpacity 
                    style={[styles.plusButton, { backgroundColor: '#ef4444' }]}
                    onPress={() => addChipItem('allergies', newAllergy, setNewAllergy)}
                  >
                    <Plus size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.chipContainer}>
                  {profile.allergies.map((item, idx) => (
                    <View key={idx} style={[styles.chip, { backgroundColor: '#fee2e2' }]}>
                      <Text style={styles.chipText}>{typeof item === 'object' ? item.name : item}</Text>
                      <TouchableOpacity onPress={() => removeChipItem('allergies', idx)}>
                        <X size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {activeSection === 'diet' && (
          <View style={styles.card}>
            <SectionHeader title="Nutritional Engine" subtitle="Fuel preferences and targets" />
            <InputLabel text="Dietary Preference" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginTop: 8 }}>
              {['omnivore', 'vegetarian', 'vegan', 'keto', 'paleo', 'pescatarian'].map(d => (
                <TouchableOpacity 
                  key={d}
                  style={[styles.outlineChip, profile.dietType === d && styles.activeOutlineChip]}
                  onPress={() => setProfile(p => ({ ...p, dietType: d }))}
                >
                  <Text style={[styles.outlineChipText, profile.dietType === d && styles.activeOutlineChipText]}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <InputLabel text="Metabolic Goal" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginTop: 8 }}>
              {[
                { key: 'aggressive_loss', label: 'Aggressive Cut' },
                { key: 'mild_loss', label: 'Mild Cut' },
                { key: 'maintenance', label: 'Maintenance' },
                { key: 'lean_gain', label: 'Lean Bulk' },
                { key: 'aggressive_gain', label: 'Aggressive Bulk' }
              ].map(g => (
                <TouchableOpacity 
                  key={g.key}
                  style={[styles.outlineChip, profile.metabolicGoal === g.key && styles.activeOutlineChip]}
                  onPress={() => setProfile(p => ({ ...p, metabolicGoal: g.key }))}
                >
                  <Text style={[styles.outlineChipText, profile.metabolicGoal === g.key && styles.activeOutlineChipText]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.inputGroup}>
              <InputLabel text={`Meals Per Day: ${profile.mealsPerDay}`} />
              <View style={styles.segmentedControl}>
                {[2, 3, 4, 5, 6].map(m => (
                  <TouchableOpacity 
                    key={m}
                    style={[styles.segmentedItem, profile.mealsPerDay === m && styles.activeSegmentedItem]}
                    onPress={() => setProfile(p => ({ ...p, mealsPerDay: m }))}
                  >
                    <Text style={[styles.segmentedText, profile.mealsPerDay === m && styles.activeSegmentedText]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <InputLabel text="Foods to Avoid" />
              <View style={styles.chipInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={newAvoidFood}
                  onChangeText={setNewAvoidFood}
                  placeholder="e.g. Sugar"
                />
                <TouchableOpacity 
                  style={[styles.plusButton, { backgroundColor: '#f59e0b' }]}
                  onPress={() => addChipItem('avoidFoods', newAvoidFood, setNewAvoidFood)}
                >
                  <Plus size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.chipContainer}>
                {profile.avoidFoods.map((item, idx) => (
                  <View key={idx} style={[styles.chip, { backgroundColor: '#fef3c7' }]}>
                    <Text style={styles.chipText}>{item}</Text>
                    <TouchableOpacity onPress={() => removeChipItem('avoidFoods', idx)}>
                      <X size={14} color="#f59e0b" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {activeSection === 'training' && (
          <View style={styles.card}>
            <SectionHeader title="Fitness Level" subtitle="Training load and experience" />
            <InputLabel text="Experience Level" />
            <View style={[styles.segmentedControl, { marginTop: 8, marginBottom: 24 }]}>
              {['beginner', 'intermediate', 'advanced'].map(e => (
                <TouchableOpacity 
                  key={e}
                  style={[styles.segmentedItem, profile.trainingExperience === e && styles.activeSegmentedItem]}
                  onPress={() => setProfile(p => ({ ...p, trainingExperience: e }))}
                >
                  <Text style={[styles.segmentedText, profile.trainingExperience === e && styles.activeSegmentedText]}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <InputLabel text="Physical Activity Level (PAL)" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginTop: 8 }}>
              {[
                { key: 'sedentary', label: 'Sedentary' },
                { key: 'lightly_active', label: 'Lightly Active' },
                { key: 'moderately_active', label: 'Moderately Active' },
                { key: 'very_active', label: 'Very Active' },
                { key: 'extra_active', label: 'Extra Active' }
              ].map(act => (
                <TouchableOpacity 
                  key={act.key}
                  style={[styles.outlineChip, profile.activityLevel === act.key && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
                  onPress={() => setProfile(p => ({ ...p, activityLevel: act.key }))}
                >
                  <Text style={[styles.outlineChipText, profile.activityLevel === act.key && { color: '#fff' }]}>
                    {act.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.inputGroup}>
              <InputLabel text={`Weekly Frequency: ${profile.workoutFrequency} sessions`} />
              <View style={styles.segmentedControl}>
                {[1, 2, 3, 4, 5, 6, 7].map(f => (
                  <TouchableOpacity 
                    key={f}
                    style={[styles.segmentedItem, profile.workoutFrequency === f && styles.activeSegmentedItem]}
                    onPress={() => setProfile(p => ({ ...p, workoutFrequency: f }))}
                  >
                    <Text style={[styles.segmentedText, profile.workoutFrequency === f && styles.activeSegmentedText]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleTitle}>Gym Access</Text>
                <Text style={styles.toggleSubtitle}>Include equipment in plans</Text>
              </View>
              <Switch
                value={profile.gymAccess}
                onValueChange={(v) => setProfile(p => ({ ...p, gymAccess: v }))}
                trackColor={{ false: '#e5e7eb', true: '#8b5cf6' }}
                thumbColor="#fff"
              />
            </View>

            <InputLabel text="Training Phase" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8, marginTop: 8 }}>
              {[
                { key: 'bulk', label: 'Bulk' },
                { key: 'cut', label: 'Cut' },
                { key: 'maintenance', label: 'Maintenance' },
                { key: 'recomp', label: 'Recomp' },
              ].map(ph => (
                <TouchableOpacity
                  key={ph.key}
                  style={[styles.outlineChip, profile.trainingPhase === ph.key && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
                  onPress={() => setProfile(p => ({
                    ...p,
                    trainingPhase: ph.key,
                    trainingPhaseStartDate: new Date().toISOString(),
                  }))}
                >
                  <Text style={[styles.outlineChipText, profile.trainingPhase === ph.key && { color: '#fff' }]}>
                    {ph.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {activeSection === 'mind' && (
          <View style={styles.card}>
            <SectionHeader title="Circadian Rhythm" subtitle="Sleep quality and timing" />
            <InputLabel text="Chronotype" />
            <View style={[styles.segmentedControl, { marginTop: 8, marginBottom: 24 }]}>
              {['early-bird', 'neutral', 'night-owl'].map(c => (
                <TouchableOpacity 
                  key={c}
                  style={[styles.segmentedItem, profile.chronotype === c && styles.activeSegmentedItem]}
                  onPress={() => setProfile(p => ({ ...p, chronotype: c }))}
                >
                  <Text style={[styles.segmentedText, profile.chronotype === c && styles.activeSegmentedText]}>
                    {c.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <InputLabel text="Avg Sleep (hrs)" icon={Clock} />
                <TextInput
                  style={styles.input}
                  value={String(profile.averageSleep)}
                  onChangeText={(v) => setProfile(p => ({ ...p, averageSleep: Number(v) }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <InputLabel text="Target Bedtime" icon={Zap} color="#06b6d4" />
                <TextInput
                  style={styles.input}
                  value={profile.defaultSleepTime}
                  onChangeText={(v) => setProfile(p => ({ ...p, defaultSleepTime: v }))}
                  placeholder="22:30"
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', '#fff']}
        style={styles.bottomBlur}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  tabContainer: {
    backgroundColor: '#fff',
    paddingBottom: 16,
  },
  tabScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 4,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  activeSegmentedItem: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentedText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  activeSegmentedText: {
    color: '#0f172a',
  },
  chipInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  outlineChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    backgroundColor: '#fff',
    marginRight: 10,
  },
  activeOutlineChip: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  outlineChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
  },
  activeOutlineChipText: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 18,
    marginTop: 8,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  bottomBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    pointerEvents: 'none',
  },
});

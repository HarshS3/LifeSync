import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, StyleSheet, ScrollView, TouchableOpacity, TextInput, 
  ActivityIndicator, Alert, Platform, Switch, Dimensions, FlatList
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { 
  User, Scale, Heart, Utensils, Dumbbell, Brain, 
  Save, LogOut, ChevronRight, Plus, X, Calendar, 
  Clock, Zap, Settings, Shield, HelpCircle, Moon, Sun,
  Activity, Thermometer, Droplets, Ruler, Clipboard,
  TrendingUp, List, Camera
} from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { useThemeContext } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, H3, Body, Caption } from '../../components/ui/Typography';

const { width } = Dimensions.get('window');

const TAB_CONFIG = [
  { id: 'basic', title: 'Basic', icon: User, color: '#3b82f6' },
  { id: 'body', title: 'Body', icon: Scale, color: '#10b981' },
  { id: 'health', title: 'Health', icon: Heart, color: '#ef4444' },
  { id: 'diet', title: 'Clinical & Diet', icon: Utensils, color: '#f59e0b' },
  { id: 'training', title: 'Training', icon: Dumbbell, color: '#8b5cf6' },
  { id: 'mind', title: 'Mind', icon: Brain, color: '#06b6d4' },
  { id: 'measurements', title: 'Measurements', icon: Ruler, color: '#ec4899' },
  { id: 'composition', title: 'Composition', icon: Clipboard, color: '#6366f1' },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { COLORS, BORDER_RADIUS, SHADOWS } = useTheme();
  const { toggleTheme, isDark } = useThemeContext();

  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [profile, setProfile] = useState({
    // Basic Info
    name: '',
    email: '',
    age: '',
    gender: '',
    dob: '',
    education: '',
    profession: '',
    skills: [],
    
    // Body Stats
    height: '',
    weight: '',
    bodyFat: '',
    restingHeartRate: '',
    bloodType: '',

    // Health
    conditions: [],
    allergies: [],
    injuries: [],
    medications: [],
    supplements: [],
    labMarkers: {
      hemoglobin: { value: '', unit: '' },
      ferritin: { value: '', unit: '' },
      iron: { value: '', unit: '' },
      vitaminB12: { value: '', unit: '' },
      vitaminD: { value: '', unit: '' },
      tsh: { value: '', unit: '' },
      crp: { value: '', unit: '' },
      fastingGlucose: { value: '', unit: '' },
      hba1c: { value: '', unit: '' },
      lipids: {
        totalCholesterol: { value: '', unit: '' },
        ldl: { value: '', unit: '' },
        hdl: { value: '', unit: '' },
        triglycerides: { value: '', unit: '' },
      },
    },
    
    // Diet
    dietType: 'omnivore',
    mealsPerDay: 3,
    fastingWindow: '',
    avoidFoods: [],
    favoriteFoods: [],
    dailyCalorieTarget: '',
    dailyProteinTarget: '',
    hydrationGoal: 8,
    mealSchedule: {
      breakfast: '08:00',
      lunch: '13:00',
      dinner: '20:00',
      snack: '16:00',
    },
    
    // Training
    trainingExperience: 'intermediate',
    preferredWorkouts: [],
    workoutFrequency: 4,
    workoutDuration: 60,
    gymAccess: true,
    homeEquipment: [],
    trainingGoals: [],
    
    // Mind
    chronotype: 'neutral',
    averageSleep: 7,
    defaultSleepTime: '22:30',
    stressTriggers: [],
    motivators: [],
    energyPeakTime: 'morning',
    focusChallenges: [],

    // Measurements & Logs
    bodyMeasurements: {
      waistCm: '', hipCm: '', chestCm: '', neckCm: '', wristCm: '', bicepCm: '', thighCm: '',
    },
    bodyMeasurementLogs: [],
    bodyComposition: {
      date: '', bmi: '', bodyFatPercent: '', fatMassKg: '', smmKg: '', proteinKg: '', 
      mineralKg: '', tbwKg: '', bmrKcal: '', metabolicAge: '', visceralFatLevel: ''
    },
    bodyCompositionLogs: [],
  });

  const [selectedMeasurementIdx, setSelectedMeasurementIdx] = useState(0);
  const [selectedCompositionIdx, setSelectedCompositionIdx] = useState(0);

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
        
        // Ensure arrays exist
        conditions: data.conditions || [],
        allergies: data.allergies || [],
        injuries: data.injuries || [],
        medications: data.medications || [],
        supplements: data.supplements || [],
        avoidFoods: data.avoidFoods || [],
        favoriteFoods: data.favoriteFoods || [],
        skills: data.skills || [],
        preferredWorkouts: data.preferredWorkouts || [],
        homeEquipment: data.homeEquipment || [],
        trainingGoals: data.trainingGoals || [],
        stressTriggers: data.stressTriggers || [],
        motivators: data.motivators || [],
        focusChallenges: data.focusChallenges || [],
        
        // Nested objects
        labMarkers: {
          ...prev.labMarkers,
          ...(data.labMarkers || {}),
        },
        mealSchedule: {
          ...prev.mealSchedule,
          ...(data.mealSchedule || {}),
        },
        bodyMeasurementLogs: data.bodyMeasurementLogs || (data.bodyMeasurements ? [data.bodyMeasurements] : []),
        bodyCompositionLogs: data.bodyCompositionLogs || (data.bodyComposition ? [data.bodyComposition] : []),
      }));

      if (data.bodyMeasurementLogs?.length > 0) setSelectedMeasurementIdx(0);
      if (data.bodyCompositionLogs?.length > 0) setSelectedCompositionIdx(data.bodyCompositionLogs.length - 1);

    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleNestedUpdate = (parent, field, value) => {
    setProfile(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
    setHasChanges(true);
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
        }
      };

      await api.put('/users/profile', payload);
      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated');
    } catch (err) {
      console.error('Save failed', err);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({ label, value, onChange, placeholder, keyboardType = 'default', icon: Icon, unit }) => (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        {Icon && <Icon size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />}
        <Caption secondary style={{ fontWeight: '700', textTransform: 'uppercase' }}>{label}</Caption>
      </View>
      <View style={[styles.inputWrapper, { backgroundColor: COLORS.gray100, borderColor: COLORS.border }]}>
        <TextInput
          style={[styles.input, { color: COLORS.text }]}
          value={String(value || '')}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray400}
          keyboardType={keyboardType}
        />
        {unit && <Caption secondary style={{ marginRight: 12 }}>{unit}</Caption>}
      </View>
    </View>
  );

  const ChipSection = ({ title, field, placeholder, bg }) => {
    const [val, setVal] = useState('');
    const items = profile[field] || [];
    return (
      <View style={styles.inputGroup}>
        <Caption secondary style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>{title}</Caption>
        <View style={styles.chipInputRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: COLORS.gray100, borderColor: COLORS.border, borderRadius: 12, height: 44, paddingHorizontal: 12 }]}
            value={val}
            onChangeText={setVal}
            placeholder={placeholder}
            placeholderTextColor={COLORS.gray400}
          />
          <TouchableOpacity 
            style={[styles.plusButton, { backgroundColor: COLORS.primary }]}
            onPress={() => {
              if (val.trim()) {
                handleUpdate(field, [...items, val.trim()]);
                setVal('');
              }
            }}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.chipContainer}>
          {items.map((item, idx) => (
            <View key={idx} style={[styles.chip, { backgroundColor: bg || COLORS.primary + '15' }]}>
              <Body style={{ fontSize: 13, fontWeight: '600' }}>{item}</Body>
              <TouchableOpacity onPress={() => handleUpdate(field, items.filter((_, i) => i !== idx))}>
                <X size={14} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const Segmented = ({ label, options, value, onSelect }) => (
    <View style={styles.inputGroup}>
      <Caption secondary style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>{label}</Caption>
      <View style={[styles.segmented, { backgroundColor: COLORS.gray100 }]}>
        {options.map(opt => (
          <TouchableOpacity 
            key={opt.key || opt} 
            style={[styles.segItem, (value === (opt.key || opt)) && styles.segActive]}
            onPress={() => onSelect(opt.key || opt)}
          >
            <Caption style={[(value === (opt.key || opt)) && { fontWeight: 'bold' }]}>
              {(opt.label || opt).toUpperCase()}
            </Caption>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const activeComposition = useMemo(() => {
    const logs = profile.bodyCompositionLogs || [];
    return logs[selectedCompositionIdx] || profile.bodyComposition;
  }, [profile.bodyCompositionLogs, selectedCompositionIdx, profile.bodyComposition]);

  const updateCompositionLog = (field, value) => {
    const logs = [...(profile.bodyCompositionLogs || [])];
    if (logs[selectedCompositionIdx]) {
      logs[selectedCompositionIdx] = { ...logs[selectedCompositionIdx], [field]: value };
      handleUpdate('bodyCompositionLogs', logs);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScreenWrapper 
      title="Profile" 
      showBack={false}
      headerRight={
        <View style={{ flexDirection: 'row', gap: 12 }}>
           {hasChanges && (
             <TouchableOpacity style={[styles.saveBtn, { backgroundColor: COLORS.primary }]} onPress={handleSave} disabled={saving}>
               {saving ? <ActivityIndicator size="small" color={COLORS.primaryContrast} /> : <Body style={{ color: COLORS.primaryContrast, fontWeight: 'bold' }}>Save</Body>}
             </TouchableOpacity>
           )}
           <TouchableOpacity onPress={() => router.push('/profile/settings')}><Settings size={22} color={COLORS.text} /></TouchableOpacity>
        </View>
      }
    >
      <View style={styles.topCard}>
        <View style={[styles.avatarLarge, { backgroundColor: COLORS.primary }]}>
          <H2 style={{ color: COLORS.primaryContrast }}>{user?.name?.charAt(0).toUpperCase() || 'U'}</H2>
        </View>
        <H2 style={{ marginTop: 12 }}>{user?.name}</H2>
        <Body secondary>{user?.email}</Body>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: COLORS.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TAB_CONFIG.map(tab => (
            <TouchableOpacity 
              key={tab.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab.id); }}
              style={[styles.tabItem, activeTab === tab.id && { backgroundColor: tab.color }]}
            >
              <tab.icon size={16} color={activeTab === tab.id ? '#fff' : tab.color} style={{ marginRight: 6 }} />
              <Caption style={[styles.tabText, activeTab === tab.id && { color: '#fff' }]}>{tab.title}</Caption>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'basic' && (
          <View>
            <InputField label="Full Name" value={profile.name} onChange={(v) => handleUpdate('name', v)} placeholder="Your name" icon={User} />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <InputField label="Age" value={profile.age} onChange={(v) => handleUpdate('age', v)} placeholder="25" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Segmented label="Sex" options={['male', 'female']} value={profile.gender} onSelect={(v) => handleUpdate('gender', v)} />
              </View>
            </View>
            <InputField label="Birth Date" value={profile.dob} onChange={(v) => handleUpdate('dob', v)} placeholder="YYYY-MM-DD" icon={Calendar} />
            <InputField label="Profession" value={profile.profession} onChange={(v) => handleUpdate('profession', v)} placeholder="Engineer" />
            <InputField label="Education" value={profile.education} onChange={(v) => handleUpdate('education', v)} placeholder="Bachelor's" />
            <ChipSection title="Skills" field="skills" placeholder="Add skill..." />
          </View>
        )}

        {activeTab === 'body' && (
          <View>
             <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <InputField label="Height" value={profile.height} onChange={(v) => handleUpdate('height', v)} placeholder="175" unit="cm" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <InputField label="Weight" value={profile.weight} onChange={(v) => handleUpdate('weight', v)} placeholder="70" unit="kg" keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <InputField label="Body Fat" value={profile.bodyFat} onChange={(v) => handleUpdate('bodyFat', v)} placeholder="15" unit="%" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <InputField label="Resting HR" value={profile.restingHeartRate} onChange={(v) => handleUpdate('restingHeartRate', v)} placeholder="60" unit="bpm" keyboardType="numeric" icon={Heart} />
              </View>
            </View>
            <InputField label="Blood Type" value={profile.bloodType} onChange={(v) => handleUpdate('bloodType', v)} placeholder="O+" />
          </View>
        )}

        {activeTab === 'health' && (
          <View>
            <ChipSection title="Conditions" field="conditions" placeholder="Asthma, etc." bg="#fee2e2" />
            <ChipSection title="Allergies" field="allergies" placeholder="Peanuts, etc." bg="#fee2e2" />
            <ChipSection title="Injuries" field="injuries" placeholder="Lower back pain" bg="#fee2e2" />
            <ChipSection title="Medications" field="medications" placeholder="Add medicine..." bg="#f1f5f9" />
            <ChipSection title="Supplements" field="supplements" placeholder="Vitamin D, etc." bg="#dcfce7" />
            
            <H3 style={{ marginTop: 20, marginBottom: 12 }}>Core Lab Markers</H3>
            <View style={styles.row}>
               <View style={{ flex: 1, marginRight: 8 }}>
                 <InputField label="Hemoglobin" value={profile.labMarkers?.hemoglobin?.value} onChange={(v) => handleNestedUpdate('labMarkers', 'hemoglobin', { ...profile.labMarkers.hemoglobin, value: v })} keyboardType="numeric" />
               </View>
               <View style={{ flex: 1, marginLeft: 8 }}>
                 <InputField label="Ferritin" value={profile.labMarkers?.ferritin?.value} onChange={(v) => handleNestedUpdate('labMarkers', 'ferritin', { ...profile.labMarkers.ferritin, value: v })} keyboardType="numeric" />
               </View>
            </View>
            <InputField label="Fasting Glucose" value={profile.labMarkers?.fastingGlucose?.value} onChange={(v) => handleNestedUpdate('labMarkers', 'fastingGlucose', { ...profile.labMarkers.fastingGlucose, value: v })} keyboardType="numeric" />
          </View>
        )}

        {activeTab === 'diet' && (
          <View>
            <Segmented label="Diet Type" options={['omnivore', 'vegetarian', 'vegan', 'keto', 'paleo']} value={profile.dietType} onSelect={(v) => handleUpdate('dietType', v)} />
            <Segmented label="Metabolic Goal" options={[
              { key: 'aggressive_loss', label: 'Cut' },
              { key: 'maintenance', label: 'Maintain' },
              { key: 'lean_gain', label: 'Bulk' }
            ]} value={profile.metabolicGoal} onSelect={(v) => handleUpdate('metabolicGoal', v)} />
            
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <InputField label="Meals/Day" value={profile.mealsPerDay} onChange={(v) => handleUpdate('mealsPerDay', v)} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <InputField label="Water" value={profile.hydrationGoal} onChange={(v) => handleUpdate('hydrationGoal', v)} unit="Cups" keyboardType="numeric" icon={Droplets} />
              </View>
            </View>

            <InputField label="Daily Calorie Target" value={profile.dailyCalorieTarget} onChange={(v) => handleUpdate('dailyCalorieTarget', v)} unit="kcal" keyboardType="numeric" />
            <InputField label="Fasting Window" value={profile.fastingWindow} onChange={(v) => handleUpdate('fastingWindow', v)} placeholder="16:8" />
            <ChipSection title="Avoid Foods" field="avoidFoods" placeholder="Add..." bg="#fef3c7" />
            <ChipSection title="Favorite Foods" field="favoriteFoods" placeholder="Add..." bg="#dcfce7" />
          </View>
        )}

        {activeTab === 'training' && (
          <View>
            <Segmented label="Experience" options={['beginner', 'intermediate', 'advanced']} value={profile.trainingExperience} onSelect={(v) => handleUpdate('trainingExperience', v)} />
            <Segmented label="Frequency" options={[2, 3, 4, 5, 6]} value={profile.workoutFrequency} onSelect={(v) => handleUpdate('workoutFrequency', v)} />
            
            <View style={styles.row}>
               <View style={{ flex: 1, marginRight: 8 }}>
                 <InputField label="Duration" value={profile.workoutDuration} onChange={(v) => handleUpdate('workoutDuration', v)} unit="min" keyboardType="numeric" />
               </View>
               <View style={{ flex: 1, marginLeft: 8, justifyContent: 'center' }}>
                 <View style={styles.toggleRowCompact}>
                   <Caption secondary style={{ fontWeight: 'bold' }}>Gym Access</Caption>
                   <Switch value={profile.gymAccess} onValueChange={(v) => handleUpdate('gymAccess', v)} trackColor={{ true: COLORS.primary }} />
                 </View>
               </View>
            </View>

            <ChipSection title="Preferred Workouts" field="preferredWorkouts" placeholder="HIIT, Yoga, etc." />
            <ChipSection title="Home Equipment" field="homeEquipment" placeholder="Dumbbells, etc." />
            <ChipSection title="Training Goals" field="trainingGoals" placeholder="Strength, etc." />
          </View>
        )}

        {activeTab === 'mind' && (
          <View>
            <Segmented label="Chronotype" options={['early-bird', 'neutral', 'night-owl']} value={profile.chronotype} onSelect={(v) => handleUpdate('chronotype', v)} />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <InputField label="Avg Sleep" value={profile.averageSleep} onChange={(v) => handleUpdate('averageSleep', v)} unit="hrs" keyboardType="numeric" icon={Moon} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <InputField label="Bedtime" value={profile.defaultSleepTime} onChange={(v) => handleUpdate('defaultSleepTime', v)} placeholder="22:30" icon={Zap} />
              </View>
            </View>
            <ChipSection title="Stress Triggers" field="stressTriggers" placeholder="Work, etc." />
            <ChipSection title="Motivators" field="motivators" placeholder="Family, etc." />
          </View>
        )}

        {activeTab === 'measurements' && (
          <View>
             <H3 style={{ marginBottom: 16 }}>Body Dimensions</H3>
             <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <InputField label="Waist" value={profile.bodyMeasurements?.waistCm} onChange={(v) => handleNestedUpdate('bodyMeasurements', 'waistCm', v)} unit="cm" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <InputField label="Hip" value={profile.bodyMeasurements?.hipCm} onChange={(v) => handleNestedUpdate('bodyMeasurements', 'hipCm', v)} unit="cm" keyboardType="numeric" />
                </View>
             </View>
             <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <InputField label="Chest" value={profile.bodyMeasurements?.chestCm} onChange={(v) => handleNestedUpdate('bodyMeasurements', 'chestCm', v)} unit="cm" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <InputField label="Bicep" value={profile.bodyMeasurements?.bicepCm} onChange={(v) => handleNestedUpdate('bodyMeasurements', 'bicepCm', v)} unit="cm" keyboardType="numeric" />
                </View>
             </View>
          </View>
        )}

        {activeTab === 'composition' && (
          <View>
             <H3 style={{ marginBottom: 16 }}>Body Composition Log</H3>
             <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                   <InputField label="Body Fat" value={activeComposition.bodyFatPercent} onChange={(v) => updateCompositionLog('bodyFatPercent', v)} unit="%" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                   <InputField label="Muscle (SMM)" value={activeComposition.smmKg} onChange={(v) => updateCompositionLog('smmKg', v)} unit="kg" keyboardType="numeric" />
                </View>
             </View>
             <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                   <InputField label="BMR" value={activeComposition.bmrKcal} onChange={(v) => updateCompositionLog('bmrKcal', v)} unit="kcal" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                   <InputField label="Visceral Fat" value={activeComposition.visceralFatLevel} onChange={(v) => updateCompositionLog('visceralFatLevel', v)} keyboardType="numeric" />
                </View>
             </View>
             
             <TouchableOpacity style={[styles.ocrBtn, { borderColor: COLORS.primary }]}>
                <Camera size={20} color={COLORS.primary} />
                <Body style={{ color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 }}>Import from Body Scan</Body>
             </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  topCard: { alignItems: 'center', paddingVertical: 24 },
  avatarLarge: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center' },
  
  tabBar: { borderBottomWidth: 1 },
  tabScroll: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.03)' },
  tabText: { fontWeight: '700', textTransform: 'uppercase', fontSize: 11 },

  content: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  input: { flex: 1, height: 52, paddingHorizontal: 16, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row' },
  
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  
  chipInputRow: { flexDirection: 'row', gap: 10 },
  plusButton: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 6 },
  
  outlineChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', marginRight: 8 },
  toggleRowCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, height: 52 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  ocrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderStyle: 'dashed', borderWidth: 2, borderRadius: 16, marginTop: 12 }
});

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { useTheme } from '../../constants/Theme';
import {
  ChevronLeft, ChevronRight, Award, TrendingUp,
  Moon, Battery, Brain, Utensils, Info, CheckCircle, Edit2, Check
} from 'lucide-react-native';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { H2, H3, Body, Caption } from '../../components/ui/Typography';

const screenWidth = Dimensions.get('window').width;

export default function WeeklyReviewScreen() {
  const router = useRouter();
  const { COLORS, BORDER_RADIUS, SHADOWS } = useTheme();
  const params = useLocalSearchParams();

  // Logic to get current week key (YYYY-Wnn)
  const getWeekKey = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const [loading, setLoading] = useState(true);
  const [weekKey, setWeekKey] = useState(params.weekKey || getWeekKey());
  const [review, setReview] = useState(null);

  // Weekly contract for NEXT week — proposed on Sunday
  const [contract, setContract] = useState(null);
  const [contractSaving, setContractSaving] = useState(false);
  const [contractEditing, setContractEditing] = useState(false);
  const [editedTargets, setEditedTargets] = useState([]);

  const nextWeekKey = (() => {
    const [y, w] = weekKey.split('-W').map(Number);
    const nw = w + 1 > 52 ? 1 : w + 1;
    const ny = w + 1 > 52 ? y + 1 : y;
    return `${ny}-W${String(nw).padStart(2, '0')}`;
  })();

  const fetchReview = async (key) => {
    setLoading(true);
    try {
      const res = await api.get(`/insights/weekly-review?weekKey=${key}`);
      setReview(res.data);
    } catch (err) {
      console.error('Failed to fetch weekly review', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContract = async (forWeekKey) => {
    try {
      const res = await api.get(`/insights/weekly-contract?weekKey=${forWeekKey}`);
      setContract(res.data);
      setEditedTargets(res.data?.targets || []);
    } catch (_) {}
  };

  const saveContract = async () => {
    setContractSaving(true);
    try {
      const res = await api.post('/insights/weekly-contract', {
        weekKey: nextWeekKey,
        targets: editedTargets,
      });
      setContract(res.data);
      setContractEditing(false);
    } catch (_) {
      Alert.alert('Error', 'Failed to save contract');
    } finally {
      setContractSaving(false);
    }
  };

  useEffect(() => {
    fetchReview(weekKey);
    fetchContract(nextWeekKey);
  }, [weekKey]);

  const changeWeek = (direction) => {
    const [year, week] = weekKey.split('-W').map(Number);
    let newWeek = week + direction;
    let newYear = year;
    if (newWeek < 1) { newWeek = 52; newYear--; }
    if (newWeek > 52) { newWeek = 1; newYear++; }
    setWeekKey(`${newYear}-W${String(newWeek).padStart(2, '0')}`);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScreenWrapper title="Weekly Deep Dive">
      <View style={[styles.weekPicker, { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.pickerBtn}>
          <ChevronLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <H3>{weekKey}</H3>
        <TouchableOpacity onPress={() => changeWeek(1)} style={styles.pickerBtn}>
          <ChevronRight size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Top Wins */}
        {review?.insights?.length > 0 && (
          <View style={styles.section}>
            <Caption secondary style={styles.sectionLabel}>WEEKLY WINS & INSIGHTS</Caption>
            {review.insights.map((msg, i) => (
              <Card key={i} style={[styles.insightCard, { borderLeftColor: COLORS.success }]} padding={16}>
                <View style={styles.insightRow}>
                  <Award size={20} color={COLORS.success} style={{ marginRight: 12 }} />
                  <Body style={{ flex: 1, lineHeight: 20 }}>{msg}</Body>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Strongest Lift */}
        {review?.strongestLift && (
          <View style={styles.section}>
            <Caption secondary style={styles.sectionLabel}>PEAK PERFORMANCE</Caption>
            <Card style={styles.liftCard} padding={20}>
              <TrendingUp size={24} color={COLORS.training} />
              <View style={{ marginTop: 12 }}>
                <H2>{review.strongestLift.weight}kg</H2>
                <Body style={{ fontWeight: '700' }}>{review.strongestLift.exercise}</Body>
                <Caption secondary>{review.strongestLift.reps} reps · {new Date(review.strongestLift.date).toLocaleDateString('en-IN')}</Caption>
              </View>
            </Card>
          </View>
        )}

        {/* Biological Persona */}
        <View style={styles.section}>
          <Caption secondary style={styles.sectionLabel}>BIOLOGICAL PERSONA</Caption>
          <View style={styles.bioGrid}>
            <BioCard 
              label="Sleep" icon={<Moon size={18} color={COLORS.info} />} 
              value={review?.biologicalPersona?.sleepArchitecture?.quality || '--'} 
              sub="Quality"
            />
            <BioCard 
              label="Recovery" icon={<Battery size={18} color={COLORS.success} />} 
              value={review?.biologicalPersona?.recoveryCapacity || 'Stable'} 
              sub="Status"
            />
            <BioCard 
              label="Stress" icon={<Brain size={18} color={COLORS.wellness} />} 
              value={review?.biologicalPersona?.stressResilience || 'Good'} 
              sub="Resilience"
            />
            <BioCard 
              label="Diversity" icon={<Utensils size={18} color={COLORS.nutrition} />} 
              value={review?.biologicalPersona?.gutDiversity || 0} 
              sub="Plant Points"
            />
          </View>
        </View>

        {/* Nutrition Highlights */}
        {review?.bestDay && (
          <View style={styles.section}>
            <Caption secondary style={styles.sectionLabel}>NUTRITION SPOTLIGHT</Caption>
            <Card padding={16} style={{ marginBottom: 12 }}>
              <View style={styles.dayHeader}>
                <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                <Body style={{ fontWeight: '700' }}>Best Consistency: {new Date(review.bestDay.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</Body>
              </View>
              <Caption secondary style={{ marginTop: 4 }}>Hit {review.bestDay.proteinPercent}% of protein target.</Caption>
            </Card>
            
            {review?.worstDay && (
              <Card padding={16}>
                <View style={styles.dayHeader}>
                  <View style={[styles.dot, { backgroundColor: COLORS.warning }]} />
                  <Body style={{ fontWeight: '700' }}>Focus Required: {new Date(review.worstDay.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</Body>
                </View>
                <Caption secondary style={{ marginTop: 4 }}>{review.worstDay.explanation}</Caption>
              </Card>
            )}
          </View>
        )}

        {/* ── Weekly Contract ──────────────────────────────────── */}
        <View style={styles.section}>
          <Caption secondary style={styles.sectionLabel}>NEXT WEEK'S CONTRACT</Caption>

          {!contract ? (
            <Card padding={16}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </Card>
          ) : (
            <Card padding={16}>
              <View style={styles.contractHeader}>
                <H3 style={{ fontSize: 14 }}>
                  {nextWeekKey} — {contract.status === 'scored' ? `${contract.score}/3 targets met` : '3 targets'}
                </H3>
                {contract.status !== 'scored' && (
                  <TouchableOpacity
                    onPress={() => setContractEditing(e => !e)}
                    style={styles.editBtn}
                  >
                    {contractEditing
                      ? <Check size={15} color={COLORS.success} />
                      : <Edit2 size={15} color={COLORS.textSecondary} />
                    }
                  </TouchableOpacity>
                )}
              </View>

              {(contractEditing ? editedTargets : contract.targets).map((target, i) => {
                const met = contract.status === 'scored' ? target.met : null;
                const domainColor = target.domain === 'nutrition' ? COLORS.nutrition : target.domain === 'training' ? COLORS.training : COLORS.wellness;

                return (
                  <View key={i} style={[styles.targetRow, { borderLeftColor: domainColor }]}>
                    <View style={styles.targetTop}>
                      <View style={[styles.domainPill, { backgroundColor: domainColor + '20' }]}>
                        <Caption style={{ color: domainColor, fontWeight: '700', fontSize: 9, textTransform: 'uppercase' }}>
                          {target.domain}
                        </Caption>
                      </View>
                      {met === true && <CheckCircle size={14} color={COLORS.success} />}
                      {met === false && <Caption style={{ color: COLORS.error, fontSize: 10 }}>✗ {target.actualValue}{target.unit}</Caption>}
                    </View>

                    {contractEditing ? (
                      <TextInput
                        style={[styles.targetEditInput, { color: COLORS.text, borderColor: COLORS.border }]}
                        value={editedTargets[i]?.label || ''}
                        onChangeText={text => {
                          const updated = [...editedTargets];
                          updated[i] = { ...updated[i], label: text };
                          setEditedTargets(updated);
                        }}
                        multiline
                      />
                    ) : (
                      <Body style={styles.targetLabel}>{target.label}</Body>
                    )}

                    {!contractEditing && target.why ? (
                      <Caption secondary style={styles.targetWhy}>{target.why}</Caption>
                    ) : null}
                  </View>
                );
              })}

              {contract.status !== 'scored' && (
                <TouchableOpacity
                  style={[styles.commitBtn, { backgroundColor: COLORS.primary }]}
                  onPress={saveContract}
                  disabled={contractSaving}
                >
                  {contractSaving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Body style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
                        {contract.status === 'active' ? 'Update Contract' : 'Commit to These Targets'}
                      </Body>
                  }
                </TouchableOpacity>
              )}

              {contract.status === 'active' && (
                <Caption secondary style={{ textAlign: 'center', marginTop: 8 }}>
                  Contract active — scored automatically at end of week.
                </Caption>
              )}
            </Card>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

function BioCard({ label, icon, value, sub }) {
  const { COLORS } = useTheme();
  return (
    <Card style={styles.bioCard} padding={12}>
      <View style={styles.bioHeader}>
        {icon}
        <Caption secondary style={{ marginLeft: 6, fontWeight: '700' }}>{label}</Caption>
      </View>
      <Body style={{ fontWeight: '800', marginTop: 8 }}>{value}</Body>
      <Caption secondary style={{ fontSize: 10 }}>{sub}</Caption>
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  weekPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  pickerBtn: { padding: 8 },
  section: { marginBottom: 24 },
  sectionLabel: { marginBottom: 12, fontWeight: '800', marginLeft: 4 },
  insightCard: { marginBottom: 8, borderLeftWidth: 4 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start' },
  contractHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  editBtn: { padding: 6 },
  targetRow: { borderLeftWidth: 3, paddingLeft: 10, marginBottom: 14 },
  targetTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  domainPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  targetLabel: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  targetWhy: { fontSize: 11, lineHeight: 17, marginTop: 2 },
  targetEditInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13, marginTop: 4 },
  commitBtn: { borderRadius: 12, padding: 13, marginTop: 8, alignItems: 'center' },
  liftCard: { alignItems: 'flex-start' },
  bioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bioCard: { flex: 1, minWidth: '45%' },
  bioHeader: { flexDirection: 'row', alignItems: 'center' },
  dayHeader: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  goalCard: { backgroundColor: '#000', marginBottom: 20 },
});

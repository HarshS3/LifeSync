import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { AlertTriangle, CheckCircle, Apple, Activity, Info } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { Card } from '../ui/Card';
import { Body, Caption, H3 } from '../ui/Typography';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

export default function DeficiencyRadar({ risks = [] }) {
  const { COLORS, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } = useTheme();

  if (!risks || risks.length === 0) {
    return (
      <View style={[styles.allClearContainer, { backgroundColor: COLORS.success + '15', borderColor: COLORS.success + '30' }]}>
        <CheckCircle size={24} color={COLORS.success} />
        <View style={styles.allClearText}>
          <Text style={[TYPOGRAPHY.label, { color: COLORS.success, textTransform: 'uppercase' }]}>All Clear</Text>
          <Body style={{ marginTop: 4 }}>
            Your 7-day micronutrient averages look great. No predictive deficiency risks detected!
          </Body>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Activity size={20} color={COLORS.warning} />
        <H3 style={{ marginLeft: 8 }}>Deficiency Radar</H3>
      </View>
      <Caption style={{ marginBottom: 16, paddingHorizontal: 16 }}>
        Based on your 7-day rolling average, you are at risk for these micronutrient deficiencies.
      </Caption>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
      >
        {risks.map((risk, index) => {
          const percent = Math.min(100, Math.round((risk.average / risk.target) * 100));
          return (
            <Card key={index} style={[styles.card, { width: CARD_WIDTH, borderColor: COLORS.warning + '50', borderWidth: 1 }]} padding={16}>
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <AlertTriangle size={18} color={COLORS.warning} />
                  <H3 style={{ marginLeft: 8 }}>{risk.nutrient}</H3>
                </View>
                <View style={[styles.percentBadge, { backgroundColor: COLORS.warning + '15' }]}>
                  <Caption style={{ color: COLORS.warning, fontWeight: '700' }}>{percent}% of Goal</Caption>
                </View>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: COLORS.gray100 }]}>
                <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: COLORS.warning }]} />
              </View>
              <Caption style={{ marginBottom: 16, textAlign: 'right' }}>
                Avg: {risk.average}{risk.unit} / Target: {risk.target}{risk.unit}
              </Caption>

              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Info size={14} color={COLORS.error} />
                  <Text style={[TYPOGRAPHY.label, { color: COLORS.error, marginLeft: 6 }]}>SYMPTOM RISK</Text>
                </View>
                <Body style={{ fontSize: 14 }}>{risk.symptomRisk}</Body>
              </View>

              <View style={[styles.section, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 12 }]}>
                <View style={styles.sectionTitleRow}>
                  <Apple size={14} color={COLORS.success} />
                  <Text style={[TYPOGRAPHY.label, { color: COLORS.success, marginLeft: 6 }]}>QUICK FIX</Text>
                </View>
                <Body style={{ fontSize: 14 }}>{risk.foodFix}</Body>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 8,
  },
  card: {
    marginRight: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  section: {
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  allClearContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 16,
    alignItems: 'flex-start',
  },
  allClearText: {
    marginLeft: 12,
    flex: 1,
  },
});

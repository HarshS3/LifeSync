import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Info } from 'lucide-react-native';

const NUTRIENT_GROUPS = [
  {
    title: 'Macronutrients',
    color: 'nutrition',
    nutrients: [
      { key: 'calories', label: 'Calories', unit: 'kcal' },
      { key: 'protein', label: 'Protein', unit: 'g' },
      { key: 'carbs', label: 'Carbs', unit: 'g' },
      { key: 'fat', label: 'Fat', unit: 'g' },
    ]
  },
  {
    title: 'Fiber & Sugar',
    color: 'warning',
    nutrients: [
      { key: 'fiber', label: 'Fiber', unit: 'g' },
      { key: 'sugar', label: 'Sugar', unit: 'g' },
    ]
  },
  {
    title: 'Fat Breakdown',
    color: 'training',
    nutrients: [
      { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g' },
      { key: 'monounsaturatedFat', label: 'Monounsaturated', unit: 'g' },
      { key: 'polyunsaturatedFat', label: 'Polyunsaturated', unit: 'g' },
      { key: 'omega3', label: 'Omega-3', unit: 'g' },
      { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
    ]
  },
  {
    title: 'Minerals',
    color: 'success',
    nutrients: [
      { key: 'sodium', label: 'Sodium', unit: 'mg' },
      { key: 'potassium', label: 'Potassium', unit: 'mg' },
      { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
      { key: 'calcium', label: 'Calcium', unit: 'mg' },
      { key: 'iron', label: 'Iron', unit: 'mg' },
      { key: 'zinc', label: 'Zinc', unit: 'mg' },
      { key: 'phosphorus', label: 'Phosphorus', unit: 'mg' },
      { key: 'copper', label: 'Copper', unit: 'mg' },
      { key: 'selenium', label: 'Selenium', unit: 'mcg' },
      { key: 'manganese', label: 'Manganese', unit: 'mg' },
    ]
  },
  {
    title: 'Vitamins',
    color: 'info',
    nutrients: [
      { key: 'vitaminA', label: 'Vitamin A', unit: 'IU' },
      { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
      { key: 'vitaminD', label: 'Vitamin D', unit: 'IU' },
      { key: 'vitaminE', label: 'Vitamin E', unit: 'mg' },
      { key: 'vitaminB1', label: 'Thiamin (B1)', unit: 'mg' },
      { key: 'vitaminB2', label: 'Riboflavin (B2)', unit: 'mg' },
      { key: 'vitaminB3', label: 'Niacin (B3)', unit: 'mg' },
      { key: 'vitaminB5', label: 'Pantothenic Acid (B5)', unit: 'mg' },
      { key: 'vitaminB6', label: 'Vitamin B6', unit: 'mg' },
      { key: 'vitaminB7', label: 'Biotin (B7)', unit: 'mcg' },
      { key: 'vitaminB9', label: 'Folate (B9)', unit: 'mcg' },
      { key: 'vitaminB12', label: 'Vitamin B12', unit: 'mcg' },
    ]
  }
];

export default function DetailsTab({ log, targets, COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY }) {
  const totals = log?.dailyTotals || {};
  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  const CompactProgressBar = ({ label, value, target, unit, colorGroup }) => {
    const barColor = COLORS[colorGroup] || COLORS.info;
    const hasTarget = target !== undefined && target > 0;
    const percentage = hasTarget ? Math.min(100, (value / target) * 100) : 0;
    
    return (
      <View style={themedStyles.nutrientRow}>
        <View style={themedStyles.nutrientHeaderRow}>
          <Text style={themedStyles.nutrientLabel}>{label}</Text>
          <View style={themedStyles.valueContainer}>
            <Text style={themedStyles.nutrientValue}>{Number.isInteger(value) ? value : value.toFixed(1)}</Text>
            <Text style={themedStyles.nutrientUnit}>{unit}</Text>
            {hasTarget && (
              <Text style={themedStyles.nutrientTargetText}>
                {' / '}{target}{unit}
              </Text>
            )}
          </View>
        </View>
        {hasTarget && (
          <View style={themedStyles.barBackground}>
            <View style={[themedStyles.barForeground, { width: `${percentage}%`, backgroundColor: barColor }]} />
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={themedStyles.scrollContent}>
      {NUTRIENT_GROUPS.map((group, gIdx) => (
        <View key={gIdx} style={themedStyles.groupContainer}>
          <Text style={themedStyles.groupTitle}>{group.title}</Text>
          <View style={themedStyles.groupCard}>
            {group.nutrients.map((n, nIdx) => {
              const val = totals[n.key] || 0;
              const target = targets[n.key];
              return (
                <View key={n.key} style={nIdx === group.nutrients.length - 1 ? { borderBottomWidth: 0 } : { borderBottomWidth: 1, borderBottomColor: COLORS.gray100 }}>
                  <CompactProgressBar 
                    label={n.label} 
                    value={val} 
                    target={target} 
                    unit={n.unit} 
                    colorGroup={group.color} 
                  />
                </View>
              );
            })}
          </View>
        </View>
      ))}

      <View style={themedStyles.footerInfo}>
        <Info size={14} color={COLORS.textSecondary} />
        <Text style={themedStyles.footerText}>
          Values are aggregated from all meals and supplements logged for this day.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = (COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY) => StyleSheet.create({
  scrollContent: { padding: SPACING.md, paddingBottom: 100 },
  groupContainer: { marginBottom: SPACING.lg },
  groupTitle: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm, paddingHorizontal: 4 },
  groupCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS },
  nutrientRow: { padding: SPACING.md },
  nutrientHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nutrientLabel: { ...TYPOGRAPHY.label, fontSize: 15, color: COLORS.text },
  valueContainer: { flexDirection: 'row', alignItems: 'baseline' },
  nutrientValue: { ...TYPOGRAPHY.label, fontSize: 16, color: COLORS.primary },
  nutrientUnit: { ...TYPOGRAPHY.caption, marginLeft: 4 },
  nutrientTargetText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  barBackground: { height: 6, backgroundColor: COLORS.gray100, borderRadius: 3, marginTop: SPACING.sm, overflow: 'hidden' },
  barForeground: { height: '100%', borderRadius: 3 },
  footerInfo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, gap: SPACING.sm, marginTop: SPACING.sm },
  footerText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, flex: 1 },
});

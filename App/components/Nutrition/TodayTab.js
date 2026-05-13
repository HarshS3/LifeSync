import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, ActivityIndicator, Dimensions 
} from 'react-native';
import { 
  Trash2, History, Utensils, Zap, Package, 
  Activity as ActivityIcon, ChevronRight, ChevronDown, 
  AlertTriangle, Info, Droplets, Edit2, X
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { AnimatedCard } from '../AnimatedCard';
import { generateCGMData, fmt, percent } from '../../lib/nutritionHelpers';

const { width } = Dimensions.get('window');

// ── Internal Components ──────────────────────────────────────────────────────

const MealItem = ({ 
  meal, 
  index, 
  onDelete, 
  deleting, 
  COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const mealTotals = meal.foods?.reduce(
    (acc, f) => ({
      calories: acc.calories + (f.calories || 0),
      protein: acc.protein + (f.protein || 0),
      carbs: acc.carbs + (f.carbs || 0),
      fat: acc.fat + (f.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ) || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  return (
    <View style={themedStyles.webMealBox}>
      <View style={themedStyles.mealMainRow}>
        <View style={themedStyles.mealLeft}>
          <Text style={themedStyles.webMealName}>{meal.name || meal.mealType}</Text>
          <View style={themedStyles.mealBadgeRow}>
             <View style={themedStyles.webMealTypeBadge}>
               <Text style={themedStyles.webMealTypeText}>{meal.mealType}</Text>
             </View>
             {meal.time && <Text style={themedStyles.webMealTime}>{meal.time}</Text>}
          </View>
        </View>
        <View style={themedStyles.mealRight}>
          <View style={themedStyles.mealActionRow}>
             <Text style={themedStyles.webMealCals}>{fmt(mealTotals.calories, 0)} kcal</Text>
             <TouchableOpacity onPress={() => onDelete(index)} style={themedStyles.webMealActionBtn}>
               <X size={14} color="#ef4444" />
             </TouchableOpacity>
          </View>
          <Text style={themedStyles.webMealMacros}>
            P {fmt(mealTotals.protein)}g · C {fmt(mealTotals.carbs)}g · F {fmt(mealTotals.fat)}g
          </Text>
        </View>
      </View>

      <View style={themedStyles.foodList}>
        {meal.foods?.map((food, i) => (
          <Text key={i} style={themedStyles.webFoodItem}>
            {food.name} {food.quantity ? `· ${food.quantity}${food.unit}` : ''} {food.calories ? `· ${Math.round(food.calories)} kcal` : ''}
          </Text>
        ))}
      </View>

      {/* Nutrient Interactions (Expandable) */}
      {(meal.insights?.synergies?.length > 0 || meal.insights?.antagonisms?.length > 0) && (
        <View style={themedStyles.webInteractionSection}>
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={themedStyles.expandToggle}>
            <Text style={themedStyles.expandToggleText}>Nutrient Interactions & Bioavailability</Text>
            {expanded ? <ChevronDown size={14} color={COLORS.textSecondary} /> : <ChevronRight size={14} color={COLORS.textSecondary} />}
          </TouchableOpacity>
          
          {expanded && (
            <View style={themedStyles.webInteractionContent}>
              {meal.insights.synergies.map((syn, i) => (
                <View key={`syn-${i}`} style={themedStyles.webInsightRow}>
                   <View style={[themedStyles.dot, { backgroundColor: '#10b981' }]} />
                   <View>
                     <Text style={themedStyles.webInsightTitle}>{syn.title} ({syn.effect})</Text>
                     <Text style={themedStyles.webInsightDesc}>{syn.description}</Text>
                   </View>
                </View>
              ))}
              {meal.insights.antagonisms.map((ant, i) => (
                <View key={`ant-${i}`} style={themedStyles.webInsightRow}>
                   <View style={[themedStyles.dot, { backgroundColor: '#f59e0b' }]} />
                   <View>
                     <Text style={themedStyles.webInsightTitle}>{ant.title} ({ant.effect})</Text>
                     <Text style={themedStyles.webInsightDesc}>{ant.description}</Text>
                     {ant.fix && <Text style={themedStyles.webInsightFix}>Fix: {ant.fix}</Text>}
                   </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

export default function TodayTab({ 
  log, 
  targets, 
  templates, 
  selectedDate, 
  refreshing, 
  onRefresh, 
  handleActionPress, 
  handleRelog, 
  handleDeleteMeal, 
  reloggingId, 
  deletingIdx,
  COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY
}) {
  const totals = log?.dailyTotals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  const cgmData = useMemo(() => {
    const points = generateCGMData(log?.meals || []);
    const sampledPoints = points.filter((_, i) => i % 6 === 0);
    return {
      labels: sampledPoints.map(p => p.time),
      datasets: [{
        data: points.map(p => p.glucose),
        color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
        strokeWidth: 2
      }]
    };
  }, [log?.meals]);

  const medicalAlerts = useMemo(() => {
    const alerts = [];
    if (!log) return alerts;

    if (totals.saturatedFat > 30) {
      alerts.push({ type: 'warning', text: `High Saturated Fat (${fmt(totals.saturatedFat)}g): Keeping saturated fat <20-30g protects your heart health.` });
    }
    if (totals.sodium > 3000) {
      alerts.push({ type: 'warning', text: `High Sodium Detected (${fmt(totals.sodium)}mg): Hydrate extra today or expect 1-2lbs of water retention.` });
    }
    
    if (Array.isArray(log.dailyInsights)) {
       log.dailyInsights.forEach(insight => {
         alerts.push({ type: insight.type === 'warning' ? 'warning' : 'info', text: insight.text });
       });
    }

    return alerts;
  }, [log, totals]);

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      contentContainerStyle={themedStyles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* 1. Meals List (At Top in Web) */}
      <View style={themedStyles.webSectionBox}>
        <View style={themedStyles.webSectionHeader}>
          <Text style={themedStyles.webSectionTitle}>Meals</Text>
          <View style={themedStyles.webCalChip}>
            <Utensils size={12} color="#166534" />
            <Text style={themedStyles.webCalChipText}>{fmt(totals.calories, 0)} kcal</Text>
          </View>
        </View>

        {log?.meals?.length > 0 ? (
          log.meals.map((meal, index) => (
            <MealItem 
              key={index}
              meal={meal}
              index={index}
              onDelete={handleDeleteMeal}
              deleting={deletingIdx === index}
              COLORS={COLORS} SPACING={SPACING} BORDER_RADIUS={BORDER_RADIUS} SHADOWS={SHADOWS} TYPOGRAPHY={TYPOGRAPHY}
            />
          ))
        ) : (
          <Text style={themedStyles.webEmptyText}>No meals logged yet for this day.</Text>
        )}
      </View>

      {/* 2. Macro Summary Strip (Grid of 4) */}
      <View style={themedStyles.macroGrid}>
        {[
          { label: 'Calories', val: fmt(totals.calories, 0), unit: 'kcal', pct: percent(totals.calories, targets.calories), color: '#16a34a' },
          { label: 'Protein',  val: fmt(totals.protein),     unit: 'g',    pct: percent(totals.protein, targets.protein),   color: '#2563eb' },
          { label: 'Carbs',    val: fmt(totals.carbs),       unit: 'g',    pct: null, color: '#d97706' },
          { label: 'Fat',      val: fmt(totals.fat),         unit: 'g',    pct: null, color: '#dc2626' },
        ].map((m) => (
          <View key={m.label} style={themedStyles.macroCard}>
            <Text style={themedStyles.macroLabel}>{m.label}</Text>
            <Text style={themedStyles.macroValText}>
              {m.val} <Text style={themedStyles.macroUnitText}>{m.unit}</Text>
            </Text>
            {m.pct != null && (
              <View style={themedStyles.macroTrack}>
                <View style={[themedStyles.macroFill, { width: `${m.pct}%`, backgroundColor: m.color }]} />
              </View>
            )}
          </View>
        ))}
      </View>

      {/* 3. Daily Medical Alerts & Insights */}
      {medicalAlerts.length > 0 && (
        <View style={themedStyles.webSectionBox}>
          <Text style={themedStyles.webSectionTitleSmall}>Daily Medical Alerts & Insights</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {medicalAlerts.map((alert, i) => (
              <View key={i} style={[themedStyles.webAlertBox, { backgroundColor: alert.type === 'warning' ? '#fef2f2' : '#eff6ff', borderColor: alert.type === 'warning' ? '#fecaca' : '#bfdbfe' }]}>
                <Text style={{ fontSize: 18 }}>{alert.type === 'warning' ? '🚨' : '💡'}</Text>
                <Text style={[themedStyles.webAlertText, { color: alert.type === 'warning' ? '#991b1b' : '#1e3a8a' }]}>{alert.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 4. Effective Daily Absorption Summary */}
      {log?.effectiveNutrientTotals && Object.keys(log.effectiveNutrientTotals).length > 0 && (
        <View style={themedStyles.webSectionBox}>
           <Text style={themedStyles.webSectionTitleSmall}>Daily Effective Absorption Summary</Text>
           <View style={themedStyles.absorptionGrid}>
              {Object.entries(log.effectiveNutrientTotals).slice(0, 10).map(([nutrient, data]) => {
                const pctVal = Math.round((data.multiplier || 1) * 100);
                const color = pctVal < 50 ? '#ef4444' : pctVal < 80 ? '#f59e0b' : '#10b981';
                return (
                  <View key={nutrient} style={themedStyles.webAbsItem}>
                    <Text style={themedStyles.webAbsLabel}>{nutrient.replace(/([A-Z])/g, ' $1').toUpperCase()}</Text>
                    <Text style={[themedStyles.webAbsValue, { color }]}>~{Math.round(data.effective)}{data.unit}</Text>
                    <Text style={themedStyles.webAbsSub}>of {Math.round(data.consumed)}{data.unit} ({pctVal}%)</Text>
                    <View style={themedStyles.miniTrack}>
                       <View style={[themedStyles.miniFill, { width: `${pctVal}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })}
           </View>
        </View>
      )}

      {/* 5. Simulated CGM Graph */}
      <View style={themedStyles.webSectionBox}>
        <View style={themedStyles.webSectionHeader}>
          <View>
            <Text style={themedStyles.webSectionTitleSmall}>Simulated Glucose Response</Text>
            <Text style={themedStyles.webSectionSub}>Based on meal Glycemic Pressure & macro buffering.</Text>
          </View>
          <View style={themedStyles.simulationBadge}>
            <Text style={themedStyles.simulationText}>Simulation</Text>
          </View>
        </View>
        <LineChart
          data={cgmData}
          width={width - 48}
          height={200}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
            labelColor: (opacity = 1) => '#6b7280',
            style: { borderRadius: 16 },
            propsForDots: { r: "0" },
            fillShadowGradient: "#f59e0b",
            fillShadowGradientOpacity: 0.2,
          }}
          bezier
          style={{ marginTop: 16, borderRadius: 16, marginLeft: -16 }}
          withInnerLines={false}
          withOuterLines={false}
        />
      </View>

      {/* 6. AI Insight & Suggestions (Placeholder for consistency) */}
      <View style={themedStyles.webGridRow}>
         <View style={[themedStyles.webSectionBox, { flex: 1, marginBottom: 0 }]}>
            <Text style={themedStyles.webSectionTitleSmall}>AI Insight</Text>
            <Text style={themedStyles.webEmptyTextSmall}>Log more meals to unlock daily AI-powered nutritional trends and fixes.</Text>
            <TouchableOpacity style={themedStyles.webOutlineBtn}>
               <Text style={themedStyles.webOutlineBtnText}>Generate Insight</Text>
            </TouchableOpacity>
         </View>
      </View>

      {/* 7. CTA Button */}
      <View style={themedStyles.webCtaBox}>
         <View>
            <Text style={themedStyles.webCtaTitle}>Ready to log a meal?</Text>
            <Text style={themedStyles.webCtaSub}>Search the database or use a template.</Text>
         </View>
         <TouchableOpacity 
           style={themedStyles.webCtaBtn}
           onPress={() => handleActionPress('/nutrition/search')}
         >
            <Text style={themedStyles.webCtaBtnText}>+ Log Meal</Text>
         </TouchableOpacity>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = (COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY) => StyleSheet.create({
  scrollContent: { padding: 16, gap: 24 },
  
  webSectionBox: { 
    backgroundColor: '#ffffff', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    padding: 16,
    marginBottom: 0
  },
  webSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  webSectionTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  webSectionTitleSmall: { fontSize: 14, fontWeight: '700', color: '#111827' },
  webSectionSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  
  webCalChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, gap: 4 },
  webCalChipText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  
  webEmptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'left' },
  webEmptyTextSmall: { fontSize: 12, color: '#6b7280', marginTop: 8, lineHeight: 18 },

  // Meals
  webMealBox: { 
    padding: 12, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    backgroundColor: '#f9fafb',
    marginBottom: 12
  },
  mealMainRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  mealLeft: { flex: 1 },
  webMealName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  mealBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  webMealTypeBadge: { backgroundColor: '#e5e7eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  webMealTypeText: { fontSize: 10, color: '#374151', textTransform: 'lowercase' },
  webMealTime: { fontSize: 11, color: '#6b7280' },
  
  mealRight: { alignItems: 'flex-end' },
  mealActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  webMealCals: { fontSize: 14, fontWeight: '600', color: '#111827' },
  webMealActionBtn: { padding: 2 },
  webMealMacros: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  
  foodList: { marginTop: 4 },
  webFoodItem: { fontSize: 11, color: '#6b7280', marginBottom: 2 },

  webInteractionSection: { marginTop: 12 },
  expandToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandToggleText: { fontSize: 11, fontWeight: '600', color: '#4b5563' },
  webInteractionContent: { marginTop: 8, padding: 12, borderRadius: 6, borderStyle: 'dashed', borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#ffffff' },
  webInsightRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  webInsightTitle: { fontSize: 11, fontWeight: '700', color: '#111827' },
  webInsightDesc: { fontSize: 11, color: '#4b5563', lineHeight: 14 },
  webInsightFix: { fontSize: 11, fontWeight: '600', color: '#111827', marginTop: 2 },

  // Macro Grid
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  macroCard: { width: '48%', backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  macroLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  macroValText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  macroUnitText: { fontSize: 12, fontWeight: '400', color: '#9ca3af' },
  macroTrack: { height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 2 },

  // Alerts
  webAlertBox: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
  webAlertText: { flex: 1, fontSize: 11, fontWeight: '500', lineHeight: 16 },

  // Absorption
  absorptionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  webAbsItem: { width: '31%', backgroundColor: '#f9fafb', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#f3f4f6' },
  webAbsLabel: { fontSize: 8, color: '#6b7280', letterSpacing: 0.5, marginBottom: 4 },
  webAbsValue: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  webAbsSub: { fontSize: 9, color: '#9ca3af', marginBottom: 6 },
  miniTrack: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 2 },

  // CGM
  simulationBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  simulationText: { fontSize: 10, fontWeight: '600', color: '#92400e' },

  // AI Box
  webGridRow: { flexDirection: 'row', gap: 16 },
  webOutlineBtn: { marginTop: 16, borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start' },
  webOutlineBtnText: { fontSize: 12, color: '#4b5563', fontWeight: '500' },

  // CTA
  webCtaBox: { backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  webCtaTitle: { fontSize: 13, fontWeight: '600', color: '#166534' },
  webCtaSub: { fontSize: 11, color: '#15803d', marginTop: 2 },
  webCtaBtn: { backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  webCtaBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
});

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  Animated, PanResponder,
} from 'react-native';
import Body from 'react-native-body-highlighter';
import { useTheme } from '../constants/Theme';
import { ChevronLeft, ChevronRight, X, ZoomIn, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Verified slugs for react-native-body-highlighter v3
export const MUSCLE_META = {
  chest:         { label: 'Chest',         side: 'front' },
  'upper-back':  { label: 'Upper Back',    side: 'back'  },
  'lower-back':  { label: 'Lower Back',    side: 'back'  },
  deltoids:      { label: 'Deltoids',      side: 'both'  },
  'front-deltoids': { label: 'Front Delts', side: 'front' },
  'back-deltoids':  { label: 'Rear Delts',  side: 'back'  },
  biceps:        { label: 'Biceps',        side: 'front' },
  triceps:       { label: 'Triceps',       side: 'back'  },
  forearms:      { label: 'Forearms',      side: 'both'  },
  abs:           { label: 'Abs',           side: 'front' },
  obliques:      { label: 'Obliques',      side: 'front' },
  trapezius:     { label: 'Trapezius',     side: 'back'  },
  quadriceps:    { label: 'Quadriceps',    side: 'front' },
  hamstring:     { label: 'Hamstrings',    side: 'back'  },
  calves:        { label: 'Calves',        side: 'back'  },
  gluteal:       { label: 'Glutes',        side: 'back'  },
  adductors:     { label: 'Adductors',     side: 'front' },
  abductors:     { label: 'Abductors',     side: 'side'  },
};

const MIN_SCALE = 1.0;
const MAX_SCALE = 3.0;
const DEFAULT_BODY_WIDTH  = SCREEN_WIDTH - 48;
const DEFAULT_BODY_HEIGHT = 380; // Increased height to prevent anatomical clipping

export default function MuscleHeatmap({ 
  data = [], 
  gender = 'male', 
  onZoomChange, 
  selectedMuscle, 
  onMuscleSelect,
  width: customWidth,
  height: customHeight
}) {
  const { COLORS, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, SPACING } = useTheme();
  const [side, setSide] = useState('front');
  const [isZoomed, setIsZoomed] = useState(false);

  const BODY_WIDTH = customWidth || DEFAULT_BODY_WIDTH;
  const BODY_HEIGHT = customHeight || DEFAULT_BODY_HEIGHT;

  // --- BLUE THEME (Active) ---
  const heatmapColors = useMemo(() => [
    COLORS.gray200,
    COLORS.training + '40',
    COLORS.training + '80',
    COLORS.training + 'C0',
    COLORS.training,
    COLORS.primary,
  ], [COLORS]);

  // ---------- Animation refs ----------
  const animScale     = useRef(new Animated.Value(1)).current;
  const animTranslateX = useRef(new Animated.Value(0)).current;
  const animTranslateY = useRef(new Animated.Value(0)).current;

  // Mutable refs to track committed gesture values
  const currentScale = useRef(1);
  const currentTX    = useRef(0);
  const currentTY    = useRef(0);

  // Gesture-session refs (reset each grant)
  const sessionInitDist  = useRef(0);
  const sessionInitScale = useRef(1);
  const sessionInitTX    = useRef(0);
  const sessionInitTY    = useRef(0);

  const getTouchDistance = (touches) => {
    const dx = touches[1].pageX - touches[0].pageX;
    const dy = touches[1].pageY - touches[0].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // ---------- PanResponder ----------
  // onStart* returns false → single-finger taps pass through to <Body>
  // onMove* activates for 2-finger pinch OR 1-finger drag when already zoomed
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) return true;
        // Increased threshold to 15 to prevent swallowing valid taps
        if (currentScale.current > 1.05) {
          return Math.abs(gs.dx) > 15 || Math.abs(gs.dy) > 15;
        }
        return false;
      },
      onMoveShouldSetPanResponderCapture: () => false,

      onPanResponderGrant: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          sessionInitDist.current  = getTouchDistance(touches);
          sessionInitScale.current = currentScale.current;
        }
        sessionInitTX.current = currentTX.current;
        sessionInitTY.current = currentTY.current;
      },

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        let scale = currentScale.current;
        if (touches && touches.length >= 2) {
          const dist     = getTouchDistance(touches);
          const newScale = Math.max(
            MIN_SCALE,
            Math.min(MAX_SCALE, sessionInitScale.current * (dist / sessionInitDist.current))
          );
          currentScale.current = newScale;
          scale = newScale;
          animScale.setValue(newScale);
        }
        
        // Pan with boundaries based on scale factor
        const maxTX = Math.max(0, ((scale - 1) * BODY_WIDTH) / 2);
        const maxTY = Math.max(0, ((scale - 1) * BODY_HEIGHT) / 2);
        
        const newTX = Math.max(-maxTX, Math.min(maxTX, sessionInitTX.current + gs.dx));
        const newTY = Math.max(-maxTY, Math.min(maxTY, sessionInitTY.current + gs.dy));
        
        currentTX.current = newTX;
        currentTY.current = newTY;
        animTranslateX.setValue(newTX);
        animTranslateY.setValue(newTY);
      },

      onPanResponderRelease: () => {
        if (currentScale.current < 1.05) {
          resetZoom();
        } else {
          setIsZoomed(true);
          if (onZoomChange) onZoomChange(true);
        }
      },
      onPanResponderTerminate: () => {},
    })
  ).current;

  // ---------- Reset zoom ----------
  const resetZoom = useCallback(() => {
    Animated.parallel([
      Animated.spring(animScale,      { toValue: 1, useNativeDriver: true, bounciness: 4 }),
      Animated.spring(animTranslateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
      Animated.spring(animTranslateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
    ]).start(() => {
      currentScale.current = 1;
      currentTX.current    = 0;
      currentTY.current    = 0;
      setIsZoomed(false);
      if (onZoomChange) onZoomChange(false);
    });
  }, [animScale, animTranslateX, animTranslateY, onZoomChange]);

  // ---------- Muscle data ----------
  const heatmapData = useMemo(() => {
    const updated = data.map((item) =>
      item.slug === selectedMuscle
        ? { ...item, color: heatmapColors[5] }
        : item
    );
    if (selectedMuscle && !updated.some((d) => d.slug === selectedMuscle)) {
      updated.push({ slug: selectedMuscle, color: heatmapColors[5] });
    }
    return updated;
  }, [data, selectedMuscle, heatmapColors]);

  const handleMusclePress = useCallback((bodyPart) => {
    if (!bodyPart?.slug) return;
    Haptics.selectionAsync().catch(() => {});
    if (onMuscleSelect) {
      onMuscleSelect(bodyPart.slug === selectedMuscle ? null : bodyPart.slug);
    }
  }, [selectedMuscle, onMuscleSelect]);

  const switchSide = useCallback(() => {
    setSide((s) => (s === 'front' ? 'back' : 'front'));
    if (onMuscleSelect) onMuscleSelect(null);
  }, [onMuscleSelect]);

  // Compute label for selected muscle
  const selectedLabel = selectedMuscle
    ? (MUSCLE_META[selectedMuscle]?.label || selectedMuscle.replace(/-/g, ' '))
    : null;

  // Find intensity entry for selected muscle
  const selectedEntry = selectedMuscle
    ? data.find((d) => d.slug === selectedMuscle)
    : null;

  const intensityLabels = ['—', 'Low', 'Moderate', 'High', 'Very High'];
  const intensityLabel = selectedEntry
    ? (intensityLabels[selectedEntry.intensity] || 'Moderate')
    : null;

  const muscleStyles = styles(COLORS, BORDER_RADIUS, SHADOWS, SPACING, BODY_HEIGHT);

  return (
    <View style={muscleStyles.container}>
      {/* ── Header ── */}
      <View style={muscleStyles.header}>
        <View>
          <Text style={[TYPOGRAPHY.h3, { color: COLORS.text }]}>Muscle Heatmap</Text>
          <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>
            Training volume distribution
          </Text>
        </View>
        <View style={muscleStyles.headerActions}>
          {isZoomed && (
            <TouchableOpacity
              style={muscleStyles.resetButton}
              onPress={resetZoom}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RotateCcw size={13} color={COLORS.textSecondary} />
              <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>Reset</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={muscleStyles.toggleButton} onPress={switchSide}>
            {side === 'front'
              ? <><Text style={[TYPOGRAPHY.label, { color: COLORS.primary }]}>Back View</Text><ChevronRight size={14} color={COLORS.primary} /></>
              : <><ChevronLeft size={14} color={COLORS.primary} /><Text style={[TYPOGRAPHY.label, { color: COLORS.primary }]}>Front View</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Zoom hint ── */}
      <View style={muscleStyles.hintRow}>
        <ZoomIn size={12} color={COLORS.textSecondary} />
        <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary, marginLeft: 4 }]}>
          Pinch to zoom • Tap a muscle to inspect
        </Text>
      </View>

      {/* ── Body visualizer with zoom/pan ── */}
      <View style={muscleStyles.zoomContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            muscleStyles.animatedBody,
            {
              transform: [
                { translateX: animTranslateX },
                { translateY: animTranslateY },
                { scale: animScale },
              ],
            },
          ]}
        >
          <Body
            data={heatmapData}
            gender={gender}
            side={side}
            scale={0.9} // Slightly reduced internal scale to ensure fit
            width={BODY_WIDTH}
            height={BODY_HEIGHT}
            onBodyPartPress={handleMusclePress}
            colors={heatmapColors}
          />
        </Animated.View>
      </View>

      {/* ── Info panel ── */}
      <View style={muscleStyles.infoPanel}>
        {selectedMuscle ? (
          <View style={muscleStyles.selectionCard}>
            <View style={muscleStyles.selectionHeader}>
              <Text style={[TYPOGRAPHY.label, { color: COLORS.textSecondary, textTransform: 'uppercase' }]}>
                Selected Muscle
              </Text>
              <TouchableOpacity
                onPress={() => onMuscleSelect(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[TYPOGRAPHY.h2, { color: COLORS.primary, textTransform: 'capitalize', marginTop: 4 }]}>
              {selectedLabel}
            </Text>
            <View style={muscleStyles.selectionMeta}>
              {selectedEntry ? (
                <>
                  <View style={[muscleStyles.tag, { backgroundColor: COLORS.trainingBg || '#eff6ff' }]}>
                    <Text style={[TYPOGRAPHY.caption, { color: COLORS.training, fontWeight: '700' }]}>
                      {intensityLabel} Intensity
                    </Text>
                  </View>
                  <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary, marginLeft: 8 }]}>
                    {selectedEntry.intensity || 1} / 4 level
                  </Text>
                </>
              ) : (
                <View style={[muscleStyles.tag, { backgroundColor: COLORS.gray100 || '#f3f4f6' }]}>
                  <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>Not trained recently</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View>
            <Text style={[TYPOGRAPHY.label, { color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8 }]}>
              Legend
            </Text>
            <View style={muscleStyles.legendGradient}>
              {heatmapColors.slice(0, 5).map((color, i) => (
                <View key={i} style={[muscleStyles.legendSwatch, { backgroundColor: color }]} />
              ))}
            </View>
            <View style={muscleStyles.legendLabels}>
              <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>Resting</Text>
              <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>Very High</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = (COLORS, BORDER_RADIUS, SHADOWS, SPACING, BODY_HEIGHT) =>
  StyleSheet.create({
    container: {
      backgroundColor: COLORS?.surface || '#fff',
      borderRadius: BORDER_RADIUS?.lg || 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: COLORS?.border || '#eee',
      ...SHADOWS,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: COLORS?.gray100 || '#f3f4f6',
    },
    toggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS?.gray100 || '#f3f4f6',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 4,
    },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    // Clipping container so the body never overflows the card
    zoomContainer: {
      width: '100%',
      height: BODY_HEIGHT,
      overflow: 'hidden',
      borderRadius: BORDER_RADIUS?.md || 12,
      backgroundColor: COLORS?.background || '#fafafa',
      alignItems: 'center',
      justifyContent: 'center',
    },
    animatedBody: {
      // Must be same size as zoomContainer so transform-origin is centred
      width: '100%',
      height: BODY_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoPanel: {
      marginTop: 16,
      paddingHorizontal: 4,
    },
    // ── Legend ──
    legendGradient: {
      flexDirection: 'row',
      height: 10,
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 4,
    },
    legendSwatch: {
      flex: 1,
    },
    legendLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    // ── Selection card ──
    selectionCard: {
      backgroundColor: COLORS?.gray100 || '#f3f4f6',
      padding: 14,
      borderRadius: 12,
    },
    selectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    selectionMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    tag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
  });

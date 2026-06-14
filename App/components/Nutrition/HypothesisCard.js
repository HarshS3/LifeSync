/**
 * HypothesisCard
 *
 * A lightweight, non-blocking card that appears when a food hypothesis exists.
 * Design principle: one tap to respond, never intrusive, always optional.
 *
 * UX flow:
 *   1. Parent fetches GET /nutrition/hypotheses?canonicalId=<foodName>
 *   2. If a hypothesis in status 'proposed' or 'testing' exists, render this card
 *   3. User taps "Felt right" or "Didn't match" — PATCH /nutrition/hypotheses/:id/feedback
 *   4. Card thanks user and disappears (auto-dismiss after 1.5s)
 *
 * This is never shown at meal log time (would interrupt the flow).
 * It's shown on the food detail screen or as a dismissible bottom notice
 * after the log-food save completes.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { FlaskConical, ThumbsUp, ThumbsDown, X } from 'lucide-react-native';
import api from '../../services/api';

const CONFIDENCE_LABEL = (c) => {
  if (c >= 0.75) return { text: 'High confidence', color: '#10b981' };
  if (c >= 0.50) return { text: 'Testing', color: '#f59e0b' };
  return { text: 'New hypothesis', color: '#6366f1' };
};

export default function HypothesisCard({ hypothesis, onDismiss }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');

  if (!hypothesis || done) {
    if (done) {
      return (
        <View style={styles.doneCard}>
          <Text style={styles.doneText}>{doneMessage}</Text>
        </View>
      );
    }
    return null;
  }

  const conf = CONFIDENCE_LABEL(hypothesis.confidence || 0.5);

  const handleFeedback = async (outcome) => {
    setSubmitting(true);
    try {
      await api.patch(`/nutrition/hypotheses/${hypothesis._id}/feedback`, { outcome });
      setDoneMessage(outcome === 'support' ? 'Noted — building your pattern.' : 'Noted — hypothesis updated.');
      setDone(true);
      setTimeout(() => onDismiss?.(), 1800);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <FlaskConical size={14} color="#6366f1" />
          <Text style={styles.titleText}>Your Hypothesis</Text>
          <View style={[styles.confBadge, { backgroundColor: conf.color + '20' }]}>
            <Text style={[styles.confText, { color: conf.color }]}>{conf.text}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={14} color="#aaa" />
        </TouchableOpacity>
      </View>

      <Text style={styles.hypothesis}>{hypothesis.hypothesis}</Text>

      {hypothesis.recommendedValidation ? (
        <Text style={styles.validation}>{hypothesis.recommendedValidation}</Text>
      ) : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.supportBtn]}
          onPress={() => handleFeedback('support')}
          disabled={submitting}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : (
            <>
              <ThumbsUp size={14} color="#10b981" />
              <Text style={[styles.btnText, { color: '#10b981' }]}>Felt right</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.refuteBtn]}
          onPress={() => handleFeedback('refute')}
          disabled={submitting}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <>
              <ThumbsDown size={14} color="#ef4444" />
              <Text style={[styles.btnText, { color: '#ef4444' }]}>Didn't match</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.observationCount}>
        {hypothesis.supportCount + hypothesis.refuteCount} observation{hypothesis.supportCount + hypothesis.refuteCount !== 1 ? 's' : ''} so far
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#faf5ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    marginTop: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4c1d95',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  confText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dismissBtn: {
    padding: 2,
  },
  hypothesis: {
    fontSize: 13,
    color: '#3b0764',
    lineHeight: 20,
    marginBottom: 6,
  },
  validation: {
    fontSize: 11,
    color: '#7c3aed',
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  supportBtn: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  refuteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  observationCount: {
    fontSize: 10,
    color: '#a78bfa',
    textAlign: 'center',
  },
  doneCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  doneText: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '600',
  },
});

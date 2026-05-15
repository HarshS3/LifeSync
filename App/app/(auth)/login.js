/**
 * Mobile Login Screen — pixel-perfect translation of:
 *   client/src/components/AuthPage.jsx  (login + register)
 *   client/src/components/ForgotPassword.jsx
 *
 * MUI → RN mapping used:
 *   bgcolor 'background.default' → #f6f1e7  (Paper theme)
 *   bgcolor 'background.paper'   → #ffffff
 *   color   'text.primary'       → #161310
 *   color   'text.secondary'     → rgba(22,19,16,0.62)
 *   color   'secondary.main'     → #1f6f5b  (accent green)
 *   color   'error.main'         → #dc2626
 *   color   'divider'            → rgba(22,19,16,0.10)
 *   p: 4 (MUI spacing × 8px)     → padding: 32
 *   borderRadius: 3 (×8px)       → borderRadius: 24
 *   py: 1.5 (button)             → paddingVertical: 12
 *   gap: 2.5                     → gap: 20  (marginBottom on items)
 *   my: 3                        → marginVertical: 24
 *   mb: 4                        → marginBottom: 32
 *   mb: 1                        → marginBottom: 8
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { API_BASE } from '../../services/api';

// ─── Colours (Paper theme tokens) ────────────────────────────────────────────
const C = {
  bg:        '#f6f1e7',          // background.default
  surface:   '#ffffff',          // background.paper
  text:      '#161310',          // text.primary
  muted:     'rgba(22,19,16,0.62)', // text.secondary
  accent:    '#1f6f5b',          // secondary.main  (forgot password link)
  border:    'rgba(22,19,16,0.10)', // divider
  error:     '#dc2626',
  success:   '#16a34a',
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
function LifeSyncMark({ size = 56 }) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

// ─── Reusable Input ───────────────────────────────────────────────────────────
function Field({ label, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 20 }}>
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={C.muted}
        {...props}
      />
    </View>
  );
}

// ─── Forgot Password Screen ───────────────────────────────────────────────────
// Exact translation of ForgotPassword.jsx
function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    if (!email) { setError('Please enter your email'); return; }
    setLoading(true);
    try {
      // Determine origin for the reset link
      const origin = __DEV__ ? 'http://192.168.1.9:5173' : 'https://lifesync-app.vercel.app';

      const res  = await fetch(`${API_BASE}/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, origin }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(data.message || 'If that email is registered, a reset link has been sent.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError(data.error || 'Something went wrong.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setError('Network error.');
    }
    setLoading(false);
  };

  return (
    // Same outer layout as AuthPage: centered, bg default
    <View style={styles.outerCenter}>
      {/* Same card as AuthPage: bg paper, borderRadius 24, border 1, p 32 */}
      <View style={styles.card}>
        {/* Header — same as AuthPage header block */}
        <View style={styles.headerBlock}>
          {/* No logo on forgot — web uses h5 title, not h4 + logo */}
          <Text style={styles.h5}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your email to get a reset link</Text>
        </View>

        {/* form gap: 2.5 = 20px via marginBottom on each child */}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        {!!error && (
          <Text style={[styles.feedbackText, { color: C.error }]}>{error}</Text>
        )}
        {!!message && (
          <Text style={[styles.feedbackText, { color: C.success }]}>{message}</Text>
        )}

        {/* "Send Reset Link" button — variant="contained", py:1.5, borderRadius:2, bgcolor text.primary */}
        <TouchableOpacity
          style={[styles.containedBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={C.surface} size="small" />
            : <Text style={styles.containedBtnText}>Send Reset Link</Text>}
        </TouchableOpacity>

        {/* "Return to Sign In" button — variant="outlined", mt:1 */}
        <TouchableOpacity
          style={styles.outlinedBtn}
          onPress={onBack}
          activeOpacity={0.85}
        >
          <Text style={styles.outlinedBtnText}>Return to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Auth Screen ─────────────────────────────────────────────────────────
// Exact translation of AuthPage.jsx
export default function LoginScreen() {
  const [showForgot, setShowForgot] = useState(false);
  const [isLogin, setIsLogin]       = useState(true);
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name.trim()) throw new Error('Name is required');
        await register(name, email, password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.root}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ForgotPasswordScreen onBack={() => setShowForgot(false)} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Outer box: minHeight 100vh, display flex, alignItems center,
            justifyContent center, bgcolor background.default, p:2 */}
        <View style={styles.outerCenter}>

          {/* Card: width 100%, maxWidth 400, bgcolor background.paper,
              borderRadius 3 (24px), border 1px divider, p:4 (32px) */}
          <View style={styles.card}>

            {/* Header block: textAlign center, mb:4 (32px) */}
            <View style={styles.headerBlock}>
              {/* LifeSyncMark size={56} */}
              <View style={styles.logoWrap}>
                <LifeSyncMark size={56} />
              </View>
              {/* variant="h4", fontWeight 700, color text.primary, mb:1 */}
              <Text style={styles.h4}>LifeSync</Text>
              {/* variant="body2", color text.secondary */}
              <Text style={styles.subtitle}>
                {isLogin ? 'Welcome back' : 'Create your account'}
              </Text>
            </View>

            {/* form: display flex, flexDirection column, gap 2.5 (20px) */}

            {/* Name field — only shown when !isLogin */}
            {!isLogin && (
              <Field
                label="Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                textContentType="name"
                placeholder="Name"
                returnKeyType="next"
              />
            )}

            {/* Email field */}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              placeholder="Email"
              returnKeyType="next"
            />

            {/* Password field */}
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={isLogin ? 'password' : 'newPassword'}
              autoComplete={isLogin ? 'password' : 'new-password'}
              placeholder="Password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {/* Forgot password — only in login, textAlign right */}
            {isLogin && (
              <View style={styles.forgotRow}>
                {/* color secondary.main, cursor pointer, fontSize 13, fontWeight 600 */}
                <TouchableOpacity onPress={() => setShowForgot(true)}>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error message */}
            {!!error && (
              <Text style={[styles.feedbackText, { color: C.error }]}>{error}</Text>
            )}

            {/* Submit button: variant="contained", py:1.5, borderRadius:2 */}
            <TouchableOpacity
              style={[styles.containedBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={C.surface} size="small" />
                : <Text style={styles.containedBtnText}>
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Text>}
            </TouchableOpacity>

            {/* Divider: my:3 (24px vertical) */}
            <View style={styles.divider} />

            {/* Toggle: mt:3 textAlign center */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleBody}>
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                {' '}
              </Text>
              <TouchableOpacity
                onPress={() => { setIsLogin(v => !v); setError(''); }}
              >
                {/* color text.primary, fontWeight 600 */}
                <Text style={styles.toggleLink}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,  // background.default
  },
  scroll: {
    flexGrow: 1,
    // p: 2 = 16px all sides on the outer box
    padding: 16,
  },
  outerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: C.surface,  // background.paper
    borderRadius: 24,             // borderRadius: 3  (MUI × 8 = 24)
    borderWidth: 1,
    borderColor: C.border,        // divider
    padding: 32,                  // p: 4 (MUI × 8 = 32)
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 32,             // mb: 4
  },
  logoWrap: {
    marginBottom: 12,             // mb: 1.5 ≈ 12px
  },
  // variant="h4", fontWeight 700, color text.primary, mb:1
  h4: {
    fontSize: 28,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  // variant="h5", fontWeight 700, color text.primary, mb:1
  h5: {
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
  },
  // variant="body2", color text.secondary
  subtitle: {
    fontSize: 14,
    color: C.muted,
  },
  // MUI TextField outlined — label above is implicit; we omit label for cleaner mobile parity
  input: {
    borderWidth: 1,
    borderColor: C.border,        // fieldset borderColor: divider
    borderRadius: 10,             // borderRadius: 2 = 16 on MUI, we use 10 for mobile feel
    paddingHorizontal: 14,
    paddingVertical: 15,
    fontSize: 16,
    color: C.text,
    backgroundColor: C.surface,
  },
  inputFocused: {
    borderColor: C.accent,        // &.Mui-focused fieldset: secondary.main
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -12,               // pull up after password field gap
    marginBottom: 20,
  },
  // color secondary.main (#1f6f5b), fontSize 13, fontWeight 600
  forgotLink: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  // variant="contained", py:1.5 (12), bgcolor text.primary, borderRadius:2 (16)
  containedBtn: {
    backgroundColor: C.text,      // text.primary = #161310
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  containedBtnText: {
    color: C.surface,              // background.paper = white
    fontSize: 15,
    fontWeight: '600',
  },
  // variant="outlined", mt:1, borderColor divider, color text.primary
  outlinedBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,                  // mt: 1
  },
  outlinedBtnText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  // Divider: my:3 = marginVertical 24
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 24,
  },
  // mt:3 textAlign center, flex row for inline text + link
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  // variant="body2", color text.secondary
  toggleBody: {
    fontSize: 14,
    color: C.muted,
  },
  // color text.primary, fontWeight 600
  toggleLink: {
    fontSize: 14,
    color: C.text,
    fontWeight: '700',
  },
});

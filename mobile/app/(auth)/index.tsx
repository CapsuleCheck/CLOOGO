import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { COLORS, FONT, SPACING, RADIUS, SHADOW } from '@/constants/theme';

export default function AuthScreen() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', neighborhood: '' });
  const [loading, setLoading] = useState(false);

  const API = process.env.EXPO_PUBLIC_API_URL!;

  const update = (key: string, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Error', 'Email and password are required.');
      return;
    }
    if (mode === 'register' && (!form.name || !form.neighborhood)) {
      Alert.alert('Error', 'Name and neighborhood are required.');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await axios.post(`${API}/api/auth/login`, {
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });
      } else {
        res = await axios.post(`${API}/api/auth/register`, {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          name: form.name.trim(),
          neighborhood: form.neighborhood.trim(),
        });
      }
      await login(res.data.token, res.data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Something went wrong. Please try again.';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>E</Text>
            </View>
            <Text style={styles.appName}>ErrandGo</Text>
            <Text style={styles.tagline}>Your neighborhood errand network</Text>
          </View>

          {/* Mode Toggle */}
          <View style={styles.toggleRow}>
            {(['login', 'register'] as const).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {mode === 'register' && (
              <>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Alex Johnson"
                  value={form.name}
                  onChangeText={v => update('name', v)}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                <Text style={styles.label}>Neighborhood</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Brooklyn, Midtown"
                  value={form.neighborhood}
                  onChangeText={v => update('neighborhood', v)}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </>
            )}

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              value={form.email}
              onChangeText={v => update('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={form.password}
              onChangeText={v => update('password', v)}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={submit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.switchText}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Text
              style={styles.switchLink}
              onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingTop: SPACING.xxl },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.md,
  },
  logoText: { fontSize: 32, fontWeight: '900', color: '#fff' },
  appName: { fontSize: FONT.xxxl, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  tagline: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: 4 },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    padding: 3,
    marginBottom: SPACING.lg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.full,
  },
  toggleBtnActive: { backgroundColor: '#fff', ...SHADOW.sm },
  toggleText: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textMuted },
  toggleTextActive: { color: COLORS.text },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOW.md,
  },
  label: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    fontSize: FONT.base,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    ...SHADOW.sm,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontSize: FONT.base, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  switchText: { textAlign: 'center', fontSize: FONT.sm, color: COLORS.textMuted },
  switchLink: { color: COLORS.primary, fontWeight: '700' },
});

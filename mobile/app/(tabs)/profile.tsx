import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { COLORS, FONT, SPACING, RADIUS, SHADOW } from '@/constants/theme';

export default function Profile() {
  const { user, login, token, authHeader, API, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', neighborhood: '' });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [rating, setRating] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);

  const fetchData = async () => {
    if (!user) return;
    setForm({ name: user.name, neighborhood: user.neighborhood });
    try {
      const [statsRes, ratingRes, earningsRes] = await Promise.all([
        axios.get(`${API}/my/stats`, { headers: authHeader }),
        axios.get(`${API}/users/${user.id}/rating`, { headers: authHeader }),
        axios.get(`${API}/my/earnings`, { headers: authHeader }),
      ]);
      setStats(statsRes.data);
      setRating(ratingRes.data);
      setEarnings(earningsRes.data);
    } catch (e) { console.error(e); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [user?.id]));

  const saveProfile = async () => {
    if (!form.name.trim() || !form.neighborhood.trim()) {
      Alert.alert('Error', 'Name and neighborhood are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/users/profile`, form, { headers: authHeader });
      await login(token!, res.data);
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const StarRow = ({ count }: { count: number }) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= Math.round(count) ? 'star' : 'star-outline'}
          size={14}
          color={i <= Math.round(count) ? '#F59E0B' : COLORS.border}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              {editing ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={form.name}
                    onChangeText={v => setForm(f => ({ ...f, name: v }))}
                    placeholder="Full name"
                  />
                  <TextInput
                    style={[styles.editInput, { marginTop: 6 }]}
                    value={form.neighborhood}
                    onChangeText={v => setForm(f => ({ ...f, neighborhood: v }))}
                    placeholder="Neighborhood"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.userName}>{user?.name}</Text>
                  <View style={styles.neighborhoodRow}>
                    <Ionicons name="location-outline" size={13} color={COLORS.primary} />
                    <Text style={styles.neighborhoodText}>{user?.neighborhood}</Text>
                  </View>
                  {rating && rating.count > 0 && (
                    <View style={styles.ratingRow}>
                      <StarRow count={rating.average} />
                      <Text style={styles.ratingText}>
                        {rating.average.toFixed(1)} ({rating.count} reviews)
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
            <TouchableOpacity
              onPress={editing ? saveProfile : () => setEditing(true)}
              style={[styles.editBtn, editing && styles.editBtnSave]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={editing ? 'checkmark' : 'pencil-outline'}
                  size={16}
                  color={editing ? '#fff' : COLORS.textMuted}
                />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.emailRow}>
            <Ionicons name="mail-outline" size={13} color={COLORS.textLight} />
            <Text style={styles.emailText}>{user?.email}</Text>
          </View>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard icon="cube-outline" label="Posted" value={stats.errands_posted} color={COLORS.info} />
            <StatCard icon="bicycle-outline" label="Active" value={stats.active_runs} color={COLORS.warning} />
            <StatCard icon="checkmark-circle-outline" label="Done" value={stats.runs_completed} color={COLORS.primary} />
          </View>
        )}

        {/* Earnings */}
        {earnings && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Runner Earnings</Text>
            </View>
            <View style={styles.earningsRow}>
              <View style={[styles.earningsCard, { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryLight }]}>
                <Text style={styles.earningsLabel}>Total Earned</Text>
                <Text style={[styles.earningsValue, { color: COLORS.primaryDark }]}>
                  ${earnings.total_earned.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.earningsCard, { backgroundColor: COLORS.warningBg, borderColor: '#FDE68A' }]}>
                <Text style={styles.earningsLabel}>Pending</Text>
                <Text style={[styles.earningsValue, { color: COLORS.warning }]}>
                  ${earnings.pending_payout.toFixed(2)}
                </Text>
              </View>
            </View>

            {earnings.completed_runs.length > 0 && (
              <>
                <Text style={styles.recentTitle}>Recent Completed Runs</Text>
                {earnings.completed_runs.slice(0, 5).map((run: any) => (
                  <View key={run.id} style={styles.earningsRunRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.runItem} numberOfLines={1}>{run.item_description}</Text>
                      <Text style={styles.runPoster}>{run.poster_name} · {run.delivery_neighborhood}</Text>
                    </View>
                    <Text style={styles.runPrice}>
                      +${(run.accepted_price || run.offered_price || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {earnings.total_earned === 0 && (
              <Text style={styles.noEarnings}>Complete runs to start earning. Your earnings appear here.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  title: { fontSize: FONT.xxl, fontWeight: '900', color: COLORS.text, letterSpacing: -0.3 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  logoutText: { fontSize: FONT.sm, color: COLORS.danger, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  avatar: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FONT.xl + 2, fontWeight: '900', color: COLORS.primaryDark },
  userName: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text },
  neighborhoodRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  neighborhoodText: { fontSize: FONT.sm, color: COLORS.textMuted },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  ratingText: { fontSize: FONT.xs, color: COLORS.textMuted },
  editBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  editBtnSave: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  editInput: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.sm,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
    fontSize: FONT.sm, color: COLORS.text,
  },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  emailText: { fontSize: FONT.sm, color: COLORS.textMuted },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: FONT.xxl, fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: FONT.xs, color: COLORS.textMuted, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT.base, fontWeight: '800', color: COLORS.text },
  earningsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  earningsCard: {
    flex: 1, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, alignItems: 'center',
  },
  earningsLabel: { fontSize: FONT.xs, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase' },
  earningsValue: { fontSize: FONT.xxl, fontWeight: '900' },
  recentTitle: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.textMuted, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  earningsRunRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.background,
  },
  runItem: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.text },
  runPoster: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2 },
  runPrice: { fontSize: FONT.sm, fontWeight: '800', color: COLORS.primaryDark },
  noEarnings: { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.md },
});

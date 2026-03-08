import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import StatusBadge from '@/components/StatusBadge';
import { COLORS, FONT, SPACING, RADIUS, SHADOW } from '@/constants/theme';
import { formatDistanceToNow } from 'date-fns';

export default function MyErrands() {
  const { authHeader, API } = useAuth();
  const [errands, setErrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchErrands = async () => {
    try {
      const res = await axios.get(`${API}/my/errands`, { headers: authHeader });
      setErrands(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchErrands(); }, [authHeader]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Errands</Text>
        <Text style={styles.subtitle}>Errands you've posted</Text>
      </View>

      <FlatList
        data={errands}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchErrands(); }} tintColor={COLORS.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/errand/${item.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.item_description}</Text>
                <View style={styles.routeRow}>
                  <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.routeText}>{item.pickup_neighborhood} → {item.delivery_neighborhood}</Text>
                </View>
              </View>
              <StatusBadge status={item.status} size="sm" />
            </View>
            <View style={styles.cardBottom}>
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>
                  ${(item.accepted_price || item.offered_price)?.toFixed(2)}
                </Text>
                {item.accepted_price && item.accepted_price !== item.offered_price && (
                  <Text style={styles.originalPrice}>${item.offered_price?.toFixed(2)}</Text>
                )}
              </View>
              {item.runner_name && (
                <View style={styles.runnerRow}>
                  <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.runnerText}>{item.runner_name}</Text>
                </View>
              )}
              <Text style={styles.timeText}>
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No errands yet</Text>
              <Text style={styles.emptyText}>Post your first errand and get it done!</Text>
              <TouchableOpacity style={styles.postBtn} onPress={() => router.push('/(tabs)/post')}>
                <Text style={styles.postBtnText}>Post Errand</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.md },
  title: { fontSize: FONT.xxl, fontWeight: '900', color: COLORS.text, letterSpacing: -0.3 },
  subtitle: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: 2 },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm, gap: SPACING.sm },
  itemTitle: { fontSize: FONT.base, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeText: { fontSize: FONT.xs, color: COLORS.textMuted },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  priceTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText: { fontSize: FONT.sm, fontWeight: '800', color: COLORS.primaryDark },
  originalPrice: { fontSize: FONT.xs, color: COLORS.textLight, textDecorationLine: 'line-through' },
  runnerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  runnerText: { fontSize: FONT.xs, color: COLORS.textMuted },
  timeText: { fontSize: FONT.xs, color: COLORS.textLight, marginLeft: 'auto' },
  empty: { alignItems: 'center', paddingTop: SPACING.xxl, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text, marginTop: SPACING.md },
  emptyText: { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
  postBtn: { marginTop: SPACING.lg, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 24, paddingVertical: 12 },
  postBtnText: { fontSize: FONT.sm, fontWeight: '800', color: '#fff' },
});

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

export default function MyRuns() {
  const { authHeader, API } = useAuth();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRuns = async () => {
    try {
      const res = await axios.get(`${API}/my/runs`, { headers: authHeader });
      setRuns(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRuns(); }, [authHeader]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Runs</Text>
        <Text style={styles.subtitle}>Errands you're running</Text>
      </View>

      <FlatList
        data={runs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRuns(); }} tintColor={COLORS.primary} />
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
                <Text style={styles.posterText}>by {item.poster_name}</Text>
              </View>
              <StatusBadge status={item.status} size="sm" />
            </View>

            <View style={styles.routeRow}>
              <Ionicons name="location-outline" size={12} color={COLORS.primary} />
              <Text style={styles.routeText}>{item.pickup_neighborhood}</Text>
              <Ionicons name="arrow-forward" size={11} color={COLORS.textLight} />
              <Ionicons name="flag-outline" size={12} color={COLORS.primaryDark} />
              <Text style={styles.routeText}>{item.delivery_neighborhood}</Text>
            </View>

            <View style={styles.cardBottom}>
              <View style={styles.earningBadge}>
                <Ionicons name="cash-outline" size={13} color={COLORS.primaryDark} />
                <Text style={styles.earningText}>
                  ${(item.accepted_price || item.offered_price)?.toFixed(2)}
                </Text>
              </View>
              {item.delivery_address && (
                <View style={styles.addressRow}>
                  <Ionicons name="home-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.addressText} numberOfLines={1}>{item.delivery_address}</Text>
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
              <Ionicons name="bicycle-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No active runs</Text>
              <Text style={styles.emptyText}>Browse the feed and submit an offer to start running errands.</Text>
              <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)')}>
                <Text style={styles.browseBtnText}>Browse Errands</Text>
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
    gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  itemTitle: { fontSize: FONT.base, fontWeight: '700', color: COLORS.text },
  posterText: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.background, borderRadius: RADIUS.sm, padding: 6 },
  routeText: { fontSize: FONT.xs, color: COLORS.textMuted, flex: 1 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  earningBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  earningText: { fontSize: FONT.sm, fontWeight: '800', color: COLORS.primaryDark },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  addressText: { fontSize: FONT.xs, color: COLORS.textMuted, flex: 1 },
  timeText: { fontSize: FONT.xs, color: COLORS.textLight },
  empty: { alignItems: 'center', paddingTop: SPACING.xxl, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text, marginTop: SPACING.md },
  emptyText: { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  browseBtn: { marginTop: SPACING.lg, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { fontSize: FONT.sm, fontWeight: '800', color: '#fff' },
});

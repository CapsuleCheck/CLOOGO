import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { COLORS, FONT, SPACING, RADIUS, SHADOW, STATUS } from '@/constants/theme';

interface Props {
  errand: any;
  onPress: () => void;
}

export default function ErrandCard({ errand, onPress }: Props) {
  const status = STATUS[errand.status as keyof typeof STATUS] || STATUS.open;
  const timeAgo = errand.created_at
    ? formatDistanceToNow(new Date(errand.created_at), { addSuffix: true })
    : '';

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.85}>
      {/* Top row: title + price */}
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          {errand.category && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{errand.category}</Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={2}>{errand.item_description}</Text>
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>${errand.offered_price?.toFixed(2)}</Text>
        </View>
      </View>

      {/* Route row */}
      <View style={styles.routeRow}>
        <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
        <Text style={styles.routeText} numberOfLines={1}>
          {errand.pickup_neighborhood}
        </Text>
        <Ionicons name="arrow-forward" size={12} color={COLORS.textLight} style={{ marginHorizontal: 4 }} />
        <Ionicons name="flag-outline" size={13} color={COLORS.primary} />
        <Text style={styles.routeText} numberOfLines={1}>
          {errand.delivery_neighborhood}
        </Text>
      </View>

      {/* Bottom row: poster + time + status */}
      <View style={styles.bottomRow}>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarText}>{errand.poster_name?.[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.posterText}>{errand.poster_name}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.timeText}>{timeAgo}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  titleGroup: { flex: 1, marginRight: SPACING.sm },
  categoryPill: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  categoryText: { fontSize: FONT.xs, color: COLORS.primaryDark, fontWeight: '600' },
  title: { fontSize: FONT.base, fontWeight: '700', color: COLORS.text, lineHeight: 21 },
  priceBadge: {
    backgroundColor: COLORS.primaryBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  priceText: { fontSize: FONT.base, fontWeight: '800', color: COLORS.primaryDark },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.xs + 2,
  },
  routeText: { fontSize: FONT.sm, color: COLORS.textMuted, flex: 1, marginLeft: 3 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 10, fontWeight: '700', color: COLORS.primaryDark },
  posterText: { fontSize: FONT.xs, color: COLORS.textMuted, fontWeight: '500' },
  timeText: { fontSize: FONT.xs, color: COLORS.textLight, marginRight: 6 },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: FONT.xs, fontWeight: '600' },
});

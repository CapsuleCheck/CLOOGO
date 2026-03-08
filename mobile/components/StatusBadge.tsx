import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS } from '@/constants/theme';

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = STATUS[status as keyof typeof STATUS] || STATUS.open;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, size === 'sm' && styles.sm]}>
      <Text style={[styles.text, { color: cfg.text }, size === 'sm' && styles.textSm]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 13, fontWeight: '700' },
  textSm: { fontSize: 11 },
});

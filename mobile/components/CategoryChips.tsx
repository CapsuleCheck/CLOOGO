import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, FONT, RADIUS, SPACING } from '@/constants/theme';

interface Props {
  categories: string[];
  selected: string;
  onSelect: (cat: string) => void;
  showAll?: boolean;
}

export default function CategoryChips({ categories, selected, onSelect, showAll = true }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {showAll && (
        <TouchableOpacity
          onPress={() => onSelect('')}
          style={[styles.chip, !selected && styles.chipActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, !selected && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
      )}
      {categories.map(cat => (
        <TouchableOpacity
          key={cat}
          onPress={() => onSelect(selected === cat ? '' : cat)}
          style={[styles.chip, selected === cat && styles.chipActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, selected === cat && styles.chipTextActive]}>
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textMuted },
  chipTextActive: { color: '#fff' },
});

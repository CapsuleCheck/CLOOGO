import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, RefreshControl,
  StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import ErrandCard from '@/components/ErrandCard';
import CategoryChips from '@/components/CategoryChips';
import { COLORS, FONT, SPACING, RADIUS, SHADOW, CATEGORIES } from '@/constants/theme';

export default function Dashboard() {
  const { authHeader, API, user } = useAuth();
  const [errands, setErrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const fetchErrands = useCallback(async (cat = category) => {
    try {
      const params: any = { status: 'open' };
      if (cat) params.category = cat;
      const res = await axios.get(`${API}/errands`, { headers: authHeader, params });
      setErrands(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API, authHeader, category]);

  useEffect(() => { fetchErrands(category); }, [category]);

  const filtered = errands.filter(e =>
    !search ||
    e.item_description?.toLowerCase().includes(search.toLowerCase()) ||
    e.pickup_neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
    e.delivery_neighborhood?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    fetchErrands(cat);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.headerTitle}>Find an Errand</Text>
        </View>
        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => router.push('/(tabs)/post')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={COLORS.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search errands, neighborhoods..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <View style={{ marginBottom: SPACING.sm }}>
        <CategoryChips
          categories={CATEGORIES}
          selected={category}
          onSelect={handleCategorySelect}
          showAll
        />
      </View>

      {loading ? (
        <ActivityIndicator
          color={COLORS.primary}
          size="large"
          style={{ marginTop: SPACING.xxl }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchErrands(category); }}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => (
            <ErrandCard
              errand={item}
              onPress={() => router.push(`/errand/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No errands found</Text>
              <Text style={styles.emptyText}>
                {category ? `No open "${category}" errands right now.` : 'Be the first to post an errand!'}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/post')}
              >
                <Text style={styles.emptyBtnText}>Post an Errand</Text>
              </TouchableOpacity>
            </View>
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listCount}>
                {filtered.length} open {filtered.length === 1 ? 'errand' : 'errands'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
  },
  greeting: { fontSize: FONT.sm, color: COLORS.textMuted, fontWeight: '500' },
  headerTitle: { fontSize: FONT.xxl + 2, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...SHADOW.sm,
  },
  postBtnText: { fontSize: FONT.sm, fontWeight: '800', color: '#fff' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: FONT.sm,
    color: COLORS.text,
  },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  listHeader: { paddingBottom: SPACING.xs },
  listCount: { fontSize: FONT.xs, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { alignItems: 'center', paddingTop: SPACING.xxl, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text, marginTop: SPACING.md },
  emptyText: { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  emptyBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { fontSize: FONT.sm, fontWeight: '800', color: '#fff' },
});

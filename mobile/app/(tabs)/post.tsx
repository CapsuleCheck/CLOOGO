import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import CategoryChips from '@/components/CategoryChips';
import { COLORS, FONT, SPACING, RADIUS, SHADOW, CATEGORIES } from '@/constants/theme';

const STEPS = ['Item Details', 'Locations', 'Price & Submit'];

export default function PostErrand() {
  const { authHeader, API } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [form, setForm] = useState({
    item_description: '',
    category: '',
    item_details: '',
    pickup_neighborhood: '',
    delivery_neighborhood: '',
    delivery_address: '',
    offered_price: '',
    image_url: '',
  });
  const [imageUri, setImageUri] = useState<string | null>(null);

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setImageUploading(true);
    setImageUri(uri);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'item.jpg',
      } as any);
      const res = await axios.post(`${API}/upload`, formData, {
        headers: { ...authHeader, 'Content-Type': 'multipart/form-data' },
      });
      update('image_url', res.data.url);
    } catch {
      Alert.alert('Upload failed', 'Could not upload image. Try again.');
      setImageUri(null);
    } finally {
      setImageUploading(false);
    }
  };

  const canAdvance = () => {
    if (step === 0) return form.item_description.trim().length > 0;
    if (step === 1)
      return form.pickup_neighborhood.trim() && form.delivery_neighborhood.trim() && form.delivery_address.trim();
    if (step === 2) return parseFloat(form.offered_price) > 0;
    return false;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/errands`, {
        ...form,
        offered_price: parseFloat(form.offered_price),
        category: form.category || null,
        item_details: form.item_details || null,
        image_url: form.image_url || null,
      }, { headers: authHeader });
      Alert.alert('Posted!', 'Your errand is now live. Runners can see it.', [
        { text: 'View Feed', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to post errand.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Post an Errand</Text>
          <Text style={styles.headerSub}>Step {step + 1} of {STEPS.length}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Step labels */}
          <View style={styles.stepLabels}>
            {STEPS.map((s, i) => (
              <View key={s} style={styles.stepLabel}>
                <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                  {i < step ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={[styles.stepDotText, i <= step && { color: '#fff' }]}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepText, i === step && styles.stepTextActive]}>{s}</Text>
              </View>
            ))}
          </View>

          {/* STEP 0: Item details */}
          {step === 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>What needs to be picked up? *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Prescription from CVS, Grocery order"
                value={form.item_description}
                onChangeText={v => update('item_description', v)}
                maxLength={100}
              />
              <Text style={styles.charCount}>{form.item_description.length}/100</Text>

              <Text style={styles.label}>Category <Text style={styles.optional}>(optional)</Text></Text>
              <CategoryChips
                categories={CATEGORIES}
                selected={form.category}
                onSelect={cat => update('category', cat)}
                showAll={false}
              />

              <Text style={[styles.label, { marginTop: SPACING.md }]}>
                Extra details <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Special instructions, item size, fragile items..."
                value={form.item_details}
                onChangeText={v => update('item_details', v)}
                multiline
                numberOfLines={3}
              />

              {/* Image Upload */}
              <Text style={styles.label}>Item Photo <Text style={styles.optional}>(optional)</Text></Text>
              {imageUri ? (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: imageUri }} style={styles.previewImg} />
                  {imageUploading && (
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeImg}
                    onPress={() => { setImageUri(null); update('image_url', ''); }}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePickerRow}>
                  <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                    <Ionicons name="images-outline" size={22} color={COLORS.primary} />
                    <Text style={styles.imagePickerText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imagePicker} onPress={takePhoto} activeOpacity={0.8}>
                    <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
                    <Text style={styles.imagePickerText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* STEP 1: Locations */}
          {step === 1 && (
            <View style={styles.section}>
              <Text style={styles.label}>Pickup Neighborhood *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Downtown, Brooklyn"
                value={form.pickup_neighborhood}
                onChangeText={v => update('pickup_neighborhood', v)}
              />
              <Text style={styles.label}>Delivery Neighborhood *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Midtown, Upper East Side"
                value={form.delivery_neighborhood}
                onChangeText={v => update('delivery_neighborhood', v)}
              />
              <Text style={styles.label}>Delivery Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 123 Main Street, Apt 4B"
                value={form.delivery_address}
                onChangeText={v => update('delivery_address', v)}
              />

              {/* Route preview */}
              {(form.pickup_neighborhood || form.delivery_neighborhood) && (
                <View style={styles.routePreview}>
                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={16} color={COLORS.primary} />
                    <Text style={styles.routeText}>{form.pickup_neighborhood || '—'}</Text>
                  </View>
                  <View style={styles.routeDivider} />
                  <View style={styles.routeRow}>
                    <Ionicons name="flag" size={16} color={COLORS.primaryDark} />
                    <Text style={styles.routeText}>{form.delivery_neighborhood || '—'}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* STEP 2: Price & Submit */}
          {step === 2 && (
            <View style={styles.section}>
              <Text style={styles.label}>Your Budget *</Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={form.offered_price}
                  onChangeText={v => update('offered_price', v)}
                />
              </View>
              <Text style={styles.priceHint}>Runners can negotiate the price.</Text>

              {/* Summary card */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <SummaryRow icon="cube-outline" label="Item" value={form.item_description} />
                {form.category && <SummaryRow icon="pricetag-outline" label="Category" value={form.category} />}
                <SummaryRow icon="location-outline" label="From" value={form.pickup_neighborhood} />
                <SummaryRow icon="flag-outline" label="To" value={`${form.delivery_neighborhood} — ${form.delivery_address}`} />
                {form.offered_price && (
                  <SummaryRow icon="cash-outline" label="Budget" value={`$${parseFloat(form.offered_price || '0').toFixed(2)}`} />
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
              <Ionicons name="chevron-back" size={18} color={COLORS.textMuted} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
            disabled={!canAdvance() || submitting || imageUploading}
            onPress={step < STEPS.length - 1 ? () => setStep(s => s + 1) : submit}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {step < STEPS.length - 1 ? 'Continue' : 'Post Errand'}
                </Text>
                <Ionicons
                  name={step < STEPS.length - 1 ? 'chevron-forward' : 'checkmark'}
                  size={18}
                  color="#fff"
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={14} color={COLORS.textMuted} />
      <Text style={styles.summaryLabel}>{label}:</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.xs },
  headerTitle: { fontSize: FONT.xxl, fontWeight: '900', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: 2 },
  progressTrack: { height: 3, backgroundColor: COLORS.border, marginHorizontal: SPACING.md, borderRadius: 2, marginBottom: SPACING.md },
  progressBar: { height: 3, backgroundColor: COLORS.primary, borderRadius: 2 },
  scroll: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.lg },
  stepLabel: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepDotText: { fontSize: 11, fontWeight: '700', color: COLORS.textLight },
  stepText: { fontSize: FONT.xs, color: COLORS.textLight, fontWeight: '500' },
  stepTextActive: { color: COLORS.primary, fontWeight: '700' },
  section: { gap: SPACING.xs },
  label: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.text, marginBottom: 4, marginTop: SPACING.xs },
  optional: { fontWeight: '400', color: COLORS.textMuted },
  charCount: { fontSize: FONT.xs, color: COLORS.textLight, textAlign: 'right', marginTop: -SPACING.xs },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    fontSize: FONT.base,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  imagePickerRow: { flexDirection: 'row', gap: SPACING.sm },
  imagePicker: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    gap: 6,
  },
  imagePickerText: { fontSize: FONT.sm, color: COLORS.primary, fontWeight: '600' },
  imagePreview: { borderRadius: RADIUS.md, overflow: 'hidden', position: 'relative', marginBottom: SPACING.xs },
  previewImg: { width: '100%', height: 180, borderRadius: RADIUS.md },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImg: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  routePreview: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDivider: { width: 2, height: 16, backgroundColor: COLORS.border, marginLeft: 7, marginVertical: 2 },
  routeText: { fontSize: FONT.sm, color: COLORS.text, fontWeight: '600' },
  priceInputRow: { flexDirection: 'row', alignItems: 'center' },
  dollarSign: { fontSize: FONT.xl, color: COLORS.textMuted, marginRight: 8, fontWeight: '700' },
  priceInput: { flex: 1, marginBottom: 0 },
  priceHint: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 4 },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  summaryTitle: { fontSize: FONT.base, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryLabel: { fontSize: FONT.sm, color: COLORS.textMuted, fontWeight: '600', width: 70 },
  summaryValue: { fontSize: FONT.sm, color: COLORS.text, flex: 1 },
  navRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 4,
  },
  backBtnText: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textMuted },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    gap: 6,
    ...SHADOW.sm,
  },
  nextBtnDisabled: { backgroundColor: COLORS.textLight },
  nextBtnText: { fontSize: FONT.base, fontWeight: '800', color: '#fff' },
});

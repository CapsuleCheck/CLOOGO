import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/context/AuthContext';
import StatusBadge from '@/components/StatusBadge';
import { COLORS, FONT, SPACING, RADIUS, SHADOW } from '@/constants/theme';
import { formatDistanceToNow, format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export default function ErrandDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authHeader, API, user } = useAuth();

  const [errand, setErrand] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Offer form
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Counter form
  const [counteringId, setCounteringId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  // Chat
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Payment
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [errandRes, offersRes] = await Promise.all([
        axios.get(`${API}/errands/${id}`, { headers: authHeader }),
        axios.get(`${API}/errands/${id}/offers`, { headers: authHeader }),
      ]);
      setErrand(errandRes.data);
      setOffers(offersRes.data);
      if (['matched', 'in_progress', 'completed'].includes(errandRes.data.status)) {
        const msgRes = await axios.get(`${API}/errands/${id}/messages`, { headers: authHeader });
        setMessages(msgRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, API, authHeader]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll messages every 5s when chat is active
  useEffect(() => {
    if (!errand || !['matched', 'in_progress', 'completed'].includes(errand.status)) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/errands/${id}/messages`, { headers: authHeader });
        setMessages(res.data);
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [errand?.status, id, API, authHeader]);

  const isPoster = errand?.poster_id === user?.id;
  const isRunner = errand?.runner_id === user?.id;
  const canChat = (isPoster || isRunner) && ['matched', 'in_progress', 'completed'].includes(errand?.status);
  const hasMyOffer = offers.some(o => o.runner_id === user?.id && o.status === 'pending');
  const myCounteredOffer = offers.find(o => o.runner_id === user?.id && o.status === 'countered');

  const submitOffer = async () => {
    const price = parseFloat(offerPrice);
    if (!price || price <= 0) { Alert.alert('Error', 'Enter a valid price.'); return; }
    setSubmittingOffer(true);
    try {
      const res = await axios.post(`${API}/errands/${id}/offers`,
        { proposed_price: price, message: offerMessage || null },
        { headers: authHeader }
      );
      setOffers(prev => [...prev, res.data]);
      setOfferPrice(''); setOfferMessage('');
      Alert.alert('Offer sent!', 'The poster will be notified of your offer.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit offer.');
    } finally { setSubmittingOffer(false); }
  };

  const acceptOffer = async (offerId: string) => {
    try {
      const res = await axios.patch(`${API}/offers/${offerId}/accept`, {}, { headers: authHeader });
      setErrand(res.data);
      setOffers(prev => prev.map(o => ({
        ...o, status: o.id === offerId ? 'accepted' : 'rejected'
      })));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to accept offer.');
    }
  };

  const rejectOffer = async (offerId: string) => {
    Alert.alert('Reject offer?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          try {
            await axios.patch(`${API}/offers/${offerId}/reject`, {}, { headers: authHeader });
            setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'rejected' } : o));
          } catch { Alert.alert('Error', 'Failed to reject.'); }
        },
      },
    ]);
  };

  const submitCounter = async (offerId: string) => {
    const price = parseFloat(counterPrice);
    if (!price || price <= 0) { Alert.alert('Error', 'Enter a valid counter price.'); return; }
    try {
      const res = await axios.patch(`${API}/offers/${offerId}/counter`,
        { counter_price: price, counter_message: counterMessage || null },
        { headers: authHeader }
      );
      setOffers(prev => prev.map(o => o.id === offerId ? res.data : o));
      setCounteringId(null); setCounterPrice(''); setCounterMessage('');
      Alert.alert('Counter sent!', 'The runner will see your counter offer.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to counter.');
    }
  };

  const acceptCounter = async (offerId: string) => {
    try {
      const res = await axios.patch(`${API}/offers/${offerId}/accept-counter`, {}, { headers: authHeader });
      setErrand(res.data);
      setOffers(prev => prev.map(o => ({
        ...o, status: o.id === offerId ? 'accepted' : 'rejected'
      })));
      Alert.alert('Counter accepted!', 'Waiting for poster to complete payment.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed.');
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const res = await axios.patch(`${API}/errands/${id}/status`, { status }, { headers: authHeader });
      setErrand(res.data);
    } catch { Alert.alert('Error', 'Failed to update status.'); }
  };

  const initiatePayment = async () => {
    setPaymentLoading(true);
    try {
      const res = await axios.post(`${API}/payments/checkout`, {
        errand_id: id,
        origin_url: API_URL,
      }, { headers: authHeader });
      const result = await WebBrowser.openBrowserAsync(res.data.url);
      if (result.type === 'cancel' || result.type === 'dismiss') {
        // Check payment status after browser closes
        setTimeout(async () => {
          const statusRes = await axios.get(`${API}/payments/status/${res.data.session_id}`, { headers: authHeader });
          if (statusRes.data.status === 'paid') {
            await fetchAll();
            Alert.alert('Payment confirmed!', 'Errand is now in progress.');
          }
        }, 1500);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to initiate payment.');
    } finally { setPaymentLoading(false); }
  };

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    const content = newMsg.trim();
    setNewMsg('');
    setSendingMsg(true);
    try {
      await axios.post(`${API}/errands/${id}/messages`, { content }, { headers: authHeader });
      const res = await axios.get(`${API}/errands/${id}/messages`, { headers: authHeader });
      setMessages(res.data);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Error', 'Failed to send message.');
      setNewMsg(content);
    } finally { setSendingMsg(false); }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!errand) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: COLORS.textMuted }}>Errand not found.</Text>
      </View>
    );
  }

  const activeOffers = offers.filter(o => o.status !== 'rejected');

  return (
    <>
      <Stack.Screen options={{ headerTitle: errand.item_description }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, backgroundColor: COLORS.background }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={COLORS.primary} />
          }
        >
          {/* Status + main info */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <StatusBadge status={errand.status} />
              {errand.category && (
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryText}>{errand.category}</Text>
                </View>
              )}
            </View>
            <Text style={styles.itemTitle}>{errand.item_description}</Text>
            {errand.item_details && <Text style={styles.itemDetails}>{errand.item_details}</Text>}

            {/* Route */}
            <View style={styles.routeCard}>
              <View style={styles.routeRow}>
                <View style={styles.routeDot} />
                <View>
                  <Text style={styles.routeLabel}>PICKUP</Text>
                  <Text style={styles.routeVal}>{errand.pickup_neighborhood}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.primaryDark }]} />
                <View>
                  <Text style={styles.routeLabel}>DELIVERY</Text>
                  <Text style={styles.routeVal}>{errand.delivery_neighborhood}</Text>
                  <Text style={styles.routeAddress}>{errand.delivery_address}</Text>
                </View>
              </View>
            </View>

            {/* Price + Poster */}
            <View style={styles.metaRow}>
              <View style={styles.priceBadge}>
                <Ionicons name="cash-outline" size={14} color={COLORS.primaryDark} />
                <Text style={styles.priceText}>
                  ${(errand.accepted_price || errand.offered_price)?.toFixed(2)}
                </Text>
                {errand.accepted_price && errand.accepted_price !== errand.offered_price && (
                  <Text style={styles.strikePriceText}>${errand.offered_price?.toFixed(2)}</Text>
                )}
              </View>
              <Text style={styles.posterInfo}>by {errand.poster_name} · {errand.poster_neighborhood}</Text>
            </View>

            {errand.image_url && (
              <Image
                source={{ uri: `${API_URL}${errand.image_url}` }}
                style={styles.errandImage}
                resizeMode="cover"
              />
            )}
          </View>

          {/* Runner action buttons */}
          {isRunner && errand.status === 'in_progress' && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Alert.alert(
                'Mark Delivered?',
                'Confirm that you have delivered the item.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delivered', onPress: () => updateStatus('completed') },
                ]
              )}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Mark as Delivered</Text>
            </TouchableOpacity>
          )}

          {/* Payment button for poster */}
          {isPoster && errand.status === 'matched' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.info }]}
              onPress={initiatePayment}
              disabled={paymentLoading}
            >
              {paymentLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>
                    Pay ${errand.accepted_price?.toFixed(2)} via Stripe
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Counter offer received banner for runner */}
          {myCounteredOffer && (
            <View style={styles.counterBanner}>
              <Ionicons name="swap-horizontal" size={16} color={COLORS.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.counterBannerTitle}>Counter offer received</Text>
                <Text style={styles.counterBannerPrice}>${myCounteredOffer.counter_price?.toFixed(2)}</Text>
                {myCounteredOffer.counter_message && (
                  <Text style={styles.counterBannerMsg}>"{myCounteredOffer.counter_message}"</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.acceptCounterBtn}
                onPress={() => acceptCounter(myCounteredOffer.id)}
              >
                <Text style={styles.acceptCounterBtnText}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* OFFERS SECTION */}
          {errand.status === 'open' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Offers ({activeOffers.length})
              </Text>

              {/* Submit offer form for non-poster */}
              {!isPoster && errand.status === 'open' && !hasMyOffer && !myCounteredOffer && (
                <View style={styles.offerForm}>
                  <Text style={styles.offerFormTitle}>Submit Your Offer</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Your price"
                      keyboardType="decimal-pad"
                      value={offerPrice}
                      onChangeText={setOfferPrice}
                    />
                  </View>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Optional message to the poster..."
                    value={offerMessage}
                    onChangeText={setOfferMessage}
                    multiline
                    numberOfLines={2}
                  />
                  <TouchableOpacity
                    style={[styles.submitOfferBtn, (!offerPrice || submittingOffer) && styles.btnDisabled]}
                    onPress={submitOffer}
                    disabled={!offerPrice || submittingOffer}
                  >
                    {submittingOffer ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.submitOfferBtnText}>Submit Offer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {hasMyOffer && (
                <View style={styles.pendingOfferBanner}>
                  <Ionicons name="time-outline" size={15} color={COLORS.info} />
                  <Text style={styles.pendingOfferText}>Your offer is pending review.</Text>
                </View>
              )}

              {/* Offers list */}
              {activeOffers.map(offer => (
                <View
                  key={offer.id}
                  style={[
                    styles.offerCard,
                    offer.status === 'accepted' && styles.offerAccepted,
                    offer.status === 'countered' && styles.offerCountered,
                  ]}
                >
                  <View style={styles.offerHeader}>
                    <View style={styles.offerAvatar}>
                      <Text style={styles.offerAvatarText}>{offer.runner_name?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.offerName}>{offer.runner_name}</Text>
                      <Text style={styles.offerNeighborhood}>{offer.runner_neighborhood}</Text>
                    </View>
                    <View>
                      <Text style={styles.offerPrice}>${offer.proposed_price?.toFixed(2)}</Text>
                      <View style={[styles.offerStatus, getOfferStatusStyle(offer.status)]}>
                        <Text style={[styles.offerStatusText, { color: getOfferStatusStyle(offer.status).color }]}>
                          {offer.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {offer.message && (
                    <Text style={styles.offerMsg}>"{offer.message}"</Text>
                  )}

                  {/* Counter price shown */}
                  {offer.status === 'countered' && offer.counter_price && (
                    <View style={styles.counterInfo}>
                      <Ionicons name="swap-horizontal" size={13} color={COLORS.warning} />
                      <Text style={styles.counterInfoText}>
                        Counter: ${offer.counter_price.toFixed(2)}
                        {offer.counter_message ? ` — "${offer.counter_message}"` : ''}
                      </Text>
                    </View>
                  )}

                  {/* Poster actions for pending offers */}
                  {isPoster && offer.status === 'pending' && errand.status === 'open' && (
                    <View style={styles.offerActions}>
                      <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOffer(offer.id)}>
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setCounteringId(counteringId === offer.id ? null : offer.id)}
                      >
                        <Text style={styles.counterBtnText}>Counter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectOffer(offer.id)}>
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Inline counter form */}
                  {counteringId === offer.id && (
                    <View style={styles.counterForm}>
                      <Text style={styles.counterFormTitle}>Your counter price</Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.dollarSign}>$</Text>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="Counter price"
                          keyboardType="decimal-pad"
                          value={counterPrice}
                          onChangeText={setCounterPrice}
                        />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Optional message..."
                        value={counterMessage}
                        onChangeText={setCounterMessage}
                      />
                      <TouchableOpacity
                        style={styles.sendCounterBtn}
                        onPress={() => submitCounter(offer.id)}
                      >
                        <Text style={styles.sendCounterBtnText}>Send Counter</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}

              {activeOffers.length === 0 && (
                <Text style={styles.noOffersText}>No offers yet. Be the first!</Text>
              )}
            </View>
          )}

          {/* CHAT SECTION */}
          {canChat && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chat</Text>
              <View style={styles.chatBox}>
                {messages.length === 0 && (
                  <Text style={styles.noChatText}>No messages yet. Say hello!</Text>
                )}
                {messages.map(msg => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <View key={msg.id} style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
                      {!isMe && (
                        <View style={styles.msgAvatar}>
                          <Text style={styles.msgAvatarText}>{msg.sender_name?.[0]?.toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleThem]}>
                        {!isMe && <Text style={styles.msgSender}>{msg.sender_name}</Text>}
                        <Text style={[styles.msgContent, isMe && { color: '#fff' }]}>{msg.content}</Text>
                        <Text style={[styles.msgTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
                          {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Chat input */}
        {canChat && (
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type a message..."
              value={newMsg}
              onChangeText={setNewMsg}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              multiline={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!newMsg.trim() || sendingMsg) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!newMsg.trim() || sendingMsg}
            >
              {sendingMsg ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

function getOfferStatusStyle(status: string) {
  const map: any = {
    pending: { backgroundColor: '#EFF6FF', color: '#1D4ED8' },
    accepted: { backgroundColor: '#ECFDF5', color: '#065F46' },
    rejected: { backgroundColor: '#F8FAFC', color: '#475569' },
    countered: { backgroundColor: '#FFFBEB', color: '#92400E' },
  };
  return map[status] || map.pending;
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  infoCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  infoHeader: { flexDirection: 'row', gap: 8, marginBottom: SPACING.sm },
  categoryPill: {
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start',
  },
  categoryText: { fontSize: FONT.xs, color: COLORS.primaryDark, fontWeight: '600' },
  itemTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  itemDetails: { fontSize: FONT.sm, color: COLORS.textMuted, lineHeight: 20, marginBottom: SPACING.sm },
  routeCard: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginTop: 3 },
  routeLine: { width: 2, height: 16, backgroundColor: COLORS.border, marginLeft: 4, marginVertical: 3 },
  routeLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textLight, letterSpacing: 0.5 },
  routeVal: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.text },
  routeAddress: { fontSize: FONT.xs, color: COLORS.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm },
  priceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  priceText: { fontSize: FONT.base, fontWeight: '900', color: COLORS.primaryDark },
  strikePriceText: { fontSize: FONT.xs, color: COLORS.textLight, textDecorationLine: 'line-through' },
  posterInfo: { fontSize: FONT.xs, color: COLORS.textMuted },
  errandImage: { width: '100%', height: 180, borderRadius: RADIUS.md, marginTop: SPACING.sm },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: 14, marginBottom: SPACING.sm, ...SHADOW.sm,
  },
  actionBtnText: { fontSize: FONT.base, fontWeight: '800', color: '#fff' },
  counterBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.warningBg, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  counterBannerTitle: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.warning },
  counterBannerPrice: { fontSize: FONT.xl, fontWeight: '900', color: COLORS.text },
  counterBannerMsg: { fontSize: FONT.xs, color: COLORS.textMuted, fontStyle: 'italic' },
  acceptCounterBtn: {
    backgroundColor: COLORS.warning, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  acceptCounterBtnText: { fontSize: FONT.sm, fontWeight: '800', color: '#fff' },
  section: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
  },
  sectionTitle: { fontSize: FONT.lg, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  offerForm: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  offerFormTitle: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dollarSign: { fontSize: FONT.xl, fontWeight: '700', color: COLORS.textMuted },
  input: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 11,
    fontSize: FONT.sm, color: COLORS.text,
  },
  textArea: { height: 60, textAlignVertical: 'top', paddingTop: 10 },
  submitOfferBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: 12, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  submitOfferBtnText: { fontSize: FONT.sm, fontWeight: '800', color: '#fff' },
  pendingOfferBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.infoBg, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  pendingOfferText: { fontSize: FONT.sm, color: COLORS.info, fontWeight: '600' },
  noOffersText: { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.md },
  offerCard: {
    borderRadius: RADIUS.lg, borderWidth: 1.5,
    borderColor: COLORS.border, padding: SPACING.md,
    marginBottom: SPACING.sm, backgroundColor: COLORS.card,
  },
  offerAccepted: { borderColor: COLORS.primaryLight, backgroundColor: COLORS.primaryBg },
  offerCountered: { borderColor: '#FDE68A', backgroundColor: COLORS.warningBg },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  offerAvatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  offerAvatarText: { fontSize: FONT.sm, fontWeight: '800', color: COLORS.primaryDark },
  offerName: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.text },
  offerNeighborhood: { fontSize: FONT.xs, color: COLORS.textMuted },
  offerPrice: { fontSize: FONT.xl, fontWeight: '900', color: COLORS.primaryDark, textAlign: 'right' },
  offerStatus: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-end', marginTop: 2 },
  offerStatusText: { fontSize: FONT.xs, fontWeight: '700' },
  offerMsg: { fontSize: FONT.sm, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 8 },
  counterInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: COLORS.warningBg, borderRadius: RADIUS.sm, padding: 8 },
  counterInfoText: { fontSize: FONT.xs, color: COLORS.warning, fontWeight: '600', flex: 1 },
  offerActions: { flexDirection: 'row', gap: 8, marginTop: SPACING.sm },
  acceptBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 9, alignItems: 'center' },
  acceptBtnText: { fontSize: FONT.xs, fontWeight: '800', color: '#fff' },
  counterBtn: { flex: 1, backgroundColor: COLORS.warningBg, borderRadius: RADIUS.full, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A' },
  counterBtnText: { fontSize: FONT.xs, fontWeight: '800', color: COLORS.warning },
  rejectBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingVertical: 9, alignItems: 'center' },
  rejectBtnText: { fontSize: FONT.xs, fontWeight: '600', color: COLORS.textMuted },
  counterForm: { backgroundColor: COLORS.warningBg, borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm, gap: 8, borderWidth: 1, borderColor: '#FDE68A' },
  counterFormTitle: { fontSize: FONT.xs, fontWeight: '700', color: COLORS.warning },
  sendCounterBtn: { backgroundColor: COLORS.warning, borderRadius: RADIUS.full, paddingVertical: 10, alignItems: 'center' },
  sendCounterBtnText: { fontSize: FONT.xs, fontWeight: '800', color: '#fff' },
  chatBox: { gap: 8 },
  noChatText: { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.md },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  msgAvatarText: { fontSize: 11, fontWeight: '700', color: COLORS.primaryDark },
  msgBubble: { maxWidth: '72%', borderRadius: RADIUS.lg, padding: 10, gap: 2 },
  msgBubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  msgBubbleThem: { backgroundColor: COLORS.background, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  msgSender: { fontSize: FONT.xs, fontWeight: '700', color: COLORS.textMuted, marginBottom: 2 },
  msgContent: { fontSize: FONT.sm, color: COLORS.text, lineHeight: 20 },
  msgTime: { fontSize: 10, color: COLORS.textLight, alignSelf: 'flex-end' },
  chatInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  chatInput: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    fontSize: FONT.sm, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.textLight },
});

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  MapPin, Package, DollarSign, Clock, Send, CheckCircle,
  ArrowLeft, User, MessageCircle, CreditCard, AlertCircle, Truck, RefreshCw,
  Navigation, Radio
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const runnerIcon = new L.DivIcon({
  className: '',
  html: `<div style="background:#059669;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 15, { animate: true, duration: 1 });
  }, [position]);
  return null;
}

function LiveTrackingMap({ runnerLocation, errandTitle }) {
  const position = runnerLocation?.lat ? [runnerLocation.lat, runnerLocation.lng] : null;
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 280 }}>
      <MapContainer
        center={position || [51.5074, -0.1278]}
        zoom={position ? 15 : 10}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {position && (
          <>
            <FlyToLocation position={position} />
            <Marker position={position} icon={runnerIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-bold text-slate-900 text-sm">Runner is here</p>
                  <p className="text-xs text-slate-500 mt-0.5">{errandTitle}</p>
                  {runnerLocation.updated_at && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Updated {formatDistanceToNow(new Date(runnerLocation.updated_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}

const STATUS_CONFIG = {
  open: { label: 'Open for Offers', color: 'bg-blue-50 text-blue-700 border-blue-200', step: 1 },
  matched: { label: 'Runner Matched', color: 'bg-amber-50 text-amber-700 border-amber-200', step: 2 },
  in_progress: { label: 'In Progress', color: 'bg-purple-50 text-purple-700 border-purple-200', step: 3 },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200', step: 4 },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500 border-slate-200', step: 0 },
};

export default function ErrandDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user, token, authHeader, API } = useAuth();

  const [errand, setErrand] = useState(null);
  const [offers, setOffers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offerForm, setOfferForm] = useState({ proposed_price: '', message: '' });
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [ratingForm, setRatingForm] = useState({ stars: 0, comment: '' });
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [counteringOfferId, setCounteringOfferId] = useState(null);
  const [counterForm, setCounterForm] = useState({ counter_price: '', counter_message: '' });
  const [showTracking, setShowTracking] = useState(false);
  const [runnerLocation, setRunnerLocation] = useState(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const locationWatchRef = useRef(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const promptShownRef = useRef(false);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const sessionId = searchParams.get('session_id');

  const isPoster = errand && user?.id === errand.poster_id;
  const isRunner = errand && user?.id === errand.runner_id;
  const canChat = errand && ['matched', 'in_progress', 'completed'].includes(errand.status) && (isPoster || isRunner);
  const hasOffer = offers.some(o => o.runner_id === user?.id && o.status === 'pending');
  const hasCounterOffer = offers.some(o => o.runner_id === user?.id && o.status === 'countered');

  const fetchAll = async () => {
    try {
      const [errandRes, offersRes] = await Promise.all([
        axios.get(`${API}/errands/${id}`, { headers: authHeader }),
        axios.get(`${API}/errands/${id}/offers`, { headers: authHeader }),
      ]);
      setErrand(errandRes.data);
      setOffers(offersRes.data);
      // Fetch messages if chat is accessible
      if (['matched', 'in_progress', 'completed'].includes(errandRes.data.status) &&
          [errandRes.data.poster_id, errandRes.data.runner_id].includes(user?.id)) {
        const msgRes = await axios.get(`${API}/errands/${id}/messages`, { headers: authHeader });
        setMessages(msgRes.data);
      }
    } catch (err) {
      toast.error('Failed to load errand details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  // Check if current user already rated
  useEffect(() => {
    if (!errand || errand.status !== 'completed') return;
    axios.get(`${API}/errands/${id}/my-rating`, { headers: authHeader })
      .then(res => { if (res.data.rated) setRatingSubmitted(true); })
      .catch(console.error);
  }, [errand?.status]);

  // Chat polling fallback (runs when canChat, every 5s)
  useEffect(() => {
    if (!canChat || !token) return;
    const poll = async () => {
      try {
        const res = await axios.get(`${API}/errands/${id}/messages`, { headers: authHeader });
        setMessages(res.data);
      } catch (err) { /* silent */ }
    };
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [canChat, token, id]);

  // WebSocket connection (best-effort; polling above is the reliable path)
  useEffect(() => {
    if (!errand || !canChat || !token) return;
    const wsBase = process.env.REACT_APP_BACKEND_URL
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
    const ws = new WebSocket(`${wsBase}/api/ws/${id}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
        } else if (data.type === 'status_update') {
          setErrand(prev => prev ? { ...prev, status: data.status } : prev);
        } else if (data.type === 'offer_accepted') {
          setErrand(data.errand);
          toast.success('An offer has been accepted!');
        } else if (data.type === 'payment_confirmed') {
          setErrand(prev => prev ? { ...prev, status: 'in_progress' } : prev);
          toast.success('Payment confirmed! Errand is now in progress.');
        }
      } catch (e) { /* ignore parse errors */ }
    };

    return () => { ws.close(); };
  }, [errand?.status, canChat, token]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll payment status if returning from Stripe
  useEffect(() => {
    if (!sessionId) return;
    let attempts = 0;
    const poll = async () => {
      if (attempts >= 6) return;
      try {
        const res = await axios.get(`${API}/payments/status/${sessionId}`, { headers: authHeader });
        setPaymentStatus(res.data.payment_status);
        if (res.data.payment_status === 'paid') {
          toast.success('Payment successful! The errand is now in progress.');
          setErrand(prev => prev ? { ...prev, status: 'in_progress' } : prev);
          return;
        }
        attempts++;
        setTimeout(poll, 2000);
      } catch (err) {
        console.error(err);
      }
    };
    toast.info('Checking payment status...');
    poll();
  }, [sessionId]);

  const submitOffer = async () => {
    if (!offerForm.proposed_price || parseFloat(offerForm.proposed_price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    setSubmittingOffer(true);
    try {
      const res = await axios.post(`${API}/errands/${id}/offers`,
        { proposed_price: parseFloat(offerForm.proposed_price), message: offerForm.message || null },
        { headers: authHeader }
      );
      setOffers(prev => [res.data, ...prev]);
      setOfferForm({ proposed_price: '', message: '' });
      toast.success('Offer submitted!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit offer');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const acceptOffer = async (offerId) => {
    try {
      const res = await axios.patch(`${API}/offers/${offerId}/accept`, {}, { headers: authHeader });
      setErrand(res.data);
      setOffers(prev => prev.map(o => ({ ...o, status: o.id === offerId ? 'accepted' : 'rejected' })));
      toast.success('Offer accepted! Proceed to payment.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to accept offer');
    }
  };

  const rejectOffer = async (offerId) => {
    try {
      await axios.patch(`${API}/offers/${offerId}/reject`, {}, { headers: authHeader });
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'rejected' } : o));
      toast.success('Offer rejected');
    } catch (err) {
      toast.error('Failed to reject offer');
    }
  };

  const submitCounter = async (offerId) => {
    if (!counterForm.counter_price || parseFloat(counterForm.counter_price) <= 0) {
      toast.error('Enter a valid counter price'); return;
    }
    try {
      const res = await axios.patch(`${API}/offers/${offerId}/counter`,
        { counter_price: parseFloat(counterForm.counter_price), counter_message: counterForm.counter_message || null },
        { headers: authHeader }
      );
      setOffers(prev => prev.map(o => o.id === offerId ? res.data : o));
      setCounteringOfferId(null);
      setCounterForm({ counter_price: '', counter_message: '' });
      toast.success('Counter offer sent!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send counter offer');
    }
  };

  const acceptCounter = async (offerId) => {
    try {
      const res = await axios.patch(`${API}/offers/${offerId}/accept-counter`, {}, { headers: authHeader });
      setErrand(res.data);
      setOffers(prev => prev.map(o => ({ ...o, status: o.id === offerId ? 'accepted' : 'rejected' })));
      toast.success('Counter offer accepted! Awaiting payment.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to accept counter offer');
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSendingMsg(true);
    const content = newMsg.trim();
    setNewMsg('');
    try {
      await axios.post(`${API}/errands/${id}/messages`, { content }, { headers: authHeader });
      // Refresh messages immediately so sender sees their own message
      const res = await axios.get(`${API}/errands/${id}/messages`, { headers: authHeader });
      setMessages(res.data);
    } catch (err) {
      toast.error('Failed to send message');
      setNewMsg(content); // restore on error
    } finally {
      setSendingMsg(false);
    }
  };

  const initiatePayment = async () => {
    setPaymentLoading(true);
    try {
      const res = await axios.post(`${API}/payments/checkout`,
        { errand_id: id, origin_url: window.location.origin },
        { headers: authHeader }
      );
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to initiate payment');
      setPaymentLoading(false);
    }
  };

  const markCompleted = async () => {
    try {
      await axios.patch(`${API}/errands/${id}/status`, { status: 'completed' }, { headers: authHeader });
      setErrand(prev => ({ ...prev, status: 'completed' }));
      toast.success('Errand marked as completed!');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const submitRating = async () => {
    if (ratingForm.stars === 0) { toast.error('Please select a star rating'); return; }
    setSubmittingRating(true);
    try {
      await axios.post(`${API}/errands/${id}/rate`, ratingForm, { headers: authHeader });
      setRatingSubmitted(true);
      toast.success('Rating submitted! Thank you.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const cancelErrand = async () => {
    try {
      await axios.delete(`${API}/errands/${id}`, { headers: authHeader });
      setErrand(prev => ({ ...prev, status: 'cancelled' }));
      toast.success('Errand cancelled');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cannot cancel this errand');
    }
  };

  // --- Live Tracking ---
  const fetchRunnerLocation = async () => {
    try {
      const res = await axios.get(`${API}/errands/${id}/runner-location`, { headers: authHeader });
      if (res.data?.lat) setRunnerLocation(res.data);
    } catch (err) { /* silent */ }
  };

  // Poll runner location every 5s when tracking panel is open
  useEffect(() => {
    if (!showTracking || !['matched', 'in_progress'].includes(errand?.status)) return;
    fetchRunnerLocation();
    const interval = setInterval(fetchRunnerLocation, 5000);
    return () => clearInterval(interval);
  }, [showTracking, errand?.status]);

  const startSharingLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported on this device'); return; }
    setSharingLocation(true);
    toast.success('Location sharing started');
    locationWatchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          await axios.patch(`${API}/errands/${id}/runner-location`, { lat, lng }, { headers: authHeader });
        } catch (err) { /* silent */ }
      },
      (err) => { toast.error('Unable to get location: ' + err.message); setSharingLocation(false); },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  };

  const stopSharingLocation = () => {
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    setSharingLocation(false);
    toast.info('Location sharing stopped');
  };

  // Clean up geolocation on unmount
  useEffect(() => {
    return () => {
      if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
    };
  }, []);

  // Auto-prompt runner to share location when offer is accepted
  useEffect(() => {
    if (!errand || !user || promptShownRef.current) return;
    const isRunnerMatched = errand.runner_id === user.id && ['matched', 'in_progress'].includes(errand.status);
    if (isRunnerMatched && !sharingLocation) {
      promptShownRef.current = true;
      setShowLocationPrompt(true);
    }
  }, [errand?.status, errand?.runner_id, user?.id]);

  if (loading) {
    return (
      <main className="pt-20 pb-28 md:pb-8 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-48 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  if (!errand) {
    return (
      <main className="pt-20 pb-28 md:pb-8 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Errand not found</p>
          <Link to="/dashboard" className="mt-4 inline-flex text-emerald-600 font-medium hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const statusCfg = STATUS_CONFIG[errand.status] || STATUS_CONFIG.open;

  return (
    <main className="pt-20 pb-28 md:pb-8 min-h-screen" data-testid="errand-detail-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Payment success banner */}
        {sessionId && paymentStatus === 'paid' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3" data-testid="payment-success-banner">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700">Payment successful!</p>
              <p className="text-sm text-emerald-600">The runner has been notified. Errand is in progress.</p>
            </div>
          </div>
        )}

        {/* Errand Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6" data-testid="errand-info-card">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Package className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 font-['Manrope']">{errand.item_description}</h1>
                <p className="text-sm text-slate-400">
                  Posted {formatDistanceToNow(new Date(errand.created_at), { addSuffix: true })} by {errand.poster_name}
                </p>
              </div>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex-shrink-0 ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>

          {errand.item_details && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 mb-4">{errand.item_details}</p>
          )}

          {/* Item image */}
          {errand.image_url && (
            <div className="rounded-xl overflow-hidden mb-4 border border-slate-100" data-testid="errand-image">
              <img
                src={`${process.env.REACT_APP_BACKEND_URL}${errand.image_url}`}
                alt={errand.item_description}
                className="w-full max-h-72 object-cover"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Pickup</p>
              <p className="font-semibold text-slate-900 text-sm">{errand.pickup_neighborhood}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Delivery</p>
              <p className="font-semibold text-slate-900 text-sm">{errand.delivery_neighborhood}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                {errand.accepted_price ? 'Agreed Price' : 'Offered Price'}
              </p>
              <p className="font-extrabold text-emerald-700 text-lg font-['Manrope']">
                ${(errand.accepted_price || errand.offered_price).toFixed(2)}
              </p>
            </div>
          </div>

          {(errand.runner_id) && (
            <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
              <Truck className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500">Runner: <span className="font-semibold text-slate-700">{errand.runner_name}</span></span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex flex-wrap gap-3">
            {isPoster && errand.status === 'matched' && (
              <button data-testid="pay-now-btn"
                onClick={initiatePayment}
                disabled={paymentLoading}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-md shadow-emerald-600/20">
                <CreditCard className="w-4 h-4" />
                {paymentLoading ? 'Loading...' : `Pay $${errand.accepted_price?.toFixed(2)}`}
              </button>
            )}
            {(isPoster || isRunner) && ['matched', 'in_progress'].includes(errand.status) && (
              <button data-testid="track-runner-btn"
                onClick={() => setShowTracking(prev => !prev)}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 font-bold text-sm transition-all ${
                  showTracking
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                }`}>
                <Navigation className="w-4 h-4" />
                {showTracking ? 'Hide Tracking' : 'Track Runner'}
              </button>
            )}
            {isRunner && errand.status === 'in_progress' && (
              <button data-testid="share-location-btn"
                onClick={sharingLocation ? stopSharingLocation : startSharingLocation}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 font-bold text-sm transition-all ${
                  sharingLocation
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}>
                <Radio className={`w-4 h-4 ${sharingLocation ? 'animate-pulse' : ''}`} />
                {sharingLocation ? 'Stop Sharing' : 'Share My Location'}
              </button>
            )}
            {isRunner && errand.status === 'in_progress' && (
              <button data-testid="mark-delivered-btn"
                onClick={markCompleted}
                className="flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-white font-bold text-sm hover:bg-purple-700 transition-all">
                <CheckCircle className="w-4 h-4" /> Mark as Delivered
              </button>
            )}
            {isPoster && errand.status === 'open' && (
              <button data-testid="cancel-errand-btn"
                onClick={cancelErrand}
                className="flex items-center gap-2 rounded-full border border-red-200 text-red-500 px-5 py-2.5 text-sm font-semibold hover:bg-red-50 transition-all">
                Cancel Errand
              </button>
            )}
          </div>

          {/* Live Tracking Panel */}
          {showTracking && ['matched', 'in_progress'].includes(errand.status) && (
            <div className="mt-5 space-y-3" data-testid="live-tracking-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${runnerLocation?.lat ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  <span className="text-sm font-semibold text-slate-700">
                    {runnerLocation?.lat ? 'Runner location live' : 'Waiting for runner to share location…'}
                  </span>
                </div>
                {runnerLocation?.updated_at && (
                  <span className="text-xs text-slate-400">
                    Updated {formatDistanceToNow(new Date(runnerLocation.updated_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              {runnerLocation?.lat ? (
                <LiveTrackingMap runnerLocation={runnerLocation} errandTitle={errand.item_description} />
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 h-40 flex flex-col items-center justify-center gap-2">
                  <Navigation className="w-8 h-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Map will appear once runner shares their location</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Offers Section — Visible when open or for poster after matched */}
        {(errand.status === 'open' || isPoster) && errand.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6" data-testid="offers-section">
            <h2 className="font-bold text-slate-900 font-['Manrope'] text-lg mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Offers ({offers.filter(o => o.status === 'pending').length} pending)
            </h2>

            {/* Make an Offer — for non-poster when open */}
            {!isPoster && errand.status === 'open' && !hasOffer && (
              <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-200" data-testid="make-offer-form">
                <h3 className="font-semibold text-slate-800 text-sm mb-3">Make an Offer</h3>
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      data-testid="offer-price-input"
                      type="number" min="0.50" step="0.50"
                      className="w-full pl-7 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={`Suggested: $${errand.offered_price.toFixed(2)}`}
                      value={offerForm.proposed_price}
                      onChange={e => setOfferForm(f => ({ ...f, proposed_price: e.target.value }))}
                    />
                  </div>
                  <textarea
                    data-testid="offer-message-input"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-20 placeholder:text-slate-400"
                    placeholder="Optional: tell the poster why you're a great fit..."
                    value={offerForm.message}
                    onChange={e => setOfferForm(f => ({ ...f, message: e.target.value }))}
                  />
                  <button data-testid="submit-offer-btn"
                    onClick={submitOffer}
                    disabled={submittingOffer}
                    className="w-full rounded-full bg-emerald-600 py-3 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-60 transition-all">
                    {submittingOffer ? 'Submitting...' : 'Submit Offer'}
                  </button>
                </div>
              </div>
            )}

            {hasCounterOffer && !isPoster && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-700 font-medium flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                You received a counter offer! See below to accept or ignore.
              </div>
            )}
            {hasOffer && !isPoster && !hasCounterOffer && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-5 text-sm text-emerald-700 font-medium">
                You have a pending offer on this errand.
              </div>
            )}

            {/* Offers List */}
            {offers.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6" data-testid="no-offers-message">No offers yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {offers.map(offer => (
                  <div key={offer.id} data-testid={`offer-card-${offer.id}`}
                    className={`rounded-xl border p-4 transition-all ${
                      offer.status === 'accepted' ? 'border-emerald-200 bg-emerald-50' :
                      offer.status === 'rejected' ? 'border-slate-100 bg-slate-50 opacity-60' :
                      offer.status === 'countered' ? 'border-amber-200 bg-amber-50' :
                      'border-slate-200 bg-white'
                    }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                          {offer.runner_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{offer.runner_name}</p>
                          <p className="text-xs text-slate-400">{offer.runner_neighborhood}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-extrabold text-emerald-700 text-lg font-['Manrope']">
                          ${offer.proposed_price.toFixed(2)}
                        </p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          offer.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                          offer.status === 'rejected' ? 'bg-slate-100 text-slate-500' :
                          offer.status === 'countered' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-50 text-blue-600'
                        }`}>{offer.status}</span>
                      </div>
                    </div>
                    {offer.message && (
                      <p className="text-sm text-slate-600 mt-2 italic">"{offer.message}"</p>
                    )}

                    {/* Counter offer received — for runner */}
                    {!isPoster && offer.runner_id === user?.id && offer.status === 'countered' && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-amber-200">
                        <div className="flex items-center gap-2 mb-1">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                          <p className="text-xs font-bold text-amber-700">Counter offer received</p>
                        </div>
                        <p className="font-extrabold text-slate-900 text-base">
                          ${offer.counter_price?.toFixed(2)}
                        </p>
                        {offer.counter_message && (
                          <p className="text-xs text-slate-500 italic mt-1">"{offer.counter_message}"</p>
                        )}
                        <button data-testid={`accept-counter-btn-${offer.id}`}
                          onClick={() => acceptCounter(offer.id)}
                          className="mt-2 w-full rounded-full bg-amber-500 py-2 text-white text-xs font-bold hover:bg-amber-600 transition-all">
                          Accept ${offer.counter_price?.toFixed(2)}
                        </button>
                      </div>
                    )}

                    {/* Poster actions on pending offer */}
                    {isPoster && offer.status === 'pending' && errand.status === 'open' && (
                      <div>
                        <div className="flex gap-2 mt-3">
                          <button data-testid={`accept-offer-btn-${offer.id}`}
                            onClick={() => acceptOffer(offer.id)}
                            className="flex-1 rounded-full bg-emerald-600 py-2 text-white text-xs font-bold hover:bg-emerald-700 transition-all">
                            Accept
                          </button>
                          <button data-testid={`counter-offer-btn-${offer.id}`}
                            onClick={() => setCounteringOfferId(counteringOfferId === offer.id ? null : offer.id)}
                            className="flex-1 rounded-full bg-amber-100 border border-amber-300 py-2 text-amber-700 text-xs font-bold hover:bg-amber-200 transition-all">
                            Counter
                          </button>
                          <button data-testid={`reject-offer-btn-${offer.id}`}
                            onClick={() => rejectOffer(offer.id)}
                            className="flex-1 rounded-full border border-slate-200 py-2 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all">
                            Reject
                          </button>
                        </div>
                        {/* Inline counter form */}
                        {counteringOfferId === offer.id && (
                          <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                            <p className="text-xs font-semibold text-amber-700">Propose a counter price</p>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                              <input data-testid="counter-price-input"
                                type="number" min="0.50" step="0.50"
                                className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                                placeholder="Your counter price"
                                value={counterForm.counter_price}
                                onChange={e => setCounterForm(f => ({ ...f, counter_price: e.target.value }))} />
                            </div>
                            <input data-testid="counter-message-input"
                              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
                              placeholder="Optional message..."
                              value={counterForm.counter_message}
                              onChange={e => setCounterForm(f => ({ ...f, counter_message: e.target.value }))} />
                            <button data-testid={`submit-counter-btn-${offer.id}`}
                              onClick={() => submitCounter(offer.id)}
                              className="w-full rounded-full bg-amber-500 py-2 text-white text-xs font-bold hover:bg-amber-600 transition-all">
                              Send Counter Offer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Section */}
        {canChat && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6" data-testid="chat-section">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 font-['Manrope'] text-lg">Chat</h2>
              <div className="w-2 h-2 rounded-full bg-emerald-500 ml-auto animate-pulse" />
            </div>

            {/* Messages */}
            <div className="h-72 overflow-y-auto p-4 space-y-3 bg-slate-50" data-testid="chat-messages">
              {messages.length === 0 ? (
                <p className="text-center text-slate-400 text-sm mt-8">No messages yet. Say hello!</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      msg.sender_id === user.id
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-white text-slate-900 border border-slate-100 rounded-bl-md shadow-sm'
                    }`}>
                      {msg.sender_id !== user.id && (
                        <p className="text-xs font-semibold text-emerald-600 mb-0.5">{msg.sender_name}</p>
                      )}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.sender_id === user.id ? 'text-emerald-200' : 'text-slate-400'}`}>
                        {format(new Date(msg.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-slate-100 p-3 flex gap-2 bg-white">
              <input
                data-testid="chat-message-input"
                className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                placeholder="Type a message..."
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />
              <button data-testid="chat-send-btn"
                onClick={sendMessage}
                disabled={sendingMsg || !newMsg.trim()}
                className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex-shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Rating Section — after completion */}
        {errand?.status === 'completed' && (isPoster || isRunner) && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6" data-testid="rating-section">
            {ratingSubmitted ? (
              <div className="flex items-center gap-3 text-emerald-600">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <p className="font-bold font-['Manrope']">Rating submitted!</p>
                  <p className="text-sm text-emerald-500">Thank you for your feedback.</p>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-bold text-slate-900 font-['Manrope'] text-lg mb-4">Rate your experience</h2>
                <p className="text-sm text-slate-500 mb-4">
                  {isPoster ? `How was ${errand.runner_name} as a runner?` : `How was ${errand.poster_name} as a poster?`}
                </p>
                {/* Star selector */}
                <div className="flex gap-2 mb-4">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} data-testid={`rating-star-${star}`}
                      onClick={() => setRatingForm(f => ({ ...f, stars: star }))}
                      className={`w-10 h-10 rounded-xl transition-all hover:scale-110 ${
                        star <= ratingForm.stars ? 'text-amber-400' : 'text-slate-200'
                      }`}>
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </button>
                  ))}
                </div>
                {ratingForm.stars > 0 && (
                  <p className="text-sm font-medium text-slate-600 mb-3">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][ratingForm.stars]}
                  </p>
                )}
                <textarea data-testid="rating-comment-input"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-20 placeholder:text-slate-400 mb-4"
                  placeholder="Leave a comment (optional)..."
                  value={ratingForm.comment}
                  onChange={e => setRatingForm(f => ({ ...f, comment: e.target.value }))}
                />
                <button data-testid="submit-rating-btn"
                  onClick={submitRating} disabled={submittingRating || ratingForm.stars === 0}
                  className="rounded-full bg-amber-500 px-6 py-2.5 text-white font-bold text-sm hover:bg-amber-600 disabled:opacity-50 transition-all">
                  {submittingRating ? 'Submitting...' : 'Submit Rating'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Delivery Address (for runner after matching) */}
        {isRunner && errand.status !== 'open' && (
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5" data-testid="delivery-address-card">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-900 font-['Manrope']">Delivery Address</h3>
            </div>
            <p className="text-amber-800 font-medium">{errand.delivery_address}</p>
            <p className="text-xs text-amber-600 mt-1">{errand.delivery_neighborhood}</p>
          </div>
        )}
      </div>
      {/* Runner Location Sharing Prompt */}
      {showLocationPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-6 sm:pb-0">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Navigation className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Share your location?</h3>
                <p className="text-xs text-slate-400">Your offer was accepted!</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Let <strong>{errand?.poster_name || 'the poster'}</strong> track your real-time movement as you pick up and deliver their errand. Your location is only shared during this errand.
            </p>
            <div className="flex gap-3">
              <button
                data-testid="prompt-share-location-btn"
                onClick={() => { setShowLocationPrompt(false); startSharingLocation(); setShowTracking(true); }}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
              >
                <Radio className="w-4 h-4" /> Share My Location
              </button>
              <button
                data-testid="prompt-skip-location-btn"
                onClick={() => setShowLocationPrompt(false)}
                className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-all"
              >
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

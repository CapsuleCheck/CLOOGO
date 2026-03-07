import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, DollarSign, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, title: 'What do you need?', icon: Package },
  { id: 2, title: 'Where?', icon: MapPin },
  { id: 3, title: 'Set your price', icon: DollarSign },
  { id: 4, title: 'Review & Post', icon: CheckCircle },
];

const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400";
const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

export default function PostErrand() {
  const { authHeader, API } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    item_description: '',
    item_details: '',
    pickup_neighborhood: '',
    delivery_neighborhood: '',
    delivery_address: '',
    offered_price: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const canProceed = () => {
    if (step === 1) return form.item_description.trim().length >= 3;
    if (step === 2) return form.pickup_neighborhood.trim() && form.delivery_neighborhood.trim() && form.delivery_address.trim();
    if (step === 3) return form.offered_price && parseFloat(form.offered_price) > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = { ...form, offered_price: parseFloat(form.offered_price) };
      const res = await axios.post(`${API}/errands`, payload, { headers: authHeader });
      toast.success('Errand posted! Waiting for runners.');
      navigate(`/errands/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to post errand');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="pt-20 pb-28 md:pb-8 min-h-screen">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 font-['Manrope'] tracking-tight">Post an Errand</h1>
          <p className="text-slate-500 mt-1">Fill in the details so runners can find and help you</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                step > s.id ? 'bg-emerald-600 text-white' :
                step === s.id ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' :
                'bg-slate-100 text-slate-400'
              }`}>
                {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded ${step > s.id ? 'bg-emerald-600' : 'bg-slate-100'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Title */}
        <div className="mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Step {step} of 4</p>
          <h2 className="text-xl font-bold text-slate-900 font-['Manrope']">
            {STEPS[step - 1].title}
          </h2>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Item name <span className="text-red-500">*</span></label>
                <input
                  data-testid="post-item-description-input"
                  className={inputClass}
                  placeholder="e.g. Prescription from CVS, Grocery order"
                  value={form.item_description}
                  onChange={e => update('item_description', e.target.value)}
                  maxLength={100}
                />
                <p className="text-xs text-slate-400 mt-1">{form.item_description.length}/100 characters</p>
              </div>
              <div>
                <label className={labelClass}>Additional details <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  data-testid="post-item-details-input"
                  className={`${inputClass} h-24 resize-none`}
                  placeholder="Any special instructions, item size, handling notes..."
                  value={form.item_details}
                  onChange={e => update('item_details', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">P</span>
                    Pickup neighborhood <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  data-testid="post-pickup-neighborhood-input"
                  className={inputClass}
                  placeholder="e.g. Riverside, Midtown"
                  value={form.pickup_neighborhood}
                  onChange={e => update('pickup_neighborhood', e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">The area where the item needs to be picked up from</p>
              </div>
              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    Delivery neighborhood <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  data-testid="post-delivery-neighborhood-input"
                  className={inputClass}
                  placeholder="e.g. Oak Park, Westside"
                  value={form.delivery_neighborhood}
                  onChange={e => update('delivery_neighborhood', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Delivery address <span className="text-red-500">*</span></label>
                <input
                  data-testid="post-delivery-address-input"
                  className={inputClass}
                  placeholder="e.g. 123 Oak Street, Apt 4B"
                  value={form.delivery_address}
                  onChange={e => update('delivery_address', e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Exact address where the runner should deliver the item</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Your offer (USD) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    data-testid="post-offered-price-input"
                    type="number" min="0.50" step="0.50"
                    className={`${inputClass} pl-8`}
                    placeholder="0.00"
                    value={form.offered_price}
                    onChange={e => update('offered_price', e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Runners may accept this or propose a counter-offer</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-sm font-semibold text-amber-900 mb-1">Pricing tip</p>
                <p className="text-xs text-amber-700">
                  Fair prices get more offers. Consider distance, time, and item size.
                  Most errands are priced between $5 – $20.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map(p => (
                  <button key={p}
                    data-testid={`post-price-preset-${p}`}
                    onClick={() => update('offered_price', p.toFixed(2))}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                      parseFloat(form.offered_price) === p
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                    }`}>
                    ${p}.00
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 font-['Manrope'] mb-4">Review your errand</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                  <Package className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Item</p>
                    <p className="font-semibold text-slate-900">{form.item_description}</p>
                    {form.item_details && <p className="text-sm text-slate-500 mt-0.5">{form.item_details}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Route</p>
                    <p className="font-semibold text-slate-900">{form.pickup_neighborhood} <span className="text-slate-400">→</span> {form.delivery_neighborhood}</p>
                    <p className="text-sm text-slate-500 mt-0.5">Deliver to: {form.delivery_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <DollarSign className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Your Offer</p>
                    <p className="font-extrabold text-emerald-700 text-2xl font-['Manrope']">
                      ${parseFloat(form.offered_price).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Runners can propose a counter-offer</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button data-testid="post-errand-back-btn"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-5 py-3 rounded-full border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < 4 ? (
            <button data-testid="post-errand-next-btn"
              onClick={() => canProceed() && setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button data-testid="post-errand-submit-btn"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20">
              {submitting ? 'Posting...' : 'Post Errand'}
              {!submitting && <CheckCircle className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  MapPin,
  DollarSign,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";
import ErrandRouteMap from "@/components/ErrandRouteMap";

const STEPS = [
  { id: 1, title: "What do you need?", icon: Package },
  { id: 2, title: "Where?", icon: MapPin },
  { id: 3, title: "Set your price", icon: DollarSign },
  { id: 4, title: "Review & Post", icon: CheckCircle },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400";
const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

export default function PostErrand() {
  const { authHeader, API } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    item_description: "",
    item_details: "",
    pickup_neighborhood: "",
    delivery_neighborhood: "",
    delivery_address: "",
    offered_price: "",
    pickup_lat: null,
    pickup_lng: null,
    delivery_lat: null,
    delivery_lng: null,
    image_url: null,
  });

  const update = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handlePickupPlace = (place) => {
    setForm((prev) => ({
      ...prev,
      pickup_neighborhood: place.neighborhood || prev.pickup_neighborhood,
      pickup_lat: place.lat ?? prev.pickup_lat,
      pickup_lng: place.lng ?? prev.pickup_lng,
    }));
  };

  const handleDeliveryNeighborhoodPlace = (place) => {
    setForm((prev) => ({
      ...prev,
      delivery_neighborhood: place.neighborhood || prev.delivery_neighborhood,
    }));
  };

  const handleDeliveryAddressPlace = (place) => {
    setForm((prev) => ({
      ...prev,
      delivery_address:
        place.address ||
        place.formattedAddress ||
        place.neighborhood ||
        prev.delivery_address,
      delivery_lat: place.lat ?? prev.delivery_lat,
      delivery_lng: place.lng ?? prev.delivery_lng,
      delivery_neighborhood:
        prev.delivery_neighborhood ||
        place.neighborhood ||
        prev.delivery_neighborhood,
    }));
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/upload`, formData, {
        headers: { ...authHeader, "Content-Type": "multipart/form-data" },
      });
      update("image_url", res.data.url);
      setImagePreview(URL.createObjectURL(file));
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setImageUploading(false);
    }
  };

  const clearImage = () => {
    update("image_url", null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canProceed = () => {
    if (step === 1) return form.item_description.trim().length >= 3;
    if (step === 2) {
      return (
        form.pickup_neighborhood.trim() &&
        form.delivery_neighborhood.trim() &&
        form.delivery_address.trim() &&
        form.delivery_lat != null &&
        form.delivery_lng != null
      );
    }
    if (step === 3)
      return form.offered_price && parseFloat(form.offered_price) > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        offered_price: parseFloat(form.offered_price),
        pickup_lat: form.pickup_lat || null,
        pickup_lng: form.pickup_lng || null,
        delivery_lat: form.delivery_lat || null,
        delivery_lng: form.delivery_lng || null,
      };
      const res = await axios.post(`${API}/errands`, payload, {
        headers: authHeader,
      });
      toast.success("Errand posted! Waiting for runners.");
      navigate(`/errands/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to post errand");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className='min-h-screen pt-20 pb-28 md:pb-8'>
      <div className='max-w-xl px-4 py-8 mx-auto sm:px-6'>
        <div className='mb-8'>
          <h1 className="text-3xl font-extrabold text-slate-900 font-['Manrope'] tracking-tight">
            Post an Errand
          </h1>
          <p className='mt-1 text-slate-500'>
            Fill in the details so runners can find and help you
          </p>
        </div>

        {/* Progress */}
        <div className='flex items-center gap-2 mb-8'>
          {STEPS.map((s, i) => (
            <div key={s.id} className='flex items-center flex-1'>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                  step > s.id
                    ? "bg-emerald-600 text-white"
                    : step === s.id
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {step > s.id ? <CheckCircle className='w-4 h-4' /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded ${step > s.id ? "bg-emerald-600" : "bg-slate-100"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className='mb-6'>
          <p className='mb-1 text-xs font-semibold tracking-widest uppercase text-slate-400'>
            Step {step} of 4
          </p>
          <h2 className="text-xl font-bold text-slate-900 font-['Manrope']">
            {STEPS[step - 1].title}
          </h2>
        </div>

        {/* Step Content */}
        <div className='p-6 mb-6 bg-white border shadow-sm rounded-2xl border-slate-100'>
          {step === 1 && (
            <div className='space-y-4'>
              <div>
                <label className={labelClass}>
                  Item name <span className='text-red-500'>*</span>
                </label>
                <input
                  data-testid='post-item-description-input'
                  className={inputClass}
                  placeholder='e.g. Prescription from CVS, Grocery order'
                  value={form.item_description}
                  onChange={(e) => update("item_description", e.target.value)}
                  maxLength={100}
                />
                <p className='mt-1 text-xs text-slate-400'>
                  {form.item_description.length}/100 characters
                </p>
              </div>

              {/* Category chips */}
              <div>
                <label className={labelClass}>
                  Category{" "}
                  <span className='font-normal text-slate-400'>(optional)</span>
                </label>
                <div
                  className='flex flex-wrap gap-2 mt-1'
                  data-testid='category-chips'
                >
                  {[
                    "Grocery",
                    "Food & Drinks",
                    "Pharmacy",
                    "Electronics",
                    "Documents",
                    "Clothing",
                    "Other",
                  ].map((cat) => (
                    <button
                      key={cat}
                      type='button'
                      data-testid={`category-chip-${cat.toLowerCase().replace(/\s+/g, "-").replace("&", "and")}`}
                      onClick={() =>
                        update("category", form.category === cat ? null : cat)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        form.category === cat
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200"
                          : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Additional details{" "}
                  <span className='font-normal text-slate-400'>(optional)</span>
                </label>
                <textarea
                  data-testid='post-item-details-input'
                  className={`${inputClass} h-24 resize-none`}
                  placeholder='Any special instructions, item size, handling notes...'
                  value={form.item_details}
                  onChange={(e) => update("item_details", e.target.value)}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className={labelClass}>
                  Item photo{" "}
                  <span className='text-xs font-normal text-slate-400'>
                    (optional)
                  </span>
                </label>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  data-testid='post-image-input'
                  className='hidden'
                  onChange={handleImageSelect}
                />
                {imagePreview ? (
                  <div className='relative overflow-hidden border rounded-xl border-slate-200'>
                    <img
                      src={imagePreview}
                      alt='Item preview'
                      className='object-cover w-full h-48'
                      data-testid='post-image-preview'
                    />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/40 to-transparent' />
                    <button
                      onClick={clearImage}
                      data-testid='post-image-clear-btn'
                      className='absolute flex items-center justify-center transition-colors rounded-full shadow-md top-2 right-2 w-7 h-7 bg-white/90 hover:bg-white'
                    >
                      <X className='w-3.5 h-3.5 text-slate-700' />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className='absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/90 hover:bg-white rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md transition-colors'
                    >
                      <Upload className='w-3 h-3' /> Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    data-testid='post-image-upload-btn'
                    disabled={imageUploading}
                    className='flex flex-col items-center justify-center w-full gap-2 transition-all border-2 border-dashed h-36 rounded-xl border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/50 group'
                  >
                    {imageUploading ? (
                      <>
                        <div className='border-2 rounded-full w-7 h-7 border-emerald-600 border-t-transparent animate-spin' />
                        <span className='text-sm text-slate-500'>
                          Uploading...
                        </span>
                      </>
                    ) : (
                      <>
                        <div className='flex items-center justify-center w-10 h-10 transition-colors rounded-xl bg-slate-100 group-hover:bg-emerald-100'>
                          <ImageIcon className='w-5 h-5 transition-colors text-slate-400 group-hover:text-emerald-600' />
                        </div>
                        <span className='text-sm font-medium text-slate-500 group-hover:text-slate-700'>
                          Click to upload photo
                        </span>
                        <span className='text-xs text-slate-400'>
                          JPG, PNG, WebP · Max 8MB
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className='space-y-4'>
              <div>
                <label className={labelClass}>
                  <span className='flex items-center gap-2'>
                    <span className='flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-amber-100 text-amber-600'>
                      P
                    </span>
                    Pickup neighborhood <span className='text-red-500'>*</span>
                  </span>
                </label>
                <GooglePlacesAutocomplete
                  testId='post-pickup-neighborhood-input'
                  types={['geocode']}
                  placeholder='Search pickup area or address'
                  hint='Type to search — pick a neighborhood or address from the list'
                  value={form.pickup_neighborhood}
                  onChange={(v) => update("pickup_neighborhood", v)}
                  onPlaceSelect={handlePickupPlace}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>
                  <span className='flex items-center gap-2'>
                    <MapPin className='w-4 h-4 text-violet-600' />
                    Delivery neighborhood{" "}
                    <span className='text-red-500'>*</span>
                  </span>
                </label>
                <GooglePlacesAutocomplete
                  testId='post-delivery-neighborhood-input'
                  types={['geocode']}
                  placeholder='Search delivery area or address'
                  hint='Type to search — pick a neighborhood or address from the list'
                  value={form.delivery_neighborhood}
                  onChange={(v) => update("delivery_neighborhood", v)}
                  onPlaceSelect={handleDeliveryNeighborhoodPlace}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>
                  Delivery address <span className='text-red-500'>*</span>
                </label>
                <GooglePlacesAutocomplete
                  testId='post-delivery-address-input'
                  types={['address']}
                  valueFromPlace='address'
                  placeholder='Search street address, e.g. 123 Oak Street'
                  hint='Type your street address and pick from the list — it will appear on the map'
                  value={form.delivery_address}
                  onChange={(v) => {
                    update("delivery_address", v);
                    if (!v.trim()) {
                      update("delivery_lat", null);
                      update("delivery_lng", null);
                    }
                  }}
                  onPlaceSelect={handleDeliveryAddressPlace}
                  required
                />
              </div>

              <ErrandRouteMap
                pickup={
                  form.pickup_lat != null
                    ? {
                        lat: form.pickup_lat,
                        lng: form.pickup_lng,
                        label: form.pickup_neighborhood,
                      }
                    : null
                }
                delivery={
                  form.delivery_lat != null
                    ? {
                        lat: form.delivery_lat,
                        lng: form.delivery_lng,
                        label: form.delivery_address,
                      }
                    : null
                }
              />
            </div>
          )}

          {step === 3 && (
            <div className='space-y-4'>
              <div>
                <label className={labelClass}>
                  Your offer (USD) <span className='text-red-500'>*</span>
                </label>
                <div className='relative'>
                  <span className='absolute text-sm font-medium -translate-y-1/2 left-4 top-1/2 text-slate-400'>
                    $
                  </span>
                  <input
                    data-testid='post-offered-price-input'
                    type='number'
                    min='0.50'
                    step='0.50'
                    className={`${inputClass} pl-8`}
                    placeholder='0.00'
                    value={form.offered_price}
                    onChange={(e) => update("offered_price", e.target.value)}
                  />
                </div>
                <p className='text-xs text-slate-400 mt-1.5'>
                  Runners may accept this or propose a counter-offer
                </p>
              </div>
              <div className='p-4 border bg-amber-50 rounded-xl border-amber-100'>
                <p className='mb-1 text-sm font-semibold text-amber-900'>
                  Pricing tip
                </p>
                <p className='text-xs text-amber-700'>
                  Most errands are priced between $5 – $20. Fair prices get more
                  offers.
                </p>
              </div>
              <div className='grid grid-cols-3 gap-2'>
                {[5, 10, 15].map((p) => (
                  <button
                    key={p}
                    data-testid={`post-price-preset-${p}`}
                    onClick={() => update("offered_price", p.toFixed(2))}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                      parseFloat(form.offered_price) === p
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    ${p}.00
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className='space-y-4'>
              <h3 className="font-bold text-slate-900 font-['Manrope'] mb-4">
                Review your errand
              </h3>
              <div className='space-y-3'>
                <div className='flex items-start gap-3 p-4 bg-slate-50 rounded-xl'>
                  <Package className='w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0' />
                  <div className='flex-1'>
                    <p className='text-xs font-medium tracking-wide uppercase text-slate-400'>
                      Item
                    </p>
                    <p className='font-semibold text-slate-900'>
                      {form.item_description}
                    </p>
                    {form.item_details && (
                      <p className='text-sm text-slate-500 mt-0.5'>
                        {form.item_details}
                      </p>
                    )}
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt='Item'
                        className='object-cover w-full mt-2 rounded-lg h-28'
                      />
                    )}
                  </div>
                </div>
                <div className='flex items-start gap-3 p-4 bg-slate-50 rounded-xl'>
                  <MapPin className='w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0' />
                  <div>
                    <p className='text-xs font-medium tracking-wide uppercase text-slate-400'>
                      Route
                    </p>
                    <p className='font-semibold text-slate-900'>
                      {form.pickup_neighborhood}{" "}
                      <span className='text-slate-400'>→</span>{" "}
                      {form.delivery_neighborhood}
                    </p>
                    <p className='text-sm text-slate-500 mt-0.5'>
                      Deliver to: {form.delivery_address}
                    </p>
                    {(form.pickup_lat || form.delivery_lat) && (
                      <p className='text-xs text-emerald-600 mt-0.5'>
                        {form.pickup_lat && form.delivery_lat
                          ? "Pickup & delivery on map"
                          : form.delivery_lat
                            ? "Delivery on map"
                            : "Pickup on map"}
                      </p>
                    )}
                  </div>
                </div>
                <div className='flex items-start gap-3 p-4 border bg-emerald-50 rounded-xl border-emerald-100'>
                  <DollarSign className='w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0' />
                  <div>
                    <p className='text-xs font-medium tracking-wide uppercase text-slate-400'>
                      Your Offer
                    </p>
                    <p className="font-extrabold text-emerald-700 text-2xl font-['Manrope']">
                      ${parseFloat(form.offered_price).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className='flex gap-3'>
          {step > 1 && (
            <button
              data-testid='post-errand-back-btn'
              onClick={() => setStep((s) => s - 1)}
              className='flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border rounded-full border-slate-200 text-slate-700 hover:bg-slate-50'
            >
              <ChevronLeft className='w-4 h-4' /> Back
            </button>
          )}
          {step < 4 ? (
            <button
              data-testid='post-errand-next-btn'
              onClick={() => canProceed() && setStep((s) => s + 1)}
              disabled={!canProceed()}
              className='flex items-center justify-center flex-1 gap-2 py-3 text-sm font-bold text-white transition-all rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-emerald-600/20'
            >
              Continue <ChevronRight className='w-4 h-4' />
            </button>
          ) : (
            <button
              data-testid='post-errand-submit-btn'
              onClick={handleSubmit}
              disabled={submitting}
              className='flex items-center justify-center flex-1 gap-2 py-3 text-sm font-bold text-white transition-all rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-emerald-600/20'
            >
              {submitting ? "Posting..." : "Post Errand"}
              {!submitting && <CheckCircle className='w-4 h-4' />}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

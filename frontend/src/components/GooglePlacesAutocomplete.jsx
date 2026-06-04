import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { loadGoogleMaps, placeToNeighborhood, placeToAddressFields } from "@/utils/googleMaps";

/**
 * Google Places Autocomplete input for address/neighborhood search.
 */
export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search for your neighborhood or city",
  className = "",
  inputClassName = "",
  testId = "places-autocomplete",
  required = false,
  disabled = false,
  types = ['geocode'],
  hint,
  /** What text to put in the input after a suggestion is picked: neighborhood | address | formatted */
  valueFromPlace = 'neighborhood',
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const google = await loadGoogleMaps();
        if (cancelled || !inputRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            types,
            fields: [
              "formatted_address",
              "address_components",
              "geometry",
              "name",
            ],
          },
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place?.geometry) return;

          const fields = placeToAddressFields(place);
          const neighborhood = placeToNeighborhood(place);
          const label =
            neighborhood || place.formatted_address || place.name || "";
          const displayValue =
            valueFromPlace === 'address'
              ? (fields?.address || label)
              : valueFromPlace === 'formatted'
                ? (place.formatted_address || label)
                : label;

          onChangeRef.current?.(displayValue);
          onPlaceSelectRef.current?.({
            neighborhood: label,
            formattedAddress: place.formatted_address,
            lat: fields?.lat ?? place.geometry.location.lat(),
            lng: fields?.lng ?? place.geometry.location.lng(),
            address: fields?.address,
            placeId: place.place_id,
          });
        });

        autocompleteRef.current = autocomplete;
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e.message || "Could not load Google Maps search");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      const ac = autocompleteRef.current;
      if (ac && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(ac);
      }
      autocompleteRef.current = null;
    };
  }, [types]);

  return (
    <div className={className}>
      <div className='flex items-start gap-2'>
        <div className='relative flex-1 min-w-0'>
          <MapPin className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10' />
          <input
            ref={inputRef}
            type='text'
            required={required}
            disabled={disabled}
            aria-busy={loading}
            aria-describedby={loading ? `${testId}-loading` : undefined}
            data-testid={testId}
            className={`w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-60 ${loading ? 'border-emerald-200 bg-emerald-50/40' : ''} ${inputClassName}`}
            placeholder={loading ? 'Preparing address search…' : placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            autoComplete='off'
          />
        </div>
        {loading && (
          <div
            id={`${testId}-loading`}
            className='flex-shrink-0 flex items-center gap-1.5 pt-3'
            role='status'
            aria-live='polite'
          >
            <Loader2
              className='w-5 h-5 text-emerald-600 animate-spin'
              data-testid={`${testId}-loading-spinner`}
            />
            <span className='sr-only'>Loading address search</span>
          </div>
        )}
      </div>
      {loading && !loadError && (
        <p className='text-xs text-emerald-700 mt-1.5 font-medium'>
          Loading map search — you can type now; pick from suggestions once ready.
        </p>
      )}
      {loadError && (
        <p className='text-xs text-amber-600 mt-1.5'>
          {loadError}. You can still type your neighborhood manually.
        </p>
      )}
      {!loadError && !loading && (
        <p className='text-xs text-slate-400 mt-1.5'>
          {hint || 'Start typing and pick a location from the suggestions'}
        </p>
      )}
    </div>
  );
}

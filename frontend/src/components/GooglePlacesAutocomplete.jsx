import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import {
  loadGoogleMaps,
  placeToNeighborhood,
  placeToAddressFields,
} from "@/utils/googleMaps";

const DEBOUNCE_MS = 280;

/** Google allows one type per Autocomplete request. */
function resolveAutocompleteType(types) {
  if (!types?.length) return undefined;
  const t = types[0];
  if (t === "address") return "address";
  if (t === "geocode") return "geocode";
  if (t === "regions") return "(regions)";
  if (t === "cities") return "(cities)";
  return t.startsWith("(") ? t : t;
}

/**
 * Google Places address search with a React-friendly suggestions dropdown.
 */
export default function GooglePlacesAutocomplete({
  value = "",
  onChange,
  onPlaceSelect,
  placeholder = "Search for your neighborhood or city",
  className = "",
  inputClassName = "",
  testId = "places-autocomplete",
  required = false,
  disabled = false,
  types = ["all"],
  hint,
  valueFromPlace = "neighborhood",
}) {
  const rootRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const debounceRef = useRef(null);
  const googleRef = useRef(null);

  const [apiReady, setApiReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  });

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled) return;
        googleRef.current = google;
        autocompleteServiceRef.current =
          new google.maps.places.AutocompleteService();
        placesServiceRef.current = new google.maps.places.PlacesService(
          document.createElement("div"),
        );
        sessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
        setApiReady(true);
        setLoadError(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e.message || "Could not load Google Maps search");
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchPredictions = useCallback(
    (input) => {
      if (!apiReady || !autocompleteServiceRef.current || !input.trim()) {
        setPredictions([]);
        setOpen(false);
        setSearching(false);
        return;
      }

      setSearching(true);
      const request = {
        input,
        sessionToken: sessionTokenRef.current,
      };
      const type = resolveAutocompleteType(types);
      if (type) request.types = [type];

      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (results, status) => {
          setSearching(false);
          const google = googleRef.current;
          const ok =
            google &&
            status === google.maps.places.PlacesServiceStatus.OK &&
            results?.length;
          if (!ok) {
            setPredictions([]);
            setOpen(false);
            return;
          }

          setPredictions(results);
          setOpen(true);
          setActiveIndex(-1);
        },
      );
    },
    [apiReady, types],
  );

  const handleInputChange = (e) => {
    const next = e.target.value;
    onChangeRef.current?.(next);
    clearTimeout(debounceRef.current);
    if (!next.trim()) {
      setPredictions([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchPredictions(next), DEBOUNCE_MS);
  };

  const applyPlace = useCallback(
    (place) => {
      if (!place?.geometry) return;
      const fields = placeToAddressFields(place);
      const neighborhood = placeToNeighborhood(place);
      const label = neighborhood || place.formatted_address || place.name || "";
      const displayValue =
        valueFromPlace === "address"
          ? fields?.address || label
          : valueFromPlace === "formatted"
            ? place.formatted_address || label
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
    },
    [valueFromPlace],
  );

  const selectPrediction = useCallback(
    (prediction) => {
      setOpen(false);
      setPredictions([]);
      setActiveIndex(-1);

      if (!placesServiceRef.current || !prediction?.place_id) return;

      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: [
            "formatted_address",
            "address_components",
            "geometry",
            "name",
            "place_id",
          ],
          sessionToken: sessionTokenRef.current,
        },
        (place, status) => {
          const google = googleRef.current;
          if (
            google &&
            status === google.maps.places.PlacesServiceStatus.OK &&
            place
          ) {
            applyPlace(place);
          } else if (prediction.description) {
            onChangeRef.current?.(prediction.description);
          }

          if (google?.maps?.places?.AutocompleteSessionToken) {
            sessionTokenRef.current =
              new google.maps.places.AutocompleteSessionToken();
          }
        },
      );
    },
    [applyPlace],
  );

  const handleKeyDown = (e) => {
    if (!open || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, predictions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectPrediction(predictions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const loading = !apiReady && !loadError;
  const showSpinner = loading || searching;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className='flex items-start gap-2'>
        <div className='relative flex-1 min-w-0'>
          <MapPin className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10' />
          <input
            type='text'
            required={required}
            disabled={disabled || loading}
            aria-busy={showSpinner}
            aria-expanded={open}
            aria-autocomplete='list'
            aria-controls={open ? `${testId}-listbox` : undefined}
            data-testid={testId}
            className={`w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400 disabled:opacity-60 ${loading ? "border-emerald-200 bg-emerald-50/40" : ""} ${inputClassName}`}
            placeholder={loading ? "Preparing address search…" : placeholder}
            value={value}
            onChange={handleInputChange}
            onFocus={() => {
              if (predictions.length > 0) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            autoComplete='off'
            role='combobox'
          />

          {open && predictions.length > 0 && (
            <ul
              id={`${testId}-listbox`}
              role='listbox'
              data-testid={`${testId}-suggestions`}
              className='absolute z-[200] w-full mt-1 py-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto'
            >
              {predictions.map((p, i) => (
                <li
                  key={p.place_id}
                  role='option'
                  aria-selected={i === activeIndex}
                  data-testid={`${testId}-suggestion-${i}`}
                  className={`px-3.5 py-2.5 cursor-pointer text-sm transition-colors ${
                    i === activeIndex
                      ? "bg-emerald-50 text-emerald-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectPrediction(p);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span className='block font-medium truncate'>
                    {p.structured_formatting?.main_text || p.description}
                  </span>
                  {p.structured_formatting?.secondary_text && (
                    <span className='text-xs text-slate-500 block truncate mt-0.5'>
                      {p.structured_formatting.secondary_text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {showSpinner && (
          <div
            className='flex-shrink-0 flex items-center gap-1.5 pt-3'
            role='status'
            aria-live='polite'
          >
            <Loader2
              className='w-5 h-5 text-emerald-600 animate-spin'
              data-testid={`${testId}-loading-spinner`}
            />
            <span className='sr-only'>
              {loading ? "Loading address search" : "Searching addresses"}
            </span>
          </div>
        )}
      </div>

      {loading && !loadError && (
        <p className='text-xs text-emerald-700 mt-1.5 font-medium'>
          Loading address search — start typing to see suggestions.
        </p>
      )}
      {loadError && (
        <p className='text-xs text-amber-600 mt-1.5'>
          {loadError}. Check REACT_APP_GOOGLE_MAPS_API_KEY in frontend/.env and
          ensure Places API is enabled.
        </p>
      )}
      {!loadError && !loading && (
        <p className='text-xs text-slate-400 mt-1.5'>
          {hint || "Start typing and pick an address from the list"}
        </p>
      )}
    </div>
  );
}

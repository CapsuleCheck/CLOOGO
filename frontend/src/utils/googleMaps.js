let loadPromise = null;

export function getGoogleMapsApiKey() {
  return process.env.REACT_APP_GOOGLE_MAPS_API_KEY?.trim() || null;
}

/** Load Google Maps JavaScript API with Places library (once). */
export function loadGoogleMaps() {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is not configured'));
  }
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser'));
  }
  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const id = 'google-maps-js';
    const existing = document.getElementById(id);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps?.places) resolve(window.google);
      else reject(new Error('Google Places library failed to load'));
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  }).catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

/** Build a neighborhood/area label from Google Place result. */
export function placeToNeighborhood(place) {
  if (!place) return '';

  const components = place.address_components || [];
  const get = (type) => components.find((c) => c.types.includes(type))?.long_name;

  const neighborhood =
    get('neighborhood')
    || get('sublocality_level_1')
    || get('sublocality')
    || get('locality')
    || get('administrative_area_level_2');

  if (neighborhood) {
    const state = get('administrative_area_level_1');
    const country = get('country');
    if (state && country === 'United States') {
      return `${neighborhood}, ${state}`;
    }
    return neighborhood;
  }

  return place.formatted_address || place.name || '';
}

/** Extract street address, neighborhood, and coordinates from a Google Place. */
export function placeToAddressFields(place) {
  if (!place?.geometry?.location) {
    return null;
  }

  const components = place.address_components || [];
  const get = (type) => components.find((c) => c.types.includes(type))?.long_name;

  const streetNumber = get('street_number');
  const route = get('route');
  const streetLine = [streetNumber, route].filter(Boolean).join(' ');
  const lat = place.geometry.location.lat();
  const lng = place.geometry.location.lng();

  return {
    formattedAddress: place.formatted_address || place.name || '',
    address: streetLine || place.formatted_address || place.name || '',
    neighborhood: placeToNeighborhood(place),
    lat,
    lng,
    placeId: place.place_id,
  };
}

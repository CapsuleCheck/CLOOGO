const HERE_VERSION = '3.2';
const HERE_BASE = `https://js.api.here.com/v3/${HERE_VERSION}`;

const SCRIPTS = [
  `${HERE_BASE}/mapsjs-core.js`,
  `${HERE_BASE}/mapsjs-service.js`,
  `${HERE_BASE}/mapsjs-mapevents.js`,
  `${HERE_BASE}/mapsjs-ui.js`,
];

let loadPromise = null;

export function getHereApiKey() {
  const key = process.env.REACT_APP_HERE_API_KEY?.trim();
  return key || null;
}

function isHereReady() {
  return Boolean(
    window.H?.Map
    && window.H?.service?.Platform
    && window.H?.map?.DomMarker
    && window.H?.mapevents?.Behavior
  );
}

/** Poll until HERE global API is usable (core + service + mapevents loaded). */
function waitForHere(maxMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (isHereReady()) {
        resolve(window.H);
        return;
      }
      if (Date.now() - start > maxMs) {
        reject(
          new Error(
            'HERE Maps API failed to initialize. Scripts may be blocked, or mapsjs-core did not finish loading. Refresh the page or check the browser console Network tab for js.api.here.com errors.'
          )
        );
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function appendStylesheet() {
  const id = 'here-mapsjs-ui-css';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = `${HERE_BASE}/mapsjs-ui.css`;
  document.head.appendChild(link);
}

/** Load one script and wait until it has executed. */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing?.getAttribute('data-loaded') === 'true') {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.async = false;
    script.setAttribute('data-here-script', 'true');
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

async function loadHereMapsDynamic() {
  appendStylesheet();

  // Core is large (~2MB on 3.2); must finish before other modules run.
  await loadScript(SCRIPTS[0]);
  await waitForHere(20000);

  for (let i = 1; i < SCRIPTS.length; i += 1) {
    await loadScript(SCRIPTS[i]);
  }

  return waitForHere(15000);
}

/**
 * Load HERE Maps API for JavaScript.
 * Prefer scripts declared in public/index.html; fall back to dynamic sequential load.
 */
export async function loadHereMaps() {
  if (typeof window === 'undefined') {
    throw new Error('HERE Maps can only load in the browser');
  }
  if (isHereReady()) {
    return window.H;
  }
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    appendStylesheet();
    // index.html may already be loading scripts — wait before injecting duplicates
    try {
      return await waitForHere(25000);
    } catch {
      return loadHereMapsDynamic();
    }
  })().catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

export function createHerePlatform(H, apiKey) {
  if (!apiKey) throw new Error('HERE API key is not configured (REACT_APP_HERE_API_KEY)');
  return new H.service.Platform({ apikey: apiKey });
}

export function getDefaultMapLayer(defaultLayers) {
  if (!defaultLayers) return null;
  return (
    defaultLayers.vector?.normal?.map
    || defaultLayers.raster?.normal?.map
    || defaultLayers.vector?.normal?.mapnight
    || (defaultLayers.vector?.normal && Object.values(defaultLayers.vector.normal)[0])
    || null
  );
}

export async function geocodeAddress(query, apiKey) {
  if (!query?.trim()) throw new Error('Empty address');
  if (!apiKey) throw new Error('HERE API key is not configured');

  const url = new URL('https://geocode.search.hereapi.com/v1/geocode');
  url.searchParams.set('q', query.trim());
  url.searchParams.set('apiKey', apiKey);

  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = data.error_description || data.error || res.statusText;
    if (res.status === 401 || String(detail).toLowerCase().includes('apikey')) {
      throw new Error(
        'HERE API key is invalid or lacks Geocoding access. Check your key at https://platform.here.com/'
      );
    }
    throw new Error(detail || 'Geocoding failed');
  }

  const item = data.items?.[0];
  const pos = item?.position;
  if (!pos) throw new Error(`Address not found: ${query}`);

  return {
    lat: pos.lat,
    lng: pos.lng,
    label: item.title || query,
  };
}

export async function calculateRoute(apiKey, points) {
  if (!apiKey) throw new Error('HERE API key is not configured');
  if (!points || points.length < 2) return null;

  const params = new URLSearchParams({
    apiKey,
    transportMode: 'car',
    return: 'polyline,summary',
    origin: `${points[0].lat},${points[0].lng}`,
    destination: `${points[points.length - 1].lat},${points[points.length - 1].lng}`,
  });

  if (points.length === 3) {
    params.append('via', `${points[1].lat},${points[1].lng}`);
  }

  const url = `https://router.hereapi.com/v8/routes?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = data.title || data.message || data.error_description || res.statusText;
    console.warn('HERE routing:', detail);
    return null;
  }

  return data.routes?.[0] || null;
}

export function drawRouteOnMap(H, map, route, style = { strokeColor: '#059669', lineWidth: 5 }) {
  const lines = [];
  (route?.sections || []).forEach((section) => {
    if (!section.polyline) return;
    try {
      const lineString = H.geo.LineString.fromFlexiblePolyline(section.polyline);
      const polyline = new H.map.Polyline(lineString, { style });
      map.addObject(polyline);
      lines.push(polyline);
    } catch (e) {
      console.warn('Failed to draw route section', e);
    }
  });
  return lines;
}

export function formatDistance(meters) {
  if (meters == null) return '—';
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters)} m`;
  return `${miles.toFixed(1)} mi`;
}

export function formatDuration(seconds) {
  if (seconds == null) return '—';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function createDomMarker(H, lat, lng, html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  const icon = new H.map.DomIcon(el, { anchor: { x: 18, y: 18 } });
  return new H.map.DomMarker({ lat, lng }, { icon });
}

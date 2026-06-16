import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MapPin, Navigation, Package, Truck, AlertCircle } from "lucide-react";
import {
  loadHereMaps,
  getHereApiKey,
  createHerePlatform,
  getDefaultMapLayer,
  geocodeAddress,
  calculateRoute,
  drawRouteOnMap,
  formatDistance,
  formatDuration,
  createDomMarker,
} from "@/utils/hereMaps";

const DEFAULT_CENTER = { lat: 41.8781, lng: -87.6298 };

const MARKER_HTML = {
  runner: `<div style="background:#059669;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:18px;">🚗</div>`,
  pickup: `<div style="background:#f59e0b;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:14px;">📦</div>`,
  delivery: `<div style="background:#7c3aed;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:14px;">🏁</div>`,
};

function buildLegLabels(points, runnerPoint, pickupPoint, deliveryPoint) {
  if (points.length === 3) return ["Runner → Pickup", "Pickup → Delivery"];
  if (points.length === 2) {
    if (runnerPoint && pickupPoint) return ["Runner → Pickup"];
    if (runnerPoint && deliveryPoint) return ["Runner → Delivery"];
    if (pickupPoint && deliveryPoint) return ["Pickup → Delivery"];
  }
  return ["Route"];
}

export default function HereTrackingMap({ errand, runnerLocation }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const uiRef = useRef(null);
  const markersGroupRef = useRef(null);
  const routeLinesRef = useRef([]);
  const initGenRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const runnerPoint = useMemo(
    () =>
      runnerLocation?.lat != null && runnerLocation?.lng != null
        ? { lat: runnerLocation.lat, lng: runnerLocation.lng }
        : null,
    [runnerLocation?.lat, runnerLocation?.lng],
  );

  const disposeMap = useCallback(() => {
    routeLinesRef.current.forEach((line) => {
      try {
        mapRef.current?.removeObject(line);
      } catch (_) {
        /* noop */
      }
    });
    routeLinesRef.current = [];

    if (uiRef.current) {
      try {
        uiRef.current.dispose();
      } catch (_) {
        /* noop */
      }
      uiRef.current = null;
    }
    if (mapRef.current) {
      try {
        mapRef.current.dispose();
      } catch (_) {
        /* noop */
      }
      mapRef.current = null;
    }
    markersGroupRef.current = null;
    setMapReady(false);
  }, []);

  useEffect(() => {
    const gen = ++initGenRef.current;
    let resizeHandler = null;
    const warns = [];

    async function init() {
      setLoading(true);
      setError(null);
      setWarnings([]);
      setRouteInfo(null);
      disposeMap();

      const apiKey = getHereApiKey();
      if (!apiKey) {
        setError(
          "HERE API key is missing. Add REACT_APP_HERE_API_KEY to frontend/.env",
        );
        setLoading(false);
        return;
      }

      if (!containerRef.current) {
        setLoading(false);
        return;
      }

      try {
        const H = await loadHereMaps();
        if (gen !== initGenRef.current) return;

        const platform = createHerePlatform(H, apiKey);
        const defaultLayers = platform.createDefaultLayers();
        const baseLayer = getDefaultMapLayer(defaultLayers);
        if (!baseLayer) {
          throw new Error("Could not create HERE map layers");
        }

        let pickup = null;
        if (errand.pickup_lat != null && errand.pickup_lng != null) {
          pickup = {
            lat: errand.pickup_lat,
            lng: errand.pickup_lng,
            label: errand.pickup_neighborhood,
          };
        } else if (errand.pickup_neighborhood) {
          try {
            pickup = await geocodeAddress(errand.pickup_neighborhood, apiKey);
            pickup.label = errand.pickup_neighborhood;
          } catch (e) {
            warns.push(`Pickup: ${e.message}`);
          }
        }

        let delivery = null;
        if (errand.delivery_lat != null && errand.delivery_lng != null) {
          delivery = {
            lat: errand.delivery_lat,
            lng: errand.delivery_lng,
            label: errand.delivery_address || errand.delivery_neighborhood,
          };
        } else {
          const deliveryQuery = [
            errand.delivery_address,
            errand.delivery_neighborhood,
          ]
            .filter(Boolean)
            .join(", ");
          if (deliveryQuery) {
            try {
              delivery = await geocodeAddress(deliveryQuery, apiKey);
              delivery.label =
                errand.delivery_address || errand.delivery_neighborhood;
            } catch (e) {
              warns.push(`Delivery: ${e.message}`);
            }
          }
        }

        if (gen !== initGenRef.current) return;

        const center = runnerPoint || pickup || delivery || DEFAULT_CENTER;

        const map = new H.Map(containerRef.current, baseLayer, {
          zoom: 13,
          center,
          pixelRatio: window.devicePixelRatio || 1,
        });
        mapRef.current = map;

        new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

        try {
          if (H.ui?.UI) {
            uiRef.current = H.ui.UI.createDefault(map, defaultLayers, "en-US");
          }
        } catch (uiErr) {
          console.warn("HERE UI controls skipped:", uiErr);
        }

        markersGroupRef.current = new H.map.Group();
        map.addObject(markersGroupRef.current);

        const group = markersGroupRef.current;
        const routePoints = [];

        if (runnerPoint) {
          group.addObject(
            createDomMarker(
              H,
              runnerPoint.lat,
              runnerPoint.lng,
              MARKER_HTML.runner,
            ),
          );
          routePoints.push(runnerPoint);
        }
        if (pickup) {
          group.addObject(
            createDomMarker(H, pickup.lat, pickup.lng, MARKER_HTML.pickup),
          );
          routePoints.push(pickup);
        }
        if (delivery) {
          group.addObject(
            createDomMarker(
              H,
              delivery.lat,
              delivery.lng,
              MARKER_HTML.delivery,
            ),
          );
          routePoints.push(delivery);
        }

        if (group.getObjects().length > 0) {
          const bounds = group.getBoundingBox();
          if (bounds) {
            map.getViewModel().setLookAtData({ bounds }, true);
          }
        }

        resizeHandler = () => {
          map.getViewPort()?.resize();
        };
        window.addEventListener("resize", resizeHandler);
        requestAnimationFrame(() => map.getViewPort()?.resize());

        if (routePoints.length >= 2) {
          const route = await calculateRoute(apiKey, routePoints);
          if (route && gen === initGenRef.current) {
            routeLinesRef.current = drawRouteOnMap(H, map, route);
            const legLabels = buildLegLabels(
              routePoints,
              runnerPoint,
              pickup,
              delivery,
            );
            const legs = (route.sections || []).map((section, i) => ({
              label: legLabels[i] || `Leg ${i + 1}`,
              distance: section.summary?.length,
              duration: section.summary?.duration,
            }));
            const summary = (route.sections || []).reduce(
              (acc, s) => ({
                length: acc.length + (s.summary?.length || 0),
                duration: acc.duration + (s.summary?.duration || 0),
              }),
              { length: 0, duration: 0 },
            );
            setRouteInfo({
              legs,
              totalDistance: summary.length,
              totalDuration: summary.duration,
            });
          }
        }

        if (gen !== initGenRef.current) return;

        if (warns.length > 0) {
          setWarnings(warns);
          if (!pickup && !delivery && !runnerPoint) {
            setError(warns[0]);
          }
        }

        setMapReady(true);
      } catch (e) {
        if (gen === initGenRef.current) {
          setError(e.message || "Failed to initialize HERE map");
        }
      } finally {
        if (gen === initGenRef.current) {
          setLoading(false);
        }
      }
    }

    const timer = requestAnimationFrame(() => init());

    return () => {
      cancelAnimationFrame(timer);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      disposeMap();
    };
  }, [
    errand.pickup_lat,
    errand.pickup_lng,
    errand.pickup_neighborhood,
    errand.delivery_address,
    errand.delivery_neighborhood,
    errand.delivery_lat,
    errand.delivery_lng,
    runnerPoint,
    disposeMap,
  ]);

  if (error && !mapReady) {
    return (
      <div
        className='p-6 border border-red-200 rounded-2xl bg-red-50'
        data-testid='here-tracking-error'
      >
        <div className='flex items-start gap-3'>
          <AlertCircle className='w-5 h-5 text-red-600 flex-shrink-0 mt-0.5' />
          <div className='text-left'>
            <p className='text-sm font-semibold text-red-800'>
              HERE map could not load
            </p>
            <p className='mt-1 text-sm text-red-700'>{error}</p>
            <p className='mt-2 text-xs text-red-600'>
              Verify your API key at{" "}
              <a
                href='https://platform.here.com/'
                target='_blank'
                rel='noopener noreferrer'
                className='underline'
              >
                platform.here.com
              </a>{" "}
              and enable Maps, Geocoding, and Routing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-3' data-testid='here-tracking-map'>
      <div className='flex flex-wrap gap-3 text-xs'>
        <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-1 font-medium'>
          <Truck className='w-3 h-3' /> Runner
        </span>
        <span className='inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 px-2.5 py-1 font-medium'>
          <Package className='w-3 h-3' /> Pickup
        </span>
        <span className='inline-flex items-center gap-1.5 rounded-full bg-violet-50 text-violet-800 px-2.5 py-1 font-medium'>
          <MapPin className='w-3 h-3' /> Delivery
        </span>
      </div>

      {warnings.length > 0 && (
        <div className='px-3 py-2 text-xs border rounded-xl border-amber-200 bg-amber-50 text-amber-800'>
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <div
        className='relative overflow-hidden border shadow-sm rounded-2xl border-slate-200'
        style={{ height: 320 }}
      >
        <div
          ref={containerRef}
          className='absolute inset-0 w-full h-full bg-slate-100'
        />
        {loading && (
          <div className='absolute inset-0 z-10 flex items-center justify-center bg-slate-50/90'>
            <p className='text-sm text-slate-500'>Loading HERE map…</p>
          </div>
        )}
      </div>

      {!runnerPoint && !loading && mapReady && (
        <p className='text-xs text-slate-500 flex items-center gap-1.5'>
          <Navigation className='w-3.5 h-3.5' />
          Runner location will appear when they tap &quot;Share My
          Location&quot;.
        </p>
      )}

      {routeInfo && (
        <div className='grid gap-2 sm:grid-cols-2'>
          {routeInfo.legs.map((leg) => (
            <div
              key={leg.label}
              className='px-3 py-2 border rounded-xl bg-slate-50 border-slate-100'
            >
              <p className='text-xs font-semibold text-slate-600'>
                {leg.label}
              </p>
              <p className='text-sm font-bold text-slate-900'>
                {formatDuration(leg.duration)} · {formatDistance(leg.distance)}
              </p>
            </div>
          ))}
          {routeInfo.totalDuration != null && (
            <div className='px-3 py-2 border rounded-xl bg-emerald-50 border-emerald-100 sm:col-span-2'>
              <p className='text-xs font-semibold text-emerald-700'>
                Full route
              </p>
              <p className='text-sm font-bold text-emerald-900'>
                {formatDuration(routeInfo.totalDuration)} ·{" "}
                {formatDistance(routeInfo.totalDistance)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

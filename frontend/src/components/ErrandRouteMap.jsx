import { useEffect, useRef, useState, useMemo } from 'react';
import { loadGoogleMaps } from '@/utils/googleMaps';

const MARKER_COLORS = {
  pickup: '#f59e0b',
  delivery: '#7c3aed',
};

/**
 * Google Map showing pickup and/or delivery pins for the post-errand flow.
 */
export default function ErrandRouteMap({
  pickup,
  delivery,
  height = 280,
  className = '',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  const pickupPoint = useMemo(
    () =>
      pickup?.lat != null && pickup?.lng != null
        ? { lat: pickup.lat, lng: pickup.lng, label: pickup.label || 'Pickup' }
        : null,
    [pickup?.lat, pickup?.lng, pickup?.label],
  );
  const deliveryPoint = useMemo(
    () =>
      delivery?.lat != null && delivery?.lng != null
        ? { lat: delivery.lat, lng: delivery.lng, label: delivery.label || 'Delivery' }
        : null,
    [delivery?.lat, delivery?.lng, delivery?.label],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      const hasPoint = pickupPoint || deliveryPoint;
      if (!hasPoint) {
        setReady(false);
        setError(null);
        return;
      }

      try {
        const google = await loadGoogleMaps();
        if (cancelled) return;

        const center = deliveryPoint || pickupPoint || { lat: 41.8781, lng: -87.6298 };

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(containerRef.current, {
            center,
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }

        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();

        if (pickupPoint) {
          const pos = { lat: pickupPoint.lat, lng: pickupPoint.lng };
          bounds.extend(pos);
          markersRef.current.push(
            new google.maps.Marker({
              map: mapRef.current,
              position: pos,
              title: pickupPoint.label,
              label: { text: 'P', color: '#fff', fontWeight: 'bold' },
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 14,
                fillColor: MARKER_COLORS.pickup,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              },
            })
          );
        }

        if (deliveryPoint) {
          const pos = { lat: deliveryPoint.lat, lng: deliveryPoint.lng };
          bounds.extend(pos);
          markersRef.current.push(
            new google.maps.Marker({
              map: mapRef.current,
              position: pos,
              title: deliveryPoint.label,
              label: { text: 'D', color: '#fff', fontWeight: 'bold' },
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 14,
                fillColor: MARKER_COLORS.delivery,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              },
            })
          );
        }

        if (pickupPoint && deliveryPoint) {
          mapRef.current.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
        } else {
          mapRef.current.setCenter(center);
          mapRef.current.setZoom(14);
        }

        setError(null);
        setReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Could not load map');
          setReady(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [pickupPoint, deliveryPoint]);

  const hasPoint = pickupPoint || deliveryPoint;

  return (
    <div className={className}>
      <div
        className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative"
        style={{ height }}
      >
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        {!hasPoint && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <p className="text-sm text-slate-500">
              Select pickup and delivery locations above to preview them on the map
            </p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-50/90">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
      {ready && hasPoint && (
        <div className="flex flex-wrap gap-3 mt-2 text-xs font-medium">
          {pickupPoint && (
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Pickup: {pickupPoint.label}
            </span>
          )}
          {deliveryPoint && (
            <span className="inline-flex items-center gap-1.5 text-violet-700">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
              Delivery: {deliveryPoint.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

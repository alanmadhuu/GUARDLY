import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

type Coordinates = {
  lat: number;
  lng: number;
};

type RouteMapProps = {
  origin: Coordinates;
  destination: Coordinates;
};

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions = {
  disableDefaultUI: false,
  fullscreenControl: false,
  mapTypeControl: false,
  streetViewControl: false,
};

function getRouteCenter(origin: Coordinates, destination: Coordinates): Coordinates {
  return {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  };
}

export default function RouteMap({ origin, destination }: RouteMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<google.maps.Map | null>(null);
  const routePath = useMemo(() => [origin, destination], [origin, destination]);
  const center = useMemo(() => getRouteCenter(origin, destination), [origin, destination]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "guardly-google-maps",
    googleMapsApiKey: apiKey || "",
  });

  const fitRouteBounds = useCallback(() => {
    if (!mapRef.current || !window.google) {
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(origin);
    bounds.extend(destination);
    mapRef.current.fitBounds(bounds, 64);
  }, [destination, origin]);

  useEffect(() => {
    if (isLoaded) {
      fitRouteBounds();
    }
  }, [fitRouteBounds, isLoaded]);

  if (!apiKey) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <div className="flex max-w-md gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Google Maps API key is not configured.</p>
            <p className="mt-1">Set VITE_GOOGLE_MAPS_API_KEY and restart the Vite dev server.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-900">
        <div className="flex max-w-md gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Google Maps failed to load.</p>
            <p className="mt-1">Check the API key, billing status, allowed referrers, and Maps JavaScript API access.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-teal-100 bg-teal-50 p-5 text-sm font-medium text-teal-900">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading map...
      </div>
    );
  }

  return (
    <div className="h-[360px] overflow-hidden rounded-lg border border-stone-200 bg-stone-100 shadow-sm">
      <GoogleMap
        center={center}
        mapContainerStyle={mapContainerStyle}
        onLoad={(map) => {
          mapRef.current = map;
          fitRouteBounds();
        }}
        onUnmount={() => {
          mapRef.current = null;
        }}
        options={mapOptions}
        zoom={13}
      >
        <MarkerF label="A" position={origin} title="Origin" />
        <MarkerF label="B" position={destination} title="Destination" />
        <PolylineF
          options={{
            strokeColor: "#0f766e",
            strokeOpacity: 0.9,
            strokeWeight: 5,
          }}
          path={routePath}
        />
      </GoogleMap>
    </div>
  );
}

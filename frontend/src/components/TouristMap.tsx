import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { AlertTriangle, Flag, LocateFixed, Loader2, Route as RouteIcon } from "lucide-react";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scamHotspots, type ScamHotspot } from "../data/scam_spots";
import { googleMapsLibraries } from "../services/googleMaps";
import type { Coordinates, RouteMapMetrics } from "../types/route";
import AreaWarningLookup from "./AreaWarningLookup";
import RiskPanel from "./RiskPanel";
import RouteLayer from "./RouteLayer";
import ScamHotspots from "./ScamHotspots";

type TouristMapProps = {
  route?: {
    origin: Coordinates;
    destination: Coordinates;
    riskLevel?: string;
  };
  actualDistanceKm?: number;
  compact?: boolean;
  currentLocation?: Coordinates;
  onRouteMetricsChange?: (metrics: RouteMapMetrics | null) => void;
  showDeviation?: boolean;
  showRouteControls?: boolean;
};

const defaultCenter = {
  lat: 26.9124,
  lng: 75.7873,
};

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions: google.maps.MapOptions = {
  fullscreenControl: false,
  mapTypeControl: false,
  streetViewControl: false,
};

const cityOptions = ["All", "Bangalore", "Delhi", "Jaipur", "Kochi", "Mumbai"];

function isHighRisk(riskLevel?: string) {
  return riskLevel?.toUpperCase() === "HIGH";
}

function MapControlButton({
  children,
  icon: Icon,
  onClick,
}: {
  children: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

export default function TouristMap({
  actualDistanceKm,
  compact = false,
  currentLocation,
  onRouteMetricsChange,
  route,
  showDeviation = false,
  showRouteControls = false,
}: TouristMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedHotspot, setSelectedHotspot] = useState<ScamHotspot | null>(scamHotspots[0] ?? null);
  const [routePath, setRoutePath] = useState<Coordinates[]>([]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "guardly-google-maps",
    googleMapsApiKey: apiKey || "",
    libraries: googleMapsLibraries,
  });

  const visibleHotspots = useMemo(() => {
    if (selectedCity === "All") {
      return scamHotspots;
    }

    return scamHotspots.filter((hotspot) => hotspot.city === selectedCity);
  }, [selectedCity]);

  const fitRouteBounds = useCallback(() => {
    if (!mapRef.current || !window.google || !route) {
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    const points = routePath.length > 0 ? routePath : [route.origin, route.destination];
    points.forEach((point) => bounds.extend(point));
    bounds.extend(route.origin);
    bounds.extend(route.destination);

    if (currentLocation) {
      bounds.extend(currentLocation);
    }

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 64);
    }
  }, [currentLocation, route, routePath]);

  const fitMapBounds = useCallback(() => {
    if (!mapRef.current || !window.google) {
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    visibleHotspots.forEach((hotspot) => bounds.extend(hotspot.position));

    if (route) {
      bounds.extend(route.origin);
      bounds.extend(route.destination);
    }

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 56);
    }
  }, [route, visibleHotspots]);

  useEffect(() => {
    if (isLoaded) {
      if (route) {
        fitRouteBounds();
      } else {
        fitMapBounds();
      }
    }
  }, [fitMapBounds, fitRouteBounds, isLoaded, route]);

  useEffect(() => {
    if (selectedCity !== "All" && selectedHotspot?.city !== selectedCity) {
      setSelectedHotspot(visibleHotspots[0] ?? null);
    }
  }, [selectedCity, selectedHotspot?.city, visibleHotspots]);

  const centerOnUser = useCallback(() => {
    if (!mapRef.current || !currentLocation) {
      return;
    }

    mapRef.current.panTo(currentLocation);
    mapRef.current.setZoom(15);
  }, [currentLocation]);

  const centerOnDestination = useCallback(() => {
    if (!mapRef.current || !route) {
      return;
    }

    mapRef.current.panTo(route.destination);
    mapRef.current.setZoom(15);
  }, [route]);

  const handleRouteMetricsChange = useCallback(
    (metrics: RouteMapMetrics | null) => {
      onRouteMetricsChange?.(metrics);
    },
    [onRouteMetricsChange],
  );

  const handleRoutePathChange = useCallback((path: Coordinates[]) => {
    setRoutePath(path);
  }, []);

  if (!apiKey) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
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
      <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-900">
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
      <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-teal-100 bg-teal-50 p-5 text-sm font-medium text-teal-900">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading map...
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${compact ? "" : "xl:grid-cols-[minmax(0,1fr)_360px]"}`}>
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {cityOptions.map((city) => (
              <button
                className={`h-9 rounded-md px-3 text-sm font-semibold transition ${
                  selectedCity === city
                    ? "bg-teal-700 text-white"
                    : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                }`}
                key={city}
                onClick={() => setSelectedCity(city)}
                type="button"
              >
                {city}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600">
            <span className="h-3 w-3 rounded-full bg-red-600" />
            High
            <span className="h-3 w-3 rounded-full bg-orange-500" />
            Medium
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            Low
          </div>
        </div>

        <div className={`${compact ? "h-[420px]" : "h-[620px]"} relative overflow-hidden rounded-lg border border-stone-200 bg-stone-100 shadow-sm`}>
          {isHighRisk(route?.riskLevel) ? (
            <div className={`absolute left-4 right-4 z-10 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 shadow-sm ${showRouteControls ? "top-16" : "top-4"}`}>
              High route risk detected. Confirm the path, ask about detours, and move to a public area if needed.
            </div>
          ) : null}

          {showRouteControls && route ? (
            <div className="absolute left-3 right-3 top-3 z-10 flex flex-wrap gap-2 sm:left-auto">
              <MapControlButton icon={RouteIcon} onClick={fitRouteBounds}>
                Fit Route
              </MapControlButton>
              <MapControlButton icon={LocateFixed} onClick={centerOnUser}>
                Center on User
              </MapControlButton>
              <MapControlButton icon={Flag} onClick={centerOnDestination}>
                Center on Destination
              </MapControlButton>
            </div>
          ) : null}

          <GoogleMap
            center={selectedHotspot?.position ?? defaultCenter}
            mapContainerStyle={mapContainerStyle}
            onLoad={(map) => {
              mapRef.current = map;
              fitMapBounds();
            }}
            onUnmount={() => {
              mapRef.current = null;
            }}
            options={mapOptions}
            zoom={5}
          >
            <ScamHotspots
              hotspots={visibleHotspots}
              onSelectHotspot={setSelectedHotspot}
              selectedHotspot={selectedHotspot}
            />
            {route ? (
              <RouteLayer
                actualDistanceKm={actualDistanceKm}
                currentLocation={currentLocation}
                destination={route.destination}
                onMetricsChange={handleRouteMetricsChange}
                onPathChange={handleRoutePathChange}
                origin={route.origin}
                riskLevel={route.riskLevel}
                showDeviation={showDeviation}
              />
            ) : null}
            {currentLocation ? (
              <MarkerF
                icon={{
                  fillColor: "#0f766e",
                  fillOpacity: 1,
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  strokeColor: "#ffffff",
                  strokeWeight: 3,
                }}
                position={currentLocation}
                title="Current location"
                zIndex={20}
              />
            ) : null}
          </GoogleMap>
        </div>
      </section>

      {!compact ? (
        <aside className="grid content-start gap-4">
          <RiskPanel hotspot={selectedHotspot} />
          <AreaWarningLookup
            initialCity={selectedHotspot?.city}
            initialLocationName={selectedHotspot?.location_name}
          />
        </aside>
      ) : null}
    </div>
  );
}

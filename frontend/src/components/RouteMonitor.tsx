import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import {
  AlertTriangle,
  Clock3,
  Gauge,
  LocateFixed,
  MessageSquareText,
  Navigation,
  Percent,
  Route as RouteIcon,
  Ruler,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveRouteActivity } from "../services/activity";
import { ApiError, checkRoute } from "../services/api";
import { googleMapsLibraries } from "../services/googleMaps";
import type { Coordinates, RouteCheckResponse, RouteMapMetrics } from "../types/route";
import TouristMap from "./TouristMap";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  ResultGrid,
  ResultItem,
  RiskBadge,
} from "./ui";

const mockRoute = {
  originName: "Albert Hall Museum, Jaipur",
  origin: {
    lat: 26.9124,
    lng: 75.7873,
  },
  destinationName: "Hawa Mahal, Jaipur",
  destination: {
    lat: 26.9239,
    lng: 75.8267,
  },
};

type SearchFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onLoad: (autocomplete: google.maps.places.Autocomplete) => void;
  onPlaceChanged: () => void;
  placeholder: string;
  searchEnabled: boolean;
};

function SearchField({
  label,
  value,
  onChange,
  onLoad,
  onPlaceChanged,
  placeholder,
  searchEnabled,
}: SearchFieldProps) {
  const input = (
    <input
      className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-stone-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="text"
      value={value}
    />
  );

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-stone-800">
      {label}
      {searchEnabled ? (
        <Autocomplete
          onLoad={onLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            componentRestrictions: {
              country: "in",
            },
          }}
        >
          {input}
        </Autocomplete>
      ) : (
        input
      )}
    </label>
  );
}

function formatKm(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Pending";
  }

  return `${value.toFixed(2)} km`;
}

function RouteStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof RouteIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm font-semibold text-stone-800">
      <span>{label}</span>
      <input
        checked={checked}
        className="h-5 w-5 accent-teal-700"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

export default function RouteMonitor() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [originQuery, setOriginQuery] = useState(mockRoute.originName);
  const [destinationQuery, setDestinationQuery] = useState(mockRoute.destinationName);
  const [origin, setOrigin] = useState<Coordinates>(mockRoute.origin);
  const [destination, setDestination] = useState<Coordinates>(mockRoute.destination);
  const [actualDistanceKm, setActualDistanceKm] = useState("8.5");
  const [demoMode, setDemoMode] = useState(false);
  const [routeMetrics, setRouteMetrics] = useState<RouteMapMetrics | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates>(mockRoute.origin);
  const [displayedRoute, setDisplayedRoute] = useState<{
    origin: Coordinates;
    destination: Coordinates;
  }>({
    origin: mockRoute.origin,
    destination: mockRoute.destination,
  });
  const [result, setResult] = useState<RouteCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [liveLocationEnabled, setLiveLocationEnabled] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { isLoaded: isPlacesLoaded } = useJsApiLoader({
    id: "guardly-google-maps",
    googleMapsApiKey: apiKey || "",
    libraries: googleMapsLibraries,
  });

  const searchEnabled = Boolean(apiKey) && isPlacesLoaded;

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function applyGeolocationPosition(position: GeolocationPosition) {
    setCurrentLocation({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });
    setLiveLocationEnabled(true);
    setLocationError(null);
  }

  function getGeolocationErrorMessage(error: GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return "Location permission is blocked. Enable location for this site and try again.";
    }

    if (error.code === error.POSITION_UNAVAILABLE) {
      return "Browser location is unavailable right now. Using the selected start point until a live fix is available.";
    }

    if (error.code === error.TIMEOUT) {
      return "Browser location is taking too long. Using the selected start point while realtime tracking keeps trying.";
    }

    return "Unable to read realtime location. Using the selected start point while tracking keeps trying.";
  }

  function stopLiveLocation() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setLiveLocationEnabled(false);
    setLocationError(null);
  }

  function startLiveLocation() {
    if (!navigator.geolocation) {
      setLocationError("Realtime location is not available in this browser.");
      return;
    }

    if (!window.isSecureContext) {
      setLocationError("Realtime location needs localhost or HTTPS. Open the app on localhost or deploy over HTTPS.");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setLiveLocationEnabled(true);
    setLocationError("Waiting for browser location fix...");
    navigator.geolocation.getCurrentPosition(
      applyGeolocationPosition,
      (geolocationError) => {
        setCurrentLocation(origin);
        setLocationError(getGeolocationErrorMessage(geolocationError));
        if (geolocationError.code === geolocationError.PERMISSION_DENIED) {
          setLiveLocationEnabled(false);
        }
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 15_000,
      },
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      applyGeolocationPosition,
      (geolocationError) => {
        setCurrentLocation(origin);
        setLocationError(getGeolocationErrorMessage(geolocationError));
        if (geolocationError.code === geolocationError.PERMISSION_DENIED) {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          setLiveLocationEnabled(false);
        }
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30_000,
        timeout: 30_000,
      },
    );
  }

  function applySelectedPlace(
    autocomplete: google.maps.places.Autocomplete | null,
    updateQuery: (value: string) => void,
    updateCoordinates: (value: Coordinates) => void,
    routeKey: "origin" | "destination",
  ) {
    const place = autocomplete?.getPlace();
    const location = place?.geometry?.location;

    if (!place || !location) {
      setError(new Error("Select a place from the search suggestions before analyzing the route."));
      return;
    }

    updateQuery(place.formatted_address || place.name || "");
    const nextCoordinates = {
      lat: location.lat(),
      lng: location.lng(),
    };
    updateCoordinates(nextCoordinates);
    if (routeKey === "origin") {
      setCurrentLocation(nextCoordinates);
    }
    setDisplayedRoute((currentRoute) => ({
      ...currentRoute,
      [routeKey]: nextCoordinates,
    }));
    setRouteMetrics(null);
    setResult(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const nextRoute = {
        origin,
        destination,
      };
      const generatedDistanceKm = routeMetrics?.routeLengthKm;
      const submittedActualDistanceKm = demoMode ? Number(actualDistanceKm) : generatedDistanceKm;

      if (!submittedActualDistanceKm || Number.isNaN(submittedActualDistanceKm)) {
        throw new Error("Route length is still loading. Wait for the map route to render, then analyze again.");
      }

      setDisplayedRoute(nextRoute);

      const response = await checkRoute({
        ...nextRoute,
        actual_distance_km: submittedActualDistanceKm,
      });
      setResult(response);
      saveRouteActivity(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Unable to analyze route."));
    } finally {
      setIsLoading(false);
    }
  }

  const handleRouteMetricsChange = useCallback(
    (metrics: RouteMapMetrics | null) => {
      setRouteMetrics(metrics);
      if (!demoMode && metrics?.routeLengthKm) {
        setActualDistanceKm(metrics.routeLengthKm.toFixed(2));
      }
    },
    [demoMode],
  );

  const extraDistanceKm = result
    ? Math.max(0, result.actual_distance_km - result.expected_distance_km)
    : Math.max(0, Number(actualDistanceKm) - (routeMetrics?.routeLengthKm ?? Number(actualDistanceKm)));

  const currentDeviationDistanceKm = result
    ? extraDistanceKm
    : Math.max(0, Number(actualDistanceKm) - (routeMetrics?.routeLengthKm ?? Number(actualDistanceKm)));
  const effectiveDeviationDistanceKm = Math.max(
    currentDeviationDistanceKm,
    routeMetrics?.currentDeviationDistanceKm ?? 0,
  );
  const displayedMapRoute = useMemo(
    () => ({
      destination: displayedRoute.destination,
      origin: displayedRoute.origin,
      riskLevel: result?.risk_level,
    }),
    [displayedRoute.destination, displayedRoute.origin, result?.risk_level],
  );

  return (
    <div className="grid gap-5">
      <TouristMap
        actualDistanceKm={demoMode ? Number(actualDistanceKm) : routeMetrics?.routeLengthKm}
        compact
        currentLocation={currentLocation}
        onRouteMetricsChange={handleRouteMetricsChange}
        route={displayedMapRoute}
        showDeviation={Boolean(result?.route_deviation_detected) || effectiveDeviationDistanceKm > 0.08}
        showRouteControls
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RouteStat icon={RouteIcon} label="Route Length" value={formatKm(routeMetrics?.routeLengthKm)} />
        <RouteStat icon={Clock3} label="ETA" value={routeMetrics?.etaText ?? "Pending"} />
        <RouteStat icon={Navigation} label="Distance Remaining" value={formatKm(routeMetrics?.distanceRemainingKm)} />
        <RouteStat icon={Gauge} label="Current Deviation Distance" value={formatKm(effectiveDeviationDistanceKm)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Panel>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <SearchField
                label="Starting Point"
                onChange={setOriginQuery}
                onLoad={(autocomplete) => {
                  originAutocompleteRef.current = autocomplete;
                }}
                onPlaceChanged={() =>
                  applySelectedPlace(originAutocompleteRef.current, setOriginQuery, setOrigin, "origin")
                }
                placeholder="Search starting point"
                searchEnabled={searchEnabled}
                value={originQuery}
              />
              <SearchField
                label="Destination Point"
                onChange={setDestinationQuery}
                onLoad={(autocomplete) => {
                  destinationAutocompleteRef.current = autocomplete;
                }}
                onPlaceChanged={() =>
                  applySelectedPlace(
                    destinationAutocompleteRef.current,
                    setDestinationQuery,
                    setDestination,
                    "destination",
                  )
                }
                placeholder="Search destination"
                searchEnabled={searchEnabled}
                value={destinationQuery}
              />
              {!apiKey ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Set VITE_GOOGLE_MAPS_API_KEY to enable place search. The demo route defaults are still ready to analyze.
                </div>
              ) : null}
              <div className="grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600 md:grid-cols-2">
                <div>
                  <span className="font-semibold uppercase text-stone-500">Selected start</span>
                  <p className="mt-1 text-stone-800">{origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}</p>
                </div>
                <div>
                  <span className="font-semibold uppercase text-stone-500">Selected destination</span>
                  <p className="mt-1 text-stone-800">{destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}</p>
                </div>
              </div>
            </div>

            <Toggle checked={demoMode} label="Demo Mode" onChange={setDemoMode} />

            <div className="grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    Realtime Location {liveLocationEnabled ? "On" : "Off"}
                  </p>
                  <p className="text-xs text-stone-600">
                    Updates the current marker and reroute deviation while the trip is moving.
                  </p>
                </div>
                <button
                  className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold shadow-sm transition ${
                    liveLocationEnabled
                      ? "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                      : "bg-teal-700 text-white hover:bg-teal-800"
                  }`}
                  onClick={liveLocationEnabled ? stopLiveLocation : startLiveLocation}
                  type="button"
                >
                  <LocateFixed className="h-4 w-4" />
                  {liveLocationEnabled ? "Stop Live Location" : "Start Live Location"}
                </button>
              </div>
              {locationError ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {locationError}
                </p>
              ) : null}
            </div>

            {demoMode ? (
              <Field
                label="Manual Distance Override"
                min={0}
                onChange={setActualDistanceKm}
                placeholder="8.5"
                step={0.01}
                type="number"
                value={actualDistanceKm}
              />
            ) : null}

            <ActionButton disabled={isLoading}>Analyze Route</ActionButton>
          </form>
        </Panel>

        <Panel>
          <div className="grid gap-4">
            {isLoading ? <LoadingState label="Analyzing route deviation..." /> : null}
            {error ? (
              <ErrorState
                details={error instanceof ApiError ? error.details : undefined}
                message={error.message}
              />
            ) : null}
            {!isLoading && !error && !result ? (
              <EmptyState>Submit the selected route to calculate deviation risk.</EmptyState>
            ) : null}
            {result ? (
              <>
                <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-stone-950">Route Analysis</h2>
                      <p className="text-sm text-stone-600">Optimal route compared with actual travel distance.</p>
                    </div>
                    <RiskBadge value={result.risk_level} />
                  </div>
                  <ResultGrid>
                    <ResultItem
                      icon={RouteIcon}
                      label="Optimal Distance"
                      value={`${result.expected_distance_km.toFixed(2)} km`}
                    />
                    <ResultItem
                      icon={Navigation}
                      label="Actual Distance"
                      value={`${result.actual_distance_km.toFixed(2)} km`}
                    />
                    <ResultItem
                      icon={Ruler}
                      label="Extra Distance"
                      value={`${extraDistanceKm.toFixed(2)} km`}
                    />
                    <ResultItem icon={AlertTriangle} label="Risk Level" value={<RiskBadge value={result.risk_level} />} />
                    <ResultItem icon={Gauge} label="Traffic Level" value={result.traffic_level} />
                    <ResultItem
                      icon={Clock3}
                      label="Traffic Delay"
                      value={`${result.traffic_delay_minutes} min`}
                    />
                    <ResultItem
                      icon={AlertTriangle}
                      label="Traffic Adjustment"
                      value={result.traffic_adjustment_applied ? "Applied" : "Not applied"}
                    />
                  </ResultGrid>
                </div>
                <ResultGrid>
                  <ResultItem
                    icon={Percent}
                    label="Deviation Percentage"
                    value={`${result.deviation_percentage.toFixed(1)}%`}
                  />
                  <ResultItem icon={AlertTriangle} label="Risk Level" value={<RiskBadge value={result.risk_level} />} />
                  <ResultItem
                    icon={AlertTriangle}
                    label="Route Deviation Detected"
                    value={result.route_deviation_detected ? "Yes" : "No"}
                  />
                </ResultGrid>
                <ResultItem icon={MessageSquareText} label="Message" value={result.message} />
              </>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

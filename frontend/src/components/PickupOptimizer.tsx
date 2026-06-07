import { Autocomplete, GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { CarFront, LocateFixed, MapPin, Navigation, ShieldCheck, Star, Waypoints } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, optimizePickup } from "../services/api";
import { googleMapsLibraries } from "../services/googleMaps";
import type { Coordinates } from "../types/route";
import type { PickupCandidate, PickupOptimizeResponse } from "../types/pickup";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  LoadingState,
  ResultGrid,
  ResultItem,
} from "./ui";

const jaipurRailwayStation = {
  lat: 26.9196,
  lng: 75.7885,
};

const hawaMahal = {
  lat: 26.9239,
  lng: 75.8267,
};

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

function getCandidateIcon(candidate: PickupCandidate, recommendedId?: string): google.maps.Symbol {
  const recommended = candidate.id === recommendedId;

  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: recommended ? "#0f766e" : "#2563eb",
    fillOpacity: 0.95,
    scale: recommended ? 10 : 7,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

function scoreTone(score: number) {
  if (score >= 80) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (score >= 60) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-red-100 text-red-800";
}

type PickupMapProps = {
  currentLocation: Coordinates;
  destinationLocation: Coordinates;
  result: PickupOptimizeResponse | null;
};

function PickupMap({ currentLocation, destinationLocation, result }: PickupMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const recommendedCandidate = result?.candidates.find(
    (candidate) =>
      candidate.location.lat === result.recommended_location.lat &&
      candidate.location.lng === result.recommended_location.lng,
  );
  const center = useMemo(
    () => result?.optimization_location ?? currentLocation,
    [currentLocation, result?.optimization_location],
  );
  const { isLoaded, loadError } = useJsApiLoader({
    id: "guardly-google-maps",
    googleMapsApiKey: apiKey || "",
    libraries: googleMapsLibraries,
  });

  if (!apiKey) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Set VITE_GOOGLE_MAPS_API_KEY to view pickup candidates on the map.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-900">
        Google Maps failed to load. Candidate scoring is still available below.
      </div>
    );
  }

  if (!isLoaded) {
    return <LoadingState label="Loading pickup map..." />;
  }

  return (
    <div className="h-[420px] overflow-hidden rounded-lg border border-stone-200 bg-stone-100 shadow-sm">
      <GoogleMap
        center={center}
        mapContainerStyle={mapContainerStyle}
        options={{
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
        }}
        zoom={16}
      >
        <MarkerF label="You" position={currentLocation} title="Current location" />
        <MarkerF label="Dest" position={destinationLocation} title="Destination" />
        {result ? <MarkerF label="Target" position={result.optimization_location} title="Optimization target" /> : null}
        {(result?.candidates ?? []).map((candidate) => (
          <MarkerF
            icon={getCandidateIcon(candidate, recommendedCandidate?.id)}
            key={candidate.id}
            label={candidate.id === recommendedCandidate?.id ? "Best" : undefined}
            position={candidate.location}
            title={`${candidate.name}: ${candidate.pickup_score}`}
          />
        ))}
        <PolylineF
          options={{
            strokeColor: "#94a3b8",
            strokeOpacity: 0.75,
            strokeWeight: 3,
          }}
          path={[currentLocation, destinationLocation]}
        />
        {result && recommendedCandidate ? (
          <PolylineF
            options={{
              strokeColor: "#0f766e",
              strokeOpacity: 0.9,
              strokeWeight: 5,
            }}
            path={[result.optimization_location, recommendedCandidate.location]}
          />
        ) : null}
      </GoogleMap>
    </div>
  );
}

export default function PickupOptimizer() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const currentPlaceAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates>(jaipurRailwayStation);
  const [destinationLocation, setDestinationLocation] = useState<Coordinates>(hawaMahal);
  const [currentPlaceQuery, setCurrentPlaceQuery] = useState("Jaipur Railway Station");
  const [destinationQuery, setDestinationQuery] = useState("Hawa Mahal, Jaipur");
  const [realtimeLocationEnabled, setRealtimeLocationEnabled] = useState(false);
  const [result, setResult] = useState<PickupOptimizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const { isLoaded: isPlacesLoaded } = useJsApiLoader({
    id: "guardly-google-maps",
    googleMapsApiKey: apiKey || "",
    libraries: googleMapsLibraries,
  });

  const currentPointSearchEnabled = Boolean(apiKey) && isPlacesLoaded;

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
    setCurrentPlaceQuery("Realtime current location");
    setRealtimeLocationEnabled(true);
    setError(null);
  }

  function applyCurrentPointSearch() {
    const place = currentPlaceAutocompleteRef.current?.getPlace();
    const location = place?.geometry?.location;

    if (!place || !location) {
      setError(new Error("Select a current point from the map search suggestions."));
      return;
    }

    setCurrentPlaceQuery(place.formatted_address || place.name || "");
    setCurrentLocation({
      lat: location.lat(),
      lng: location.lng(),
    });
    setError(null);
  }

  function applyDestinationSearch() {
    const place = destinationAutocompleteRef.current?.getPlace();
    const location = place?.geometry?.location;

    if (!place || !location) {
      setError(new Error("Select a destination from the map search suggestions."));
      return;
    }

    setDestinationQuery(place.formatted_address || place.name || "");
    setDestinationLocation({
      lat: location.lat(),
      lng: location.lng(),
    });
    setError(null);
  }

  function stopRealtimeLocation() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setRealtimeLocationEnabled(false);
  }

  function startRealtimeLocation() {
    if (!navigator.geolocation) {
      setError(new Error("Current location is not available in this browser."));
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setRealtimeLocationEnabled(true);
    navigator.geolocation.getCurrentPosition(
      applyGeolocationPosition,
      () => {
        setError(new Error("Waiting for realtime location. If this continues, check browser location permissions."));
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 15_000,
      },
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      applyGeolocationPosition,
      () => {
        setError(new Error("Realtime location is unavailable right now. Search the current point on Maps instead."));
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30_000,
        timeout: 30_000,
      },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await optimizePickup({
        current_location: currentLocation,
        destination_location: destinationLocation,
        optimize_for: "current_location",
      });
      setResult(response);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught : new Error("Unable to optimize pickup."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CarFront className="h-5 w-5 text-teal-700" />
          <h2 className="text-xl font-semibold text-stone-950">Smart Fare Optimization</h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
          Finds nearby pickup points that may reduce ride-hailing friction around crowded tourist zones.
          Provider fare APIs are not used.
        </p>
      </section>

      <PickupMap
        currentLocation={currentLocation}
        destinationLocation={destinationLocation}
        result={result}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-900">Current location</p>
                  <p className="text-xs text-stone-600">Use realtime location or search the current point on Maps.</p>
                </div>
                <button
                  className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold shadow-sm transition ${
                    realtimeLocationEnabled
                      ? "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                      : "bg-teal-700 text-white hover:bg-teal-800"
                  }`}
                  onClick={realtimeLocationEnabled ? stopRealtimeLocation : startRealtimeLocation}
                  type="button"
                >
                  <LocateFixed className="h-4 w-4" />
                  {realtimeLocationEnabled ? "Stop Realtime" : "Use Realtime Location"}
                </button>
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-800">
                Search Current Point
                {currentPointSearchEnabled ? (
                  <Autocomplete
                    onLoad={(autocomplete) => {
                      currentPlaceAutocompleteRef.current = autocomplete;
                    }}
                    onPlaceChanged={applyCurrentPointSearch}
                    options={{
                      componentRestrictions: {
                        country: "in",
                      },
                    }}
                  >
                    <input
                      className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-stone-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                      onChange={(event) => setCurrentPlaceQuery(event.target.value)}
                      placeholder="Search current point"
                      type="text"
                      value={currentPlaceQuery}
                    />
                  </Autocomplete>
                ) : (
                  <input
                    className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-stone-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                    onChange={(event) => setCurrentPlaceQuery(event.target.value)}
                    placeholder="Set VITE_GOOGLE_MAPS_API_KEY to search current point"
                    type="text"
                    value={currentPlaceQuery}
                  />
                )}
              </label>
              <div className="rounded-md border border-stone-200 bg-white p-3 text-xs text-stone-600">
                <span className="font-semibold uppercase text-stone-500">Selected current point</span>
                <p className="mt-1 text-stone-800">
                  {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-stone-800">
                Destination
                {currentPointSearchEnabled ? (
                  <Autocomplete
                    onLoad={(autocomplete) => {
                      destinationAutocompleteRef.current = autocomplete;
                    }}
                    onPlaceChanged={applyDestinationSearch}
                    options={{
                      componentRestrictions: {
                        country: "in",
                      },
                    }}
                  >
                    <input
                      className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-stone-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                      onChange={(event) => setDestinationQuery(event.target.value)}
                      placeholder="Search destination"
                      type="text"
                      value={destinationQuery}
                    />
                  </Autocomplete>
                ) : (
                  <input
                    className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-stone-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                    onChange={(event) => setDestinationQuery(event.target.value)}
                    placeholder="Set VITE_GOOGLE_MAPS_API_KEY to search destination"
                    type="text"
                    value={destinationQuery}
                  />
                )}
              </label>
              <div className="rounded-md border border-stone-200 bg-white p-3 text-xs text-stone-600">
                <span className="font-semibold uppercase text-stone-500">Selected destination</span>
                <p className="mt-1 text-stone-800">
                  {destinationLocation.lat.toFixed(4)}, {destinationLocation.lng.toFixed(4)}
                </p>
              </div>
            </div>
            <ActionButton disabled={isLoading}>
              <Waypoints className="h-4 w-4" />
              Optimize Pickup
            </ActionButton>
          </form>

          <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
            Use the Jaipur defaults for a reliable demo. Recommendations are generated near the current point, with the
            destination shown on the map for trip context.
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          {isLoading ? <LoadingState label="Generating pickup candidates..." /> : null}
          {error ? (
            <ErrorState
              details={error instanceof ApiError ? error.details : undefined}
              message={error.message}
            />
          ) : null}
          {!isLoading && !error && !result ? (
            <EmptyState>Submit your current GPS location to generate nearby pickup options.</EmptyState>
          ) : null}
          {result ? (
            <>
              <ResultGrid>
                <ResultItem icon={Star} label="Best Pickup" value={result.best_pickup_location} />
                <ResultItem
                  icon={Navigation}
                  label="Walking Distance"
                  value={`${result.walking_distance_m} m`}
                />
                <ResultItem
                  icon={ShieldCheck}
                  label="Pickup Score"
                  value={
                    <span className={`rounded-full px-3 py-1 text-base font-bold ${scoreTone(result.pickup_score)}`}>
                      {result.pickup_score}/100
                    </span>
                  }
                />
                <ResultItem icon={MapPin} label="Reason" value={result.reason} />
              </ResultGrid>
              <div className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-900">
                Ride-provider fare data used: {result.provider_fare_data_used ? "Yes" : "No"}
              </div>
            </>
          ) : null}
        </section>
      </div>

      {result ? (
        <section className="grid gap-3">
          {result.candidates.map((candidate, index) => (
            <article
              className={`rounded-lg border bg-white p-4 shadow-sm ${
                index === 0 ? "border-teal-300" : "border-stone-200"
              }`}
              key={candidate.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-stone-950">{candidate.name}</h3>
                    {index === 0 ? (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-stone-600">{candidate.reason}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${scoreTone(candidate.pickup_score)}`}>
                  {candidate.pickup_score}/100
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-md bg-stone-50 p-3">
                  <p className="text-xs font-semibold uppercase text-stone-500">Walk</p>
                  <p className="mt-1 font-bold text-stone-950">{candidate.walking_distance_m} m</p>
                </div>
                <div className="rounded-md bg-stone-50 p-3">
                  <p className="text-xs font-semibold uppercase text-stone-500">Road Access</p>
                  <p className="mt-1 font-bold text-stone-950">
                    {candidate.score_breakdown.road_accessibility}
                  </p>
                </div>
                <div className="rounded-md bg-stone-50 p-3">
                  <p className="text-xs font-semibold uppercase text-stone-500">Congestion</p>
                  <p className="mt-1 font-bold text-stone-950">
                    {candidate.score_breakdown.traffic_congestion}
                  </p>
                </div>
                <div className="rounded-md bg-stone-50 p-3">
                  <p className="text-xs font-semibold uppercase text-stone-500">Source</p>
                  <p className="mt-1 font-bold text-stone-950">{candidate.data_source}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

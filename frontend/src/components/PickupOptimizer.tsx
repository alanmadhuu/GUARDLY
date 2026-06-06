import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { CarFront, MapPin, Navigation, ShieldCheck, Star, Waypoints } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { ApiError, optimizePickup } from "../services/api";
import type { PickupCandidate, PickupOptimizeResponse } from "../types/pickup";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  ResultGrid,
  ResultItem,
} from "./ui";

const jaipurRailwayStation = {
  lat: 26.9196,
  lng: 75.7885,
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

function PickupMap({ result }: { result: PickupOptimizeResponse }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const recommendedCandidate = result.candidates.find(
    (candidate) =>
      candidate.location.lat === result.recommended_location.lat &&
      candidate.location.lng === result.recommended_location.lng,
  );
  const center = useMemo(() => result.current_location, [result.current_location]);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "tourist-shield-google-maps",
    googleMapsApiKey: apiKey || "",
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
        <MarkerF label="You" position={result.current_location} title="Current location" />
        {result.candidates.map((candidate) => (
          <MarkerF
            icon={getCandidateIcon(candidate, recommendedCandidate?.id)}
            key={candidate.id}
            label={candidate.id === recommendedCandidate?.id ? "Best" : undefined}
            position={candidate.location}
            title={`${candidate.name}: ${candidate.pickup_score}`}
          />
        ))}
        {recommendedCandidate ? (
          <PolylineF
            options={{
              strokeColor: "#0f766e",
              strokeOpacity: 0.9,
              strokeWeight: 5,
            }}
            path={[result.current_location, recommendedCandidate.location]}
          />
        ) : null}
      </GoogleMap>
    </div>
  );
}

export default function PickupOptimizer() {
  const [lat, setLat] = useState(String(jaipurRailwayStation.lat));
  const [lng, setLng] = useState(String(jaipurRailwayStation.lng));
  const [result, setResult] = useState<PickupOptimizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await optimizePickup({
        current_location: {
          lat: Number(lat),
          lng: Number(lng),
        },
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Current Latitude"
                onChange={setLat}
                step={0.0001}
                type="number"
                value={lat}
              />
              <Field
                label="Current Longitude"
                onChange={setLng}
                step={0.0001}
                type="number"
                value={lng}
              />
            </div>
            <ActionButton disabled={isLoading}>
              <Waypoints className="h-4 w-4" />
              Optimize Pickup
            </ActionButton>
          </form>

          <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
            Use the Jaipur Railway Station sample for a reliable demo, or paste live GPS
            coordinates from a phone.
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

      {result ? <PickupMap result={result} /> : null}

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

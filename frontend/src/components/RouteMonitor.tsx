import { AlertTriangle, MapPinned, MessageSquareText, Navigation, Percent } from "lucide-react";
import { FormEvent, useState } from "react";
import { saveRouteActivity } from "../services/activity";
import { ApiError, checkRoute } from "../services/api";
import type { RouteCheckResponse } from "../types/route";
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
  origin: {
    lat: 26.9124,
    lng: 75.7873,
  },
  destination: {
    lat: 26.9239,
    lng: 75.8267,
  },
};

export default function RouteMonitor() {
  const [originLat, setOriginLat] = useState(String(mockRoute.origin.lat));
  const [originLng, setOriginLng] = useState(String(mockRoute.origin.lng));
  const [destinationLat, setDestinationLat] = useState(String(mockRoute.destination.lat));
  const [destinationLng, setDestinationLng] = useState(String(mockRoute.destination.lng));
  const [actualDistanceKm, setActualDistanceKm] = useState("8.5");
  const [displayedRoute, setDisplayedRoute] = useState(mockRoute);
  const [result, setResult] = useState<RouteCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const nextRoute = {
        origin: {
          lat: Number(originLat),
          lng: Number(originLng),
        },
        destination: {
          lat: Number(destinationLat),
          lng: Number(destinationLng),
        },
      };

      setDisplayedRoute(nextRoute);

      const response = await checkRoute({
        ...nextRoute,
        actual_distance_km: Number(actualDistanceKm),
      });
      setResult(response);
      saveRouteActivity(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Unable to analyze route."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <TouristMap
        compact
        route={{
          destination: displayedRoute.destination,
          origin: displayedRoute.origin,
          riskLevel: result?.risk_level,
        }}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Panel>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Origin Latitude"
                onChange={setOriginLat}
                placeholder="26.9124"
                step={0.0001}
                type="number"
                value={originLat}
              />
              <Field
                label="Origin Longitude"
                onChange={setOriginLng}
                placeholder="75.7873"
                step={0.0001}
                type="number"
                value={originLng}
              />
              <Field
                label="Destination Latitude"
                onChange={setDestinationLat}
                placeholder="26.9239"
                step={0.0001}
                type="number"
                value={destinationLat}
              />
              <Field
                label="Destination Longitude"
                onChange={setDestinationLng}
                placeholder="75.8267"
                step={0.0001}
                type="number"
                value={destinationLng}
              />
            </div>
            <Field
              label="Actual Distance Travelled"
              min={0}
              onChange={setActualDistanceKm}
              placeholder="8.5"
              step={0.01}
              type="number"
              value={actualDistanceKm}
            />
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
              <EmptyState>Submit origin, destination, and travelled distance to flag route deviation.</EmptyState>
            ) : null}
            {result ? (
              <>
                <ResultGrid>
                  <ResultItem
                    icon={MapPinned}
                    label="Expected Distance"
                    value={`${result.expected_distance_km.toFixed(2)} km`}
                  />
                  <ResultItem
                    icon={Navigation}
                    label="Actual Distance"
                    value={`${result.actual_distance_km.toFixed(2)} km`}
                  />
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

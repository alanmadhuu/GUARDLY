import { DirectionsRenderer, MarkerF, PolylineF } from "@react-google-maps/api";
import { useEffect, useState } from "react";
import type { Coordinates, RouteMapMetrics } from "../types/route";

type RouteLayerProps = {
  origin: Coordinates;
  destination: Coordinates;
  currentLocation?: Coordinates;
  showDeviation?: boolean;
  actualDistanceKm?: number;
  onMetricsChange?: (metrics: RouteMapMetrics | null) => void;
  onPathChange?: (path: Coordinates[]) => void;
  riskLevel?: string;
};

function metersToKm(meters?: number) {
  return meters ? meters / 1000 : 0;
}

function secondsToMinutes(seconds?: number) {
  return seconds ? Math.max(1, Math.round(seconds / 60)) : 0;
}

function toCoordinates(point: google.maps.LatLng): Coordinates {
  return {
    lat: point.lat(),
    lng: point.lng(),
  };
}

function distanceMeters(first: Coordinates, second: Coordinates) {
  const earthRadiusM = 6_371_000;
  const lat1 = first.lat * Math.PI / 180;
  const lat2 = second.lat * Math.PI / 180;
  const deltaLat = (second.lat - first.lat) * Math.PI / 180;
  const deltaLng = (second.lng - first.lng) * Math.PI / 180;
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function distanceToSegmentMeters(point: Coordinates, start: Coordinates, end: Coordinates) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos((point.lat * Math.PI) / 180);
  const startX = (start.lng - point.lng) * metersPerDegreeLng;
  const startY = (start.lat - point.lat) * metersPerDegreeLat;
  const endX = (end.lng - point.lng) * metersPerDegreeLng;
  const endY = (end.lat - point.lat) * metersPerDegreeLat;
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;

  if (segmentLengthSquared === 0) {
    return distanceMeters(point, start);
  }

  const projection = Math.max(0, Math.min(1, -(startX * segmentX + startY * segmentY) / segmentLengthSquared));
  const nearestX = startX + projection * segmentX;
  const nearestY = startY + projection * segmentY;

  return Math.sqrt(nearestX ** 2 + nearestY ** 2);
}

function distanceToPathKm(point: Coordinates | undefined, path: Coordinates[]) {
  if (!point || path.length < 2) {
    return 0;
  }

  let nearestMeters = Number.POSITIVE_INFINITY;
  for (let index = 0; index < path.length - 1; index += 1) {
    nearestMeters = Math.min(nearestMeters, distanceToSegmentMeters(point, path[index], path[index + 1]));
  }

  return nearestMeters === Number.POSITIVE_INFINITY ? 0 : nearestMeters / 1000;
}

function getTrafficDuration(leg?: google.maps.DirectionsLeg) {
  return (leg as google.maps.DirectionsLeg & { duration_in_traffic?: google.maps.Distance }).duration_in_traffic;
}

function buildDeviatedPath(
  path: Coordinates[],
  origin: Coordinates,
  destination: Coordinates,
  currentLocation?: Coordinates,
) {
  if (currentLocation) {
    return [origin, currentLocation, destination];
  }

  if (path.length < 3) {
    const midpoint = {
      lat: (origin.lat + destination.lat) / 2 + 0.018,
      lng: (origin.lng + destination.lng) / 2 - 0.018,
    };
    return [origin, midpoint, destination];
  }

  const midpointIndex = Math.floor(path.length / 2);
  const midpoint = path[midpointIndex];
  const offsetPoint = {
    lat: midpoint.lat + 0.018,
    lng: midpoint.lng - 0.018,
  };

  return [origin, ...path.slice(1, midpointIndex), offsetPoint, ...path.slice(midpointIndex + 1, -1), destination];
}

export default function RouteLayer({
  actualDistanceKm,
  currentLocation,
  destination,
  onMetricsChange,
  onPathChange,
  origin,
  showDeviation,
}: RouteLayerProps) {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsFailed, setDirectionsFailed] = useState(false);
  const [optimalPath, setOptimalPath] = useState<Coordinates[]>([]);
  const [remainingDistanceKm, setRemainingDistanceKm] = useState(0);

  useEffect(() => {
    if (!window.google) {
      setDirections(null);
      setDirectionsFailed(true);
      onMetricsChange?.(null);
      onPathChange?.([]);
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    setDirections(null);
    setDirectionsFailed(false);
    setOptimalPath([]);
    onMetricsChange?.(null);
    onPathChange?.([]);

    directionsService.route(
      {
        destination,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
        },
        origin,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          const leg = result.routes[0]?.legs[0];
          const trafficDuration = getTrafficDuration(leg);
          const routePath = result.routes[0]?.overview_path?.map(toCoordinates) ?? [];
          const routeLengthKm = metersToKm(leg?.distance?.value);
          const distanceRemainingKm = currentLocation
            ? metersToKm(leg?.distance?.value)
            : routeLengthKm;
          const effectiveActualDistanceKm = actualDistanceKm ?? routeLengthKm;
          const currentDeviationDistanceKm = Math.max(
            0,
            effectiveActualDistanceKm - routeLengthKm,
            distanceToPathKm(currentLocation, routePath),
          );

          setDirections(result);
          setDirectionsFailed(false);
          setOptimalPath(routePath);
          onPathChange?.(routePath);
          setRemainingDistanceKm(distanceRemainingKm);
          onMetricsChange?.({
            currentDeviationDistanceKm,
            distanceRemainingKm,
            etaMinutes: secondsToMinutes(trafficDuration?.value ?? leg?.duration?.value),
            etaText: trafficDuration?.text ?? leg?.duration?.text ?? "Unavailable",
            routeLengthKm,
          });
          return;
        }

        setDirections(null);
        setDirectionsFailed(true);
        onMetricsChange?.(null);
        onPathChange?.([]);
      },
    );
  }, [destination, onMetricsChange, onPathChange, origin]);

  useEffect(() => {
    if (!window.google || !currentLocation) {
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        destination,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
        },
        origin: currentLocation,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          const leg = result.routes[0]?.legs[0];
          setRemainingDistanceKm(metersToKm(leg?.distance?.value));
        }
      },
    );
  }, [currentLocation, destination]);

  useEffect(() => {
    if (!directions) {
      return;
    }

    const leg = directions.routes[0]?.legs[0];
    const trafficDuration = getTrafficDuration(leg);
    const routePath = directions.routes[0]?.overview_path?.map(toCoordinates) ?? optimalPath;
    const routeLengthKm = metersToKm(leg?.distance?.value);
    const effectiveActualDistanceKm = actualDistanceKm ?? routeLengthKm;
    onMetricsChange?.({
      currentDeviationDistanceKm: Math.max(
        0,
        effectiveActualDistanceKm - routeLengthKm,
        distanceToPathKm(currentLocation, routePath),
      ),
      distanceRemainingKm: remainingDistanceKm || routeLengthKm,
      etaMinutes: secondsToMinutes(trafficDuration?.value ?? leg?.duration?.value),
      etaText: trafficDuration?.text ?? leg?.duration?.text ?? "Unavailable",
      routeLengthKm,
    });
  }, [actualDistanceKm, currentLocation, directions, onMetricsChange, optimalPath, remainingDistanceKm]);

  const deviatedPath = showDeviation ? buildDeviatedPath(optimalPath, origin, destination, currentLocation) : [];

  if (directions) {
    return (
      <>
        <DirectionsRenderer
          directions={directions}
          options={{
            polylineOptions: {
              strokeColor: "#2563eb",
              strokeOpacity: 0.9,
              strokeWeight: 5,
            },
            preserveViewport: true,
            suppressMarkers: true,
          }}
        />
        {showDeviation ? (
          <PolylineF
            options={{
              strokeColor: "#dc2626",
              strokeOpacity: 0.9,
              strokeWeight: 5,
            }}
            path={deviatedPath}
          />
        ) : null}
        <MarkerF label="A" position={origin} title="Starting point" />
        <MarkerF label="B" position={destination} title="Destination" />
      </>
    );
  }

  return (
    <>
      <MarkerF label="A" position={origin} title="Origin" />
      <MarkerF label="B" position={destination} title="Destination" />
      {directionsFailed ? (
        <PolylineF
          options={{
            strokeColor: "#2563eb",
            strokeOpacity: 0.65,
            strokeWeight: 5,
          }}
          path={[origin, destination]}
        />
      ) : null}
    </>
  );
}

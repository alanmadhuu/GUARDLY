export type Coordinates = {
  lat: number;
  lng: number;
};

export type RouteCheckRequest = {
  origin: Coordinates;
  destination: Coordinates;
  actual_distance_km: number;
};

export type RouteCheckResponse = {
  expected_distance_km: number;
  actual_distance_km: number;
  deviation_percentage: number;
  risk_level: string;
  route_deviation_detected: boolean;
  message: string;
  traffic_level: string;
  traffic_delay_minutes: number;
  traffic_adjustment_applied: boolean;
};

export type RouteMapMetrics = {
  routeLengthKm: number;
  etaText: string;
  etaMinutes: number;
  distanceRemainingKm: number;
  currentDeviationDistanceKm: number;
};

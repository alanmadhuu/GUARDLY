import type { Coordinates } from "./route";

export type PickupOptimizeRequest = {
  current_location: Coordinates;
};

export type PickupScoreBreakdown = {
  road_accessibility: number;
  traffic_congestion: number;
  tourist_hotspot_density: number;
  pickup_convenience: number;
};

export type PickupCandidate = {
  id: string;
  name: string;
  location: Coordinates;
  walking_distance_m: number;
  radius_m: number;
  pickup_score: number;
  score_breakdown: PickupScoreBreakdown;
  reason: string;
  data_source: string;
};

export type PickupOptimizeResponse = {
  best_pickup_location: string;
  walking_distance_m: number;
  pickup_score: number;
  reason: string;
  current_location: Coordinates;
  recommended_location: Coordinates;
  candidates: PickupCandidate[];
  provider_fare_data_used: boolean;
};

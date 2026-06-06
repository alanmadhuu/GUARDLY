import rawScamHotspots from "./scam_spots.json";

export type HotspotRiskLevel = "HIGH" | "MEDIUM" | "LOW";

export type ScamHotspot = {
  id: string;
  city: string;
  location_name: string;
  scam_type: string;
  risk_level: HotspotRiskLevel;
  warning_message: string;
  position: {
    lat: number;
    lng: number;
  };
};

export const scamHotspots = rawScamHotspots as ScamHotspot[];

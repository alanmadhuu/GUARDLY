import { MarkerF, PolylineF } from "@react-google-maps/api";
import type { Coordinates } from "../types/route";

type RouteLayerProps = {
  origin: Coordinates;
  destination: Coordinates;
  riskLevel?: string;
};

function isHighRisk(riskLevel?: string) {
  return riskLevel?.toUpperCase() === "HIGH";
}

export default function RouteLayer({ origin, destination, riskLevel }: RouteLayerProps) {
  const highRisk = isHighRisk(riskLevel);

  return (
    <>
      <MarkerF label="A" position={origin} title="Origin" />
      <MarkerF label="B" position={destination} title="Destination" />
      <PolylineF
        options={{
          strokeColor: highRisk ? "#dc2626" : "#0f766e",
          strokeOpacity: 0.9,
          strokeWeight: highRisk ? 6 : 5,
        }}
        path={[origin, destination]}
      />
    </>
  );
}

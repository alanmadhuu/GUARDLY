import { InfoWindowF, MarkerF } from "@react-google-maps/api";
import { useMemo, useState } from "react";
import type { ScamHotspot } from "../data/scam_spots";

type ScamHotspotsProps = {
  hotspots: ScamHotspot[];
  selectedHotspot: ScamHotspot | null;
  onSelectHotspot: (hotspot: ScamHotspot) => void;
};

const riskColors = {
  HIGH: "#dc2626",
  MEDIUM: "#f97316",
  LOW: "#eab308",
};

function getMarkerIcon(riskLevel: ScamHotspot["risk_level"]): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: riskColors[riskLevel],
    fillOpacity: 0.95,
    scale: riskLevel === "HIGH" ? 9 : 7,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

export default function ScamHotspots({
  hotspots,
  selectedHotspot,
  onSelectHotspot,
}: ScamHotspotsProps) {
  const [openHotspotId, setOpenHotspotId] = useState<string | null>(selectedHotspot?.id ?? null);
  const selectedMarker = useMemo(
    () => hotspots.find((hotspot) => hotspot.id === openHotspotId) ?? null,
    [hotspots, openHotspotId],
  );

  return (
    <>
      {hotspots.map((hotspot) => (
        <MarkerF
          icon={getMarkerIcon(hotspot.risk_level)}
          key={hotspot.id}
          onClick={() => {
            setOpenHotspotId(hotspot.id);
            onSelectHotspot(hotspot);
          }}
          position={hotspot.position}
          title={`${hotspot.location_name}: ${hotspot.scam_type}`}
          zIndex={hotspot.risk_level === "HIGH" ? 3 : 2}
        />
      ))}

      {selectedMarker ? (
        <InfoWindowF
          onCloseClick={() => setOpenHotspotId(null)}
          position={selectedMarker.position}
        >
          <div className="max-w-[240px] text-sm text-stone-800">
            <p className="font-semibold text-stone-950">{selectedMarker.location_name}</p>
            <p className="mt-1">{selectedMarker.scam_type}</p>
            <p className="mt-2 text-xs font-semibold uppercase text-stone-500">
              {selectedMarker.risk_level} risk
            </p>
            <p className="mt-2 text-xs leading-5">{selectedMarker.warning_message}</p>
          </div>
        </InfoWindowF>
      ) : null}
    </>
  );
}

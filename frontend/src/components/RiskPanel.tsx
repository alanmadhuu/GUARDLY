import { AlertTriangle, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { ScamHotspot } from "../data/scam_spots";
import { ApiError, checkLocationWarning } from "../services/api";
import type { LocationWarningResponse } from "../types/location";
import { EmptyState, ErrorState, LoadingState, RiskBadge } from "./ui";

type RiskPanelProps = {
  hotspot: ScamHotspot | null;
};

function getRecommendation(riskScore?: number) {
  if (riskScore === undefined) {
    return "Select a hotspot to view verified local warning data.";
  }

  if (riskScore >= 70) {
    return "Use official counters or trusted apps, avoid unsolicited help, and leave the area if pressure escalates.";
  }

  if (riskScore >= 40) {
    return "Confirm prices upfront, compare options, and keep valuables secured while moving through the area.";
  }

  return "Stay aware, verify fees before agreeing, and use standard tourist precautions.";
}

export default function RiskPanel({ hotspot }: RiskPanelProps) {
  const [result, setResult] = useState<LocationWarningResponse | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!hotspot) {
      setResult(null);
      setError(null);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setError(null);

    checkLocationWarning({
      city: hotspot.city,
      location_name: hotspot.location_name,
    })
      .then((response) => {
        if (isActive) {
          setResult(response);
        }
      })
      .catch((caught) => {
        if (isActive) {
          setResult(null);
          setError(caught instanceof Error ? caught : new Error("Unable to load hotspot warnings."));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [hotspot]);

  return (
    <aside className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-teal-700" />
        <h2 className="text-lg font-semibold text-stone-950">Current Location</h2>
      </div>

      {!hotspot ? <EmptyState>Select a hotspot marker to inspect local scam warnings.</EmptyState> : null}
      {isLoading ? <LoadingState label="Loading verified hotspot warnings..." /> : null}
      {error ? (
        <ErrorState
          details={error instanceof ApiError ? error.details : undefined}
          message={error.message}
        />
      ) : null}

      {hotspot && !isLoading && !error ? (
        <div className="grid gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-600">
              <MapPin className="h-4 w-4" />
              {hotspot.city}
            </div>
            <p className="mt-1 text-xl font-semibold text-stone-950">{hotspot.location_name}</p>
          </div>

          <div className="grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-4">
            <div className="text-xs font-semibold uppercase text-stone-500">Risk Score</div>
            <div className="text-3xl font-bold text-stone-950">{result?.risk_score ?? "--"}</div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
              <AlertTriangle className="h-4 w-4" />
              Nearby Scam Warnings
            </div>
            {(result?.warnings ?? [hotspot]).map((warning, index) => (
              <div className="rounded-md border border-stone-200 bg-stone-50 p-3" key={`${warning.scam_type}-${index}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-stone-950">{warning.scam_type}</p>
                  <RiskBadge value={warning.risk_level} />
                </div>
                <p className="mt-2 text-sm text-stone-600">{warning.warning_message}</p>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-teal-100 bg-teal-50 p-4 text-sm text-teal-950">
            <p className="font-semibold">Tourist safety recommendation</p>
            <p className="mt-2 leading-6">{getRecommendation(result?.risk_score)}</p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

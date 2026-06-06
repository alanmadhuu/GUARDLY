import { AlertTriangle, MapPin, MessageSquareWarning, ShieldAlert } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { saveLocationActivity } from "../services/activity";
import { ApiError, checkLocationWarning } from "../services/api";
import type { LocationWarningResponse } from "../types/location";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  ResultGrid,
  ResultItem,
  RiskBadge,
} from "./ui";

type AreaWarningLookupProps = {
  initialCity?: string;
  initialLocationName?: string;
};

export default function AreaWarningLookup({
  initialCity = "",
  initialLocationName = "",
}: AreaWarningLookupProps) {
  const [city, setCity] = useState(initialCity);
  const [locationName, setLocationName] = useState(initialLocationName);
  const [result, setResult] = useState<LocationWarningResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);

  useEffect(() => {
    setCity(initialCity);
    setLocationName(initialLocationName);
    setResult(null);
    setError(null);
  }, [initialCity, initialLocationName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await checkLocationWarning({
        city: city.trim(),
        location_name: locationName.trim(),
      });
      setResult(response);
      saveLocationActivity(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Unable to check area."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-teal-700" />
        <h2 className="text-lg font-semibold text-stone-950">Area Warnings</h2>
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <Field label="City" onChange={setCity} placeholder="Jaipur" value={city} />
        <Field
          label="Location Name"
          onChange={setLocationName}
          placeholder="Jaipur Railway Station"
          value={locationName}
        />
        <ActionButton disabled={isLoading}>Check Area</ActionButton>
      </form>

      <div className="grid gap-4">
        {isLoading ? <LoadingState label="Checking area warning data..." /> : null}
        {error ? (
          <ErrorState
            details={error instanceof ApiError ? error.details : undefined}
            message={error.message}
          />
        ) : null}
        {!isLoading && !error && !result ? (
          <EmptyState>Select a hotspot or enter an area to check known tourist safety warnings.</EmptyState>
        ) : null}
        {result ? (
          <>
            <ResultGrid>
              <ResultItem icon={ShieldAlert} label="Risk Score" value={result.risk_score} />
              <ResultItem icon={MapPin} label="Location" value={result.location_name} />
            </ResultGrid>
            {result.warnings.length > 0 ? (
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings List
                </div>
                {result.warnings.map((warning, index) => (
                  <div
                    className="rounded-md border border-stone-200 bg-stone-50 p-4"
                    key={`${warning.scam_type}-${index}`}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ResultItem label="Scam Type" value={warning.scam_type} />
                      <ResultItem label="Risk Level" value={<RiskBadge value={warning.risk_level} />} />
                    </div>
                    <div className="mt-3 flex gap-2 rounded-md bg-white p-3 text-sm text-stone-700">
                      <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <span>{warning.warning_message}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No warnings returned for this location.</EmptyState>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}

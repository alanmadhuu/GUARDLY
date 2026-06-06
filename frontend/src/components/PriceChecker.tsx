import { AlertTriangle, BadgeDollarSign, MessageSquareText, Percent } from "lucide-react";
import { FormEvent, useState } from "react";
import { ApiError, checkPrice } from "../services/api";
import type { PriceCheckResponse } from "../types/price";
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

export default function PriceChecker() {
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [result, setResult] = useState<PriceCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await checkPrice({
        city: city.trim(),
        category: category.trim(),
        quoted_price: Number(quotedPrice),
        distance_km: Number(distanceKm),
      });
      setResult(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Unable to check price."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Panel>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="City" onChange={setCity} placeholder="Jaipur" value={city} />
          <Field
            label="Category"
            onChange={setCategory}
            placeholder="auto_per_km"
            value={category}
          />
          <Field
            label="Quoted Price"
            min={0}
            onChange={setQuotedPrice}
            placeholder="500"
            step={0.01}
            type="number"
            value={quotedPrice}
          />
          <Field
            label="Distance (km)"
            min={0}
            onChange={setDistanceKm}
            placeholder="3"
            step={0.01}
            type="number"
            value={distanceKm}
          />
          <ActionButton disabled={isLoading}>Check Price</ActionButton>
        </form>
      </Panel>

      <Panel>
        <div className="grid gap-4">
          {isLoading ? <LoadingState label="Checking local price data..." /> : null}
          {error ? (
            <ErrorState
              details={error instanceof ApiError ? error.details : undefined}
              message={error.message}
            />
          ) : null}
          {!isLoading && !error && !result ? (
            <EmptyState>Submit a quoted price to compare it with expected local rates.</EmptyState>
          ) : null}
          {result ? (
            <>
              <ResultGrid>
                <ResultItem icon={BadgeDollarSign} label="Expected Range" value={result.expected_range} />
                <ResultItem icon={AlertTriangle} label="Risk Level" value={<RiskBadge value={result.risk_level} />} />
                <ResultItem
                  icon={Percent}
                  label="Overcharge Percentage"
                  value={`${result.overcharge_percentage}%`}
                />
              </ResultGrid>
              <ResultItem icon={MessageSquareText} label="Message" value={result.message} />
            </>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

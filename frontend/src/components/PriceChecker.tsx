import { AlertTriangle, BadgeDollarSign, MessageSquareText, Percent } from "lucide-react";
import { FormEvent, useState } from "react";
import { savePriceActivity } from "../services/activity";
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

const categoryOptions = [
  {
    value: "auto_per_km",
    label: "Auto rickshaw per km",
  },
  {
    value: "taxi_per_km",
    label: "Taxi per km",
  },
  {
    value: "tour_guide",
    label: "Tour guide",
  },
  {
    value: "monument_ticket",
    label: "Monument ticket",
  },
  {
    value: "bottled_water",
    label: "Bottled water",
  },
];

export default function PriceChecker() {
  const [city, setCity] = useState("");
  const [category, setCategory] = useState(categoryOptions[0].value);
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
      savePriceActivity(response);
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
          <label className="flex flex-col gap-2 text-sm font-medium text-stone-800">
            Category
            <select
              className="h-11 rounded-md border border-stone-300 bg-white px-3 text-stone-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-stone-500">
              Uses backend category key: {category}
            </span>
          </label>
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

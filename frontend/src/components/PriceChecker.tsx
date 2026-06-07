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
    requiresDistance: true,
    calculation: "Expected fare = local per-km range multiplied by trip distance.",
  },
  {
    value: "taxi_per_km",
    label: "Taxi per km",
    requiresDistance: true,
    calculation: "Expected fare = local per-km range multiplied by trip distance.",
  },
  {
    value: "tour_guide",
    label: "Tour guide",
    requiresDistance: false,
    calculation: "Expected price uses the local half-day guide range for the selected city.",
  },
  {
    value: "monument_ticket",
    label: "Monument ticket",
    requiresDistance: false,
    calculation: "Expected price uses the local per-person ticket range for the selected city.",
  },
  {
    value: "bottled_water",
    label: "Bottled water",
    requiresDistance: false,
    calculation: "Expected price uses the local 1 liter bottle range and printed MRP guidance.",
  },
];

const cityOptions = ["Jaipur", "Delhi", "Mumbai", "Kochi", "Bangalore"];

export default function PriceChecker() {
  const [city, setCity] = useState(cityOptions[0]);
  const [category, setCategory] = useState(categoryOptions[0].value);
  const [quotedPrice, setQuotedPrice] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [result, setResult] = useState<PriceCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const selectedCategory = categoryOptions.find((option) => option.value === category) ?? categoryOptions[0];
  const requiresDistance = selectedCategory.requiresDistance;

  function handleCategoryChange(nextCategory: string) {
    setCategory(nextCategory);
    setError(null);
    setResult(null);
  }

  function handleCityChange(nextCity: string) {
    setCity(nextCity);
    setError(null);
    setResult(null);
  }

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
        distance_km: requiresDistance ? Number(distanceKm) : 1,
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
          <label className="flex flex-col gap-2 text-sm font-medium text-stone-800">
            City
            <select
              className="h-11 rounded-md border border-stone-300 bg-white px-3 text-stone-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => handleCityChange(event.target.value)}
              value={city}
            >
              {cityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-stone-800">
            Category
            <select
              className="h-11 rounded-md border border-stone-300 bg-white px-3 text-stone-950 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => handleCategoryChange(event.target.value)}
              value={category}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-stone-500">
              {selectedCategory.calculation}
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
          {requiresDistance ? (
            <Field
              label="Distance (km)"
              min={0}
              onChange={setDistanceKm}
              placeholder="3"
              step={0.01}
              type="number"
              value={distanceKm}
            />
          ) : (
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-stone-600">
              Distance is not used for {selectedCategory.label.toLowerCase()} because this category is priced by unit,
              ticket, or service duration.
            </div>
          )}
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
              <ResultItem icon={BadgeDollarSign} label="Calculation" value={result.calculation_note} />
            </>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

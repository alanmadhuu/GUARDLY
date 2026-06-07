import type { LocationWarningResponse } from "../types/location";
import type { PriceCheckResponse } from "../types/price";
import type { RouteCheckResponse } from "../types/route";
import type { DashboardActivity, DashboardSummary, ProtectionStatus } from "../types/activity";

const ACTIVITY_STORAGE_KEY = "guardly.activity.v1";
const PROTECTION_STORAGE_KEY = "guardly.protection.v1";
const ACTIVITY_UPDATED_EVENT = "guardly:activity-updated";
const INR_PER_EXTRA_ROUTE_KM = 45;
const MAX_ACTIVITY_COUNT = 40;

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emitActivityUpdated() {
  window.dispatchEvent(new Event(ACTIVITY_UPDATED_EVENT));
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeRiskLevel(riskLevel: string) {
  const normalized = riskLevel.toLowerCase();

  if (normalized.includes("high")) {
    return "HIGH";
  }

  if (normalized.includes("medium") || normalized.includes("caution")) {
    return "MEDIUM";
  }

  return "LOW";
}

function riskLevelFromScore(score: number) {
  if (score >= 70) {
    return "HIGH";
  }

  if (score >= 40) {
    return "MEDIUM";
  }

  return "LOW";
}

function riskPenalty(riskLevel?: string, riskScore?: number) {
  if (typeof riskScore === "number") {
    return Math.min(100, Math.max(0, riskScore));
  }

  const normalized = normalizeRiskLevel(riskLevel ?? "LOW");

  if (normalized === "HIGH") {
    return 85;
  }

  if (normalized === "MEDIUM") {
    return 50;
  }

  return 15;
}

function parseExpectedMax(expectedRange: string) {
  const matches = expectedRange.match(/\d+(\.\d+)?/g);
  if (!matches?.length) {
    return 0;
  }

  return Math.max(...matches.map(Number));
}

function estimatePriceSavings(response: PriceCheckResponse) {
  if (typeof response.money_saved === "number") {
    return Math.round(Math.max(0, response.money_saved));
  }

  const expectedMax = parseExpectedMax(response.expected_range);
  const directSavings = response.quoted_price - expectedMax;

  if (directSavings > 0) {
    return Math.round(directSavings);
  }

  if (response.overcharge_percentage > 0) {
    const expectedPrice = response.quoted_price / (1 + response.overcharge_percentage / 100);
    return Math.round(Math.max(0, response.quoted_price - expectedPrice));
  }

  return 0;
}

function estimateRouteSavings(response: RouteCheckResponse) {
  const extraDistance = response.actual_distance_km - response.expected_distance_km;
  return Math.round(Math.max(0, extraDistance) * INR_PER_EXTRA_ROUTE_KM);
}

function formatRouteDetail(response: RouteCheckResponse) {
  return `${response.deviation_percentage.toFixed(1)}% deviation, ${response.actual_distance_km.toFixed(
    1,
  )} km travelled`;
}

export function subscribeToActivityUpdates(callback: () => void) {
  window.addEventListener(ACTIVITY_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(ACTIVITY_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getActivities() {
  return readJson<DashboardActivity[]>(ACTIVITY_STORAGE_KEY, []).sort(
    (first, second) =>
      new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime(),
  );
}

export function saveActivity(activity: DashboardActivity) {
  const activities = [activity, ...getActivities()]
    .sort(
      (first, second) =>
        new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime(),
    )
    .slice(0, MAX_ACTIVITY_COUNT);

  writeJson(ACTIVITY_STORAGE_KEY, activities);
  emitActivityUpdated();
}

export function clearActivities() {
  writeJson(ACTIVITY_STORAGE_KEY, []);
  emitActivityUpdated();
}

export function savePriceActivity(response: PriceCheckResponse) {
  const savingsInr = estimatePriceSavings(response);
  const overchargeAlert =
    response.overcharge_percentage > 0
      ? `Fare appears ${response.overcharge_percentage}% above normal`
      : undefined;

  saveActivity({
    id: createId("price"),
    kind: "price",
    title: `${response.city} ${response.category} price check`,
    detail: `Quoted ₹${Math.round(response.quoted_price)} against expected ₹${response.expected_range}`,
    riskLevel: normalizeRiskLevel(response.risk_level),
    timestamp: new Date().toISOString(),
    savingsInr,
    alertMessage: normalizeRiskLevel(response.risk_level) === "LOW" ? undefined : overchargeAlert,
    meta: {
      overchargePercentage: response.overcharge_percentage,
    },
  });
}

export function saveRouteActivity(response: RouteCheckResponse) {
  const savingsInr = estimateRouteSavings(response);

  saveActivity({
    id: createId("route"),
    kind: "route",
    title: "Route analysis completed",
    detail: formatRouteDetail(response),
    riskLevel: normalizeRiskLevel(response.risk_level),
    timestamp: new Date().toISOString(),
    savingsInr,
    alertMessage: response.route_deviation_detected
      ? "Possible route deviation detected"
      : undefined,
    meta: {
      deviationPercentage: response.deviation_percentage,
      routeDeviationDetected: response.route_deviation_detected,
    },
  });
}

export function saveLocationActivity(response: LocationWarningResponse) {
  const riskLevel = riskLevelFromScore(response.risk_score);

  saveActivity({
    id: createId("location"),
    kind: "location",
    title: `${response.location_name} area check`,
    detail: `${response.warnings.length} warning${response.warnings.length === 1 ? "" : "s"} in ${
      response.city
    }`,
    riskLevel,
    timestamp: new Date().toISOString(),
    riskScore: response.risk_score,
    alertMessage:
      response.risk_score >= 40 && response.warnings.length > 0
        ? "High-risk scam area nearby"
        : undefined,
    meta: {
      warningsCount: response.warnings.length,
    },
  });
}

export function getProtectionStatus() {
  return readJson<ProtectionStatus>(PROTECTION_STORAGE_KEY, { enabled: false });
}

export function setProtectionEnabled(enabled: boolean) {
  const status: ProtectionStatus = enabled
    ? { enabled: true, enabledAt: new Date().toISOString() }
    : { enabled: false };

  writeJson(PROTECTION_STORAGE_KEY, status);
  emitActivityUpdated();
  return status;
}

export function seedDemoActivities() {
  const now = Date.now();
  const demoActivities: DashboardActivity[] = [
    {
      id: "demo-location-1",
      kind: "location",
      title: "Jaipur Railway Station area check",
      detail: "3 warnings in Jaipur",
      riskLevel: "HIGH",
      riskScore: 82,
      timestamp: new Date(now - 1000 * 60 * 4).toISOString(),
      alertMessage: "High-risk scam area nearby",
      meta: {
        warningsCount: 3,
      },
    },
    {
      id: "demo-price-1",
      kind: "price",
      title: "Jaipur auto_per_km price check",
      detail: "Quoted ₹500 against expected ₹90-150",
      riskLevel: "HIGH",
      timestamp: new Date(now - 1000 * 60 * 10).toISOString(),
      savingsInr: 350,
      alertMessage: "Fare appears 120% above normal",
      meta: {
        overchargePercentage: 120,
      },
    },
    {
      id: "demo-route-1",
      kind: "route",
      title: "Route analysis completed",
      detail: "63.0% deviation, 8.5 km travelled",
      riskLevel: "MEDIUM",
      timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
      savingsInr: 180,
      alertMessage: "Possible route deviation detected",
      meta: {
        deviationPercentage: 63,
        routeDeviationDetected: true,
      },
    },
    {
      id: "demo-price-2",
      kind: "price",
      title: "Delhi taxi_per_km price check",
      detail: "Quoted ₹260 against expected ₹180-220",
      riskLevel: "MEDIUM",
      timestamp: new Date(now - 1000 * 60 * 43).toISOString(),
      savingsInr: 40,
      alertMessage: "Fare appears 18% above normal",
      meta: {
        overchargePercentage: 18,
      },
    },
  ];

  writeJson(ACTIVITY_STORAGE_KEY, demoActivities);
  setProtectionEnabled(true);
  emitActivityUpdated();
}

export function getDashboardSummary(activities: DashboardActivity[]): DashboardSummary {
  const latestPrice = activities.find((activity) => activity.kind === "price");
  const latestRoute = activities.find((activity) => activity.kind === "route");
  const latestLocation = activities.find((activity) => activity.kind === "location");

  const routeRisk = riskPenalty(latestRoute?.riskLevel);
  const locationRisk = riskPenalty(latestLocation?.riskLevel, latestLocation?.riskScore);
  const priceRisk = riskPenalty(latestPrice?.riskLevel);
  const combinedPenalty = routeRisk * 0.35 + locationRisk * 0.35 + priceRisk * 0.3;
  const score = Math.round(Math.max(0, Math.min(100, 100 - combinedPenalty)));
  const moneySavedToday = activities.reduce(
    (total, activity) => total + (activity.savingsInr ?? 0),
    0,
  );
  const activeAlerts = activities
    .filter((activity) => Boolean(activity.alertMessage))
    .slice(0, 5);

  return {
    score,
    status: score >= 75 ? "SAFE" : score >= 45 ? "CAUTION" : "HIGH RISK",
    currentRiskLevel: score >= 75 ? "Low" : score >= 45 ? "Medium" : "High",
    moneySavedToday,
    potentialLossPrevented: Math.max(moneySavedToday, activeAlerts.length * 250),
    activeAlerts,
    recentChecks: activities.slice(0, 6),
    routeRisk,
    locationRisk,
    priceRisk,
  };
}

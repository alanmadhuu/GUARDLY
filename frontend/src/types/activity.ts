export type ActivityKind = "price" | "route" | "location";

export type DashboardActivity = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  riskLevel: string;
  timestamp: string;
  savingsInr?: number;
  riskScore?: number;
  alertMessage?: string;
  meta?: Record<string, string | number | boolean>;
};

export type ProtectionStatus = {
  enabled: boolean;
  enabledAt?: string;
};

export type DashboardSummary = {
  score: number;
  status: "SAFE" | "CAUTION" | "HIGH RISK";
  currentRiskLevel: "Low" | "Medium" | "High";
  moneySavedToday: number;
  potentialLossPrevented: number;
  activeAlerts: DashboardActivity[];
  recentChecks: DashboardActivity[];
  routeRisk: number;
  locationRisk: number;
  priceRisk: number;
};

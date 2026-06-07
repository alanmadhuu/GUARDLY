import {
  Activity,
  BadgeDollarSign,
  BellRing,
  Clock3,
  Gauge,
  Map,
  MapPinned,
  Play,
  RotateCcw,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  clearActivities,
  getActivities,
  getDashboardSummary,
  seedDemoActivities,
  subscribeToActivityUpdates,
} from "../services/activity";
import type { DashboardActivity } from "../types/activity";

type DashboardProps = {
  onNavigate: (tab: "map" | "price" | "route") => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatActivityTime(timestamp: string) {
  const elapsedMs = Date.now() - new Date(timestamp).getTime();
  const elapsedMinutes = Math.max(1, Math.round(elapsedMs / 60000));

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  return `${elapsedHours} hr ago`;
}

function riskAccent(riskLevel: string) {
  const normalized = riskLevel.toLowerCase();

  if (normalized.includes("high")) {
    return "border-red-200 bg-red-50 text-red-900";
  }

  if (normalized.includes("medium")) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function scoreAccent(status: string) {
  if (status === "HIGH RISK") {
    return {
      bar: "bg-red-600",
      badge: "border-red-200 bg-red-50 text-red-800",
      ring: "border-red-200 bg-red-50",
    };
  }

  if (status === "CAUTION") {
    return {
      bar: "bg-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-800",
      ring: "border-amber-200 bg-amber-50",
    };
  }

  return {
    bar: "bg-emerald-600",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    ring: "border-emerald-200 bg-emerald-50",
  };
}

function activityIcon(kind: DashboardActivity["kind"]) {
  if (kind === "price") {
    return BadgeDollarSign;
  }

  if (kind === "route") {
    return MapPinned;
  }

  return ShieldQuestion;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "stone",
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  detail: string;
  tone?: "stone" | "green" | "amber" | "red" | "blue";
}) {
  const toneClasses = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-800",
    stone: "border-stone-200 bg-white text-stone-700",
  };

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-stone-950">{value}</p>
        </div>
        <div className={`rounded-md border p-2 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-600">{detail}</p>
    </section>
  );
}

function RiskBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="font-semibold text-stone-950">{Math.round(value)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-teal-700"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [activities, setActivities] = useState<DashboardActivity[]>(() => getActivities());

  useEffect(() => {
    return subscribeToActivityUpdates(() => {
      setActivities(getActivities());
    });
  }, []);

  const summary = useMemo(() => getDashboardSummary(activities), [activities]);
  const accent = scoreAccent(summary.status);

  function loadDemoMode() {
    seedDemoActivities();
    setActivities(getActivities());
  }

  function resetDemoMode() {
    clearActivities();
    setActivities([]);
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-7">
          <div className="grid gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase text-teal-800">
                <ShieldCheck className="h-4 w-4" />
                Demo Ready
              </div>
              <h1 className="mt-4 max-w-3xl text-4xl font-bold text-stone-950 sm:text-5xl">
                GUARDLY
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600">
                One command center for fare checks, route deviation, hotspot warnings,
                AI-backed explanations, orchestration, and map-based scam visibility.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
                onClick={loadDemoMode}
                type="button"
              >
                <Play className="h-4 w-4" />
                Demo Mode
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
                onClick={resetDemoMode}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          <div className={`rounded-lg border p-5 ${accent.ring}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase text-stone-600">Tourist Safety Score</p>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${accent.badge}`}>
                {summary.status}
              </span>
            </div>
            <div className="mt-5 flex items-end gap-3">
              <span className="text-6xl font-bold text-stone-950">{summary.score}</span>
              <span className="pb-2 text-xl font-semibold text-stone-500">/100</span>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
              <div className={`h-full rounded-full ${accent.bar}`} style={{ width: `${summary.score}%` }} />
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-700">
              Combined from latest route risk, location risk, and price risk.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail="Estimated from overcharge checks and route deviation prevention."
          icon={BadgeDollarSign}
          label="Money Saved"
          tone="green"
          value={`${formatCurrency(summary.moneySavedToday)} Saved Today`}
        />
        <MetricCard
          detail="Newest route, location, and fare alerts stay visible for demos."
          icon={BellRing}
          label="Active Alerts"
          tone={summary.activeAlerts.length > 0 ? "red" : "green"}
          value={String(summary.activeAlerts.length)}
        />
        <MetricCard
          detail="Based on the latest combined safety score."
          icon={Gauge}
          label="Current Risk Level"
          tone={summary.currentRiskLevel === "High" ? "red" : summary.currentRiskLevel === "Medium" ? "amber" : "green"}
          value={summary.currentRiskLevel}
        />
        <MetricCard
          detail="Useful headline number for hackathon walkthroughs."
          icon={Sparkles}
          label="Loss Prevented"
          tone="blue"
          value={`${formatCurrency(summary.potentialLossPrevented)} Potential Loss Prevented`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6">
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-stone-950">Live Alert Feed</h2>
                <p className="mt-1 text-sm text-stone-600">Newest alerts appear first.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {summary.activeAlerts.length > 0 ? (
                summary.activeAlerts.map((activity) => {
                  const Icon = activityIcon(activity.kind);

                  return (
                    <article
                      className={`rounded-md border p-4 ${riskAccent(activity.riskLevel)}`}
                      key={activity.id}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-semibold">{activity.alertMessage}</h3>
                            <span className="text-xs font-semibold uppercase">
                              {activity.riskLevel}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6">{activity.detail}</p>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
                  No active alerts yet. Run a price, route, or area check to populate the feed.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-950">Recent Activity</h2>
            <div className="mt-4 grid gap-3">
              {summary.recentChecks.length > 0 ? (
                summary.recentChecks.map((activity) => {
                  const Icon = activityIcon(activity.kind);

                  return (
                    <article
                      className="grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                      key={activity.id}
                    >
                      <div className="rounded-md border border-stone-200 bg-white p-2 text-stone-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-stone-950">{activity.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-stone-600">{activity.detail}</p>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:justify-center">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${riskAccent(activity.riskLevel)}`}>
                          {activity.riskLevel}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium text-stone-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatActivityTime(activity.timestamp)}
                        </span>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
                  Recent price checks, route analyses, and location checks will persist here.
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-950">Risk Breakdown</h2>
            <div className="mt-4 grid gap-4">
              <RiskBar label="Route Risk" value={summary.routeRisk} />
              <RiskBar label="Location Risk" value={summary.locationRisk} />
              <RiskBar label="Price Risk" value={summary.priceRisk} />
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-950">Quick Access</h2>
            <div className="mt-4 grid gap-2">
              <button
                className="flex h-11 items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-3 text-sm font-semibold text-stone-800 transition hover:bg-white"
                onClick={() => onNavigate("price")}
                type="button"
              >
                Price analysis
                <BadgeDollarSign className="h-4 w-4" />
              </button>
              <button
                className="flex h-11 items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-3 text-sm font-semibold text-stone-800 transition hover:bg-white"
                onClick={() => onNavigate("route")}
                type="button"
              >
                Route deviation
                <MapPinned className="h-4 w-4" />
              </button>
              <button
                className="flex h-11 items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-3 text-sm font-semibold text-stone-800 transition hover:bg-white"
                onClick={() => onNavigate("map")}
                type="button"
              >
                Map warnings
                <Map className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-950">Safety Statistics</h2>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between rounded-md bg-stone-50 px-3 py-2 text-sm">
                <span className="text-stone-600">Checks recorded</span>
                <span className="font-bold text-stone-950">{activities.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-stone-50 px-3 py-2 text-sm">
                <span className="text-stone-600">High-risk alerts</span>
                <span className="font-bold text-stone-950">
                  {activities.filter((activity) => activity.riskLevel === "HIGH").length}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-700" />
              <h2 className="text-xl font-semibold text-stone-950">Feature Overview</h2>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-stone-600">
              <p>Price analysis, route detection, location warnings, and map heatmap are linked here.</p>
              <p>AI explanations and LangGraph orchestration remain on the existing backend surface.</p>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

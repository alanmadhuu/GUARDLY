import { BadgeDollarSign, CarFront, LayoutDashboard, Map, MapPinned } from "lucide-react";
import { ComponentType, useState } from "react";
import Dashboard from "./components/Dashboard";
import PickupOptimizer from "./components/PickupOptimizer";
import PriceChecker from "./components/PriceChecker";
import RouteMonitor from "./components/RouteMonitor";
import TouristMap from "./components/TouristMap";

type TabKey = "dashboard" | "map" | "price" | "route" | "pickup";

type Tab = {
  key: TabKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const tabs: Tab[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "map", label: "Tourist Map", icon: Map },
  { key: "price", label: "Price Checker", icon: BadgeDollarSign },
  { key: "route", label: "Route Monitor", icon: MapPinned },
  { key: "pickup", label: "Fare Optimizer", icon: CarFront },
];

function renderActiveTab(activeTab: TabKey, setActiveTab: (tab: TabKey) => void) {
  if (activeTab === "dashboard") {
    return <Dashboard onNavigate={setActiveTab} />;
  }

  if (activeTab === "map") {
    return <TouristMap />;
  }

  if (activeTab === "route") {
    return <RouteMonitor />;
  }

  if (activeTab === "pickup") {
    return <PickupOptimizer />;
  }

  return <PriceChecker />;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-2 border-b border-stone-200 pb-5">
          <p className="text-sm font-semibold uppercase text-teal-700">Tourist Shield</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-stone-950">Safety Dashboard</h1>
            </div>
            <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600">
              API: {import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"}
            </div>
          </div>
        </header>

        <nav
          aria-label="Dashboard sections"
          className="mb-6 grid gap-2 rounded-lg border border-stone-200 bg-white p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={`flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-teal-700 text-white shadow-sm"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1">{renderActiveTab(activeTab, setActiveTab)}</div>
      </div>
    </main>
  );
}

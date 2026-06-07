# GUARDLY Frontend

React TypeScript MVP for the GUARDLY FastAPI backend.

## File Structure

```text
frontend/
  index.html
  package.json
  postcss.config.js
  tailwind.config.js
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  src/
    App.tsx
    main.tsx
    styles.css
    components/
      AreaWarnings.tsx
      AreaWarningLookup.tsx
      Dashboard.tsx
      PriceChecker.tsx
      PickupOptimizer.tsx
      RiskPanel.tsx
      RouteLayer.tsx
      RouteMap.tsx
      RouteMonitor.tsx
      ScamHotspots.tsx
      TouristMap.tsx
      ui.tsx
    data/
      scam_spots.json
      scam_spots.ts
    services/
      activity.ts
      api.ts
    types/
      activity.ts
      location.ts
      pickup.ts
      price.ts
      route.ts
```

## Component Hierarchy

```text
App
  Dashboard
    Tourist safety score
    Money saved and loss prevented metrics
    Live alert feed
    Recent activity
    Demo mode controls
    Quick access buttons
  TouristMap
    ScamHotspots
    RouteLayer
    RiskPanel
    AreaWarningLookup
  PriceChecker
  PickupOptimizer
  RouteMonitor
    TouristMap compact route view
```

## Installation

```powershell
cd frontend
npm install
npm install @react-google-maps/api
```

## Run

Start the backend first:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend:

```powershell
cd frontend
npm run dev
```

The app runs at:

- `http://127.0.0.1:5173`

## Configuration

The frontend defaults to:

```text
http://127.0.0.1:8000
```

Override the API base URL with:

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

Configure Google Maps:

```powershell
Copy-Item .env.example .env.local
```

Then edit `.env.local`:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

The Google Cloud project for the key must have Maps JavaScript API enabled. Restart `npm run dev` after changing Vite environment variables.

## Map Features

- `Tourist Map` tab displays scam hotspot markers loaded from `src/data/scam_spots.json`.
- Marker colors: red for high risk, orange for medium risk, yellow for low risk.
- Clicking a hotspot opens map details and updates the current-location risk panel.
- The risk panel calls the existing backend `POST /location-warning` endpoint.
- The map includes the area-warning lookup so selected hotspots can be checked without leaving the map.
- `Route Monitor` uses the same map layer for origin, destination, route line, and high-risk route alert.

## Dashboard Features

- `Dashboard` is the default homepage.
- Tourist safety score is computed in the frontend from the latest route, location, and price risk signals.
- Money saved is estimated from overcharge detection and route deviation distance.
- Live alerts are derived from existing price, route, and location API responses.
- Recent activity is persisted in `localStorage` through `src/services/activity.ts`.
- `Demo Mode` seeds realistic local activity without adding backend endpoints.
- `Fare Optimizer` calls `POST /optimize-pickup` and renders pickup candidates on the map when Google Maps is configured.

## Styling Approach

- Tailwind CSS utility classes drive layout, spacing, typography, state color, and responsive behavior.
- Cards use restrained borders, 8px radius, and clear information hierarchy.
- The dashboard uses teal for primary actions, emerald for safe states, amber for caution, red for high risk, and stone/slate neutrals for structure.
- Layouts are responsive from mobile single-column views to multi-column desktop dashboards.

## Build

```powershell
npm run build
```

## Testing

1. Start the backend:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

2. Start the frontend:

```powershell
cd frontend
npm run dev
```

3. Open `http://127.0.0.1:5173`.
4. Confirm the dashboard is the first screen.
5. Click `Demo Mode` and verify the safety score, money saved, active alerts, and recent activity populate.
6. Run one price check, route analysis, and map area-warning check. Return to the dashboard and verify each appears in recent activity.
7. Open `Fare Optimizer`, submit the Jaipur Railway Station sample, and verify five pickup candidates plus one recommendation.
8. Refresh the browser and confirm recent activity persists.
9. Run the production check:

```powershell
npm run build
```

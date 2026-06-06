# Tourist Shield Frontend

React TypeScript MVP for the Tourist Shield FastAPI backend.

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
      PriceChecker.tsx
      RouteMap.tsx
      RouteMonitor.tsx
      ui.tsx
    services/
      api.ts
    types/
      location.ts
      price.ts
      route.ts
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
uvicorn app.main:app --reload
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

## Build

```powershell
npm run build
```

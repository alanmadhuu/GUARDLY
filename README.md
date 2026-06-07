# GUARDLY

## Problem Statement

Tourists often overpay for transport, accept unsafe route deviations, or enter scam-prone areas because they lack local context. GUARDLY gives quick, local-data-backed safety checks for common travel risks.

## Solution

GUARDLY combines price analysis, route deviation detection, location warnings, LangGraph orchestration, map visualization, and optional Groq explanations into a demo-ready web app. The system is designed to keep working from local JSON data when external AI services are unavailable.

## Features

- Tourist safety dashboard.
- Price overcharge detection with `money_saved`.
- Route deviation detection.
- Location scam warnings.
- Smart pickup-point optimization for ride-hailing pickup access.
- Scam hotspot map data.
- LangGraph agent orchestration.
- Groq-backed AI explanations through a centralized backend service.
- Deterministic fallback explanations for demo reliability.
- Health checks for API, data loading, and Groq configuration.

## Architecture

```text
backend/
  app/
    main.py
    routes/
    services/
    models/
    utils/
    agents/
    data/
  requirements.txt
  .env.example
  README.md
frontend/
  src/
    components/
    services/
    types/
    data/
  package.json
scripts/
  build_demo_dataset.py
data/
  attractions.json
  ticket_prices.json
  police_stations.json
  scam_spots.json
  prices.json
```

## API Endpoints

- `GET /health`
- `GET /health/data`
- `POST /check-price`
- `POST /check-route`
- `POST /location-warning`
- `POST /optimize-pickup`
- `POST /agent-query`
- `POST /agent-explain`

## Setup Instructions

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Environment:

```text
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
DEMO_MODE=true
```

Use `DEMO_MODE=true` for hackathon demos where no external dependency should break the flow.

## Demo Flow

1. Open `http://127.0.0.1:5173`.
2. Confirm `GET http://127.0.0.1:8000/health` returns loaded local data.
3. Use Demo Mode on the dashboard.
4. Run a Jaipur auto price check with an inflated fare.
5. Run the sample Jaipur route deviation check.
6. Run a Jaipur Railway Station location warning.
7. Use Fare Optimizer from the Jaipur Railway Station sample coordinates.
8. Show `/agent-explain` returning a useful explanation even if Groq is unavailable.

## Future Improvements

- Add automated backend endpoint tests.
- Expand city datasets and ticket sources.
- Add monitoring for fallback versus Groq usage.
- Add a dedicated safety-score endpoint if product scope requires it.

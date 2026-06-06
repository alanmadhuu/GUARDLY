# Tourist Shield Backend

## Problem Statement

Tourists are vulnerable to overcharging, unsafe route deviations, and location-specific scams because they lack local context. Tourist Shield provides fast local checks that help a traveler understand whether a fare, route, or area looks risky.

## Solution

The backend exposes a small FastAPI API backed by local JSON datasets. It can explain analysis results with Groq when configured, but every LLM path has deterministic fallback responses so the project remains demoable without external AI access.

## Features

- Price analysis for common tourist purchases and transport categories.
- Route deviation detection using local distance calculations.
- Location warnings from local scam hotspot data.
- Smart pickup-point optimization around crowded tourist locations.
- LangGraph orchestration for intent-based demo flows.
- Groq-powered explanations through a centralized AI service.
- Demo-safe fallback explanations when Groq is unavailable.
- Health checks for API, local data, and Groq configuration.
- Money saved estimates for price checks.
- Shared tourist safety score utility.

## Architecture

```text
backend/
  app/
    main.py
    routes/
      agent.py
      explain.py
      location.py
      pickup.py
      price.py
      route.py
    services/
      ai_service.py
      location_service.py
      pickup_service.py
      price_service.py
      route_service.py
    models/
      agent_models.py
      location_models.py
      pickup_models.py
      price_models.py
      route_models.py
    utils/
      data_loader.py
      geo.py
      matching.py
      safety.py
    agents/
      graph.py
      location_agent.py
      price_agent.py
      route_agent.py
      state.py
      supervisor.py
    data/
      prices.json
      scam_spots.json
  requirements.txt
  .env
  .env.example
  run_backend.ps1
  README.md
```

All runtime analysis uses local JSON files. No endpoint calls Groq directly; `app/services/ai_service.py` owns all LLM access.

## API Endpoints

- `GET /health`
- `GET /health/data`
- `POST /check-price`
- `POST /check-route`
- `POST /location-warning`
- `POST /optimize-pickup`
- `POST /agent-query`
- `POST /agent-explain`

### Health Response

```json
{
  "api": true,
  "prices_loaded": true,
  "scam_data_loaded": true,
  "groq_configured": true
}
```

## Setup Instructions

Create a virtual environment:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Create local environment settings:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```text
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
DEMO_MODE=true
```

`DEMO_MODE=true` keeps explanations and pickup optimization deterministic. Set it to `false` when you want Groq explanations and Google-backed pickup scoring during a live run.

Start the backend:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Demo Flow

1. Open `GET /health` and confirm local data is loaded.
2. Run a high-overcharge price check:

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-price -H "Content-Type: application/json" -d "{\"city\":\"Jaipur\",\"category\":\"auto_per_km\",\"quoted_price\":500,\"distance_km\":3}"
```

3. Run a route deviation check:

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-route -H "Content-Type: application/json" -d "{\"origin\":{\"lat\":26.9124,\"lng\":75.7873},\"destination\":{\"lat\":26.9239,\"lng\":75.8267},\"actual_distance_km\":8.5}"
```

4. Run a location warning check:

```powershell
curl.exe -X POST http://127.0.0.1:8000/location-warning -H "Content-Type: application/json" -d "{\"city\":\"Jaipur\",\"location_name\":\"Jaipur Railway Station\"}"
```

5. Run a pickup optimization check:

```powershell
curl.exe -X POST http://127.0.0.1:8000/optimize-pickup -H "Content-Type: application/json" -d "{\"current_location\":{\"lat\":26.9196,\"lng\":75.7885}}"
```

6. Run the LangGraph + explanation endpoint:

```powershell
curl.exe -X POST http://127.0.0.1:8000/agent-explain -H "Content-Type: application/json" -d "{\"intent\":\"price_check\",\"payload\":{\"city\":\"Jaipur\",\"category\":\"auto_per_km\",\"quoted_price\":500,\"distance_km\":3}}"
```

## Reliability Notes

- Groq is optional at demo time.
- Google Maps APIs are optional at demo time.
- LLM calls use timeout, retry, structured JSON prompting, validation, and fallback.
- If JSON parsing fails, the API returns a deterministic local explanation.
- If `GROQ_API_KEY` is missing or `DEMO_MODE=true`, no external AI request is made.
- Pickup optimization does not use Uber, Rapido, or other private ride-provider APIs.

## Future Improvements

- Add automated backend tests for all endpoints.
- Expand local datasets with more cities and official ticket sources.
- Add response telemetry for fallback versus Groq usage.
- Add typed safety score response models if the score becomes an endpoint.

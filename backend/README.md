# Tourist Shield Backend

FastAPI stub backend for Tourist Shield.

## File Structure

```text
backend/
  app/
    main.py
    routes/
      price.py
      route.py
      location.py
    models/
      price_models.py
      route_models.py
      location_models.py
    services/
      price_service.py
      route_service.py
      location_service.py
    utils/
      data_loader.py
      geo.py
      matching.py
    data/
      prices.json
      scam_spots.json
  tests/
  requirements.txt
  README.md
```

## Installation

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run

```powershell
uvicorn app.main:app --reload
```

The API will be available at:

- `http://127.0.0.1:8000`
- `http://127.0.0.1:8000/docs`

## Endpoints

- `GET /health`
- `GET /health/data`
- `POST /check-price`
- `POST /check-route`
- `POST /location-warning`

All safety, price, and route responses currently use mock data.

## Test Data Loading

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health/data
```

Expected mock data summary:

- `cities_loaded`: `5`
- `price_records`: `25`
- `scam_hotspots`: `27`

## Test Price Checker

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-price -H "Content-Type: application/json" -d "{\"city\":\"Jaipur\",\"category\":\"auto_per_km\",\"quoted_price\":500,\"distance_km\":3}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-price -H "Content-Type: application/json" -d "{\"city\":\"Delhi\",\"category\":\"taxi_per_km\",\"quoted_price\":120,\"distance_km\":3}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-price -H "Content-Type: application/json" -d "{\"city\":\"Mumbai\",\"category\":\"bottled_water\",\"quoted_price\":25,\"distance_km\":1}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-price -H "Content-Type: application/json" -d "{\"city\":\"Kochi\",\"category\":\"tour_guide\",\"quoted_price\":4500,\"distance_km\":1}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-price -H "Content-Type: application/json" -d "{\"city\":\"Bangalore\",\"category\":\"auto_per_km\",\"quoted_price\":80,\"distance_km\":3}"
```

Validation examples:

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-price -H "Content-Type: application/json" -d "{\"city\":\"Goa\",\"category\":\"auto_per_km\",\"quoted_price\":100,\"distance_km\":2}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-price -H "Content-Type: application/json" -d "{\"city\":\"Jaipur\",\"category\":\"airport_transfer\",\"quoted_price\":100,\"distance_km\":2}"
```

## Test Route Checker

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-route -H "Content-Type: application/json" -d "{\"origin\":{\"lat\":26.9124,\"lng\":75.7873},\"destination\":{\"lat\":26.9239,\"lng\":75.8267},\"actual_distance_km\":8.5}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-route -H "Content-Type: application/json" -d "{\"origin\":{\"lat\":28.6139,\"lng\":77.2090},\"destination\":{\"lat\":28.6562,\"lng\":77.2410},\"actual_distance_km\":6.8}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-route -H "Content-Type: application/json" -d "{\"origin\":{\"lat\":19.0760,\"lng\":72.8777},\"destination\":{\"lat\":19.0896,\"lng\":72.8656},\"actual_distance_km\":2.6}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-route -H "Content-Type: application/json" -d "{\"origin\":{\"lat\":12.9716,\"lng\":77.5946},\"destination\":{\"lat\":12.9763,\"lng\":77.6033},\"actual_distance_km\":1.8}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-route -H "Content-Type: application/json" -d "{\"origin\":{\"lat\":9.9312,\"lng\":76.2673},\"destination\":{\"lat\":9.9650,\"lng\":76.2420},\"actual_distance_km\":5.2}"
```

Validation example:

```powershell
curl.exe -X POST http://127.0.0.1:8000/check-route -H "Content-Type: application/json" -d "{\"origin\":{\"lat\":120,\"lng\":75.7873},\"destination\":{\"lat\":26.9239,\"lng\":75.8267},\"actual_distance_km\":8.5}"
```

## Test Location Warning

```powershell
curl.exe -X POST http://127.0.0.1:8000/location-warning -H "Content-Type: application/json" -d "{\"city\":\"Jaipur\",\"location_name\":\"Jaipur Railway Station\"}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/location-warning -H "Content-Type: application/json" -d "{\"city\":\"Jaipur\",\"location_name\":\"Jaipur Railway Stn\"}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/location-warning -H "Content-Type: application/json" -d "{\"city\":\"Delhi\",\"location_name\":\"New Delhi Railway Station\"}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/location-warning -H "Content-Type: application/json" -d "{\"city\":\"Mumbai\",\"location_name\":\"Gateway of India\"}"
```

```powershell
curl.exe -X POST http://127.0.0.1:8000/location-warning -H "Content-Type: application/json" -d "{\"city\":\"Bangalore\",\"location_name\":\"KR Market\"}"
```

Validation example:

```powershell
curl.exe -X POST http://127.0.0.1:8000/location-warning -H "Content-Type: application/json" -d "{\"city\":\"Goa\",\"location_name\":\"Beach Market\"}"
```

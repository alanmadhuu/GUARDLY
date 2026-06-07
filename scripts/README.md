# GUARDLY Demo Dataset

`build_demo_dataset.py` is a one-time generator for local hackathon demo data.
It does not create a continuous pipeline, database, scheduler, or backend service.

## Regenerate

From the repository root:

```powershell
python scripts/build_demo_dataset.py
```

If Python is installed through the Windows launcher:

```powershell
py scripts/build_demo_dataset.py
```

Use deterministic fallback data only:

```powershell
python scripts/build_demo_dataset.py --offline
```

Generate only canonical files under `data/` without updating app runtime copies:

```powershell
python scripts/build_demo_dataset.py --skip-app-sync
```

## Outputs

```text
data/
  attractions.json
  ticket_prices.json
  police_stations.json
  scam_spots.json
  prices.json
```

By default, the script also updates:

```text
backend/app/data/prices.json
backend/app/data/scam_spots.json
frontend/src/data/scam_spots.json
```

Those mirrored files keep the existing app running entirely from local JSON after
generation.

## Sources

- OpenStreetMap Overpass API for attractions and police stations.
- Public tourism or monument websites for ticket-price hints.
- Static fallback values when a request fails, scraping returns no usable price,
  or the source provides too few records for a convincing demo.

The fallback dataset is intentionally curated for reliability over completeness.

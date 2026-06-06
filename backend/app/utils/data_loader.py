import json
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
PRICES_FILE = DATA_DIR / "prices.json"
SCAM_SPOTS_FILE = DATA_DIR / "scam_spots.json"


def load_json_file(file_path: Path) -> dict[str, Any]:
    with file_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_prices() -> dict[str, Any]:
    return load_json_file(PRICES_FILE)


def load_scam_spots() -> dict[str, Any]:
    return load_json_file(SCAM_SPOTS_FILE)


def load_tourist_data() -> dict[str, dict[str, Any]]:
    return {
        "prices": load_prices(),
        "scam_spots": load_scam_spots(),
    }


def get_data_summary(tourist_data: dict[str, dict[str, Any]]) -> dict[str, int]:
    prices = tourist_data["prices"]
    scam_spots = tourist_data["scam_spots"]
    cities = set(prices.keys()) | set(scam_spots.keys())

    return {
        "cities_loaded": len(cities),
        "price_records": sum(len(city_prices) for city_prices in prices.values()),
        "scam_hotspots": sum(len(city_spots) for city_spots in scam_spots.values()),
    }

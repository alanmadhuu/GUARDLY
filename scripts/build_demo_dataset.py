"""Build one-time local demo datasets for GUARDLY.

The script attempts lightweight collection from free public sources:
- OpenStreetMap Overpass API for attractions and police stations.
- Public tourism/monument pages for ticket price hints.

If any request fails or returns too little data, curated fallback records are
used. The app can then run entirely from generated local JSON files.

Regenerate from the repository root:
    python scripts/build_demo_dataset.py

Offline/fallback-only generation:
    python scripts/build_demo_dataset.py --offline

Write canonical files only, without updating app runtime copies:
    python scripts/build_demo_dataset.py --skip-app-sync
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


CITIES = ["Kochi", "Delhi", "Jaipur", "Mumbai", "Bangalore"]
REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "data"
USER_AGENT = "GuardlyHackathonDemo/1.0 (local data generation)"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
MIN_ATTRACTIONS_PER_CITY = 8
MIN_POLICE_PER_CITY = 4


CITY_BOUNDS = {
    "Kochi": {"south": 9.89, "west": 76.20, "north": 10.05, "east": 76.36},
    "Delhi": {"south": 28.50, "west": 77.05, "north": 28.75, "east": 77.32},
    "Jaipur": {"south": 26.80, "west": 75.68, "north": 27.05, "east": 75.95},
    "Mumbai": {"south": 18.88, "west": 72.76, "north": 19.22, "east": 72.98},
    "Bangalore": {"south": 12.86, "west": 77.48, "north": 13.08, "east": 77.72},
}


FALLBACK_ATTRACTIONS = {
    "Kochi": [
        ("Fort Kochi Beach", "beach", 9.9656, 76.2422),
        ("Chinese Fishing Nets", "heritage", 9.9673, 76.2429),
        ("Mattancherry Palace", "museum", 9.9581, 76.2596),
        ("Paradesi Synagogue", "heritage", 9.9575, 76.2594),
        ("St Francis Church", "church", 9.9669, 76.2428),
        ("Marine Drive Kochi", "promenade", 9.9816, 76.2762),
        ("Kerala Folklore Museum", "museum", 9.9393, 76.3001),
        ("Hill Palace Museum", "museum", 9.9526, 76.3639),
    ],
    "Delhi": [
        ("Red Fort", "fort", 28.6562, 77.2410),
        ("India Gate", "monument", 28.6129, 77.2295),
        ("Qutub Minar", "monument", 28.5245, 77.1855),
        ("Humayun's Tomb", "monument", 28.5933, 77.2507),
        ("Lotus Temple", "temple", 28.5535, 77.2588),
        ("Jama Masjid", "mosque", 28.6507, 77.2334),
        ("Akshardham Temple", "temple", 28.6127, 77.2773),
        ("National Museum Delhi", "museum", 28.6118, 77.2195),
    ],
    "Jaipur": [
        ("Hawa Mahal", "palace", 26.9239, 75.8267),
        ("Amber Fort", "fort", 26.9855, 75.8513),
        ("City Palace Jaipur", "palace", 26.9258, 75.8237),
        ("Jantar Mantar Jaipur", "observatory", 26.9248, 75.8246),
        ("Nahargarh Fort", "fort", 26.9373, 75.8155),
        ("Albert Hall Museum", "museum", 26.9117, 75.8195),
        ("Jal Mahal", "palace", 26.9535, 75.8460),
        ("Birla Mandir Jaipur", "temple", 26.8924, 75.8152),
    ],
    "Mumbai": [
        ("Gateway of India", "monument", 18.9220, 72.8347),
        ("Chhatrapati Shivaji Maharaj Terminus", "heritage", 18.9398, 72.8355),
        ("Marine Drive Mumbai", "promenade", 18.9432, 72.8234),
        ("Elephanta Caves", "caves", 18.9633, 72.9315),
        ("Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", "museum", 18.9269, 72.8326),
        ("Juhu Beach", "beach", 19.0988, 72.8267),
        ("Haji Ali Dargah", "dargah", 18.9827, 72.8089),
        ("Sanjay Gandhi National Park", "park", 19.2147, 72.9106),
    ],
    "Bangalore": [
        ("Bangalore Palace", "palace", 12.9987, 77.5920),
        ("Lalbagh Botanical Garden", "garden", 12.9507, 77.5848),
        ("Cubbon Park", "park", 12.9763, 77.5929),
        ("Vidhana Soudha", "landmark", 12.9796, 77.5907),
        ("Tipu Sultan's Summer Palace", "palace", 12.9595, 77.5736),
        ("ISKCON Temple Bangalore", "temple", 13.0098, 77.5511),
        ("Government Museum Bangalore", "museum", 12.9745, 77.5963),
        ("Commercial Street", "market", 12.9822, 77.6083),
    ],
}


FALLBACK_POLICE_STATIONS = {
    "Kochi": [
        ("Fort Kochi Police Station", 9.9667, 76.2430),
        ("Ernakulam Central Police Station", 9.9793, 76.2835),
        ("Mattancherry Police Station", 9.9582, 76.2590),
        ("Palarivattom Police Station", 10.0002, 76.3073),
    ],
    "Delhi": [
        ("Connaught Place Police Station", 28.6328, 77.2197),
        ("New Delhi Railway Station Police Post", 28.6425, 77.2195),
        ("Chandni Chowk Police Station", 28.6506, 77.2303),
        ("Parliament Street Police Station", 28.6249, 77.2108),
    ],
    "Jaipur": [
        ("Tourist Police Station Jaipur", 26.9196, 75.7885),
        ("Manak Chowk Police Station", 26.9251, 75.8234),
        ("Amer Police Station", 26.9850, 75.8510),
        ("Sindhi Camp Police Station", 26.9221, 75.8008),
    ],
    "Mumbai": [
        ("Colaba Police Station", 18.9168, 72.8310),
        ("Azad Maidan Police Station", 18.9385, 72.8292),
        ("Marine Drive Police Station", 18.9432, 72.8234),
        ("Juhu Police Station", 19.1030, 72.8270),
    ],
    "Bangalore": [
        ("Cubbon Park Police Station", 12.9767, 77.5963),
        ("Upparpet Police Station", 12.9779, 77.5727),
        ("Commercial Street Police Station", 12.9822, 77.6083),
        ("KR Market Police Station", 12.9615, 77.5761),
    ],
}


FALLBACK_TICKET_PRICES = {
    "Kochi": [
        ("Mattancherry Palace", 5, 100, "Kerala tourism heritage site estimate"),
        ("Kerala Folklore Museum", 100, 200, "Museum ticket estimate"),
        ("Hill Palace Museum", 30, 100, "Museum ticket estimate"),
        ("Fort Kochi Beach", 0, 0, "Public beach access"),
    ],
    "Delhi": [
        ("Red Fort", 35, 600, "ASI monument common Indian/foreign visitor range"),
        ("Qutub Minar", 35, 600, "ASI monument common Indian/foreign visitor range"),
        ("Humayun's Tomb", 35, 600, "ASI monument common Indian/foreign visitor range"),
        ("National Museum Delhi", 20, 650, "Museum visitor range estimate"),
    ],
    "Jaipur": [
        ("Hawa Mahal", 50, 200, "Rajasthan monument visitor range estimate"),
        ("Amber Fort", 100, 550, "Rajasthan monument visitor range estimate"),
        ("City Palace Jaipur", 200, 700, "Palace visitor range estimate"),
        ("Jantar Mantar Jaipur", 50, 200, "Rajasthan monument visitor range estimate"),
    ],
    "Mumbai": [
        ("Elephanta Caves", 40, 600, "ASI monument common Indian/foreign visitor range"),
        ("Gateway of India", 0, 0, "Public monument access"),
        ("CSMVS Museum", 150, 700, "Museum visitor range estimate"),
        ("Sanjay Gandhi National Park", 85, 300, "Park entry and attraction estimate"),
    ],
    "Bangalore": [
        ("Bangalore Palace", 240, 520, "Palace visitor range estimate"),
        ("Lalbagh Botanical Garden", 30, 30, "Garden entry estimate"),
        ("Tipu Sultan's Summer Palace", 20, 200, "Monument visitor range estimate"),
        ("Government Museum Bangalore", 20, 100, "Museum visitor range estimate"),
    ],
}


TOURISM_PRICE_PAGES = {
    "Kochi": [
        "https://www.keralatourism.org/destination/mattancherry-palace-kochi/178",
        "https://www.keralatourism.org/destination/fort-kochi-ernakulam/422",
    ],
    "Delhi": [
        "https://delhitourism.gov.in/",
        "https://asi.nic.in/",
    ],
    "Jaipur": [
        "https://www.tourism.rajasthan.gov.in/",
        "https://www.tourism.rajasthan.gov.in/jaipur.html",
    ],
    "Mumbai": [
        "https://www.maharashtratourism.gov.in/",
        "https://asi.nic.in/",
    ],
    "Bangalore": [
        "https://www.karnatakatourism.org/",
        "https://www.karnatakatourism.org/tour-item/bengaluru-palace/",
    ],
}


PRICE_RANGES = {
    "Kochi": {
        "auto_per_km": (18, 25, "per km", "Typical city auto-rickshaw fare after the minimum fare."),
        "taxi_per_km": (22, 35, "per km", "Regular taxi or app-cab estimate within city limits."),
        "tour_guide": (1500, 3000, "half day", "Licensed local guide for Fort Kochi or heritage areas."),
        "monument_ticket": (20, 500, "per person", "Varies between Indian and foreign visitor ticket categories."),
        "bottled_water": (20, 30, "1 liter bottle", "MRP is usually printed on the bottle."),
    },
    "Delhi": {
        "auto_per_km": (17, 25, "per km", "Typical metered auto-rickshaw range after flag-down fare."),
        "taxi_per_km": (25, 45, "per km", "App-cab and city taxi fares vary with traffic and demand."),
        "tour_guide": (2000, 4500, "half day", "Guide rates are higher around Old Delhi, Red Fort, and Qutub Minar."),
        "monument_ticket": (35, 600, "per person", "Major monuments often have separate Indian and foreign visitor rates."),
        "bottled_water": (20, 30, "1 liter bottle", "Avoid paying above MRP unless buying in a premium venue."),
    },
    "Jaipur": {
        "auto_per_km": (18, 28, "per km", "Tourist-area autos may quote fixed prices instead of meter fares."),
        "taxi_per_km": (24, 40, "per km", "City taxi rates may rise for Amber Fort and outskirts."),
        "tour_guide": (1500, 3500, "half day", "Common for City Palace, Hawa Mahal, and Amber Fort visits."),
        "monument_ticket": (50, 700, "per person", "Composite tickets may cost more but cover multiple sites."),
        "bottled_water": (20, 30, "1 liter bottle", "MRP bottles are widely available near tourist areas."),
    },
    "Mumbai": {
        "auto_per_km": (18, 26, "per km", "Autos are common in suburbs; they are not available in South Mumbai."),
        "taxi_per_km": (28, 50, "per km", "Black-and-yellow taxis and app cabs vary by traffic and surge."),
        "tour_guide": (2500, 5000, "half day", "Popular for Colaba, Dharavi, and heritage walking tours."),
        "monument_ticket": (40, 650, "per person", "Museum and cave site tickets vary by visitor category."),
        "bottled_water": (20, 35, "1 liter bottle", "Prices can be higher inside hotels, airports, and cinemas."),
    },
    "Bangalore": {
        "auto_per_km": (18, 30, "per km", "Metered autos and app autos vary by traffic and demand."),
        "taxi_per_km": (25, 45, "per km", "App-cab fares often rise during peak commute hours."),
        "tour_guide": (1800, 4000, "half day", "Common for city walks, markets, and day trips near Bangalore."),
        "monument_ticket": (25, 500, "per person", "Government gardens and museums are usually lower cost."),
        "bottled_water": (20, 30, "1 liter bottle", "Check printed MRP before paying."),
    },
}


SCAM_SPOTS = {
    "Kochi": [
        ("Fort Kochi Beach", "Overpriced souvenirs", "MEDIUM", "Compare prices before buying beachside souvenirs and avoid pressure sales.", 9.9656, 76.2422),
        ("Chinese Fishing Nets", "Photo fee pressure", "LOW", "Agree on any photo or demonstration fee before participating.", 9.9673, 76.2429),
        ("Jew Town", "Inflated antique prices", "MEDIUM", "Ask for authenticity proof and avoid buying expensive antiques impulsively.", 9.9576, 76.2595),
        ("Ernakulam Railway Station", "Fake porter charge", "MEDIUM", "Use official porters and confirm the fee before handing over luggage.", 9.9699, 76.2918),
        ("Marine Drive", "Unofficial boat ride", "HIGH", "Book boat rides only through visible counters or trusted operators.", 9.9816, 76.2762),
        ("Fort Kochi Ferry Terminal", "Unofficial ferry helper", "MEDIUM", "Use posted ferry counters and avoid paying intermediaries.", 9.9647, 76.2427),
    ],
    "Delhi": [
        ("New Delhi Railway Station", "Fake ticket office", "HIGH", "Ignore claims that your train is cancelled and use official railway counters or apps.", 28.6425, 77.2195),
        ("Connaught Place", "Forced shopping detour", "MEDIUM", "Be cautious if a stranger redirects you to a specific travel shop or emporium.", 28.6315, 77.2167),
        ("Paharganj Main Bazaar", "Hotel commission scam", "MEDIUM", "Confirm hotel bookings directly and avoid unsolicited agents.", 28.6441, 77.2141),
        ("India Gate", "Overpriced photography", "LOW", "Set the price clearly before accepting printed photos or instant pictures.", 28.6129, 77.2295),
        ("Chandni Chowk", "Pickpocket distraction", "HIGH", "Keep bags closed and phones secure in crowded lanes.", 28.6506, 77.2303),
        ("Red Fort Entry", "Unofficial guide pressure", "MEDIUM", "Use licensed guides and verify ticket counters before paying.", 28.6562, 77.2410),
    ],
    "Jaipur": [
        ("Hawa Mahal", "Unofficial guide", "MEDIUM", "Use licensed guides and confirm the total fee before starting.", 26.9239, 75.8267),
        ("Amber Fort Parking Area", "Inflated elephant or jeep ride", "MEDIUM", "Check official rates before agreeing to rides up to the fort.", 26.9855, 75.8513),
        ("Johari Bazaar", "Fake gemstone sale", "HIGH", "Avoid high-value gem purchases without certification and independent verification.", 26.9216, 75.8266),
        ("City Palace Gate", "Ticket markup", "LOW", "Buy tickets only from official counters or official online links.", 26.9258, 75.8237),
        ("Bapu Bazaar", "Aggressive bargaining pressure", "MEDIUM", "Walk away if a shopkeeper pressures you or changes the agreed price.", 26.9176, 75.8207),
        ("Jaipur Railway Station", "Fake guides", "HIGH", "Unauthorized guides may overcharge tourists or redirect them to commission shops.", 26.9196, 75.7885),
        ("Jaipur Railway Station", "Taxi overcharging", "MEDIUM", "Negotiate the fare or use a trusted ride app before starting the trip.", 26.9196, 75.7885),
    ],
    "Mumbai": [
        ("Gateway of India", "Unofficial ferry ticket", "HIGH", "Use official ferry counters and avoid buying tickets from roaming agents.", 18.9220, 72.8347),
        ("Colaba Causeway", "Counterfeit goods", "MEDIUM", "Assume branded goods on street stalls may be counterfeit.", 18.9154, 72.8267),
        ("Chhatrapati Shivaji Maharaj Terminus", "Fake taxi helper", "MEDIUM", "Use prepaid taxi counters or trusted ride-hailing pickup points.", 18.9398, 72.8355),
        ("Marine Drive", "Overpriced street snack", "LOW", "Check prices before ordering from mobile vendors.", 18.9432, 72.8234),
        ("Juhu Beach", "Bag distraction theft", "MEDIUM", "Do not leave bags unattended while taking photos or buying snacks.", 19.0988, 72.8267),
        ("Elephanta Ferry Boarding", "Inflated boat package", "HIGH", "Confirm official ferry prices and avoid bundled tour pressure.", 18.9217, 72.8346),
    ],
    "Bangalore": [
        ("Majestic Bus Station", "Fake bus assistance", "MEDIUM", "Verify bus platforms through official displays or staff.", 12.9779, 77.5727),
        ("KR Market", "Pickpocket distraction", "HIGH", "Keep valuables in front pockets or zipped bags in dense crowds.", 12.9615, 77.5761),
        ("MG Road", "Overpriced pub crawl offer", "MEDIUM", "Avoid paying strangers upfront for nightlife packages.", 12.9756, 77.6067),
        ("Bangalore Palace", "Unofficial guide", "LOW", "Confirm guide identity and total cost before accepting help.", 12.9987, 77.5920),
        ("Commercial Street", "Inflated tourist price", "MEDIUM", "Compare shops and confirm the final price before payment.", 12.9822, 77.6083),
        ("Kempegowda Bus Station", "Taxi overcharging", "MEDIUM", "Confirm the fare or use a trusted app before leaving the station.", 12.9779, 77.5727),
    ],
}


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def request_text(url: str, timeout: float) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def request_json(url: str, data: bytes | None, timeout: float) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def overpass_query(city: str, selector: str, timeout: float) -> list[dict[str, Any]]:
    bounds = CITY_BOUNDS[city]
    bbox = f'{bounds["south"]},{bounds["west"]},{bounds["north"]},{bounds["east"]}'
    query = f"""
    [out:json][timeout:20];
    (
      node{selector}({bbox});
      way{selector}({bbox});
      relation{selector}({bbox});
    );
    out center 40;
    """
    payload = urllib.parse.urlencode({"data": query}).encode("utf-8")
    response = request_json(OVERPASS_URL, payload, timeout)
    return response.get("elements", [])


def osm_position(element: dict[str, Any]) -> tuple[float, float] | None:
    lat = element.get("lat") or element.get("center", {}).get("lat")
    lon = element.get("lon") or element.get("center", {}).get("lon")

    if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
        return float(lat), float(lon)

    return None


def fallback_attractions(city: str) -> list[dict[str, Any]]:
    return [
        {
            "id": f"{slugify(city)}-{slugify(name)}",
            "city": city,
            "name": name,
            "category": category,
            "lat": lat,
            "lng": lng,
            "source": "static_fallback",
        }
        for name, category, lat, lng in FALLBACK_ATTRACTIONS[city]
    ]


def fallback_police_stations(city: str) -> list[dict[str, Any]]:
    return [
        {
            "id": f"{slugify(city)}-{slugify(name)}",
            "city": city,
            "name": name,
            "lat": lat,
            "lng": lng,
            "source": "static_fallback",
        }
        for name, lat, lng in FALLBACK_POLICE_STATIONS[city]
    ]


def collect_attractions(city: str, offline: bool, timeout: float) -> list[dict[str, Any]]:
    fallback = fallback_attractions(city)
    if offline:
        return fallback

    try:
        elements = overpass_query(
            city,
            '["tourism"~"attraction|museum|viewpoint|gallery"]["name"]',
            timeout,
        )
    except Exception as error:
        print(f"{city}: OSM attraction lookup failed, using fallback ({error})")
        return fallback

    seen = set()
    records: list[dict[str, Any]] = []
    for element in elements:
        tags = element.get("tags", {})
        name = tags.get("name")
        position = osm_position(element)
        if not name or not position:
            continue

        key = slugify(name)
        if key in seen:
            continue
        seen.add(key)
        lat, lng = position
        records.append(
            {
                "id": f"{slugify(city)}-{key}",
                "city": city,
                "name": name,
                "category": tags.get("tourism", "attraction"),
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "source": "openstreetmap",
                "osm_type": element.get("type"),
                "osm_id": element.get("id"),
            }
        )

    if len(records) < MIN_ATTRACTIONS_PER_CITY:
        merged = {record["id"]: record for record in records}
        merged.update({record["id"]: record for record in fallback})
        records = list(merged.values())

    return sorted(records, key=lambda record: record["name"])[:12]


def collect_police_stations(city: str, offline: bool, timeout: float) -> list[dict[str, Any]]:
    fallback = fallback_police_stations(city)
    if offline:
        return fallback

    try:
        elements = overpass_query(city, '["amenity"="police"]["name"]', timeout)
    except Exception as error:
        print(f"{city}: OSM police lookup failed, using fallback ({error})")
        return fallback

    seen = set()
    records: list[dict[str, Any]] = []
    for element in elements:
        tags = element.get("tags", {})
        name = tags.get("name")
        position = osm_position(element)
        if not name or not position:
            continue

        key = slugify(name)
        if key in seen:
            continue
        seen.add(key)
        lat, lng = position
        records.append(
            {
                "id": f"{slugify(city)}-{key}",
                "city": city,
                "name": name,
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "source": "openstreetmap",
                "osm_type": element.get("type"),
                "osm_id": element.get("id"),
            }
        )

    if len(records) < MIN_POLICE_PER_CITY:
        merged = {record["id"]: record for record in records}
        merged.update({record["id"]: record for record in fallback})
        records = list(merged.values())

    return sorted(records, key=lambda record: record["name"])[:8]


def extract_rupee_amounts(page_text: str) -> list[int]:
    matches = re.findall(r"(?:₹|Rs\.?|INR)\s?([0-9][0-9,]{0,5})", page_text, flags=re.IGNORECASE)
    amounts = sorted({int(match.replace(",", "")) for match in matches})
    return [amount for amount in amounts if amount <= 5000]


def collect_ticket_prices(city: str, offline: bool, timeout: float) -> list[dict[str, Any]]:
    records = [
        {
            "id": f"{slugify(city)}-{slugify(name)}",
            "city": city,
            "attraction_name": name,
            "min_inr": min_inr,
            "max_inr": max_inr,
            "unit": "per person",
            "note": note,
            "source": "static_fallback",
        }
        for name, min_inr, max_inr, note in FALLBACK_TICKET_PRICES[city]
    ]

    if offline:
        return records

    scraped_amounts: list[int] = []
    source_url = ""
    for url in TOURISM_PRICE_PAGES[city]:
        try:
            page_text = request_text(url, timeout)
            amounts = extract_rupee_amounts(page_text)
            if amounts:
                scraped_amounts.extend(amounts)
                source_url = url
                break
        except Exception as error:
            print(f"{city}: tourism page scrape failed for {url} ({error})")
        time.sleep(0.2)

    if not scraped_amounts:
        return records

    min_price = min(scraped_amounts)
    max_price = max(scraped_amounts)
    first_record = records[0].copy()
    first_record.update(
        {
            "min_inr": min_price,
            "max_inr": max_price,
            "note": "Extracted rupee amounts from a public tourism or monument page; verify before production use.",
            "source": "public_tourism_page",
            "source_url": source_url,
        }
    )
    return [first_record, *records[1:]]


def build_prices() -> dict[str, dict[str, dict[str, Any]]]:
    prices: dict[str, dict[str, dict[str, Any]]] = {}
    for city, categories in PRICE_RANGES.items():
        prices[city] = {
            category: {
                "min_inr": min_inr,
                "max_inr": max_inr,
                "unit": unit,
                "note": note,
            }
            for category, (min_inr, max_inr, unit, note) in categories.items()
        }
    return prices


def build_scam_spots() -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for city, spots in SCAM_SPOTS.items():
        duplicate_counts: dict[str, int] = {}
        for location_name, scam_type, risk_level, warning_message, lat, lng in spots:
            base_slug = f"{slugify(city)}-{slugify(location_name)}"
            duplicate_counts[base_slug] = duplicate_counts.get(base_slug, 0) + 1
            suffix = "" if duplicate_counts[base_slug] == 1 else f"-{duplicate_counts[base_slug]}"
            records.append(
                {
                    "id": f"{base_slug}{suffix}",
                    "city": city,
                    "location_name": location_name,
                    "scam_type": scam_type,
                    "risk_level": risk_level,
                    "warning_message": warning_message,
                    "position": {"lat": lat, "lng": lng},
                    "source": "static_fallback",
                }
            )
    return sorted(records, key=lambda record: (record["city"], record["location_name"], record["scam_type"]))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)
        file.write("\n")


def grouped_backend_scam_spots(scam_spots: list[dict[str, Any]]) -> dict[str, list[dict[str, str]]]:
    grouped: dict[str, list[dict[str, str]]] = {city: [] for city in CITIES}
    for spot in scam_spots:
        grouped[spot["city"]].append(
            {
                "location_name": spot["location_name"],
                "scam_type": spot["scam_type"],
                "risk_level": spot["risk_level"].lower(),
                "warning_message": spot["warning_message"],
            }
        )
    return grouped


def frontend_scam_spots(scam_spots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": spot["id"],
            "city": spot["city"],
            "location_name": spot["location_name"],
            "scam_type": spot["scam_type"],
            "risk_level": spot["risk_level"],
            "warning_message": spot["warning_message"],
            "position": spot["position"],
        }
        for spot in scam_spots
    ]


def build_dataset(offline: bool, timeout: float) -> dict[str, Any]:
    attractions = []
    ticket_prices = []
    police_stations = []

    for city in CITIES:
        attractions.extend(collect_attractions(city, offline, timeout))
        ticket_prices.extend(collect_ticket_prices(city, offline, timeout))
        police_stations.extend(collect_police_stations(city, offline, timeout))

    return {
        "attractions": sorted(attractions, key=lambda record: (record["city"], record["name"])),
        "ticket_prices": sorted(
            ticket_prices,
            key=lambda record: (record["city"], record["attraction_name"]),
        ),
        "police_stations": sorted(
            police_stations,
            key=lambda record: (record["city"], record["name"]),
        ),
        "scam_spots": build_scam_spots(),
        "prices": build_prices(),
    }


def write_dataset(dataset: dict[str, Any], output_dir: Path, skip_app_sync: bool) -> None:
    write_json(output_dir / "attractions.json", dataset["attractions"])
    write_json(output_dir / "ticket_prices.json", dataset["ticket_prices"])
    write_json(output_dir / "police_stations.json", dataset["police_stations"])
    write_json(output_dir / "scam_spots.json", dataset["scam_spots"])
    write_json(output_dir / "prices.json", dataset["prices"])

    if skip_app_sync:
        return

    write_json(REPO_ROOT / "backend" / "app" / "data" / "prices.json", dataset["prices"])
    write_json(
        REPO_ROOT / "backend" / "app" / "data" / "scam_spots.json",
        grouped_backend_scam_spots(dataset["scam_spots"]),
    )
    write_json(
        REPO_ROOT / "frontend" / "src" / "data" / "scam_spots.json",
        frontend_scam_spots(dataset["scam_spots"]),
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build local GUARDLY demo JSON datasets.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Canonical output directory. Defaults to repo-root/data.",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Use curated fallback values only; do not call public websites or APIs.",
    )
    parser.add_argument(
        "--skip-app-sync",
        action="store_true",
        help="Do not update backend/frontend runtime JSON copies.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=8.0,
        help="Per-request timeout in seconds for public data sources.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dataset = build_dataset(offline=args.offline, timeout=args.timeout)
    write_dataset(dataset, args.output_dir, args.skip_app_sync)

    print("GUARDLY demo dataset generated.")
    print(f"Canonical output: {args.output_dir.resolve()}")
    print(f"Attractions: {len(dataset['attractions'])}")
    print(f"Ticket price records: {len(dataset['ticket_prices'])}")
    print(f"Police stations: {len(dataset['police_stations'])}")
    print(f"Scam spots: {len(dataset['scam_spots'])}")
    print(f"Price categories: {sum(len(city_prices) for city_prices in dataset['prices'].values())}")

    if not args.skip_app_sync:
        print("Runtime JSON copies updated for backend and frontend.")

    return 0


if __name__ == "__main__":
    sys.exit(main())

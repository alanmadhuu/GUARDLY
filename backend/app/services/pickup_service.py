import json
import math
import os
import urllib.parse
import urllib.request
from typing import Any

from app.models.pickup_models import (
    PickupCandidate,
    PickupOptimizeRequest,
    PickupOptimizeResponse,
    PickupScoreBreakdown,
)
from app.models.route_models import Coordinates
from app.services.ai_service import is_demo_mode_enabled


GOOGLE_DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"
GOOGLE_NEARBY_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
GOOGLE_NEAREST_ROADS_URL = "https://roads.googleapis.com/v1/nearestRoads"
REQUEST_TIMEOUT_SECONDS = 4
EARTH_RADIUS_M = 6_371_000

CandidateSeed = tuple[int, int, str]

CANDIDATE_SEEDS: list[CandidateSeed] = [
    (100, 35, "Near-side road pickup"),
    (200, 115, "Secondary street pickup"),
    (300, 205, "Lower congestion pickup"),
    (500, 295, "Main-road access pickup"),
    (350, 0, "Transit-friendly pickup"),
]


def clamp_score(value: float) -> int:
    return round(max(0, min(100, value)))


def get_google_api_key() -> str:
    return os.getenv("GOOGLE_MAPS_API_KEY", "").strip()


def has_google_api_key() -> bool:
    api_key = get_google_api_key()
    return bool(api_key) and not api_key.startswith("your_")


def destination_point(origin: Coordinates, distance_m: int, bearing_degrees: int) -> Coordinates:
    bearing = math.radians(bearing_degrees)
    lat1 = math.radians(origin.lat)
    lon1 = math.radians(origin.lng)
    angular_distance = distance_m / EARTH_RADIUS_M

    lat2 = math.asin(
        math.sin(lat1) * math.cos(angular_distance)
        + math.cos(lat1) * math.sin(angular_distance) * math.cos(bearing)
    )
    lon2 = lon1 + math.atan2(
        math.sin(bearing) * math.sin(angular_distance) * math.cos(lat1),
        math.cos(angular_distance) - math.sin(lat1) * math.sin(lat2),
    )

    return Coordinates(lat=round(math.degrees(lat2), 6), lng=round(math.degrees(lon2), 6))


def haversine_distance_m(first: Coordinates, second: Coordinates) -> int:
    lat1 = math.radians(first.lat)
    lat2 = math.radians(second.lat)
    delta_lat = lat2 - lat1
    delta_lng = math.radians(second.lng - first.lng)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
    )
    return round(EARTH_RADIUS_M * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def get_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    encoded_params = urllib.parse.urlencode(params)
    request = urllib.request.Request(
        f"{url}?{encoded_params}",
        headers={"User-Agent": "TouristShield/1.0"},
    )
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        return json.loads(response.read().decode("utf-8"))


def snap_to_nearest_road(location: Coordinates, api_key: str) -> Coordinates | None:
    try:
        response = get_json(
            GOOGLE_NEAREST_ROADS_URL,
            {
                "points": f"{location.lat},{location.lng}",
                "key": api_key,
            },
        )
    except Exception:
        return None

    snapped_points = response.get("snappedPoints", [])
    if not snapped_points:
        return None

    snapped_location = snapped_points[0].get("location", {})
    lat = snapped_location.get("latitude")
    lng = snapped_location.get("longitude")
    if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
        return Coordinates(lat=round(float(lat), 6), lng=round(float(lng), 6))

    return None


def get_walking_distance_m(origin: Coordinates, candidate: Coordinates, api_key: str) -> int | None:
    try:
        response = get_json(
            GOOGLE_DIRECTIONS_URL,
            {
                "origin": f"{origin.lat},{origin.lng}",
                "destination": f"{candidate.lat},{candidate.lng}",
                "mode": "walking",
                "key": api_key,
            },
        )
    except Exception:
        return None

    routes = response.get("routes", [])
    legs = routes[0].get("legs", []) if routes else []
    distance = legs[0].get("distance", {}) if legs else {}
    value = distance.get("value")
    return int(value) if isinstance(value, int) else None


def count_nearby_places(location: Coordinates, place_type: str, radius_m: int, api_key: str) -> int:
    try:
        response = get_json(
            GOOGLE_NEARBY_SEARCH_URL,
            {
                "location": f"{location.lat},{location.lng}",
                "radius": radius_m,
                "type": place_type,
                "key": api_key,
            },
        )
    except Exception:
        return 0

    results = response.get("results", [])
    return len(results) if isinstance(results, list) else 0


def estimate_scores(
    radius_m: int,
    walking_distance_m: int,
    snapped_to_road: bool,
    nearby_hotspots: int,
    nearby_transit: int,
    used_google: bool,
) -> PickupScoreBreakdown:
    road_accessibility = 88 if snapped_to_road else 68
    pickup_convenience = 92 - abs(250 - walking_distance_m) / 6 + nearby_transit * 2
    traffic_congestion = 82 - nearby_hotspots * 5 + min(radius_m, 500) / 20
    tourist_hotspot_density = 92 - nearby_hotspots * 8

    if not used_google:
        road_accessibility = 75 + min(radius_m, 500) / 25
        traffic_congestion = 60 + min(radius_m, 500) / 12
        tourist_hotspot_density = 88 - max(0, 300 - radius_m) / 8
        pickup_convenience = 92 - abs(250 - walking_distance_m) / 8

    return PickupScoreBreakdown(
        road_accessibility=clamp_score(road_accessibility),
        traffic_congestion=clamp_score(traffic_congestion),
        tourist_hotspot_density=clamp_score(tourist_hotspot_density),
        pickup_convenience=clamp_score(pickup_convenience),
    )


def combine_pickup_score(breakdown: PickupScoreBreakdown) -> int:
    return clamp_score(
        breakdown.road_accessibility * 0.32
        + breakdown.traffic_congestion * 0.24
        + breakdown.tourist_hotspot_density * 0.2
        + breakdown.pickup_convenience * 0.24
    )


def build_reason(candidate: PickupCandidate) -> str:
    breakdown = candidate.score_breakdown
    strongest = max(
        [
            ("better road access", breakdown.road_accessibility),
            ("lower congestion", breakdown.traffic_congestion),
            ("lower tourist hotspot density", breakdown.tourist_hotspot_density),
            ("easier pickup access", breakdown.pickup_convenience),
        ],
        key=lambda item: item[1],
    )[0]

    return f"{strongest.capitalize()} with a short {candidate.walking_distance_m}m walk."


def generate_pickup_candidates(payload: PickupOptimizeRequest) -> list[PickupCandidate]:
    api_key = get_google_api_key()
    use_google = has_google_api_key() and not is_demo_mode_enabled()
    candidates: list[PickupCandidate] = []

    for index, (radius_m, bearing, label) in enumerate(CANDIDATE_SEEDS, start=1):
        raw_location = destination_point(payload.current_location, radius_m, bearing)
        snapped_location = snap_to_nearest_road(raw_location, api_key) if use_google else None
        location = snapped_location or raw_location
        walking_distance = (
            get_walking_distance_m(payload.current_location, location, api_key)
            if use_google
            else None
        )
        walking_distance_m = walking_distance or haversine_distance_m(
            payload.current_location,
            location,
        )
        nearby_hotspots = (
            count_nearby_places(location, "tourist_attraction", 160, api_key) if use_google else 0
        )
        nearby_transit = (
            count_nearby_places(location, "transit_station", 180, api_key) if use_google else 0
        )
        breakdown = estimate_scores(
            radius_m=radius_m,
            walking_distance_m=walking_distance_m,
            snapped_to_road=snapped_location is not None,
            nearby_hotspots=nearby_hotspots,
            nearby_transit=nearby_transit,
            used_google=use_google,
        )
        pickup_score = combine_pickup_score(breakdown)
        candidate = PickupCandidate(
            id=f"pickup-{index}",
            name=label,
            location=location,
            walking_distance_m=walking_distance_m,
            radius_m=radius_m,
            pickup_score=pickup_score,
            score_breakdown=breakdown,
            reason="",
            data_source="google_maps" if use_google else "demo_heuristic",
        )
        candidate.reason = build_reason(candidate)
        candidates.append(candidate)

    return sorted(candidates, key=lambda candidate: candidate.pickup_score, reverse=True)


def optimize_pickup(payload: PickupOptimizeRequest) -> PickupOptimizeResponse:
    candidates = generate_pickup_candidates(payload)
    best_candidate = candidates[0]

    return PickupOptimizeResponse(
        best_pickup_location=best_candidate.name,
        walking_distance_m=best_candidate.walking_distance_m,
        pickup_score=best_candidate.pickup_score,
        reason=best_candidate.reason,
        current_location=payload.current_location,
        recommended_location=best_candidate.location,
        candidates=candidates,
        provider_fare_data_used=False,
    )

import json
import os
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass

from app.models.route_models import RouteCheckRequest, RouteCheckResponse
from app.utils.geo import (
    calculate_deviation_percentage,
    calculate_route_risk,
    haversine_distance,
    is_route_deviation_detected,
)

GOOGLE_DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"
REQUEST_TIMEOUT_SECONDS = 5


@dataclass
class RouteContext:
    distance_km: float
    traffic_level: str = "UNKNOWN"
    traffic_delay_minutes: int = 0
    traffic_adjustment_applied: bool = False


def get_google_api_key() -> str:
    return os.getenv("GOOGLE_MAPS_API_KEY", "").strip()


def has_google_api_key() -> bool:
    api_key = get_google_api_key()
    return bool(api_key) and not api_key.startswith("your_")


def get_google_route_context(payload: RouteCheckRequest) -> RouteContext | None:
    if not has_google_api_key():
        return None

    params = {
        "origin": f"{payload.origin.lat},{payload.origin.lng}",
        "destination": f"{payload.destination.lat},{payload.destination.lng}",
        "departure_time": str(int(time.time())),
        "mode": "driving",
        "traffic_model": "best_guess",
        "key": get_google_api_key(),
    }
    request = urllib.request.Request(
        f"{GOOGLE_DIRECTIONS_URL}?{urllib.parse.urlencode(params)}",
        headers={"User-Agent": "Guardly/1.0"},
    )

    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception:
        return None

    if data.get("status") != "OK":
        return None

    routes = data.get("routes", [])
    legs = routes[0].get("legs", []) if routes else []
    leg = legs[0] if legs else {}
    distance = leg.get("distance", {})
    distance_m = distance.get("value")

    if not isinstance(distance_m, (int, float)):
        return None

    duration_seconds = leg.get("duration", {}).get("value")
    traffic_seconds = leg.get("duration_in_traffic", {}).get("value")
    traffic_delay_minutes = 0
    traffic_level = "UNKNOWN"
    traffic_adjustment_applied = False

    if isinstance(duration_seconds, (int, float)) and isinstance(traffic_seconds, (int, float)):
        traffic_delay_seconds = max(0, traffic_seconds - duration_seconds)
        traffic_delay_minutes = round(traffic_delay_seconds / 60)
        delay_ratio = traffic_delay_seconds / duration_seconds if duration_seconds > 0 else 0
        traffic_level = classify_traffic_level(delay_ratio)
        traffic_adjustment_applied = delay_ratio >= 0.15

    return RouteContext(
        distance_km=float(distance_m) / 1000,
        traffic_level=traffic_level,
        traffic_delay_minutes=traffic_delay_minutes,
        traffic_adjustment_applied=traffic_adjustment_applied,
    )


def get_driving_distance_km(payload: RouteCheckRequest) -> float | None:
    route_context = get_google_route_context(payload)
    return route_context.distance_km if route_context else None


def classify_traffic_level(delay_ratio: float) -> str:
    if delay_ratio >= 0.35:
        return "HEAVY"
    if delay_ratio >= 0.15:
        return "MODERATE"
    return "LOW"


def calculate_traffic_allowance(traffic_level: str) -> float:
    if traffic_level == "HEAVY":
        return 0.15
    if traffic_level == "MODERATE":
        return 0.08
    return 0.0


def calculate_traffic_aware_route_risk(
    actual_distance_km: float,
    expected_distance_km: float,
    traffic_level: str,
) -> str:
    allowance = calculate_traffic_allowance(traffic_level)

    if actual_distance_km <= expected_distance_km * (1.15 + allowance):
        return "LOW"

    if actual_distance_km <= expected_distance_km * (1.30 + allowance):
        return "MEDIUM"

    return "HIGH"


def get_expected_route_context(payload: RouteCheckRequest) -> RouteContext:
    route_context = get_google_route_context(payload)
    if route_context is not None:
        return route_context
    straight_line_distance_km = haversine_distance(
        payload.origin.lat,
        payload.origin.lng,
        payload.destination.lat,
        payload.destination.lng,
    )
    return RouteContext(distance_km=straight_line_distance_km * 1.2)


def get_expected_distance_km(payload: RouteCheckRequest) -> float:
    return get_expected_route_context(payload).distance_km


def check_route(payload: RouteCheckRequest) -> RouteCheckResponse:
    route_context = get_expected_route_context(payload)
    expected_distance_km = route_context.distance_km
    if route_context.traffic_adjustment_applied:
        risk_level = calculate_traffic_aware_route_risk(
            payload.actual_distance_km,
            expected_distance_km,
            route_context.traffic_level,
        )
    else:
        risk_level = calculate_route_risk(payload.actual_distance_km, expected_distance_km)
    route_deviation_detected = is_route_deviation_detected(risk_level)

    return RouteCheckResponse(
        expected_distance_km=round(expected_distance_km, 1),
        actual_distance_km=round(payload.actual_distance_km, 1),
        deviation_percentage=round(
            calculate_deviation_percentage(payload.actual_distance_km, expected_distance_km),
            1,
        ),
        risk_level=risk_level,
        route_deviation_detected=route_deviation_detected,
        message=(
            "Possible route deviation detected"
            if route_deviation_detected
            else "Route distance is within expected range"
        ),
        traffic_level=route_context.traffic_level,
        traffic_delay_minutes=route_context.traffic_delay_minutes,
        traffic_adjustment_applied=route_context.traffic_adjustment_applied,
    )

from math import asin, cos, radians, sin, sqrt


EARTH_RADIUS_KM = 6371.0


def haversine_distance(origin_lat: float, origin_lng: float, destination_lat: float, destination_lng: float) -> float:
    origin_lat_rad = radians(origin_lat)
    origin_lng_rad = radians(origin_lng)
    destination_lat_rad = radians(destination_lat)
    destination_lng_rad = radians(destination_lng)

    lat_delta = destination_lat_rad - origin_lat_rad
    lng_delta = destination_lng_rad - origin_lng_rad

    haversine_value = (
        sin(lat_delta / 2) ** 2
        + cos(origin_lat_rad) * cos(destination_lat_rad) * sin(lng_delta / 2) ** 2
    )

    return 2 * EARTH_RADIUS_KM * asin(sqrt(haversine_value))


def calculate_route_risk(actual_distance_km: float, expected_distance_km: float) -> str:
    if actual_distance_km <= expected_distance_km * 1.15:
        return "LOW"

    if actual_distance_km <= expected_distance_km * 1.30:
        return "MEDIUM"

    return "HIGH"


def calculate_deviation_percentage(actual_distance_km: float, expected_distance_km: float) -> float:
    if actual_distance_km <= expected_distance_km:
        return 0.0

    return ((actual_distance_km - expected_distance_km) / expected_distance_km) * 100


def is_route_deviation_detected(risk_level: str) -> bool:
    return risk_level in {"MEDIUM", "HIGH"}

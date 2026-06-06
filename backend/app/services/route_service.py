from app.models.route_models import RouteCheckRequest, RouteCheckResponse
from app.utils.geo import (
    calculate_deviation_percentage,
    calculate_route_risk,
    haversine_distance,
    is_route_deviation_detected,
)


def check_route(payload: RouteCheckRequest) -> RouteCheckResponse:
    straight_line_distance_km = haversine_distance(
        payload.origin.lat,
        payload.origin.lng,
        payload.destination.lat,
        payload.destination.lng,
    )
    expected_distance_km = straight_line_distance_km * 1.2
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
    )

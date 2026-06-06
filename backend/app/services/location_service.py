from typing import Any

from fastapi import HTTPException, status

from app.models.location_models import LocationWarningRequest, LocationWarningResponse
from app.utils.matching import (
    calculate_location_risk_score,
    get_matching_key,
    get_matching_location_name,
    get_warnings_for_location,
)


def check_location_warning(
    payload: LocationWarningRequest,
    scam_spots: dict[str, list[dict[str, Any]]],
) -> LocationWarningResponse:
    matching_city = get_matching_key(scam_spots, payload.city)

    if matching_city is None:
        available_cities = ", ".join(sorted(scam_spots.keys()))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"City '{payload.city}' is not supported. Available cities: {available_cities}.",
        )

    city_spots = scam_spots[matching_city]
    matching_location_name = get_matching_location_name(city_spots, payload.location_name)

    if matching_location_name is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No scam warning locations are available for '{payload.location_name}'.",
        )

    warnings = get_warnings_for_location(city_spots, matching_location_name)

    return LocationWarningResponse(
        city=matching_city,
        location_name=matching_location_name,
        risk_score=calculate_location_risk_score(warnings),
        warnings=warnings,
    )

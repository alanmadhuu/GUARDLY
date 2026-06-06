from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from app.models.location_models import LocationWarningRequest, LocationWarningResponse
from app.services.location_service import check_location_warning


router = APIRouter()


def get_loaded_scam_spots(request: Request) -> dict[str, list[dict[str, Any]]]:
    if not hasattr(request.app.state, "tourist_data"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tourist data is not loaded yet. Please try again shortly.",
        )

    return request.app.state.tourist_data["scam_spots"]


@router.post("/location-warning", response_model=LocationWarningResponse)
def location_warning_endpoint(
    payload: LocationWarningRequest,
    request: Request,
) -> LocationWarningResponse:
    return check_location_warning(payload, get_loaded_scam_spots(request))

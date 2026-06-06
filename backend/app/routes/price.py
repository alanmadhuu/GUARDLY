from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from app.models.price_models import PriceCheckRequest, PriceCheckResponse
from app.services.price_service import check_price


router = APIRouter()


def get_loaded_prices(request: Request) -> dict[str, dict[str, dict[str, Any]]]:
    if not hasattr(request.app.state, "tourist_data"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tourist data is not loaded yet. Please try again shortly.",
        )

    return request.app.state.tourist_data["prices"]


@router.post("/check-price", response_model=PriceCheckResponse)
def check_price_endpoint(payload: PriceCheckRequest, request: Request) -> PriceCheckResponse:
    return check_price(payload, get_loaded_prices(request))

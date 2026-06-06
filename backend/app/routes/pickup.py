from fastapi import APIRouter

from app.models.pickup_models import PickupOptimizeRequest, PickupOptimizeResponse
from app.services.pickup_service import optimize_pickup


router = APIRouter()


@router.post("/optimize-pickup", response_model=PickupOptimizeResponse)
def optimize_pickup_endpoint(payload: PickupOptimizeRequest) -> PickupOptimizeResponse:
    return optimize_pickup(payload)

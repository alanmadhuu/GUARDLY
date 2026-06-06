from fastapi import APIRouter

from app.models.route_models import RouteCheckRequest, RouteCheckResponse
from app.services.route_service import check_route


router = APIRouter()


@router.post("/check-route", response_model=RouteCheckResponse)
def check_route_endpoint(payload: RouteCheckRequest) -> RouteCheckResponse:
    return check_route(payload)

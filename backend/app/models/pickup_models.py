from typing import Literal

from pydantic import BaseModel, Field

from app.models.route_models import Coordinates


class PickupOptimizeRequest(BaseModel):
    current_location: Coordinates
    destination_location: Coordinates | None = None
    optimize_for: Literal["current_location", "destination"] = "current_location"


class PickupScoreBreakdown(BaseModel):
    road_accessibility: int
    traffic_congestion: int
    tourist_hotspot_density: int
    pickup_convenience: int


class PickupCandidate(BaseModel):
    id: str
    name: str
    location: Coordinates
    walking_distance_m: int
    radius_m: int
    pickup_score: int
    score_breakdown: PickupScoreBreakdown
    reason: str
    data_source: str


class PickupOptimizeResponse(BaseModel):
    best_pickup_location: str
    walking_distance_m: int
    pickup_score: int
    reason: str
    current_location: Coordinates
    destination_location: Coordinates | None = None
    optimization_target: str = "current_location"
    optimization_location: Coordinates
    recommended_location: Coordinates
    candidates: list[PickupCandidate]
    provider_fare_data_used: bool = Field(
        default=False,
        description="Ride-provider fare data is not used unless an approved integration is added.",
    )

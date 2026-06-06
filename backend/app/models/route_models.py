from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    lat: float = Field(..., ge=-90, le=90, examples=[26.9124])
    lng: float = Field(..., ge=-180, le=180, examples=[75.7873])


class RouteCheckRequest(BaseModel):
    origin: Coordinates
    destination: Coordinates
    actual_distance_km: float = Field(..., gt=0, examples=[8.5])


class RouteCheckResponse(BaseModel):
    expected_distance_km: float
    actual_distance_km: float
    deviation_percentage: float
    risk_level: str
    route_deviation_detected: bool
    message: str

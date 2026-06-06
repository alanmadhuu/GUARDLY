from pydantic import BaseModel, Field


class LocationWarningRequest(BaseModel):
    city: str = Field(..., min_length=1, examples=["Jaipur"])
    location_name: str = Field(..., min_length=1, examples=["Jaipur Railway Station"])


class ScamWarning(BaseModel):
    scam_type: str
    risk_level: str
    warning_message: str


class LocationWarningResponse(BaseModel):
    city: str
    location_name: str
    risk_score: int
    warnings: list[ScamWarning]

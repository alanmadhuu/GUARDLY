from pydantic import BaseModel, Field


class PriceCheckRequest(BaseModel):
    city: str = Field(..., examples=["Jaipur"])
    category: str = Field(..., examples=["auto_per_km"])
    quoted_price: float = Field(..., gt=0, examples=[500])
    distance_km: float | None = Field(default=None, gt=0, examples=[3])


class PriceCheckResponse(BaseModel):
    city: str
    category: str
    quoted_price: float
    expected_range: str
    risk_level: str
    overcharge_percentage: int
    money_saved: int
    message: str
    calculation_note: str

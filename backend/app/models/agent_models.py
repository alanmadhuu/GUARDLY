from typing import Any

from pydantic import BaseModel, Field


class AgentQueryRequest(BaseModel):
    intent: str = Field(..., examples=["price_check"])
    payload: dict[str, Any] = Field(
        ...,
        examples=[
            {
                "city": "Jaipur",
                "category": "auto_per_km",
                "quoted_price": 500,
                "distance_km": 3,
            }
        ],
    )

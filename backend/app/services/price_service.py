from typing import Any

from fastapi import HTTPException, status

from app.models.price_models import PriceCheckRequest, PriceCheckResponse


def format_price_range(min_price: float, max_price: float) -> str:
    return f"{round(min_price)}-{round(max_price)}"


def calculate_expected_range(price_record: dict[str, Any], distance_km: float) -> tuple[float, float]:
    min_price = float(price_record["min_inr"])
    max_price = float(price_record["max_inr"])

    if price_record["unit"] == "per km":
        return min_price * distance_km, max_price * distance_km

    return min_price, max_price


def calculate_price_risk(quoted_price: float, expected_max_price: float) -> str:
    if quoted_price <= expected_max_price:
        return "LOW"

    if quoted_price <= expected_max_price * 1.5:
        return "MEDIUM"

    return "HIGH"


def calculate_overcharge_percentage(quoted_price: float, expected_max_price: float) -> int:
    if quoted_price <= expected_max_price:
        return 0

    return round(((quoted_price - expected_max_price) / expected_max_price) * 100)


def build_price_message(risk_level: str) -> str:
    messages = {
        "LOW": "Quoted price is within the expected local range",
        "MEDIUM": "Possible tourist overcharge detected",
        "HIGH": "Likely tourist overcharge detected",
    }
    return messages[risk_level]


def check_price(
    payload: PriceCheckRequest,
    prices: dict[str, dict[str, dict[str, Any]]],
) -> PriceCheckResponse:
    if payload.city not in prices:
        available_cities = ", ".join(sorted(prices.keys()))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"City '{payload.city}' is not supported. Available cities: {available_cities}.",
        )

    city_prices = prices[payload.city]
    if payload.category not in city_prices:
        available_categories = ", ".join(sorted(city_prices.keys()))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Category '{payload.category}' is not supported for {payload.city}. "
                f"Available categories: {available_categories}."
            ),
        )

    expected_min_price, expected_max_price = calculate_expected_range(
        city_prices[payload.category],
        payload.distance_km,
    )
    risk_level = calculate_price_risk(payload.quoted_price, expected_max_price)

    return PriceCheckResponse(
        city=payload.city,
        category=payload.category,
        quoted_price=payload.quoted_price,
        expected_range=format_price_range(expected_min_price, expected_max_price),
        risk_level=risk_level,
        overcharge_percentage=calculate_overcharge_percentage(
            payload.quoted_price,
            expected_max_price,
        ),
        message=build_price_message(risk_level),
    )

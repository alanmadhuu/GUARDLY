from typing import Any, Literal


SafetyStatus = Literal["SAFE", "CAUTION", "HIGH_RISK"]


def risk_penalty(risk_level: str | None = None, risk_score: int | None = None) -> int:
    if risk_score is not None:
        return min(100, max(0, risk_score))

    normalized = (risk_level or "LOW").strip().upper()
    if normalized == "HIGH":
        return 85
    if normalized == "MEDIUM":
        return 50
    return 15


def status_from_score(score: int) -> SafetyStatus:
    if score >= 75:
        return "SAFE"
    if score >= 45:
        return "CAUTION"
    return "HIGH_RISK"


def calculate_safety_score(
    price_risk: str | None = None,
    route_risk: str | None = None,
    location_risk: str | None = None,
    location_risk_score: int | None = None,
) -> dict[str, Any]:
    price_penalty = risk_penalty(price_risk)
    route_penalty = risk_penalty(route_risk)
    location_penalty = risk_penalty(location_risk, location_risk_score)
    combined_penalty = price_penalty * 0.3 + route_penalty * 0.35 + location_penalty * 0.35
    score = round(max(0, min(100, 100 - combined_penalty)))

    return {
        "score": score,
        "status": status_from_score(score),
    }

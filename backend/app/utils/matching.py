from difflib import get_close_matches
from typing import Any


RISK_SCORES = {
    "LOW": 20,
    "MEDIUM": 50,
    "HIGH": 80,
}


def normalize_text(value: str) -> str:
    return " ".join(value.strip().lower().split())


def get_matching_key(records: dict[str, Any], requested_key: str) -> str | None:
    requested_key_normalized = normalize_text(requested_key)

    for known_key in records:
        if normalize_text(known_key) == requested_key_normalized:
            return known_key

    return None


def get_matching_location_name(city_spots: list[dict[str, Any]], location_name: str) -> str | None:
    requested_location = normalize_text(location_name)
    location_names = [spot["location_name"] for spot in city_spots]

    for known_location in location_names:
        if normalize_text(known_location) == requested_location:
            return known_location

    normalized_to_original = {
        normalize_text(known_location): known_location
        for known_location in location_names
    }
    closest_matches = get_close_matches(
        requested_location,
        list(normalized_to_original.keys()),
        n=1,
        cutoff=0.45,
    )

    if not closest_matches:
        return None

    return normalized_to_original[closest_matches[0]]


def get_warnings_for_location(city_spots: list[dict[str, Any]], location_name: str) -> list[dict[str, str]]:
    matching_location = normalize_text(location_name)
    warnings = []

    for spot in city_spots:
        if normalize_text(spot["location_name"]) == matching_location:
            risk_level = spot["risk_level"].upper()
            warnings.append(
                {
                    "scam_type": spot["scam_type"],
                    "risk_level": risk_level,
                    "warning_message": spot["warning_message"],
                }
            )

    return warnings


def calculate_location_risk_score(warnings: list[dict[str, str]]) -> int:
    if not warnings:
        return 0

    total_score = sum(RISK_SCORES[warning["risk_level"]] for warning in warnings)
    return round(total_score / len(warnings))

import json
import os
import time
from typing import Any

from pydantic import BaseModel, Field, ValidationError

try:
    from groq import Groq
except ImportError:
    Groq = None  # type: ignore[assignment]


DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"
REQUEST_TIMEOUT_SECONDS = 8
MAX_LLM_RETRIES = 2


class ExplanationPayload(BaseModel):
    explanation: str = Field(..., min_length=1, max_length=1200)


def is_demo_mode_enabled() -> bool:
    return os.getenv("DEMO_MODE", "").strip().lower() in {"1", "true", "yes", "on"}


def is_groq_configured() -> bool:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    return Groq is not None and bool(api_key) and not api_key.startswith("your_")


def build_fallback_explanation(intent: str, analysis: dict[str, Any]) -> str:
    if intent == "price_check":
        risk_level = analysis.get("risk_level", "UNKNOWN")
        quoted_price = analysis.get("quoted_price", "the quoted price")
        expected_range = analysis.get("expected_range", "the expected local range")
        overcharge = analysis.get("overcharge_percentage", 0)
        money_saved = analysis.get("money_saved", 0)
        return (
            f"This price check is marked {risk_level}. The quoted price of {quoted_price} is compared "
            f"against the expected range of {expected_range}, with an estimated overcharge of {overcharge}%. "
            f"Using the recommended local price could save about INR {money_saved}. Ask for the meter or official "
            "rate, compare with another vendor, and avoid paying until the total price is clear."
        )

    if intent == "route_check":
        risk_level = analysis.get("risk_level", "UNKNOWN")
        deviation = analysis.get("deviation_percentage", 0)
        return (
            f"This route check is marked {risk_level}. The travelled distance appears to deviate by about "
            f"{deviation}% from the expected route distance. Confirm the route on your own map, ask the driver "
            "to explain the detour, and move to a public or well-lit area if you feel unsafe."
        )

    if intent == "location_warning":
        risk_score = analysis.get("risk_score", "unknown")
        warnings = analysis.get("warnings", [])
        warning_count = len(warnings) if isinstance(warnings, list) else 0
        return (
            f"This area has a risk score of {risk_score} with {warning_count} known warning item(s). "
            "Review the listed scam types before arriving, keep valuables secure, use official counters or apps, "
            "and avoid unsolicited help from strangers."
        )

    return "The analysis completed, but no AI explanation is available for this intent."


def build_explanation_prompt(intent: str, analysis: dict[str, Any]) -> str:
    if intent == "price_check":
        task = (
            "Explain why the quoted price may be risky, mention money_saved if present, "
            "and give practical next steps for a tourist."
        )
    elif intent == "route_check":
        task = "Explain the route deviation, recommend next steps, and include concise safety guidance."
    elif intent == "location_warning":
        task = "Summarize the area warnings, identify key risks, and give practical tourist advice."
    else:
        task = "Explain the analysis result for a tourist."

    return (
        "Return only valid JSON with this exact shape: "
        '{"explanation":"short practical explanation under 140 words"}.\n'
        "Do not recalculate risk, invent facts, or override the provided analysis.\n\n"
        f"Intent: {intent}\n"
        f"Task: {task}\n"
        f"Analysis JSON:\n{json.dumps(analysis, ensure_ascii=False, indent=2)}"
    )


def parse_json_object(raw_content: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(raw_content)
    except json.JSONDecodeError:
        start = raw_content.find("{")
        end = raw_content.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None

        try:
            parsed = json.loads(raw_content[start : end + 1])
        except json.JSONDecodeError:
            return None

    return parsed if isinstance(parsed, dict) else None


def validate_explanation_payload(raw_content: str) -> ExplanationPayload | None:
    parsed = parse_json_object(raw_content)
    if parsed is None:
        return None

    try:
        return ExplanationPayload(**parsed)
    except ValidationError:
        return None


def create_groq_client() -> Any:
    if Groq is None:
        raise RuntimeError("Groq SDK is not installed.")

    return Groq(api_key=os.getenv("GROQ_API_KEY"))


def request_explanation_from_groq(intent: str, analysis: dict[str, Any]) -> str | None:
    model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip() or DEFAULT_GROQ_MODEL
    client = create_groq_client().with_options(timeout=REQUEST_TIMEOUT_SECONDS)

    for attempt in range(MAX_LLM_RETRIES + 1):
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You explain existing tourist safety analysis. "
                            "You never perform new analysis. You return strict JSON only."
                        ),
                    },
                    {
                        "role": "user",
                        "content": build_explanation_prompt(intent, analysis),
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_completion_tokens=240,
            )
            raw_content = completion.choices[0].message.content or ""
            payload = validate_explanation_payload(raw_content)
            return payload.explanation if payload else None
        except Exception:
            if attempt >= MAX_LLM_RETRIES:
                return None
            time.sleep(0.25 * (attempt + 1))

    return None


def explain_analysis(intent: str, analysis: dict[str, Any]) -> str:
    fallback = build_fallback_explanation(intent, analysis)

    if is_demo_mode_enabled() or not is_groq_configured():
        return fallback

    return request_explanation_from_groq(intent, analysis) or fallback

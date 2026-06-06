from fastapi import HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError

from app.agents.state import AgentState
from app.models.location_models import LocationWarningRequest
from app.services.location_service import check_location_warning


def location_agent_node(state: AgentState) -> AgentState:
    try:
        payload = LocationWarningRequest(**state["payload"])
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=jsonable_encoder(exc.errors()),
        ) from exc

    result = check_location_warning(payload, state["tourist_data"]["scam_spots"])
    return {"result": result.model_dump()}

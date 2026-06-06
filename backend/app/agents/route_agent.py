from fastapi import HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError

from app.agents.state import AgentState
from app.models.route_models import RouteCheckRequest
from app.services.route_service import check_route


def route_agent_node(state: AgentState) -> AgentState:
    try:
        payload = RouteCheckRequest(**state["payload"])
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=jsonable_encoder(exc.errors()),
        ) from exc

    result = check_route(payload)
    return {"result": result.model_dump()}

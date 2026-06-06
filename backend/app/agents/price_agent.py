from fastapi import HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError

from app.agents.state import AgentState
from app.models.price_models import PriceCheckRequest
from app.services.price_service import check_price


def price_agent_node(state: AgentState) -> AgentState:
    try:
        payload = PriceCheckRequest(**state["payload"])
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=jsonable_encoder(exc.errors()),
        ) from exc

    result = check_price(payload, state["tourist_data"]["prices"])
    return {"result": result.model_dump()}

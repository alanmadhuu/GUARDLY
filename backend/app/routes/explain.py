from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from app.agents import tourist_shield_graph
from app.models.agent_models import AgentQueryRequest
from app.services.ai_service import explain_analysis


router = APIRouter()


def get_loaded_tourist_data(request: Request) -> dict[str, Any]:
    if not hasattr(request.app.state, "tourist_data"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tourist data is not loaded yet. Please try again shortly.",
        )

    return request.app.state.tourist_data


@router.post("/agent-explain")
def agent_explain_endpoint(payload: AgentQueryRequest, request: Request) -> dict[str, Any]:
    final_state = tourist_shield_graph.invoke(
        {
            "intent": payload.intent,
            "payload": payload.payload,
            "tourist_data": get_loaded_tourist_data(request),
        }
    )
    analysis = final_state["result"]

    return {
        "analysis": analysis,
        "explanation": explain_analysis(payload.intent, analysis),
    }

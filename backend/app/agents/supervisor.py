from fastapi import HTTPException, status

from app.agents.state import AgentState


INTENT_TO_AGENT = {
    "price_check": "price_agent",
    "route_check": "route_agent",
    "location_warning": "location_agent",
}


def supervisor_node(state: AgentState) -> AgentState:
    intent = state.get("intent")

    if intent not in INTENT_TO_AGENT:
        supported_intents = ", ".join(sorted(INTENT_TO_AGENT.keys()))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported intent '{intent}'. Supported intents: {supported_intents}.",
        )

    return {"next_agent": INTENT_TO_AGENT[intent]}


def route_from_supervisor(state: AgentState) -> str:
    return state["next_agent"]

from typing import Any, Literal, TypedDict


AgentIntent = Literal["price_check", "route_check", "location_warning"]
AgentNode = Literal["price_agent", "route_agent", "location_agent"]


class AgentState(TypedDict, total=False):
    intent: str
    payload: dict[str, Any]
    tourist_data: dict[str, Any]
    next_agent: AgentNode
    result: dict[str, Any]

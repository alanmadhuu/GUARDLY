from langgraph.graph import END, StateGraph

from app.agents.location_agent import location_agent_node
from app.agents.price_agent import price_agent_node
from app.agents.route_agent import route_agent_node
from app.agents.state import AgentState
from app.agents.supervisor import route_from_supervisor, supervisor_node


def build_tourist_shield_graph():
    graph = StateGraph(AgentState)

    graph.add_node("supervisor", supervisor_node)
    graph.add_node("price_agent", price_agent_node)
    graph.add_node("route_agent", route_agent_node)
    graph.add_node("location_agent", location_agent_node)

    graph.set_entry_point("supervisor")
    graph.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {
            "price_agent": "price_agent",
            "route_agent": "route_agent",
            "location_agent": "location_agent",
        },
    )
    graph.add_edge("price_agent", END)
    graph.add_edge("route_agent", END)
    graph.add_edge("location_agent", END)

    return graph.compile()


tourist_shield_graph = build_tourist_shield_graph()

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import agent, explain, location, pickup, price, route
from app.services.ai_service import is_groq_configured
from app.utils.data_loader import get_data_summary, load_tourist_data

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.tourist_data = load_tourist_data()
    yield


app = FastAPI(
    title="GUARDLY API",
    description="Stub backend for an AI-powered tourist safety platform.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(price.router)
app.include_router(route.router)
app.include_router(location.router)
app.include_router(pickup.router)
app.include_router(agent.router)
app.include_router(explain.router)


@app.get("/health")
def health_check() -> dict[str, bool]:
    tourist_data = getattr(app.state, "tourist_data", {})

    return {
        "api": True,
        "prices_loaded": bool(tourist_data.get("prices")),
        "scam_data_loaded": bool(tourist_data.get("scam_spots")),
        "groq_configured": is_groq_configured(),
    }


@app.get("/health/data")
def data_health_check() -> dict[str, int]:
    tourist_data: dict[str, dict[str, Any]] = app.state.tourist_data
    return get_data_summary(tourist_data)

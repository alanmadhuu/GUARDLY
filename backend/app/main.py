from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import location, price, route
from app.utils.data_loader import get_data_summary, load_tourist_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.tourist_data = load_tourist_data()
    yield


app = FastAPI(
    title="Tourist Shield API",
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


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/data")
def data_health_check() -> dict[str, int]:
    tourist_data: dict[str, dict[str, Any]] = app.state.tourist_data
    return get_data_summary(tourist_data)

"""
main.py

This is the FastAPI web application. It:
1. Exposes a /predict endpoint that returns an ML prediction.
2. Exposes a /health endpoint so monitoring tools (or Docker/AWS)
   can check if the app is alive.
3. Exposes a /metrics endpoint (via Instrumentator) that Prometheus
   scrapes to collect request count, latency, etc.

Run locally with:
    uvicorn app.main:app --reload --port 8001
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from prometheus_fastapi_instrumentator import Instrumentator

from app.model import predict


# Create the FastAPI application instance
app = FastAPI(
    title="ML Model Deployment & Monitoring Pipeline",
    description="A simple Iris classifier served via FastAPI, "
                "containerized with Docker, and monitored with Prometheus/Grafana.",
    version="1.0.0",
)


# ============================================================
# CORS CONFIGURATION
# Allows the local frontend to communicate with FastAPI
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PROMETHEUS MONITORING
# ============================================================

Instrumentator().instrument(app).expose(app)


# ============================================================
# REQUEST MODEL
# ============================================================

class IrisFeatures(BaseModel):
    sepal_length: float = Field(
        ...,
        description="Sepal length in cm"
    )

    sepal_width: float = Field(
        ...,
        description="Sepal width in cm"
    )

    petal_length: float = Field(
        ...,
        description="Petal length in cm"
    )

    petal_width: float = Field(
        ...,
        description="Petal width in cm"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "sepal_length": 5.1,
                "sepal_width": 3.5,
                "petal_length": 1.4,
                "petal_width": 0.2,
            }
        }
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    """
    Simple health check endpoint.
    Returns 200 OK with a small JSON body if the app is running.
    """

    return {
        "status": "ok"
    }


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():
    """
    Basic root endpoint so hitting the base URL doesn't 404.
    """

    return {
        "message": "ML Model Deployment & Monitoring Pipeline is running. See /docs for API docs."
    }


# ============================================================
# ML PREDICTION ENDPOINT
# ============================================================

@app.post("/predict")
def get_prediction(features: IrisFeatures):
    """
    Accepts 4 iris flower measurements and returns the
    predicted species along with a confidence score.
    """

    result = predict(
        sepal_length=features.sepal_length,
        sepal_width=features.sepal_width,
        petal_length=features.petal_length,
        petal_width=features.petal_width,
    )

    return result
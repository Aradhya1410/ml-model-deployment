"""
test_api.py

Basic automated tests for the API.
These run automatically in GitHub Actions on every push (CI),
so if someone breaks the app, the pipeline fails and tells us.

Run locally with:
    pytest -v
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """The /health endpoint should always return 200 and status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root():
    """The root endpoint should respond successfully."""
    response = client.get("/")
    assert response.status_code == 200


def test_predict_valid_input():
    """A valid prediction request should return a class and confidence."""
    payload = {
        "sepal_length": 5.1,
        "sepal_width": 3.5,
        "petal_length": 1.4,
        "petal_width": 0.2,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "predicted_class" in data
    assert data["predicted_class"] in ["setosa", "versicolor", "virginica"]
    assert 0.0 <= data["confidence"] <= 1.0


def test_predict_missing_field():
    """Missing a required field should return a 422 validation error, not crash."""
    payload = {
        "sepal_length": 5.1,
        "sepal_width": 3.5,
        "petal_length": 1.4,
        # petal_width missing on purpose
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_metrics_endpoint_exists():
    """Prometheus needs this endpoint to exist and return plaintext metrics."""
    response = client.get("/metrics")
    assert response.status_code == 200

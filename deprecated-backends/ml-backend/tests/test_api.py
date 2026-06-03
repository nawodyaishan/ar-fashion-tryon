import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_garment_detection_invalid_file():
    response = client.post(
        "/api/v1/garment/detect",
        files={"file": ("test.txt", b"text content", "text/plain")}
    )
    assert response.status_code == 400

# Add more tests...
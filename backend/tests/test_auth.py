from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200


def test_register_user():
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test_user@example.com",
            "password": "test12345",
            "name": "Test User",
        },
    )

    assert response.status_code in [200, 201, 400]

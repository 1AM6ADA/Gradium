from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine


Base.metadata.create_all(bind=engine)

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200


def test_register_user():
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test_user_ci@example.com",
            "password": "test12345",
            "name": "Test User",
        },
    )

    assert response.status_code in [200, 201, 400]

from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from main import app
from app.dependencies import get_current_user

USER = {"id": "12345678-1234-1234-1234-123456789012", "email": "test@example.com"}

def test_send_endpoint_queues_campaign(monkeypatch):
    publish = AsyncMock()
    update_status = AsyncMock()
    monkeypatch.setattr("app.routers.emails.publish_job", publish)
    monkeypatch.setattr("app.routers.emails.update_campaign_status", update_status)
    monkeypatch.setattr("app.routers.emails.get_daily_send_volume", AsyncMock(return_value=0))
    monkeypatch.setattr("app.routers.emails.create_audit_log", AsyncMock(return_value=True))

    app.dependency_overrides[get_current_user] = lambda: USER

    try:
        response = TestClient(app).post(
            "/api/emails/send",
            json={
                "campaign_id": "campaign-123",
                "token_data": {"access_token": "token"},
                "from_name": "Sender",
                "from_email": "sender@example.com",
                "consent_confirmed": True,
                "emails": [
                    {
                        "to": "recipient@example.com",
                        "subject": "Hello",
                        "body": "Email body",
                        "contact_name": "Recipient",
                    }
                ],
            },
        )

        assert response.status_code == 200
        assert response.json() == {
            "success": True,
            "message": "Campaign queued successfully",
        }
        publish.assert_awaited_once()
        update_status.assert_awaited_once_with("campaign-123", "queued")
    finally:
        app.dependency_overrides = {}


def test_send_endpoint_rejects_empty_campaign():
    app.dependency_overrides[get_current_user] = lambda: USER
    try:
        response = TestClient(app).post(
            "/api/emails/send",
            json={
                "token_data": {"access_token": "token"},
                "from_name": "Sender",
                "from_email": "sender@example.com",
                "consent_confirmed": True,
                "emails": [],
            },
        )
        assert response.status_code == 400
    finally:
        app.dependency_overrides = {}


def test_send_endpoint_rejects_unconfirmed_consent():
    app.dependency_overrides[get_current_user] = lambda: USER
    try:
        response = TestClient(app).post(
            "/api/emails/send",
            json={
                "token_data": {"access_token": "token"},
                "from_name": "Sender",
                "from_email": "sender@example.com",
                "consent_confirmed": False,
                "emails": [
                    {
                        "to": "recipient@example.com",
                        "subject": "Hello",
                        "body": "Email body",
                        "contact_name": "Recipient",
                    }
                ],
            },
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Consent confirmation is required."
    finally:
        app.dependency_overrides = {}

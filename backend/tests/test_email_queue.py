from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from main import app


def test_send_endpoint_queues_campaign(monkeypatch):
    publish = AsyncMock()
    update_status = AsyncMock()
    monkeypatch.setattr("app.routers.emails.publish_job", publish)
    monkeypatch.setattr("app.routers.emails.update_campaign_status", update_status)

    response = TestClient(app).post(
        "/api/emails/send",
        json={
            "campaign_id": "campaign-123",
            "token_data": {"access_token": "token"},
            "from_name": "Sender",
            "from_email": "sender@example.com",
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


def test_send_endpoint_rejects_empty_campaign():
    response = TestClient(app).post(
        "/api/emails/send",
        json={
            "token_data": {"access_token": "token"},
            "from_name": "Sender",
            "from_email": "sender@example.com",
            "emails": [],
        },
    )

    assert response.status_code == 400

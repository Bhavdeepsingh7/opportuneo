import asyncio
import json
from unittest.mock import AsyncMock

from workers import email_worker


class Message:
    def __init__(self, job, headers=None):
        self.body = json.dumps(job).encode()
        self.headers = headers or {}
        self.ack = AsyncMock()


def test_worker_acknowledges_success(monkeypatch):
    message = Message({"campaign_id": "campaign-1"})
    monkeypatch.setattr(email_worker, "_process_job", AsyncMock(return_value=[]))
    monkeypatch.setattr(email_worker, "update_campaign_status", AsyncMock())
    publish = AsyncMock()
    monkeypatch.setattr(email_worker, "publish_job", publish)

    asyncio.run(email_worker.handle_message(message))

    message.ack.assert_awaited_once()
    publish.assert_not_awaited()


def test_worker_retries_only_failed_emails(monkeypatch):
    job = {"campaign_id": "campaign-1", "emails": [{"to": "failed@example.com"}]}
    message = Message(job)
    monkeypatch.setattr(email_worker, "_process_job", AsyncMock(return_value=job["emails"]))
    monkeypatch.setattr(email_worker, "update_campaign_status", AsyncMock())
    publish = AsyncMock()
    monkeypatch.setattr(email_worker, "publish_job", publish)

    asyncio.run(email_worker.handle_message(message))

    publish.assert_awaited_once_with(
        job,
        headers={"x-retry-count": 1},
    )
    message.ack.assert_awaited_once()


def test_worker_dead_letters_after_three_retries(monkeypatch):
    job = {"campaign_id": "campaign-1"}
    message = Message(job, headers={"x-retry-count": 3})
    monkeypatch.setattr(email_worker, "_process_job", AsyncMock(side_effect=RuntimeError("send failed")))
    monkeypatch.setattr(email_worker, "update_campaign_status", AsyncMock())
    publish = AsyncMock()
    monkeypatch.setattr(email_worker, "publish_job", publish)

    asyncio.run(email_worker.handle_message(message))

    dead_job = {**job, "failure": "send failed", "retry_count": 3}
    publish.assert_awaited_once_with(dead_job, queue_name=email_worker.settings.rabbitmq_dead_queue)
    message.ack.assert_awaited_once()

import asyncio
import json
import logging
from typing import Any

from aio_pika.abc import AbstractIncomingMessage

from app.config import get_settings
from app.models.schemas import ContactEntry
from app.rabbitmq import connect_rabbitmq, get_channel, publish_job
from app.services.campaign_service import update_campaign_status
from app.services.email_generator import generate_emails_for_contacts
from app.services.gmail_service import send_emails_via_gmail

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)
settings = get_settings()
MAX_RETRIES = 3


async def _generate_emails(job: dict[str, Any]) -> list[dict[str, Any]]:
    contacts = [ContactEntry(**contact) for contact in job.get("contacts", [])]
    generated = await generate_emails_for_contacts(
        resume_data=job["resume_data"],
        contacts=contacts,
        job_context=job.get("job_context", ""),
        tone=job.get("tone", "confident"),
    )
    return [
        {
            "to": email.contact.email,
            "subject": email.subject,
            "body": email.body,
            "contact_name": email.contact.name,
        }
        for email in generated
    ]


async def _process_job(job: dict[str, Any]) -> list[dict[str, Any]]:
    emails = job.get("emails") or await _generate_emails(job)
    results = await send_emails_via_gmail(
        token_data=job["token_data"],
        emails=emails,
        from_name=job["from_name"],
        from_email=job["from_email"],
        resume_file_path=job.get("resume_file_path"),
    )
    failed_addresses = {result.email for result in results if not result.success}
    return [email for email in emails if email.get("to") in failed_addresses]


async def handle_message(message: AbstractIncomingMessage) -> None:
    job: dict[str, Any] = {}
    try:
        job = json.loads(message.body.decode("utf-8"))
        await update_campaign_status(job.get("campaign_id"), "processing")
        failed_emails = await _process_job(job)
        if failed_emails:
            raise RuntimeError(f"{len(failed_emails)} email(s) failed")

        await update_campaign_status(job.get("campaign_id"), "completed")
        await message.ack()
        logger.info("Campaign %s completed", job.get("campaign_id") or "<untracked>")
    except Exception as exc:
        retry_count = int((message.headers or {}).get("x-retry-count", 0))
        next_retry = retry_count + 1

        if next_retry <= MAX_RETRIES:
            retry_job = {**job}
            if "failed_emails" in locals() and failed_emails:
                retry_job["emails"] = failed_emails
            await publish_job(retry_job, headers={"x-retry-count": next_retry})
            await update_campaign_status(job.get("campaign_id"), "retrying")
            logger.warning("Campaign failed; queued retry %s/%s: %s", next_retry, MAX_RETRIES, exc)
        else:
            dead_job = {**job, "failure": str(exc), "retry_count": retry_count}
            await publish_job(dead_job, queue_name=settings.rabbitmq_dead_queue)
            await update_campaign_status(job.get("campaign_id"), "failed")
            logger.exception("Campaign moved to dead-letter queue")

        await message.ack()


async def main() -> None:
    await connect_rabbitmq()
    channel = await get_channel()
    await channel.set_qos(prefetch_count=1)
    queue = await channel.declare_queue(settings.rabbitmq_queue, durable=True)
    await queue.consume(handle_message)
    logger.info("Email worker consuming %s", settings.rabbitmq_queue)
    await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())

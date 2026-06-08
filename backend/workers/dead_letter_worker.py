import asyncio
import json
import logging

from aio_pika.abc import AbstractIncomingMessage

from app.config import get_settings
from app.rabbitmq import connect_rabbitmq, get_channel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)
settings = get_settings()


async def handle_message(message: AbstractIncomingMessage) -> None:
    try:
        job = json.loads(message.body.decode("utf-8"))
        logger.error(
            "Dead-lettered campaign %s after %s retries: %s",
            job.get("campaign_id") or "<untracked>",
            job.get("retry_count", 0),
            job.get("failure", "unknown failure"),
        )
        await message.ack()
    except Exception:
        logger.exception("Could not log dead-lettered job")
        await message.reject(requeue=False)


async def main() -> None:
    await connect_rabbitmq()
    channel = await get_channel()
    await channel.set_qos(prefetch_count=1)
    queue = await channel.declare_queue(settings.rabbitmq_dead_queue, durable=True)
    await queue.consume(handle_message)
    logger.info("Dead-letter worker consuming %s", settings.rabbitmq_dead_queue)
    await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())

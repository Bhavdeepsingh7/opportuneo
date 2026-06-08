import asyncio
import json
import logging
from typing import Any

import aio_pika
from aio_pika.abc import AbstractRobustChannel, AbstractRobustConnection

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_connection: AbstractRobustConnection | None = None
_channel: AbstractRobustChannel | None = None
_connection_lock = asyncio.Lock()


async def connect_rabbitmq() -> AbstractRobustConnection:
    """Create a reconnecting RabbitMQ connection and declare durable queues."""
    global _connection, _channel

    async with _connection_lock:
        if _connection and not _connection.is_closed:
            return _connection

        _connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        _channel = await _connection.channel(publisher_confirms=True)
        await _channel.set_qos(prefetch_count=1)
        await _channel.declare_queue(settings.rabbitmq_queue, durable=True)
        await _channel.declare_queue(settings.rabbitmq_dead_queue, durable=True)
        logger.info("Connected to RabbitMQ")
        return _connection


async def get_channel() -> AbstractRobustChannel:
    global _channel

    if not _connection or _connection.is_closed:
        await connect_rabbitmq()
    if not _channel or _channel.is_closed:
        _channel = await _connection.channel(publisher_confirms=True)
        await _channel.set_qos(prefetch_count=1)
        await _channel.declare_queue(settings.rabbitmq_queue, durable=True)
        await _channel.declare_queue(settings.rabbitmq_dead_queue, durable=True)
    return _channel


async def publish_job(
    job: dict[str, Any],
    queue_name: str | None = None,
    headers: dict[str, Any] | None = None,
) -> None:
    channel = await get_channel()
    await channel.default_exchange.publish(
        aio_pika.Message(
            body=json.dumps(job).encode("utf-8"),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            headers=headers or {},
        ),
        routing_key=queue_name or settings.rabbitmq_queue,
        mandatory=True,
    )


async def close_rabbitmq() -> None:
    global _connection, _channel

    if _connection and not _connection.is_closed:
        await _connection.close()
    _connection = None
    _channel = None

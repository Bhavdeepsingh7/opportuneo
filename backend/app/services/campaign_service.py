import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def update_campaign_status(campaign_id: str | None, status: str) -> None:
    """Update a Supabase campaign when a queued job is linked to one."""
    if not campaign_id:
        return
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning("Campaign %s status not updated: Supabase is not configured", campaign_id)
        return

    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.patch(
                f"{settings.supabase_url}/rest/v1/campaigns",
                params={"id": f"eq.{campaign_id}"},
                headers=headers,
                json={"status": status},
            )
        if response.status_code not in (200, 204):
            logger.error(
                "Could not update campaign %s to %s: %s",
                campaign_id,
                status,
                response.text,
            )
    except httpx.HTTPError:
        logger.exception("Could not update campaign %s to %s", campaign_id, status)

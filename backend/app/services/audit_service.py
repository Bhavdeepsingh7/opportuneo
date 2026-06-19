import httpx
from typing import Any
from app.config import get_settings
from app.dependencies import get_supabase_headers
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

async def create_audit_log(user_id: str, action: str, metadata: dict[str, Any] = None) -> bool:
    """Create an audit log in Supabase."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning("Audit log not written: Supabase not configured")
        return False
        
    payload = {
        "user_id": user_id,
        "action": action,
        "metadata": metadata or {}
    }
    
    # We use service role key to write to audit_logs bypassing RLS
    headers = get_supabase_headers()
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/audit_logs"
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(url, headers=headers, json=payload)
            res.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to write audit log: {str(e)}")
        return False

async def get_daily_send_volume(user_id: str) -> int:
    """Calculate total emails sent by user in last 24 hours."""
    from datetime import datetime, timedelta, timezone
    
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning("Supabase not configured, daily send volume defaulted to 0")
        return 0
        
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(days=1)
    iso_timestamp = twenty_four_hours_ago.isoformat()
    
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/audit_logs"
    params = {
        "user_id": f"eq.{user_id}",
        "action": "eq.emails_sent",
        "timestamp": f"gte.{iso_timestamp}"
    }
    headers = get_supabase_headers()
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url, headers=headers, params=params)
            res.raise_for_status()
            logs = res.json()
            
            total = 0
            for log in logs:
                meta = log.get("metadata") or {}
                total += meta.get("count", 0)
            return total
    except Exception as e:
        logger.error(f"Failed to fetch daily send volume: {str(e)}")
        return 0

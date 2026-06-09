from typing import Any
import httpx
from fastapi import Header, HTTPException
from app.config import get_settings

settings = get_settings()

def get_supabase_headers(access_token: str | None = None) -> dict[str, str]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="Supabase is not configured")
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {access_token or settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }

async def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    access_token = authorization.removeprefix("Bearer ").strip()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers=get_supabase_headers(access_token),
        )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    user_data = response.json()
    user_data["access_token"] = access_token
    return user_data

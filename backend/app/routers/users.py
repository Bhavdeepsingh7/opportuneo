from fastapi import APIRouter, HTTPException, Depends
import httpx
from app.config import get_settings
from app.dependencies import get_current_user, get_supabase_headers
import logging

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/users", tags=["users"])

@router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    """Get the user's profile from Supabase."""
    async with httpx.AsyncClient(timeout=10) as client:
        base_url = settings.supabase_url.rstrip("/")
        url = f"{base_url}/rest/v1/profiles?id=eq.{user['id']}&select=*"
        
        res = await client.get(url, headers=get_supabase_headers())
        
        if res.status_code != 200:
            logger.error(f"Failed to fetch profile: {res.text}")
            raise HTTPException(status_code=500, detail="Failed to fetch profile")
        
        data = res.json()
        return data[0] if data else None

@router.patch("/profile")
async def update_profile(req: dict, user: dict = Depends(get_current_user)):
    """Update user's profile (name, etc). Uses upsert-like behavior."""
    allowed_fields = ["full_name"]
    payload = {k: v for k, v in req.items() if k in allowed_fields}
    
    if not payload:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    # Add ID for upsert
    payload["id"] = user["id"]

    async with httpx.AsyncClient(timeout=10) as client:
        base_url = settings.supabase_url.rstrip("/")
        # We use POST with resolution=merge-duplicates for upsert in PostgREST
        url = f"{base_url}/rest/v1/profiles"
        
        headers = get_supabase_headers()
        headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
        
        logger.info(f"Upserting profile for {user['id']} at {url}")
        try:
            res = await client.post(url, headers=headers, json=payload)
            res.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"Supabase upsert failed: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Failed to update profile: {e.response.text}")
        except Exception as e:
            logger.error(f"Request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")
    
    return {"success": True}

@router.delete("/account")
async def delete_account(user: dict = Depends(get_current_user)):
    """Delete the user's account from Supabase Auth and all their data."""
    async with httpx.AsyncClient(timeout=10) as client:
        base_url = settings.supabase_url.rstrip("/")
        url = f"{base_url}/auth/v1/admin/users/{user['id']}"
        
        try:
            res = await client.delete(url, headers=get_supabase_headers())
            res.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"Delete account failed: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Failed to delete account: {e.response.text}")
        except Exception as e:
            logger.error(f"Delete request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")
    
    return {"success": True}

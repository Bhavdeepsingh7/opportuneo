import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import json, uuid, urllib.parse, httpx
from app.services.gmail_service import get_gmail_auth_url, exchange_code_for_tokens, get_gmail_user_email
from app.config import get_settings
from app.dependencies import get_current_user, get_supabase_headers

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/gmail", tags=["gmail"])

# In-memory token store — maps short session_id → tokens
_token_store: dict = {}

@router.get("/auth-url")
def gmail_auth_url():
    return {"url": get_gmail_auth_url()}

@router.get("/callback")
async def gmail_callback(code: str = None, error: str = None, state: str = None):
    """Handle Google OAuth callback."""
    frontend_url = settings.frontend_url.rstrip("/")
    if error:
        return RedirectResponse(url=f"{frontend_url}/app/settings?gmail_error={urllib.parse.quote(error)}")
    if not code:
        return RedirectResponse(url=f"{frontend_url}/app/settings?gmail_error=no_code")

    try:
        tokens = exchange_code_for_tokens(code)
        email = get_gmail_user_email(tokens)

        # Store tokens server-side
        session_id = str(uuid.uuid4())
        _token_store[session_id] = tokens

        # NOTE: We can't easily save to Supabase here because we don't have the Supabase user ID 
        # unless we pass it in 'state'. But for simplicity, we'll let the frontend 
        # call a 'confirm' endpoint or just update the profile when it receives the tokens.
        # Actually, let's keep it simple: frontend receives session_id, gets tokens, 
        # then calls our backend to "link" this email to their profile.

        redirect_url = (
            f"{frontend_url}/app/settings?gmail_connected=1"
            f"&gmail_email={urllib.parse.quote(email)}"
            f"&gmail_session={session_id}"
        )
        return RedirectResponse(url=redirect_url)
    except Exception as e:
        logger.error(f"Gmail callback failed: {str(e)}")
        return RedirectResponse(url=f"{frontend_url}/app/settings?gmail_error={urllib.parse.quote(str(e))}")

@router.get("/tokens/{session_id}")
def get_tokens(session_id: str):
    tokens = _token_store.pop(session_id, None)
    if not tokens:
        raise HTTPException(status_code=404, detail="Session not found or already used")
    return {"tokens": tokens}

@router.post("/link")
async def link_gmail(req: dict, user: dict = Depends(get_current_user)):
    """Link a Gmail address to the user's profile."""
    email = req.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    
    async with httpx.AsyncClient() as client:
        res = await client.patch(
            f"{settings.supabase_url}/rest/v1/profiles?id=eq.{user['id']}",
            headers=get_supabase_headers(),
            json={"gmail_email": email, "gmail_connected": True}
        )
    if res.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=500, detail="Failed to update profile")
    return {"success": True}

@router.post("/disconnect")
async def disconnect_gmail(user: dict = Depends(get_current_user)):
    """Disconnect Gmail from the user's profile."""
    async with httpx.AsyncClient() as client:
        res = await client.patch(
            f"{settings.supabase_url}/rest/v1/profiles?id=eq.{user['id']}",
            headers=get_supabase_headers(),
            json={"gmail_email": None, "gmail_connected": False}
        )
    if res.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=500, detail="Failed to update profile")
    return {"success": True}

class VerifyTokenRequest(BaseModel):
    token_data: dict

@router.post("/verify")
def verify_gmail_token(req: VerifyTokenRequest):
    try:
        email = get_gmail_user_email(req.token_data)
        return {"valid": True, "email": email}
    except Exception as e:
        return {"valid": False, "error": str(e)}

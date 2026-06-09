import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import json, uuid, urllib.parse
from app.services.gmail_service import get_gmail_auth_url, exchange_code_for_tokens, get_gmail_user_email
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/gmail", tags=["gmail"])

# In-memory token store — maps short session_id → tokens
# In production replace with Redis or Supabase
_token_store: dict = {}

@router.get("/auth-url")
def gmail_auth_url():
    logger.info("AUTH-URL REQUEST RECEIVED")
    logger.info("CLIENT_ID_WEB_CONFIG: %s", settings.google_client_id_web)
    url = get_gmail_auth_url()
    logger.info("URL_RETURNED_TO_FRONTEND: %s", url)
    return {"url": url}

@router.get("/callback")
def gmail_callback(code: str = None, error: str = None, state: str = None):
    """Handle Google OAuth callback.
    Stores tokens server-side, redirects frontend with a short session_id only.
    """
    logger.info("CALLBACK HIT")
    logger.info("CODE=%s", code)
    logger.info("STATE=%s", state)
    logger.info("ERROR=%s", error)

    frontend_url = settings.frontend_url.rstrip("/")
    if error:
        redirect_url = f"{frontend_url}/app/settings?gmail_error={urllib.parse.quote(error)}"
        logger.info("REDIRECT URL=%s", redirect_url)
        return RedirectResponse(url=redirect_url)
    if not code:
        redirect_url = f"{frontend_url}/app/settings?gmail_error=no_code"
        logger.info("REDIRECT URL=%s", redirect_url)
        return RedirectResponse(url=redirect_url)
    try:
        logger.info("Handling Gmail OAuth callback")
        tokens = exchange_code_for_tokens(code)
        email = get_gmail_user_email(tokens)
        logger.info(f"Gmail tokens retrieved for {email}")

        # Store tokens server-side, give frontend a short-lived session key
        session_id = str(uuid.uuid4())
        _token_store[session_id] = tokens

        redirect_url = (
            f"{frontend_url}/app/settings?gmail_connected=1"
            f"&gmail_email={urllib.parse.quote(email)}"
            f"&gmail_session={session_id}"
        )
        logger.info("REDIRECT URL=%s", redirect_url)
        return RedirectResponse(url=redirect_url)
    except Exception as e:
        logger.error(f"Gmail callback failed: {str(e)}")
        redirect_url = f"{frontend_url}/app/settings?gmail_error={urllib.parse.quote(str(e))}"
        logger.info("REDIRECT URL=%s", redirect_url)
        return RedirectResponse(url=redirect_url)

@router.get("/tokens/{session_id}")
def get_tokens(session_id: str):
    """Frontend exchanges session_id for actual tokens (one-time retrieval)."""
    tokens = _token_store.pop(session_id, None)   # pop = one-time use
    if not tokens:
        raise HTTPException(status_code=404, detail="Session not found or already used")
    return {"tokens": tokens}

class VerifyTokenRequest(BaseModel):
    token_data: dict

@router.post("/verify")
def verify_gmail_token(req: VerifyTokenRequest):
    try:
        email = get_gmail_user_email(req.token_data)
        return {"valid": True, "email": email}
    except Exception as e:
        return {"valid": False, "error": str(e)}

import httpx
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel
from app.services.email_generator import generate_emails_for_contacts, regenerate_single_email
from app.models.schemas import ContactEntry
from app.rabbitmq import publish_job
from app.services.campaign_service import update_campaign_status
from app.dependencies import get_current_user, get_supabase_headers
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/emails", tags=["emails"])

class GenerateRequest(BaseModel):
    resume_data: dict
    contacts: List[ContactEntry]
    job_context: str = ""
    tone: str = "confident"

class RegenerateRequest(BaseModel):
    resume_data: dict
    contact: ContactEntry
    job_context: str = ""
    tone: str = "confident"
    feedback: str = ""

class SendRequest(BaseModel):
    token_data: dict          # Gmail OAuth tokens stored on frontend, passed per request
    from_name: str
    from_email: str
    emails: List[dict]        # [{to, subject, body, contact_name}]
    resume_file_path: str | None = None
    campaign_id: str | None = None

async def _call_rpc(name: str, params: dict):
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{settings.supabase_url}/rest/v1/rpc/{name}",
            headers=get_supabase_headers(),
            json=params,
        )
    return response

@router.post("/generate")
async def generate_emails(req: GenerateRequest, user: dict = Depends(get_current_user)):
    """Generate personalized emails for all contacts. Consumes 1 credit per email."""
    if not req.contacts:
        raise HTTPException(status_code=400, detail="No contacts provided")
    if not req.resume_data:
        raise HTTPException(status_code=400, detail="No resume data provided")

    user_id = user["id"]
    count = len(req.contacts)

    # 1. Deduct credits atomically before generation
    res = await _call_rpc("deduct_credits", {"u_id": user_id, "amount": count})
    if res.status_code != 200:
        detail = "Insufficient credits. Please upgrade your plan."
        try:
            error_data = res.json()
            if "message" in error_data:
                detail = error_data["message"]
        except:
            pass
        raise HTTPException(status_code=402, detail=detail)

    remaining_credits = res.json()

    try:
        emails = await generate_emails_for_contacts(
            resume_data=req.resume_data,
            contacts=req.contacts,
            job_context=req.job_context,
            tone=req.tone,
        )
        return {
            "emails": [e.model_dump() for e in emails],
            "available_credits": remaining_credits
        }
    except Exception as e:
        # 2. Refund credits if generation fails completely
        await _call_rpc("refund_credits", {"u_id": user_id, "amount": count})
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.post("/regenerate")
async def regenerate_email(req: RegenerateRequest, user: dict = Depends(get_current_user)):
    """Regenerate a single email. Consumes 1 credit."""
    user_id = user["id"]
    
    # 1. Deduct 1 credit atomically
    res = await _call_rpc("deduct_credits", {"u_id": user_id, "amount": 1})
    if res.status_code != 200:
        raise HTTPException(status_code=402, detail="Insufficient credits. Please upgrade your plan.")
    
    remaining_credits = res.json()

    try:
        email = await regenerate_single_email(
            resume_data=req.resume_data,
            contact=req.contact,
            job_context=req.job_context,
            tone=req.tone,
            feedback=req.feedback,
        )
        return {
            **email.model_dump(),
            "available_credits": remaining_credits
        }
    except Exception as e:
        # 2. Refund 1 credit if regeneration fails
        await _call_rpc("refund_credits", {"u_id": user_id, "amount": 1})
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {str(e)}")

@router.post("/send")
async def send_emails(req: SendRequest):
    """Queue reviewed emails for asynchronous delivery through Gmail."""
    import logging
    logging.info(f"SEND_EMAILS_REQUEST: resume_file_path={req.resume_file_path}")
    if not req.emails:
        raise HTTPException(status_code=400, detail="No emails to send")
    if not req.token_data:
        raise HTTPException(status_code=401, detail="Gmail not connected")

    try:
        await publish_job(
            {
                "campaign_id": req.campaign_id,
                "token_data": req.token_data,
                "from_name": req.from_name,
                "from_email": req.from_email,
                "emails": req.emails,
                "resume_file_path": req.resume_file_path,
            }
        )
        await update_campaign_status(req.campaign_id, "queued")
    except Exception as e:
        raise HTTPException(status_code=503, detail="Could not queue campaign") from e

    return {
        "success": True,
        "message": "Campaign queued successfully",
    }

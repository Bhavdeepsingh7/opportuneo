from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
from app.services.email_generator import generate_emails_for_contacts, regenerate_single_email
from app.models.schemas import ContactEntry
from app.rabbitmq import publish_job
from app.services.campaign_service import update_campaign_status

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

@router.post("/generate")
async def generate_emails(req: GenerateRequest):
    """Generate personalized emails for all contacts."""
    if not req.contacts:
        raise HTTPException(status_code=400, detail="No contacts provided")
    if not req.resume_data:
        raise HTTPException(status_code=400, detail="No resume data provided")

    emails = await generate_emails_for_contacts(
        resume_data=req.resume_data,
        contacts=req.contacts,
        job_context=req.job_context,
        tone=req.tone,
    )
    return {"emails": [e.model_dump() for e in emails]}

@router.post("/regenerate")
async def regenerate_email(req: RegenerateRequest):
    """Regenerate a single email with optional user feedback."""
    email = await regenerate_single_email(
        resume_data=req.resume_data,
        contact=req.contact,
        job_context=req.job_context,
        tone=req.tone,
        feedback=req.feedback,
    )
    return email.model_dump()

@router.post("/send")
async def send_emails(req: SendRequest):
    """Queue reviewed emails for asynchronous delivery through Gmail."""
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

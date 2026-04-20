from fastapi import APIRouter, HTTPException, Body
from typing import List
from pydantic import BaseModel
from app.services.email_generator import generate_emails_for_contacts, regenerate_single_email
from app.services.gmail_service import send_emails_via_gmail
from app.models.schemas import ContactEntry, GeneratedEmail

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
    """Send emails via the user's Gmail account (OAuth)."""
    if not req.emails:
        raise HTTPException(status_code=400, detail="No emails to send")
    if not req.token_data:
        raise HTTPException(status_code=401, detail="Gmail not connected")

    results = await send_emails_via_gmail(
        token_data=req.token_data,
        emails=req.emails,
        from_name=req.from_name,
        from_email=req.from_email,
    )

    sent = sum(1 for r in results if r.success)
    failed = sum(1 for r in results if not r.success)

    return {
        "results": [r.model_dump() for r in results],
        "summary": {"sent": sent, "failed": failed, "total": len(results)},
    }

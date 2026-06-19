from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum

class ParseResumeResponse(BaseModel):
    name: str
    current_title: str
    current_company: str
    years_experience: int
    top_skills: List[str]
    key_achievements: List[str]
    education: str
    summary: str

class ContactEntry(BaseModel):
    name: str
    email: str
    company: str
    title: Optional[str] = ""

class GenerateEmailsRequest(BaseModel):
    resume_data: dict
    contacts: List[ContactEntry]
    job_context: Optional[str] = ""
    tone: str = "confident"  # confident | warm | humble
    user_id: str
    consent_confirmed: bool = False

class GeneratedEmail(BaseModel):
    contact: ContactEntry
    subject: str
    body: str
    variant: str  # direct | warm | followup

class SendEmailRequest(BaseModel):
    from_name: str
    from_email: str  # must be verified in Resend
    emails: List[dict]  # [{to, subject, body}]
    user_id: str
    consent_confirmed: bool = False

class EmailSendResult(BaseModel):
    email: str
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None

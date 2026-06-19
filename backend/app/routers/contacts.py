from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.services.contact_service import parse_contacts_file
from app.dependencies import get_current_user
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/contacts", tags=["contacts"])

@router.post("/parse")
async def parse_contacts(
    file: UploadFile = File(...),
    consent_confirmed: bool = Form(False),
    user: dict = Depends(get_current_user)
):
    """Parse contacts from CSV or PDF file."""
    if not consent_confirmed:
        raise HTTPException(
            status_code=400,
            detail="Consent confirmation is required. You must confirm that these contacts have opted in to receive communications."
        )

    file_bytes = await file.read()
    filename = file.filename or ""
    content_type = file.content_type or ""

    contacts = await parse_contacts_file(file_bytes, content_type, filename)

    if not contacts:
        raise HTTPException(
            status_code=422,
            detail="No valid contacts with email addresses found. Ensure your CSV has columns: name, email, company, title"
        )

    if len(contacts) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 recipients allowed per upload action to maintain compliance and sender reputation."
        )

    # Store consent acknowledgment
    await create_audit_log(
        user_id=user["id"],
        action="consent_acknowledged",
        metadata={"type": "contact_upload", "filename": filename}
    )

    # Store contact upload audit log
    await create_audit_log(
        user_id=user["id"],
        action="contacts_uploaded",
        metadata={"filename": filename, "count": len(contacts)}
    )

    return {
        "count": len(contacts),
        "contacts": [c.model_dump() for c in contacts]
    }

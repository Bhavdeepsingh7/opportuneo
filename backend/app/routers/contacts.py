from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.contact_service import parse_contacts_file

router = APIRouter(prefix="/contacts", tags=["contacts"])

@router.post("/parse")
async def parse_contacts(file: UploadFile = File(...)):
    """Parse contacts from CSV or PDF file."""
    file_bytes = await file.read()
    filename = file.filename or ""
    content_type = file.content_type or ""

    contacts = await parse_contacts_file(file_bytes, content_type, filename)

    if not contacts:
        raise HTTPException(
            status_code=422,
            detail="No valid contacts with email addresses found. Ensure your CSV has columns: name, email, company, title"
        )

    return {
        "count": len(contacts),
        "contacts": [c.model_dump() for c in contacts]
    }

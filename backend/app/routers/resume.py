from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from app.services.resume_service import extract_resume_text, parse_resume_with_ai

router = APIRouter(prefix="/resume", tags=["resume"])

@router.post("/parse")
async def parse_resume(
    file: UploadFile = File(None),
    text: str = Form(None),
):
    """Parse resume from uploaded file or pasted text."""
    if file:
        file_bytes = await file.read()
        raw_text = extract_resume_text(file_bytes, file.content_type or "")
    elif text:
        raw_text = text
    else:
        raise HTTPException(status_code=400, detail="Provide either a file or text")

    if len(raw_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Resume text too short to parse")

    parsed = await parse_resume_with_ai(raw_text)
    return {"raw_text": raw_text, "parsed": parsed}

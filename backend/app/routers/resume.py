from fastapi import APIRouter, UploadFile, File, HTTPException, Form
import os
import uuid

from app.services.resume_service import extract_resume_text, parse_resume_with_ai

router = APIRouter(prefix="/resume", tags=["resume"])

# Config
TEMP_DIR = "temp"
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_TYPES = ["application/pdf"]


@router.post("/parse")
async def parse_resume(
    file: UploadFile = File(None),
    text: str = Form(None),
):
    """
    Parse resume from uploaded file or pasted text.
    Returns raw text + structured parsed data + file path (if uploaded).
    """

    file_path = None
    raw_text = ""

    # -------------------------
    # CASE 1: FILE UPLOAD
    # -------------------------
    if file:
        # Validate file type
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are allowed",
            )

        # Read file once
        content = await file.read()

        # Validate size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File too large (max 2MB)",
            )

        # Ensure temp directory exists
        os.makedirs(TEMP_DIR, exist_ok=True)

        # Safe filename
        safe_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(TEMP_DIR, safe_filename)

        # Save file
        with open(file_path, "wb") as f:
            f.write(content)

        # Extract text
        raw_text = extract_resume_text(content, file.content_type or "")

    # -------------------------
    # CASE 2: TEXT INPUT
    # -------------------------
    elif text:
        raw_text = text.strip()

    # -------------------------
    # ERROR: NO INPUT
    # -------------------------
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either a file or text",
        )

    # -------------------------
    # VALIDATE TEXT
    # -------------------------
    if len(raw_text.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="Resume text too short to parse",
        )

    # -------------------------
    # AI PARSING
    # -------------------------
    try:
        parsed = await parse_resume_with_ai(raw_text)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Resume parsing failed: {str(e)}",
        )

    # -------------------------
    # RESPONSE
    # -------------------------
    return {
        "raw_text": raw_text,
        "parsed": parsed,
        "file_path": file_path  # important for email attachment later
    }
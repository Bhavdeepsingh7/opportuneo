from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
import os
import uuid
import httpx

from app.services.resume_service import extract_resume_text, parse_resume_with_ai
from app.services.storage_service import storage_service
from app.dependencies import get_current_user, get_supabase_headers
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/resume", tags=["resume"])

# Config
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
STORAGE_BUCKET = "resumes"


@router.get("/default")
async def get_default_resume(user: dict = Depends(get_current_user)):
    """Get the user's default resume."""
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{settings.supabase_url}/rest/v1/resumes?user_id=eq.{user['id']}&is_default=eq.true&select=*",
            headers=get_supabase_headers()
        )
    if res.status_code != 200:
        return None
    data = res.json()
    if data:
        import logging
        logging.info(f"GET_DEFAULT_RESUME: storage_path={data[0].get('storage_path')}")
    return data[0] if data else None

@router.post("/upload-default")
async def upload_default_resume(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload, parse, and set a resume as default."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    # 1. Upload to Supabase Storage
    safe_filename = f"{uuid.uuid4()}_{file.filename}"
    storage_path = f"{user['id']}/{safe_filename}"
    import logging
    logging.info(f"UPLOAD_DEFAULT_RESUME: storage_path={storage_path}")
    try:
        await storage_service.upload_file(
            bucket=STORAGE_BUCKET,
            path=storage_path,
            content=content,
            content_type=file.content_type or "application/octet-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    # 2. Parse
    try:
        raw_text = extract_resume_text(content, file.content_type or "")
        parsed = await parse_resume_with_ai(raw_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

    # 3. Save to Supabase DB
    async with httpx.AsyncClient() as client:
        # Unset existing default
        await client.patch(
            f"{settings.supabase_url}/rest/v1/resumes?user_id=eq.{user['id']}&is_default=eq.true",
            headers=get_supabase_headers(),
            json={"is_default": False}
        )
        # Insert new default
        res = await client.post(
            f"{settings.supabase_url}/rest/v1/resumes",
            headers=get_supabase_headers(),
            json={
                "user_id": user["id"],
                "filename": file.filename,
                "is_default": True,
                "raw_text": raw_text,
                "parsed_data": parsed,
                "storage_path": storage_path
            }
        )
    
    if res.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=500, detail="Failed to save resume")
    
    return {"success": True, "filename": file.filename, "parsed": parsed, "storage_path": storage_path}

@router.delete("/default")
async def delete_default_resume(user: dict = Depends(get_current_user)):
    """Delete the default resume."""
    async with httpx.AsyncClient() as client:
        res = await client.delete(
            f"{settings.supabase_url}/rest/v1/resumes?user_id=eq.{user['id']}&is_default=eq.true",
            headers=get_supabase_headers()
        )
    if res.status_code not in [200, 201, 204]:
        raise HTTPException(status_code=500, detail="Failed to delete resume")
    return {"success": True}

@router.post("/parse")
async def parse_resume(
    file: UploadFile = File(None),
    text: str = Form(None),
):
    """
    Parse resume from uploaded file or pasted text.
    Returns raw text + structured parsed data + storage path (if uploaded).
    """

    storage_path = None
    raw_text = ""

    # -------------------------
    # CASE 1: FILE UPLOAD
    # -------------------------
    if file:
        # Validate file type
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Allowed: PDF, DOCX, TXT",
            )

        # Read file
        content = await file.read()

        # Validate size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File too large (max 2MB)",
            )

        # Safe filename & upload to Supabase
        safe_filename = f"{uuid.uuid4()}_{file.filename}"
        storage_path = f"uploads/{safe_filename}"
        import logging
        logging.info(f"PARSE_RESUME: storage_path={storage_path}")
        
        try:
            await storage_service.upload_file(
                bucket=STORAGE_BUCKET,
                path=storage_path,
                content=content,
                content_type=file.content_type or "application/octet-stream"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to storage: {str(e)}"
            )

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
        "file_path": storage_path  # We keep 'file_path' key for frontend compatibility
    }
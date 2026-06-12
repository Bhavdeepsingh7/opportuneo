import io
import csv
import json
import pandas as pd
import PyPDF2
from typing import List
from openai import OpenAI
from app.config import get_settings
from app.models.schemas import ContactEntry

settings = get_settings()

# LLM Selection Logic
if settings.llm_provider == "groq":
    client = OpenAI(
        api_key=settings.groq_api_key,
        base_url="https://api.groq.com/openai/v1"
    )
    LLM_MODEL = "llama-3.3-70b-versatile"
elif settings.llm_provider == "gemini":
    client = OpenAI(
        api_key=settings.gemini_api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    LLM_MODEL = "gemini-2.5-flash"
else:
    client = OpenAI(
        api_key=settings.groq_api_key,
        base_url="https://api.groq.com/openai/v1"
    )
    LLM_MODEL = "llama-3.3-70b-versatile"

# Gemini-specific configuration (commented out per requirement)
# client = OpenAI(
#     api_key=settings.gemini_api_key,
#     base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
# )
# LLM_MODEL = "gemini-2.5-flash"

def parse_csv_contacts(file_bytes: bytes) -> List[ContactEntry]:
    text = file_bytes.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    contacts = []
    
    col_map = {}
    if reader.fieldnames:
        for col in reader.fieldnames:
            col_lower = col.strip().lower()
            if any(k in col_lower for k in ["email", "e-mail", "mail"]):
                col_map["email"] = col
            elif any(k in col_lower for k in ["name", "full name", "contact"]):
                col_map["name"] = col
            elif any(k in col_lower for k in ["company", "organization", "employer", "firm"]):
                col_map["company"] = col
            elif any(k in col_lower for k in ["title", "position", "role", "job"]):
                col_map["title"] = col

    for row in reader:
        email = row.get(col_map.get("email", "email"), "").strip()
        if not email or "@" not in email:
            continue

        contacts.append(ContactEntry(
            email=email,
            name=row.get(col_map.get("name", "name"), "").strip() or "Hiring Manager",
            company=row.get(col_map.get("company", "company"), "").strip() or "Company",
            title=row.get(col_map.get("title", "title"), "").strip() or "HR Manager",
        ))
    return contacts


async def parse_pdf_contacts_with_ai(file_bytes: bytes) -> List[ContactEntry]:
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "user",
                "content": f"""Extract all contact information from this document.

Return ONLY a raw JSON array. Do NOT include markdown code fences.
Ensure all newlines within JSON string values are escaped as \\n.

[
  {{"name": "Full Name", "email": "email@company.com", "company": "Company Name", "title": "Job Title"}},
  ...
]
Only include entries that have a valid email address. If no emails found, return [].

Document text:
{text[:5000]}"""
            }
        ],
        temperature=0.2
    )

    text_resp = response.choices[0].message.content.strip()

    # Log raw response
    import logging
    logger = logging.getLogger(__name__)
    logger.debug(f"CONTACT_PARSE RAW RESPONSE:\n{text_resp}")

    # Robust cleanup
    cleaned = text_resp.strip()
    if cleaned.startswith("```"):
        import re
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned, strict=False)
    except json.JSONDecodeError:
        import re
        # Look for [ ] array block
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if match:
            data = json.loads(match.group(0), strict=False)
        else:
            logger.error(f"Failed to parse contact JSON. Raw: {text_resp}")
            raise ValueError(f"Invalid JSON from model: {cleaned[:100]}...")

    return [
        ContactEntry(**item)
        for item in data
        if item.get("email") and "@" in item.get("email", "")
    ]


async def parse_contacts_file(file_bytes: bytes, content_type: str, filename: str) -> List[ContactEntry]:
    filename_lower = filename.lower()

    if filename_lower.endswith(".csv") or "csv" in content_type:
        return parse_csv_contacts(file_bytes)

    elif filename_lower.endswith(".pdf") or "pdf" in content_type:
        return await parse_pdf_contacts_with_ai(file_bytes)

    else:
        try:
            return parse_csv_contacts(file_bytes)
        except Exception:
            return []
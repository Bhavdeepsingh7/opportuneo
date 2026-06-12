import io
import json
from openai import OpenAI
import PyPDF2
import docx
from app.config import get_settings

settings = get_settings()

import logging
logger = logging.getLogger(__name__)

def get_llm_config(provider: str):
    if provider == "groq":
        return {
            "client": OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1"),
            "model": "llama-3.3-70b-versatile"
        }
    elif provider == "gemini":
        return {
            "client": OpenAI(api_key=settings.gemini_api_key, base_url="https://generativelanguage.googleapis.com/v1beta/openai/"),
            "model": "gemini-2.5-flash"
        }
    return {
        "client": OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1"),
        "model": "llama-3.3-70b-versatile"
    }

def should_fallback_to_groq(error: Exception) -> bool:
    err_str = str(error).lower()
    if any(k in err_str for k in ["429", "resource_exhausted", "quota exceeded", "rate limit", "timeout", "500", "502", "503", "504"]):
        return True
    return False

def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text.strip()

def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])

def extract_resume_text(file_bytes: bytes, content_type: str) -> str:
    if "pdf" in content_type:
        return extract_text_from_pdf(file_bytes)
    elif "docx" in content_type or "word" in content_type or "openxml" in content_type:
        return extract_text_from_docx(file_bytes)
    else:
        return file_bytes.decode("utf-8", errors="ignore")


async def parse_resume_with_ai(raw_text: str) -> dict:
    primary = settings.primary_llm
    fallback = settings.fallback_llm
    provider = primary
    config = get_llm_config(provider)

    try:
        logger.info(f"Using {provider} provider for resume parsing")
        response = config["client"].chat.completions.create(
            model=config["model"],
            messages=[
                {
                    "role": "user",
                    "content": f"""Extract structured professional profile from this resume.

Return ONLY a raw JSON object. Do NOT include markdown code fences, do NOT include any explanation.
Ensure all newlines within JSON string values are escaped as \\n.

{{
  "name": "Full Name",
  "current_title": "Most recent job title",
  "current_company": "Most recent company",
  "years_experience": years,
  "top_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "key_achievements": ["specific achievement with metric", "another achievement"],
  "education": "Degree and school",
  "projects": ["brief description of key projects showcasing skills and impact"],
  "summary": "2-3 sentence professional summary highlighting what makes them stand out"
}}

Resume text:
{raw_text[:4000]}"""
                }
            ],
            temperature=0.2
        )
    except Exception as e:
        if should_fallback_to_groq(e):
            logger.warning(f"{provider} quota exhausted or error; using {fallback} fallback for resume parsing. Error: {str(e)}")
            provider = fallback
            config = get_llm_config(provider)
            try:
                logger.info(f"Using {provider} fallback provider for resume parsing")
                response = config["client"].chat.completions.create(
                    model=config["model"],
                    messages=[
                        {
                            "role": "user",
                            "content": f"""Extract structured professional profile from this resume.

Return ONLY a raw JSON object. Do NOT include markdown code fences, do NOT include any explanation.
Ensure all newlines within JSON string values are escaped as \\n.

{{
  "name": "Full Name",
  "current_title": "Most recent job title",
  "current_company": "Most recent company",
  "years_experience": years,
  "top_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "key_achievements": ["specific achievement with metric", "another achievement"],
  "education": "Degree and school",
  "projects": ["brief description of key projects showcasing skills and impact"],
  "summary": "2-3 sentence professional summary highlighting what makes them stand out"
}}

Resume text:
{raw_text[:4000]}"""
                        }
                    ],
                    temperature=0.2
                )
            except Exception as fe:
                logger.error(f"Fallback {provider} also failed for resume parsing: {str(fe)}")
                raise ValueError(f"Resume parsing failed on both primary and fallback: {str(fe)}")
        else:
            logger.error(f"LLM API Failure ({provider}) during resume parsing: {str(e)}")
            raise ValueError(f"Resume parsing failed: {str(e)}")

    text = response.choices[0].message.content.strip()

    # Log raw response
    logger.debug(f"RESUME_PARSE RAW RESPONSE:\n{text}")

    # Robust cleanup
    cleaned = text.strip()
    if cleaned.startswith("```"):
        import re
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned, strict=False)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0), strict=False)
        logger.error(f"Failed to parse resume JSON. Raw: {text}")
        raise
import io
import json
from openai import OpenAI
import PyPDF2
import docx
from app.config import get_settings

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
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "user",
                "content": f"""Extract structured professional profile from this resume.
Return ONLY valid JSON, no markdown fences, no explanation:
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

    text = response.choices[0].message.content.strip()

    # cleanup (Gemini sometimes still wraps JSON)
    text = text.replace("```json", "").replace("```", "").strip()

    return json.loads(text)
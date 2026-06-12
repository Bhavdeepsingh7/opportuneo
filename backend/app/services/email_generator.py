import json
import logging
import re
from typing import List

from openai import OpenAI

from app.config import get_settings
from app.models.schemas import ContactEntry, GeneratedEmail

settings = get_settings()
logger = logging.getLogger(__name__)

client = OpenAI(
    api_key=settings.gemini_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)

SYSTEM_PROMPT = """You are an expert career coach writing personalized job outreach emails.

Rules:
- SPECIFIC: Reference at least one real detail about the company or their role
- RELEVANT: Connect the sender's specific experience to what this company needs
- HUMAN: Sound like a thoughtful person wrote this, not AI
- CONCISE: 120-180 words for email body
- FORMAT: 3-5 short paragraphs with blank lines between them
- tell about the sender's unique value, skills , or perspective that would benefit the recipient or their team
- also share the relevent links of the sender's work, projects, or portfolio to provide evidence of their skills and experience.
- ONE clear CTA at the end (schedule a call, review application, etc.)

NEVER use: "I'm passionate about", "I'd be a great fit", "I've always admired", "synergy", "leverage", "circle back", "touch base", "per my last email"

Return ONLY valid JSON, no markdown fences."""

TONE_INSTRUCTIONS = {
    "confident": "Write confidently and directly. Lead with your strongest qualification. Be assertive but not arrogant.",
    "warm": "Write warmly and with genuine curiosity. Show real interest in their work. Be personable.",
    "humble": "Write with humility and eagerness to learn. Position yourself as someone who brings value and wants to grow.",
}


def _extract_json_object(text: str) -> dict:
    cleaned = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError(f"Invalid JSON from model: {cleaned}")
        return json.loads(match.group(0))


def _normalize_body(body: str) -> str:
    lines = [line.rstrip() for line in body.replace("\r\n", "\n").split("\n")]
    normalized = "\n".join(lines).strip()
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized


def _validate_generated_email(data: dict, contact: ContactEntry) -> None:
    subject = str(data.get("subject", "")).strip()
    body = _normalize_body(str(data.get("body", "")))
    word_count = len(re.findall(r"\b\w+\b", body))
    paragraphs = [p for p in body.split("\n\n") if p.strip()]
    
    role = (contact.title or "").strip()
    company = (contact.company or "").strip()
    body_lower = body.lower()

    # 1. Company Match (Robust)
    company_found = False
    if not company:
        company_found = True
    else:
        if company.lower() in body_lower:
            company_found = True
        else:
            # Variations: strip common suffixes
            simplified = re.sub(
                r"\s+(inc|corp|ltd|llc|incorporated|corporation|group|solutions|technologies|systems|lab|labs)\.?$", 
                "", 
                company, 
                flags=re.I
            ).strip()
            if len(simplified) >= 3 and simplified.lower() in body_lower:
                company_found = True

    # 2. Role Match (Robust / Keyword-based)
    role_found = False
    if not role:
        role_found = True
    else:
        if role.lower() in body_lower:
            role_found = True
        else:
            # Significant keywords only
            noise = {
                "senior", "junior", "lead", "staff", "principal", "ii", "iii", "level", "associate", 
                "trainee", "intern", "sr", "jr", "manager", "director", "vp", "head", "specialist"
            }
            keywords = [w for w in re.findall(r"\b\w+\b", role.lower()) if w not in noise and len(w) > 2]
            if keywords and all(kw in body_lower for kw in keywords):
                role_found = True

    # 3. Validation Rules
    errors = []
    if not subject:
        errors.append("Empty subject line")
    if word_count < 90:
        errors.append(f"Body too short ({word_count} words, target 120-180)")
    if len(paragraphs) < 3:
        errors.append(f"Insufficient structure ({len(paragraphs)} paragraphs)")
    
    # Requirement: Company or Role must be mentioned
    if not company_found and not role_found:
        logger.error(
            f"EMAIL_VALIDATION_FAILURE:\n"
            f"  Recipient: {contact.name}\n"
            f"  Company: '{company}' (Match: {company_found})\n"
            f"  Role: '{role}' (Match: {role_found})\n"
            f"  Body snippet: {body[:200]}...\n"
            f"  Full Body: {body}"
        )
        errors.append(f"Generated body did not reference the company ('{company}') or role ('{role}')")

    if errors:
        raise ValueError("; ".join(errors))


def _fallback_email(profile_name: str, current_title: str, contact: ContactEntry) -> GeneratedEmail:
    subject = f"{current_title or 'Professional'} reaching out about {contact.company}"
    body = (
        f"Hi {contact.name},\n\n"
        f"I'm reaching out because your work at {contact.company} caught my attention, and I wanted to introduce myself directly. "
        f"I currently work as a {current_title or 'professional'} and am exploring opportunities where I can contribute relevant experience in a hands-on way.\n\n"
        f"My background is centered on delivering practical results, working across teams, and taking ownership of meaningful problems. "
        f"I'm especially interested in environments where thoughtful execution matters and where individual contributions can have visible impact.\n\n"
        f"If you're open to it, I'd appreciate the chance to share a bit more about my background and learn whether there might be a fit with your team or someone you recommend I speak with.\n\n"
        f"Best,\n{profile_name}"
    )
    return GeneratedEmail(contact=contact, subject=subject[:60], body=body, variant="direct")


async def generate_emails_for_contacts(
    resume_data: dict,
    contacts: List[ContactEntry],
    job_context: str = "",
    tone: str = "confident",
) -> List[GeneratedEmail]:
    tone_instruction = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["confident"])

    profile = f"""
Candidate: {resume_data.get('name', 'Candidate')}
Current Title: {resume_data.get('current_title', '')}
Current Company: {resume_data.get('current_company', '')}
Years of Experience: {resume_data.get('years_experience', '')}
Top Skills: {', '.join(resume_data.get('top_skills', []))}
Key Achievements: {'; '.join(resume_data.get('key_achievements', []))}
Education: {resume_data.get('education', '')}
Summary: {resume_data.get('summary', '')}
""".strip()

    results = []
    profile_name = resume_data.get("name", "Candidate")
    current_title = resume_data.get("current_title", "Professional")

    for contact in contacts:
        try:
            email = await _generate_single_email(
                profile=profile,
                contact=contact,
                job_context=job_context,
                tone_instruction=tone_instruction,
            )
            results.append(email)
        except Exception:
            logger.exception("Email generation failed for %s at %s", contact.name, contact.company)
            results.append(_fallback_email(profile_name, current_title, contact))

    return results


async def _generate_single_email(
    profile: str,
    contact: ContactEntry,
    job_context: str,
    tone_instruction: str,
) -> GeneratedEmail:
    context_section = f"\nJob Context / Role Targeting: {job_context}" if job_context else ""
    last_error = None

    for attempt in range(2):
        extra_guidance = ""
        if attempt == 1:
            extra_guidance = """

Important correction:
- The previous draft was too short or malformed.
- Make the body 120-180 words.
- Use 3-5 short paragraphs with blank lines between them.
- Mention the company name or the recipient's role explicitly.
- Return strict JSON only.
"""

        response = client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"""Generate a personalized outreach email.

RECIPIENT:
Name: {contact.name}
Title: {contact.title}
Company: {contact.company}
Email: {contact.email}

SENDER PROFILE:
{profile}
{context_section}

TONE: {tone_instruction}
{extra_guidance}

Return JSON:
{{
  "subject": "compelling email subject (max 60 chars)",
  "body": "full email body (120-180 words, with \\n\\n between paragraphs)",
  "variant": "direct"
}}""",
                },
            ],
            temperature=0.6 if attempt == 1 else 0.4,
        )

        text = response.choices[0].message.content.strip()

        try:
            data = _extract_json_object(text)
            data["body"] = _normalize_body(str(data.get("body", "")))
            _validate_generated_email(data, contact)
            return GeneratedEmail(
                contact=contact,
                subject=str(data["subject"]).strip(),
                body=data["body"],
                variant=data.get("variant", "direct"),
            )
        except Exception as e:
            last_error = e

    raise ValueError(str(last_error) if last_error else "Email generation failed")


async def regenerate_single_email(
    resume_data: dict,
    contact: ContactEntry,
    job_context: str,
    tone: str,
    feedback: str = "",
) -> GeneratedEmail:
    tone_instruction = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["confident"])

    profile = f"""
Candidate: {resume_data.get('name', 'Candidate')}
Current Title: {resume_data.get('current_title', '')}
Skills: {', '.join(resume_data.get('top_skills', []))}
Achievements: {'; '.join(resume_data.get('key_achievements', []))}
Summary: {resume_data.get('summary', '')}
""".strip()

    feedback_section = f"\nUser feedback: {feedback}" if feedback else ""

    response = client.chat.completions.create(
        model="gemini-2.5-flash",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"""Regenerate the outreach email with improvements.

RECIPIENT: {contact.name} | {contact.title} @ {contact.company}
SENDER: {profile}
TONE: {tone_instruction}
{feedback_section}

Return JSON:
{{
  "subject": "compelling email subject (max 60 chars)",
  "body": "full email body (120-180 words, with \\n\\n between paragraphs)",
  "variant": "direct"
}}""",
            },
        ],
        temperature=0.5,
    )

    text = response.choices[0].message.content.strip()
    data = _extract_json_object(text)
    data["body"] = _normalize_body(str(data.get("body", "")))
    _validate_generated_email(data, contact)

    return GeneratedEmail(
        contact=contact,
        subject=str(data["subject"]).strip(),
        body=data["body"],
        variant=data.get("variant", "direct"),
    )

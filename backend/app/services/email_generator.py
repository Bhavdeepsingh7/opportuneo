import json
from typing import List
from openai import OpenAI
from app.config import get_settings
from app.models.schemas import ContactEntry, GeneratedEmail

settings = get_settings()

client = OpenAI(
    api_key=settings.gemini_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

SYSTEM_PROMPT = """You are an expert career coach writing personalized job outreach emails.

Rules:
- SPECIFIC: Reference at least one real detail about the company or their role
- RELEVANT: Connect the sender's specific experience to what this company needs  
- HUMAN: Sound like a thoughtful person wrote this, not AI
- CONCISE: 120-180 words for email body
- ONE clear CTA at the end (schedule a call, review application, etc.)

NEVER use: "I'm passionate about", "I'd be a great fit", "I've always admired", "synergy", "leverage", "circle back", "touch base", "per my last email"

Return ONLY valid JSON, no markdown fences."""

TONE_INSTRUCTIONS = {
    "confident": "Write confidently and directly. Lead with your strongest qualification. Be assertive but not arrogant.",
    "warm": "Write warmly and with genuine curiosity. Show real interest in their work. Be personable.",
    "humble": "Write with humility and eagerness to learn. Position yourself as someone who brings value and wants to grow."
}


async def generate_emails_for_contacts(
    resume_data: dict,
    contacts: List[ContactEntry],
    job_context: str = "",
    tone: str = "confident"
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

    for contact in contacts:
        try:
            email = await _generate_single_email(
                profile=profile,
                contact=contact,
                job_context=job_context,
                tone_instruction=tone_instruction
            )
            results.append(email)
        except Exception:
            results.append(GeneratedEmail(
                contact=contact,
                subject=f"Introduction — {resume_data.get('current_title', 'Professional')} seeking opportunity",
                body=f"Hi {contact.name},\n\nI came across {contact.company} and was impressed by your work. I'd love to connect.\n\nBest,\n{resume_data.get('name', '')}",
                variant="direct"
            ))

    return results


async def _generate_single_email(
    profile: str,
    contact: ContactEntry,
    job_context: str,
    tone_instruction: str
) -> GeneratedEmail:

    context_section = f"\nJob Context / Role Targeting: {job_context}" if job_context else ""

    response = client.chat.completions.create(
        model="gemini-flash-latest",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
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

Return JSON:
{{
  "subject": "compelling email subject (max 60 chars)",
  "body": "full email body (120-180 words)",
  "variant": "direct"
}}"""
            }
        ],
        temperature=0.4
    )

    text = response.choices[0].message.content.strip()
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise ValueError(f"Invalid JSON from model: {text}")

    return GeneratedEmail(
        contact=contact,
        subject=data["subject"],
        body=data["body"],
        variant=data.get("variant", "direct")
    )


async def regenerate_single_email(
    resume_data: dict,
    contact: ContactEntry,
    job_context: str,
    tone: str,
    feedback: str = ""
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
        model="gemini-flash-latest",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"""Regenerate the outreach email with improvements.

RECIPIENT: {contact.name} | {contact.title} @ {contact.company}
SENDER: {profile}
TONE: {tone_instruction}
{feedback_section}

Return JSON: {{"subject": "...", "body": "...", "variant": "direct"}}"""
            }
        ],
        temperature=0.5
    )

    text = response.choices[0].message.content.strip()
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise ValueError(f"Invalid JSON from model: {text}")

    return GeneratedEmail(
        contact=contact,
        subject=data["subject"],
        body=data["body"],
        variant=data.get("variant", "direct")
    )
import resend
from typing import List
from app.config import get_settings
from app.models.schemas import EmailSendResult

settings = get_settings()

async def send_emails(
    emails: List[dict],  # [{to, subject, body, contact_name}]
    from_name: str,
    from_email: str = "outreach@resend.dev"  # use resend test domain or user's verified domain
) -> List[EmailSendResult]:
    """
    Send emails via Resend API.
    
    Note: In production, from_email should be a verified domain in Resend.
    For testing, use 'onboarding@resend.dev' (Resend's test address).
    """
    resend.api_key = settings.resend_api_key
    results = []

    for email_data in emails:
        to_email = email_data.get("to", "")
        subject = email_data.get("subject", "")
        body = email_data.get("body", "")
        contact_name = email_data.get("contact_name", "")

        # Convert plain text body to HTML
        html_body = plain_to_html(body, from_name)

        try:
            params = resend.Emails.SendParams(
                from_=f"{from_name} <{from_email}>",
                to=[to_email],
                subject=subject,
                html=html_body,
                text=body,
            )
            response = resend.Emails.send(params)
            results.append(EmailSendResult(
                email=to_email,
                success=True,
                message_id=response.get("id", "")
            ))
        except Exception as e:
            results.append(EmailSendResult(
                email=to_email,
                success=False,
                error=str(e)
            ))

    return results

def plain_to_html(text: str, sender_name: str) -> str:
    """Convert plain text email to clean HTML"""
    paragraphs = text.strip().split("\n\n")
    html_paragraphs = "".join(
        f"<p style='margin:0 0 16px 0;line-height:1.6;color:#374151;'>{p.replace(chr(10), '<br>')}</p>"
        for p in paragraphs if p.strip()
    )

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:40px;border:1px solid #e5e7eb;">
    {html_paragraphs}
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;">
    Sent via OutreachAI
  </p>
</body>
</html>
"""

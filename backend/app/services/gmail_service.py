import os
import base64
import json
import mimetypes
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from app.config import get_settings
from app.models.schemas import EmailSendResult

settings = get_settings()

# Include openid — Google always returns it; without it the library raises "Scope has changed"
SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.send",
]

def _make_flow():
    from google_auth_oauthlib.flow import Flow
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri],
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.google_redirect_uri,
    )

def get_gmail_auth_url() -> str:
    """Return Google OAuth URL for frontend redirect."""
    flow = _make_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="false",  # prevents scope-change errors
        prompt="consent",
    )
    return auth_url

def exchange_code_for_tokens(code: str) -> dict:
    """Exchange OAuth code for access + refresh tokens."""
    # Allow the library to accept extra scopes returned by Google
    os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

    flow = _make_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes or SCOPES),
    }

def _build_creds(token_data: dict) -> Credentials:
    creds = Credentials(
        token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=token_data.get("client_id", settings.google_client_id),
        client_secret=token_data.get("client_secret", settings.google_client_secret),
        scopes=token_data.get("scopes", SCOPES),
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return creds

def get_gmail_user_email(token_data: dict) -> str:
    """Get the Gmail address for the connected account."""
    creds = _build_creds(token_data)
    service = build("oauth2", "v2", credentials=creds)
    user_info = service.userinfo().get().execute()
    return user_info.get("email", "")

def _get_allowed_attachment_path(file_path: Optional[str]) -> Optional[str]:
    if not file_path:
        return None

    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    temp_root = os.path.abspath(os.path.join(backend_root, "temp"))
    candidate = os.path.abspath(file_path)

    if os.path.commonpath([candidate, temp_root]) != temp_root:
        raise ValueError("Attachment must be inside the backend temp directory")
    if not os.path.isfile(candidate):
        raise FileNotFoundError("Resume attachment file was not found")

    return candidate

def _attach_file(msg: MIMEMultipart, file_path: str) -> None:
    mime_type, _ = mimetypes.guess_type(file_path)
    main_type, sub_type = (mime_type or "application/octet-stream").split("/", 1)

    with open(file_path, "rb") as f:
        part = MIMEBase(main_type, sub_type)
        part.set_payload(f.read())

    encoders.encode_base64(part)
    part.add_header(
        "Content-Disposition",
        f'attachment; filename="{os.path.basename(file_path)}"',
    )
    msg.attach(part)

def _build_message(
    from_header: str,
    to_email: str,
    subject: str,
    body: str,
    attachment_path: Optional[str] = None,
) -> dict:
    msg = MIMEMultipart("alternative")
    msg["From"] = from_header
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    msg.attach(MIMEText(plain_to_html(body), "html"))

    if attachment_path:
        mixed = MIMEMultipart("mixed")
        mixed["From"] = from_header
        mixed["To"] = to_email
        mixed["Subject"] = subject
        mixed.attach(msg)
        _attach_file(mixed, attachment_path)
        msg = mixed

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    return {"raw": raw}

async def send_emails_via_gmail(
    token_data: dict,
    emails: List[dict],
    from_name: str,
    from_email: str,
    resume_file_path: Optional[str] = None,
) -> List[EmailSendResult]:
    """Send emails using the user's Gmail via OAuth tokens."""
    creds = _build_creds(token_data)
    service = build("gmail", "v1", credentials=creds)
    results = []
    from_header = f"{from_name} <{from_email}>"
    attachment_path = _get_allowed_attachment_path(resume_file_path)

    for email_data in emails:
        to = email_data.get("to", "")
        subject = email_data.get("subject", "")
        body = email_data.get("body", "")
        try:
            message = _build_message(from_header, to, subject, body, attachment_path)
            sent = service.users().messages().send(userId="me", body=message).execute()
            results.append(EmailSendResult(email=to, success=True, message_id=sent.get("id", "")))
        except Exception as e:
            results.append(EmailSendResult(email=to, success=False, error=str(e)))

    return results

def plain_to_html(text: str) -> str:
    paragraphs = text.strip().split("\n\n")
    html_paras = "".join(
        f"<p style='margin:0 0 16px;line-height:1.65;color:#1f2937;font-size:15px;'>{p.replace(chr(10),'<br>')}</p>"
        for p in paragraphs if p.strip()
    )
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:40px 16px;">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:10px;padding:44px;border:1px solid #e5e7eb;">
{html_paras}
</div></body></html>"""

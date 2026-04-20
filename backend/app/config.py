import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

class Settings:
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    google_redirect_uri: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/gmail/callback")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    secret_key: str = os.getenv("SECRET_KEY", "change-me-in-production-32-chars!!")

@lru_cache()
def get_settings() -> Settings:
    return Settings()

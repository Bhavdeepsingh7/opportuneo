import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

class Settings:
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    llm_provider: str = os.getenv("LLM_PROVIDER", "groq")  # 'groq' or 'gemini'
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    razorpay_key_id: str = os.getenv("RAZORPAY_KEY_ID", "")
    razorpay_key_secret: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    razorpay_webhook_secret: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    google_client_id_web: str = os.getenv("GOOGLE_CLIENT_ID_WEB", "")
    google_client_secret_web: str = os.getenv("GOOGLE_CLIENT_SECRET_WEB", "")
    google_redirect_uri: str = os.getenv("GOOGLE_REDIRECT_URI_WEB", "http://localhost:8000/api/gmail/callback")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    secret_key: str = os.getenv("SECRET_KEY", "change-me-in-production-32-chars!!")
    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
    rabbitmq_queue: str = os.getenv("RABBITMQ_QUEUE", "campaign_queue")
    rabbitmq_dead_queue: str = os.getenv("RABBITMQ_DEAD_QUEUE", "dead_letter_queue")

@lru_cache()
def get_settings() -> Settings:
    return Settings()

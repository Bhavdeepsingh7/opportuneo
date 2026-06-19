from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import resume, contacts, emails, gmail, users, payments
from app.rabbitmq import close_rabbitmq

settings = get_settings()

@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await close_rabbitmq()

app = FastAPI(
    title="Opportuneo API",
    description="AI-powered email assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(resume.router,   prefix="/api")
app.include_router(contacts.router, prefix="/api")
app.include_router(emails.router,   prefix="/api")
app.include_router(gmail.router,    prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(users.router,    prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "service": "Opportuneo API"}

@app.get("/health")
def health():
    return {"status": "healthy"}

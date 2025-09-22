from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.api.projects import router as projects_router
from app.api.repo import router as repo_router
from app.api.commits import router as commits_router
from app.api.env import router as env_router
from app.api.assets import router as assets_router
from app.api.chat import router as chat_router
from app.api.tokens import router as tokens_router
from app.api.settings import router as settings_router
from app.api.project_services import router as project_services_router
from app.api.github import router as github_router
from app.api.vercel import router as vercel_router
from app.api.auth_supabase import router as auth_router
from app.api.students_supabase import router as students_router
from app.api.supabase_auth import router as supabase_auth_router
from app.api.admin_supabase import router as admin_router
from app.api.leaderboard import router as leaderboard_router
from app.api.general import router as general_router
from app.api.resources import router as resources_router
from app.api.realtime import router as realtime_router
from app.core.logging import configure_logging
from app.core.terminal_ui import ui
# Removed SQLAlchemy imports - using Supabase SDK only
from app.core.database_supabase import get_supabase_client_instance
import os
from typing import List

configure_logging()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Clovable API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware to suppress logging for specific endpoints
class LogFilterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Suppress logging for polling endpoints
        if "/requests/active" in request.url.path:
            import logging
            logger = logging.getLogger("uvicorn.access")
            original_disabled = logger.disabled
            logger.disabled = True
            try:
                response = await call_next(request)
            finally:
                logger.disabled = original_disabled
        else:
            response = await call_next(request)
        return response

app.add_middleware(LogFilterMiddleware)

# Environment-based CORS configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    # Strict CORS for production
    allowed_origins = [
        "https://your-production-domain.com",
        "https://www.your-production-domain.com"
    ]
    # Add your actual production domains here
    additional_origins = os.getenv("ALLOWED_ORIGINS", "")
    if additional_origins:
        allowed_origins.extend(additional_origins.split(","))
else:
    # Permissive CORS for development
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"] if ENVIRONMENT == "production" else ["*"],
    allow_headers=["*"]
)

# Routers
app.include_router(projects_router, prefix="/api/projects")
app.include_router(repo_router)
app.include_router(commits_router)
app.include_router(env_router)
app.include_router(assets_router)
app.include_router(chat_router, prefix="/api/chat")  # Unified chat API (includes WebSocket and ACT)
app.include_router(tokens_router)  # Service tokens API
app.include_router(settings_router)  # Settings API
app.include_router(project_services_router)  # Project services API
app.include_router(github_router)  # GitHub integration API
app.include_router(vercel_router)  # Vercel integration API
app.include_router(auth_router, prefix="/api")  # Olympics authentication API (SQLite)
app.include_router(supabase_auth_router, prefix="/api")  # Olympics Supabase SDK authentication API
app.include_router(students_router, prefix="/api")  # Olympics students API (Supabase)
app.include_router(admin_router, prefix="/api")  # Olympics admin API (Supabase)
app.include_router(leaderboard_router, prefix="/api")  # Olympics leaderboard API
app.include_router(general_router, prefix="/api")  # Olympics general endpoints API
app.include_router(resources_router, prefix="/api")  # Olympics resources API  
app.include_router(realtime_router, prefix="/api")  # Olympics real-time API


@app.get("/health")
def health():
    # Health check (English comments only)
    return {"ok": True}


@app.on_event("startup")
def on_startup() -> None:
    # Supabase tables already exist - no creation needed
    ui.info("Initializing Supabase connection")
    get_supabase_client_instance()  # Test connection
    ui.success("Supabase multi-user deployment ready")
    
    # Show available endpoints
    ui.info("API server ready")
    ui.panel(
        "WebSocket: /api/chat/{project_id}\nREST API: /api/projects, /api/chat, /api/github, /api/vercel",
        title="Available Endpoints",
        style="green"
    )
    
    # Display ASCII logo after all initialization is complete
    ui.ascii_logo()
    
    # Show environment info
    env_info = {
        "Environment": os.getenv("ENVIRONMENT", "development"),
        "Debug": os.getenv("DEBUG", "false"),
        "Port": os.getenv("PORT", "8000")
    }
    ui.status_line(env_info)

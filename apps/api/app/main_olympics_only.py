"""
Olympics PWA - Supabase-Only Main Application
Clean deployment for classroom use with 50+ concurrent students
NO SQLite dependencies - Pure Supabase PostgreSQL
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Olympics-only imports - NO SQLite dependencies
from app.api.auth_supabase import router as auth_router
from app.api.supabase_auth import router as supabase_auth_router
from app.api.admin_supabase import router as admin_supabase_router
from app.api.students_supabase import router as students_supabase_router
from app.core.logging import configure_logging
from app.core.terminal_ui import ui
from app.core.database_supabase import get_supabase_client_instance
import os
from typing import List

configure_logging()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="XV Winter Olympic Saga Game API - Classroom Ready")
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
    # Production CORS for Render deployment
    render_url = os.getenv("RENDER_EXTERNAL_URL", "")
    allowed_origins = []
    
    # Add Render domain
    if render_url:
        allowed_origins.extend([
            f"https://{render_url}",
            f"https://www.{render_url}"
        ])
    
    # Add custom domains from environment
    additional_origins = os.getenv("ALLOWED_ORIGINS", "")
    if additional_origins:
        allowed_origins.extend(additional_origins.split(","))
    
    # Add common frontend deployment platforms
    allowed_origins.extend([
        "https://*.onrender.com",
        "https://*.vercel.app", 
        "https://*.netlify.app",
        "https://olympics-pwa-frontend-2024.vercel.app"  # Specific frontend domain
    ])
    
    # Fallback if no origins specified
    if not allowed_origins:
        allowed_origins = ["https://*.onrender.com", "https://*.vercel.app"]
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

# Olympics PWA Routers ONLY - No SQLite dependencies
app.include_router(auth_router, prefix="/api")  # Olympics Supabase authentication
app.include_router(supabase_auth_router, prefix="/api")  # Olympics Supabase SDK authentication
app.include_router(admin_supabase_router, prefix="/api")  # Olympics Admin Management
app.include_router(students_supabase_router, prefix="/api")  # Olympics Student Dashboard

@app.get("/")
def root():
    """Root endpoint - API information"""
    return {
        "message": "XV Winter Olympic Saga Game API",
        "status": "running",
        "version": "2.0",
        "database": "Supabase PostgreSQL",
        "endpoints": {
            "health": "/health",
            "system_status": "/api/system/status",
            "api_docs": "/docs",
            "authentication": "/api/auth/",
            "students": "/api/students/",
            "admin": "/api/admin/"
        }
    }

@app.get("/health")
def health():
    """Health check for Olympics PWA"""
    return {"ok": True, "service": "XV Winter Olympic Saga Game", "database": "Supabase PostgreSQL"}

@app.get("/debug")
def debug():
    """Debug endpoint to check app status"""
    import sys
    return {
        "debug": True,
        "python_version": sys.version,
        "environment_vars": {
            "ENVIRONMENT": os.getenv("ENVIRONMENT"),
            "PORT": os.getenv("PORT"),
            "SUPABASE_URL": os.getenv("SUPABASE_URL", "NOT_SET")[:50] + "..." if os.getenv("SUPABASE_URL") else "NOT_SET",
            "PYTHONPATH": os.getenv("PYTHONPATH")
        },
        "routes_loaded": len(app.routes),
        "password_fix_deployed": "YES - Backend supports PostgreSQL crypt passwords",
        "backend_version": "2024-12-03-password-fix",
        "message": "If you see this, the basic app is working"
    }

@app.get("/api/system/status")
def system_status():
    """System status for classroom deployment"""
    return {
        "status": "ready",
        "service": "XV Winter Olympic Saga Game API",
        "database": "Supabase PostgreSQL",
        "max_concurrent_students": 50,
        "features": [
            "Student Registration",
            "Multi-user Authentication", 
            "Real-time Leaderboards",
            "Olympic Gameplay",
            "Admin Management"
        ]
    }

@app.on_event("startup")
def on_startup() -> None:
    """Initialize Supabase-only Olympics PWA"""
    ui.info("🏔️ Starting XV Winter Olympic Saga Game API")
    ui.info("🚀 SUPABASE-ONLY MODE - No SQLite dependencies")
    
    # Test Supabase connection with error handling
    try:
        get_supabase_client_instance()
        ui.success("✅ Supabase PostgreSQL connected - Multi-user deployment ready")
    except Exception as e:
        ui.error(f"❌ Supabase connection failed: {e}")
        ui.warning("⚠️  API will start anyway - check environment variables")
    
    # Show available endpoints
    ui.info("📱 Olympics PWA API ready for classroom deployment")
    ui.panel(
        "Authentication: /api/auth/\nSystem Status: /api/system/status\nHealth Check: /health",
        title="Olympics PWA Endpoints",
        style="green"
    )
    
    # Display ASCII logo
    ui.ascii_logo()
    
    # Show deployment info
    deployment_info = {
        "Service": "XV Winter Olympic Saga Game",
        "Database": "Supabase PostgreSQL",
        "Environment": os.getenv("ENVIRONMENT", "development"),
        "Port": os.getenv("PORT", "8080"),
        "Max Students": "50+",
        "Database Dependencies": "Supabase Only ✅",
        "Render Ready": "✅" if ENVIRONMENT == "production" else "Development Mode"
    }
    ui.status_line(deployment_info)
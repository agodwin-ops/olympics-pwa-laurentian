from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import inspect
import os
import logging

from app.core.database import engine, Base
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router  
from app.api.students import router as students_router
from app.api.resources import router as resources_router
from app.api.realtime import router as realtime_router
from app.models import olympics  # Import models to register them

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="1992 Olympics Chef de Mission RPG API",
    description="Backend API for the Olympic-themed classroom RPG",
    version="1.0.0"
)

# Middleware to suppress logging for specific endpoints
class LogFilterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Suppress logging for health checks and static files
        if any(path in request.url.path for path in ["/health", "/uploads", "/docs"]):
            original_level = logger.level
            logger.setLevel(logging.WARNING)
            try:
                response = await call_next(request)
            finally:
                logger.setLevel(original_level)
        else:
            response = await call_next(request)
        return response

app.add_middleware(LogFilterMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Static file serving for uploaded files
if not os.path.exists("uploads"):
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("uploads/profile_pictures", exist_ok=True)
    os.makedirs("uploads/resources", exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api") 
app.include_router(students_router, prefix="/api")
app.include_router(resources_router, prefix="/api")
app.include_router(realtime_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "1992 Olympics Chef de Mission RPG API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    try:
        # Test database connection
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        return {
            "status": "healthy",
            "database": "connected",
            "tables": len(tables),
            "timestamp": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.on_event("startup")
async def startup_event():
    """Initialize database and application"""
    try:
        logger.info("🏔️ Starting 1992 Olympics Chef de Mission RPG API...")
        
        # Create database tables
        logger.info("📊 Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables initialized")
        
        # Verify tables exist
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        logger.info(f"📋 Found {len(tables)} database tables")
        
        # Log available endpoints
        logger.info("🛣️ API endpoints available:")
        logger.info("   • POST /api/auth/register - User registration")
        logger.info("   • POST /api/auth/login - User login")
        logger.info("   • GET /api/auth/me - Current user profile")
        logger.info("   • GET /api/students/me/profile - Complete player profile")
        logger.info("   • GET /api/students/leaderboard - Game leaderboard")
        logger.info("   • POST /api/admin/award - Award students (admin only)")
        logger.info("   • POST /api/admin/bulk-award - Bulk award students (admin only)")
        logger.info("   • GET /api/admin/students - Student overview (admin only)")
        logger.info("   • GET /api/lectures - Get all lectures")
        logger.info("   • POST /api/lectures - Create lecture (admin only)")
        logger.info("   • POST /api/lectures/{id}/upload - Upload file to lecture (admin only)")
        logger.info("   • GET /api/resources/{id}/download - Download resource file")
        logger.info("   • GET /docs - API documentation")
        
        logger.info("🚀 Olympics RPG API is ready!")
        logger.info("🎮 May the best Chef de Mission win!")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🏁 Shutting down Olympics RPG API...")
    logger.info("👋 Thanks for playing!")

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return {
        "success": False,
        "error": "Not found",
        "message": "The requested endpoint was not found",
        "path": request.url.path
    }

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    logger.error(f"Internal server error: {exc}")
    return {
        "success": False,
        "error": "Internal server error",
        "message": "An unexpected error occurred",
        "path": request.url.path
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main_olympics:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8080)),
        reload=True,
        log_level="info"
    )
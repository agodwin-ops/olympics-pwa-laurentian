"""
Olympics PWA - Supabase SDK Authentication API
Complete replacement for custom auth using Supabase's built-in authentication
Bypasses all PostgreSQL connection issues by using REST API
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import Optional, Dict, Any
import os
import uuid
import asyncio
from datetime import datetime

from app.core.supabase_auth_service import supabase_auth
from app.schemas.olympics import AuthResponse, APIResponse, User as UserSchema

router = APIRouter(prefix="/supabase-auth", tags=["Supabase Authentication"])
limiter = Limiter(key_func=get_remote_address)
security = HTTPBearer()

# Configuration
ADMIN_CODE = os.getenv("ADMIN_CODE", "OLYMPICS2024ADMIN")

async def save_profile_picture_supabase(file: UploadFile) -> Optional[str]:
    """Save uploaded profile picture using Supabase Storage"""
    if not file:
        return None
    
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed."
        )
    
    # Validate file size (5MB max)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum 5MB allowed."
        )
    
    try:
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        
        # Upload to Supabase Storage (if configured)
        # For now, return a placeholder URL
        # TODO: Implement actual Supabase Storage upload
        return f"/storage/profile_pictures/{unique_filename}"
        
    except Exception as e:
        print(f"❌ Profile picture upload failed: {e}")
        return None

@router.post("/register", response_model=AuthResponse)
@limiter.limit("5/minute")
async def register_supabase(
    request: Request,
    email: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    user_program: str = Form(...),
    is_admin: bool = Form(False),
    admin_code: Optional[str] = Form(None),
    profile_picture: Optional[UploadFile] = File(None),
):
    """Register a new user using Supabase Auth"""
    
    # Validate admin code if admin registration
    if is_admin:
        if not admin_code or admin_code != ADMIN_CODE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid admin code"
            )
    
    # Check password confirmation
    if password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Handle profile picture upload
    profile_picture_url = None
    if profile_picture:
        profile_picture_url = await save_profile_picture_supabase(profile_picture)
    
    # Prepare user data
    user_data = {
        "username": username,
        "user_program": user_program,
        "is_admin": is_admin,
        "profile_picture_url": profile_picture_url
    }
    
    try:
        # Register user with Supabase Auth
        result = await supabase_auth.register_user(email, password, user_data)
        
        if result["success"]:
            return AuthResponse(
                access_token=result["session"]["access_token"] if result["session"] else "",
                token_type="bearer",
                user=UserSchema(
                    id=result["user"]["id"],
                    email=result["user"]["email"],
                    username=user_data["username"],
                    user_program=user_data["user_program"],
                    is_admin=user_data["is_admin"],
                    email_verified=result["user"].get("email_confirmed_at") is not None,
                    profile_picture_url=profile_picture_url,
                    created_at=result["user"]["created_at"],
                    updated_at=result["user"]["updated_at"]
                )
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Registration failed")
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login_supabase(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
):
    """Login with Supabase Auth"""
    
    try:
        result = await supabase_auth.login_user(email, password)
        
        if result["success"]:
            user_profile = result.get("profile", {})
            
            return AuthResponse(
                access_token=result["session"]["access_token"],
                token_type="bearer",
                user=UserSchema(
                    id=result["user"]["id"],
                    email=result["user"]["email"],
                    username=user_profile.get("username", ""),
                    user_program=user_profile.get("user_program", ""),
                    is_admin=user_profile.get("is_admin", False),
                    email_verified=result["user"].get("email_confirmed_at") is not None,
                    profile_picture_url=user_profile.get("profile_picture_url"),
                    created_at=result["user"]["created_at"],
                    updated_at=result["user"]["updated_at"],
                    last_active=user_profile.get("last_active")
                )
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result.get("error", "Invalid email or password")
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

async def get_current_user_supabase(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from Supabase Auth token"""
    try:
        token = credentials.credentials
        result = await supabase_auth.get_current_user(token)
        
        if result["success"]:
            user_profile = result.get("profile", {})
            
            return UserSchema(
                id=result["user"]["id"],
                email=result["user"]["email"],
                username=user_profile.get("username", ""),
                user_program=user_profile.get("user_program", ""),
                is_admin=user_profile.get("is_admin", False),
                email_verified=result["user"].get("email_confirmed_at") is not None,
                profile_picture_url=user_profile.get("profile_picture_url"),
                created_at=result["user"]["created_at"],
                updated_at=result["user"]["updated_at"],
                last_active=user_profile.get("last_active")
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

def get_current_admin_supabase(current_user: UserSchema = Depends(get_current_user_supabase)):
    """Get current admin user"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

@router.get("/me", response_model=UserSchema)
async def get_current_user_info_supabase(current_user: UserSchema = Depends(get_current_user_supabase)):
    """Get current user information"""
    return current_user

@router.post("/logout", response_model=APIResponse)
async def logout_supabase():
    """Logout user"""
    try:
        result = await supabase_auth.logout_user()
        
        if result["success"]:
            return APIResponse(
                success=True,
                message="Successfully logged out"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Logout failed"
            )
            
    except Exception as e:
        return APIResponse(
            success=True,  # Always return success for logout
            message="Logged out (session may have been expired)"
        )

@router.get("/player-stats")
async def get_player_stats_supabase(current_user: UserSchema = Depends(get_current_user_supabase)):
    """Get player stats using Supabase SDK"""
    try:
        stats = await supabase_auth.get_player_stats(current_user.id)
        
        if stats:
            return APIResponse(
                success=True,
                data=stats,
                message="Player stats retrieved"
            )
        else:
            # Create initial stats if not found
            await supabase_auth.create_initial_player_data(current_user.id)
            stats = await supabase_auth.get_player_stats(current_user.id)
            
            return APIResponse(
                success=True,
                data=stats or {},
                message="Player stats initialized"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get player stats: {str(e)}"
        )

@router.get("/player-skills")
async def get_player_skills_supabase(current_user: UserSchema = Depends(get_current_user_supabase)):
    """Get player skills using Supabase SDK"""
    try:
        skills = await supabase_auth.get_player_skills(current_user.id)
        
        return APIResponse(
            success=True,
            data=skills or {},
            message="Player skills retrieved"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get player skills: {str(e)}"
        )

@router.get("/player-inventory")
async def get_player_inventory_supabase(current_user: UserSchema = Depends(get_current_user_supabase)):
    """Get player inventory using Supabase SDK"""
    try:
        inventory = await supabase_auth.get_player_inventory(current_user.id)
        
        return APIResponse(
            success=True,
            data=inventory,
            message="Player inventory retrieved"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get player inventory: {str(e)}"
        )

@router.post("/add-experience")
async def add_experience_supabase(
    activity: str = Form(...),
    xp_gained: int = Form(...),
    description: Optional[str] = Form(None),
    current_user: UserSchema = Depends(get_current_user_supabase)
):
    """Add experience points using Supabase SDK"""
    try:
        success = await supabase_auth.add_experience(
            current_user.id, activity, xp_gained, description
        )
        
        if success:
            return APIResponse(
                success=True,
                message=f"Added {xp_gained} XP for {activity}"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add experience"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add experience: {str(e)}"
        )

@router.get("/check-admin-code")
@limiter.limit("3/minute")
async def check_admin_code_supabase(request: Request, code: str):
    """Check if admin code is valid"""
    return APIResponse(
        success=code == ADMIN_CODE,
        message="Valid admin code" if code == ADMIN_CODE else "Invalid admin code"
    )

@router.get("/status")
async def get_supabase_status():
    """Get Supabase service status"""
    try:
        connected = await supabase_auth.test_connection()
        
        return APIResponse(
            success=True,
            data={
                "service": "Supabase SDK",
                "connected": connected,
                "auth_service": "Supabase Auth",
                "database": "Supabase PostgreSQL via REST API"
            },
            message="Supabase service operational" if connected else "Supabase service unavailable"
        )
        
    except Exception as e:
        return APIResponse(
            success=False,
            error=f"Supabase status check failed: {str(e)}"
        )
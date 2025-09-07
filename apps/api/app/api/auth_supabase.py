"""
Authentication System using Supabase SDK - Multi-User Deployment
Complete replacement for SQLAlchemy-based auth
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import Optional
import os
import re
from datetime import datetime, timedelta
from jose import JWTError, jwt
from pydantic import BaseModel
import uuid

from app.core.supabase_db import get_supabase_db, SupabaseDB

router = APIRouter(prefix="/auth", tags=["Supabase Authentication"])
limiter = Limiter(key_func=get_remote_address)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-jwt-key-olympics-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
ADMIN_CODE = os.getenv("ADMIN_CODE", "OLYMPICS2024ADMIN")

# Pydantic models
class UserRegistration(BaseModel):
    email: str
    username: str
    password: str
    confirm_password: str
    user_program: str
    is_admin: bool = False
    admin_code: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class CompleteProfileRequest(BaseModel):
    username: str
    user_program: str
    profile_picture: Optional[str] = None  # Base64 encoded image

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password: str) -> list:
    """Validate password strength"""
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one number")
    return errors

def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: SupabaseDB = Depends(get_supabase_db)
):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin(
    current_user = Depends(get_current_user)
):
    """Ensure current user is admin"""
    if not current_user.get('is_admin', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.post("/register", response_model=AuthResponse)
@limiter.limit("5/minute")
async def register(
    request: Request,
    user_data: UserRegistration,
    db: SupabaseDB = Depends(get_supabase_db)
):
    """Register a new user using Supabase"""
    
    # Validate email format
    if not validate_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Validate password strength
    password_errors = validate_password(user_data.password)
    if password_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Password does not meet requirements", "errors": password_errors}
        )
    
    # Check password confirmation
    if user_data.password != user_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Validate admin code if admin registration
    if user_data.is_admin:
        if not user_data.admin_code or user_data.admin_code != ADMIN_CODE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid admin code"
            )
    
    # Check if user already exists
    existing_user = await db.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create user in Supabase
    user_dict = {
        "email": user_data.email,
        "username": user_data.username,
        "password": user_data.password,  # Will be hashed in create_user
        "user_program": user_data.user_program,
        "is_admin": user_data.is_admin
    }
    
    created_user = await db.create_user(user_dict)
    if not created_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    # Create initial player stats and skills for students
    if not user_data.is_admin:
        await db.create_player_stats(created_user['id'])
        await db.create_player_skills(created_user['id'])
    
    # Create access token
    access_token = create_access_token({"sub": created_user['id']})
    
    # Remove password hash from response
    user_response = {k: v for k, v in created_user.items() if k != 'password_hash'}
    
    return AuthResponse(
        access_token=access_token,
        user=user_response
    )

@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: SupabaseDB = Depends(get_supabase_db)
):
    """Login user using Supabase"""
    
    # Get user by email
    user = await db.get_user_by_email(form_data.username)  # username field contains email
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not await db.verify_password(form_data.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token({"sub": user['id']})
    
    # Remove password hash from response
    user_response = {k: v for k, v in user.items() if k != 'password_hash'}
    
    return AuthResponse(
        access_token=access_token,
        user=user_response
    )

@router.get("/me")
async def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """Get current user information"""
    # Remove password hash from response
    return {k: v for k, v in current_user.items() if k != 'password_hash'}

@router.post("/complete-profile")
@limiter.limit("5/minute")
async def complete_profile(
    request: Request,
    profile_data: CompleteProfileRequest,
    current_user = Depends(get_current_user),
    db: SupabaseDB = Depends(get_supabase_db)
):
    """Complete user profile after first login with pre-set credentials"""
    
    try:
        # Check if profile is already complete (check for non-empty username/program)
        if current_user.get('username') and current_user.get('user_program'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile is already complete"
            )
        
        # Check if username is already taken
        existing_user = await db.get_user_by_username(profile_data.username)
        if existing_user and existing_user['id'] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken"
            )
        
        # Update user profile
        user_updates = {
            "username": profile_data.username,
            "user_program": profile_data.user_program,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Handle profile picture if provided
        if profile_data.profile_picture:
            # In a real implementation, you'd save this to file storage
            # For now, we'll just store the filename/reference
            user_updates["profile_picture"] = f"profile_{current_user['id']}.jpg"
        
        # Update user in database
        updated_user = await db.update_user(current_user['id'], user_updates)
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )
        
        # Now create player stats, skills, and inventory
        # Create initial player stats
        initial_stats = {
            "id": str(uuid.uuid4()),
            "user_id": current_user['id'],
            "total_xp": 0,
            "current_xp": 0,
            "current_level": 1,
            "current_rank": 0,
            "gameboard_xp": 0,
            "gameboard_position": 1,
            "gameboard_moves": 0,
            "gold": 3,  # Starting gold
            "unit_xp": {},
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await db.create_player_stats(initial_stats)
        
        # Create initial player skills (all level 1)
        await db.create_player_skills(current_user['id'])
        
        # Create initial inventory
        initial_inventory = {
            "id": str(uuid.uuid4()),
            "user_id": current_user['id'],
            "water": 0,
            "gatorade": 0,
            "first_aid_kit": 0,
            "skis": 0,
            "toques": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await db.create_player_inventory(initial_inventory)
        
        print(f"✅ Profile completed for user: {profile_data.username} ({current_user['email']})")
        
        return {
            "success": True,
            "message": "Profile completed successfully",
            "data": {
                "username": profile_data.username,
                "user_program": profile_data.user_program
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Profile completion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
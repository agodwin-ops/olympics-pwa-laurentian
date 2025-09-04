from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.security import OAuth2PasswordBearer
from slowapi import Limiter
from slowapi.util import get_remote_address
# Removed SQLAlchemy - using Supabase SDK
from typing import Optional
import os
import uuid
import shutil
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

from app.core.supabase_db import get_supabase_db
from app.schemas.olympics import (
    UserCreate, AuthResponse, APIResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
# Reduced token expiration for better security
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours default

# Admin verification code - use strong random string in production
ADMIN_CODE = os.getenv("ADMIN_CODE", "ADMIN_" + os.urandom(16).hex() if os.getenv("ENVIRONMENT") == "production" else "OLYMPICS2024ADMIN")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

import re
import secrets

def validate_password(password: str) -> list:
    """Validate password strength and return list of errors"""
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one number")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        errors.append("Password must contain at least one special character")
    return errors

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def generate_verification_token() -> str:
    """Generate secure random token for email verification"""
    return secrets.token_urlsafe(32)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    # Update last active
    user.last_active = datetime.utcnow()
    db.commit()
    
    return user


def get_current_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def save_profile_picture(file: UploadFile) -> str:
    """Save uploaded profile picture and return URL"""
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
    file_size = 0
    content = await file.read()
    file_size = len(content)
    
    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum 5MB allowed."
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = "uploads/profile_pictures"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    # Return URL path
    return f"/uploads/profile_pictures/{unique_filename}"


@router.post("/register", response_model=AuthResponse)
@limiter.limit("5/minute")  # Limit registration attempts
async def register(
    request: Request,
    user_data: UserCreate,
    db: get_supabase_db = Depends(get_supabase_db)
):
    """Register a new user using Supabase - MULTI-USER DEPLOYMENT"""
    
    # Validate email format
    if not validate_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Validate password strength
    password_errors = validate_password(password)
    if password_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Password does not meet requirements", "errors": password_errors}
        )
    
    # Check password confirmation
    if password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Validate admin code if admin registration
    if is_admin:
        if not admin_code or admin_code != ADMIN_CODE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid admin code"
            )
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == email) | (User.username == username)
    ).first()
    
    if existing_user:
        field = "email" if existing_user.email == email else "username"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with this {field} already exists"
        )
    
    # Handle profile picture upload
    profile_picture_url = None
    if profile_picture:
        profile_picture_url = await save_profile_picture(profile_picture)
    
    # Generate email verification token
    verification_token = generate_verification_token()
    
    # Auto-verify emails in development mode
    is_development = os.getenv("ENVIRONMENT", "development") == "development"
    
    # Create user with hashed password
    db_user = User(
        email=email,
        username=username,
        password_hash=get_password_hash(password),
        user_program=user_program,
        is_admin=is_admin,
        profile_picture_url=profile_picture_url,
        email_verified=is_development,  # Auto-verify in development
        email_verification_token=None if is_development else verification_token
    )
    
    db.add(db_user)
    db.flush()  # Get the user ID
    
    # Create initial player stats
    player_stats = PlayerStats(user_id=db_user.id)
    db.add(player_stats)
    
    # Create initial player skills
    player_skills = PlayerSkills(user_id=db_user.id)
    db.add(player_skills)
    
    # Create initial player inventory
    player_inventory = PlayerInventory(user_id=db_user.id)
    db.add(player_inventory)
    
    db.commit()
    db.refresh(db_user)
    
    # Log development auto-verification
    if is_development:
        print(f"🧪 DEVELOPMENT: Auto-verified email for {email}")
    else:
        print(f"📧 PRODUCTION: Email verification required for {email}")
        # TODO: Send actual email in production
        print(f"Email verification link: http://localhost:3000/verify-email?token={verification_token}")
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(db_user.id)}, expires_delta=access_token_expires
    )
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserSchema.from_orm(db_user)
    )


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")  # Limit login attempts
async def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Login with email and password"""
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if email is verified
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please verify your email before logging in. Check your inbox for verification link."
        )
    
    # Update last active
    user.last_active = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserSchema.from_orm(user)
    )


@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify user email with token"""
    
    user = db.query(User).filter(User.email_verification_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    # Mark email as verified
    user.email_verified = True
    user.email_verification_token = None  # Clear token after use
    db.commit()
    
    return {"message": "Email successfully verified! You can now log in."}


@router.post("/resend-verification")
async def resend_verification(email: str = Form(...), db: Session = Depends(get_db)):
    """Resend email verification token"""
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If this email is registered, a verification email will be sent."}
    
    if user.email_verified:
        return {"message": "Email is already verified."}
    
    # Generate new token
    user.email_verification_token = generate_verification_token()
    db.commit()
    
    # TODO: Send email in production
    print(f"Email verification link: http://localhost:3001/verify-email?token={user.email_verification_token}")
    
    return {"message": "Verification email sent (check console for now)."}


@router.post("/forgot-password")
async def forgot_password(email: str = Form(...), db: Session = Depends(get_db)):
    """Request password reset token"""
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If this email is registered, a password reset link will be sent."}
    
    # Generate reset token with expiration
    reset_token = generate_verification_token()
    reset_expires = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    
    user.password_reset_token = reset_token
    user.password_reset_expires = reset_expires
    db.commit()
    
    # TODO: Send email in production
    print(f"Password reset link: http://localhost:3001/reset-password?token={reset_token}")
    
    return {"message": "Password reset email sent (check console for now)."}


@router.post("/reset-password")
async def reset_password(
    token: str = Form(...),
    new_password: str = Form(...),
    confirm_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Reset password with token"""
    
    # Validate new password strength
    password_errors = validate_password(new_password)
    if password_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Password does not meet requirements", "errors": password_errors}
        )
    
    # Check password confirmation
    if new_password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Find user with valid reset token
    user = db.query(User).filter(
        User.password_reset_token == token,
        User.password_reset_expires > datetime.utcnow()
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password and clear reset token
    user.password_hash = get_password_hash(new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    
    return {"message": "Password successfully reset! You can now log in with your new password."}


@router.get("/me", response_model=UserSchema)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserSchema.from_orm(current_user)


@router.post("/logout", response_model=APIResponse)
async def logout():
    """Logout user (client-side token removal)"""
    return APIResponse(
        success=True,
        message="Successfully logged out"
    )


@router.post("/initialize-player", response_model=APIResponse)
async def initialize_player_data(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initialize player data for a new user"""
    
    # Verify the user exists and either is the same user or current user is admin
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if str(target_user.id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Check if player data already exists
    existing_stats = db.query(PlayerStats).filter(PlayerStats.user_id == user_id).first()
    if existing_stats:
        return APIResponse(
            success=True,
            message="Player data already initialized"
        )
    
    # Create player stats
    player_stats = PlayerStats(user_id=user_id)
    db.add(player_stats)
    
    # Create player skills
    player_skills = PlayerSkills(user_id=user_id)
    db.add(player_skills)
    
    # Create player inventory
    player_inventory = PlayerInventory(user_id=user_id)
    db.add(player_inventory)
    
    db.commit()
    
    return APIResponse(
        success=True,
        message="Player data initialized successfully"
    )


@router.get("/check-admin-code")
@limiter.limit("3/minute")  # Limit admin code checking
async def check_admin_code(request: Request, code: str):
    """Check if admin code is valid (for frontend validation)"""
    return APIResponse(
        success=code == ADMIN_CODE,
        message="Valid admin code" if code == ADMIN_CODE else "Invalid admin code"
    )
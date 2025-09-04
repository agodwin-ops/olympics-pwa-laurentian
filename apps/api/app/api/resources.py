import os
import uuid
import mimetypes
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db, get_current_user
from app.models.olympics import User, Lecture, LectureResource, FileAccessLog, Unit
from app.schemas.olympics import (
    LectureCreate, LectureUpdate, Lecture as LectureSchema, LectureWithResources,
    LectureResourceCreate, LectureResource as LectureResourceSchema,
    FileUploadResponse, FileAccessLogCreate
)

router = APIRouter()

# File upload configuration
UPLOAD_DIR = "uploads/resources"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
    '.txt', '.md', '.html', '.zip', '.rar', '.7z',
    '.mp4', '.avi', '.mov', '.wmv', '.flv',
    '.mp3', '.wav', '.wma', '.aac',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'
}

# Dangerous file patterns to reject
DANGEROUS_PATTERNS = {
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar',
    '.sh', '.ps1', '.py', '.php', '.asp', '.jsp', '.rb', '.pl'
}

# MIME type validation mapping
ALLOWED_MIME_TYPES = {
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.ppt': ['application/vnd.ms-powerpoint'],
    '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    '.xls': ['application/vnd.ms-excel'],
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '.txt': ['text/plain'],
    '.md': ['text/markdown', 'text/plain'],
    '.html': ['text/html'],
    '.zip': ['application/zip'],
    '.rar': ['application/x-rar-compressed'],
    '.7z': ['application/x-7z-compressed'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.bmp': ['image/bmp'],
    '.svg': ['image/svg+xml'],
    '.mp4': ['video/mp4'],
    '.avi': ['video/x-msvideo'],
    '.mov': ['video/quicktime'],
    '.mp3': ['audio/mpeg'],
    '.wav': ['audio/wav'],
}

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

def is_admin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def validate_file(file: UploadFile) -> tuple[bool, str]:
    """Validate uploaded file with comprehensive security checks"""
    if not file.filename:
        return False, "No filename provided"
    
    # Sanitize filename - remove path components and dangerous characters
    filename = os.path.basename(file.filename)
    if not filename or filename in ['.', '..']:
        return False, "Invalid filename"
    
    # Check file extension
    file_ext = os.path.splitext(filename.lower())[1]
    if file_ext not in ALLOWED_EXTENSIONS:
        return False, f"File type {file_ext} not allowed"
    
    # Check for dangerous file patterns
    if file_ext in DANGEROUS_PATTERNS:
        return False, f"File type {file_ext} is not allowed for security reasons"
    
    # Additional filename validation
    if any(char in filename for char in ['<', '>', ':', '"', '|', '?', '*']):
        return False, "Filename contains invalid characters"
    
    # Check filename length
    if len(filename) > 255:
        return False, "Filename too long"
    
    return True, "Valid"

def validate_mime_type(file_ext: str, detected_type: str) -> bool:
    """Validate MIME type matches file extension"""
    if file_ext not in ALLOWED_MIME_TYPES:
        return False
    
    allowed_types = ALLOWED_MIME_TYPES[file_ext]
    return detected_type in allowed_types or detected_type.startswith('application/octet-stream')

@router.get("/lectures", response_model=List[LectureWithResources])
def get_all_lectures(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    unit_id: Optional[str] = None,
    published_only: bool = False
):
    """Get all lectures with their resources"""
    query = db.query(Lecture)
    
    # Students can only see published lectures
    if not current_user.is_admin:
        published_only = True
    
    if published_only:
        query = query.filter(Lecture.is_published == True)
    
    if unit_id:
        query = query.filter(Lecture.unit_id == unit_id)
    
    lectures = query.order_by(Lecture.order_index, Lecture.created_at).all()
    return lectures

@router.post("/lectures", response_model=LectureSchema)
def create_lecture(
    lecture_data: LectureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_admin_user)
):
    """Create a new lecture (Admin only)"""
    # Verify unit exists if provided
    if lecture_data.unit_id:
        unit = db.query(Unit).filter(Unit.id == lecture_data.unit_id).first()
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found")
    
    lecture = Lecture(
        **lecture_data.dict(exclude={'created_by'}),
        created_by=current_user.id
    )
    db.add(lecture)
    db.commit()
    db.refresh(lecture)
    return lecture

@router.get("/lectures/{lecture_id}", response_model=LectureWithResources)
def get_lecture(
    lecture_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific lecture with its resources"""
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    
    # Students can only see published lectures
    if not current_user.is_admin and not lecture.is_published:
        raise HTTPException(status_code=404, detail="Lecture not found")
    
    return lecture

@router.put("/lectures/{lecture_id}", response_model=LectureSchema)
def update_lecture(
    lecture_id: str,
    lecture_update: LectureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_admin_user)
):
    """Update a lecture (Admin only)"""
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    
    # Verify unit exists if being updated
    if lecture_update.unit_id:
        unit = db.query(Unit).filter(Unit.id == lecture_update.unit_id).first()
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found")
    
    update_data = lecture_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lecture, field, value)
    
    db.commit()
    db.refresh(lecture)
    return lecture

@router.delete("/lectures/{lecture_id}")
def delete_lecture(
    lecture_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_admin_user)
):
    """Delete a lecture and all its resources (Admin only)"""
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    
    # Delete associated files from filesystem
    for resource in lecture.resources:
        try:
            if os.path.exists(resource.file_path):
                os.remove(resource.file_path)
        except Exception as e:
            print(f"Error deleting file {resource.file_path}: {e}")
    
    db.delete(lecture)
    db.commit()
    return {"success": True, "message": "Lecture deleted successfully"}

@router.post("/lectures/{lecture_id}/upload", response_model=FileUploadResponse)
def upload_file_to_lecture(
    lecture_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    is_public: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(is_admin_user)
):
    """Upload a file to a lecture (Admin only)"""
    # Verify lecture exists
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    
    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    try:
        # Read file content
        file_content = file.file.read()
        
        # Check file size
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit")
        
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file to disk
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Get file type and validate it
        file_type = mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
        
        # Additional MIME type validation
        if not validate_mime_type(file_ext, file_type):
            raise HTTPException(status_code=400, detail=f"MIME type {file_type} doesn't match file extension {file_ext}")
        
        # Create database record
        resource = LectureResource(
            lecture_id=lecture_id,
            filename=unique_filename,
            original_filename=file.filename,
            file_type=file_type,
            file_size=len(file_content),
            file_path=file_path,
            description=description,
            is_public=is_public,
            uploaded_by=current_user.id
        )
        
        db.add(resource)
        db.commit()
        db.refresh(resource)
        
        return FileUploadResponse(
            success=True,
            resource=resource,
            message="File uploaded successfully"
        )
        
    except Exception as e:
        # Clean up file if database operation fails
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    finally:
        file.file.close()

@router.get("/resources/{resource_id}/download")
def download_file(
    resource_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download a file resource"""
    resource = db.query(LectureResource).filter(LectureResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Check if user can access this resource
    if not resource.is_public and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if file exists
    if not os.path.exists(resource.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    # Log file access
    try:
        access_log = FileAccessLog(
            resource_id=resource_id,
            user_id=current_user.id,
            access_type="download",
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent")
        )
        db.add(access_log)
        db.commit()
    except Exception as e:
        print(f"Error logging file access: {e}")
    
    # Return file
    return FileResponse(
        path=resource.file_path,
        filename=resource.original_filename,
        media_type=resource.file_type
    )

@router.delete("/resources/{resource_id}")
def delete_resource(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_admin_user)
):
    """Delete a file resource (Admin only)"""
    resource = db.query(LectureResource).filter(LectureResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Delete file from filesystem
    try:
        if os.path.exists(resource.file_path):
            os.remove(resource.file_path)
    except Exception as e:
        print(f"Error deleting file {resource.file_path}: {e}")
    
    # Delete database record
    db.delete(resource)
    db.commit()
    return {"success": True, "message": "Resource deleted successfully"}

@router.get("/resources/{resource_id}/access-logs")
def get_resource_access_logs(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_admin_user),
    limit: int = 50,
    offset: int = 0
):
    """Get access logs for a resource (Admin only)"""
    resource = db.query(LectureResource).filter(LectureResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    logs = db.query(FileAccessLog)\
        .filter(FileAccessLog.resource_id == resource_id)\
        .order_by(FileAccessLog.accessed_at.desc())\
        .offset(offset)\
        .limit(limit)\
        .all()
    
    return {"logs": logs}

@router.get("/stats/downloads")
def get_download_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(is_admin_user)
):
    """Get download statistics (Admin only)"""
    # Most downloaded resources
    from sqlalchemy import func
    
    most_downloaded = db.query(
        LectureResource.id,
        LectureResource.original_filename,
        func.count(FileAccessLog.id).label('download_count')
    ).join(FileAccessLog)\
     .group_by(LectureResource.id)\
     .order_by(func.count(FileAccessLog.id).desc())\
     .limit(10)\
     .all()
    
    # Recent downloads
    recent_downloads = db.query(FileAccessLog)\
        .join(LectureResource)\
        .order_by(FileAccessLog.accessed_at.desc())\
        .limit(20)\
        .all()
    
    return {
        "most_downloaded": most_downloaded,
        "recent_downloads": recent_downloads
    }
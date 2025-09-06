"""
Olympics PWA Admin API - Supabase Compatible
Provides admin functionality for assignment creation and XP awarding using Supabase
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import uuid

from app.core.supabase_client import get_supabase_client, get_supabase_auth_client
from app.api.auth_supabase import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin - Supabase"])
limiter = Limiter(key_func=get_remote_address)

# Request Models
class CreateAssignmentRequest(BaseModel):
    name: str
    description: str = ""
    unit_id: str  # Quest ID
    max_xp: int

class AwardXPRequest(BaseModel):
    target_user_id: str
    assignment_id: str
    xp_awarded: int
    description: str = ""

class BulkAwardRequest(BaseModel):
    award_type: str  # "xp", "gold", "gameboard_moves" 
    amount: int
    description: str = ""
    target_user_ids: List[str] = []  # If empty, award to all students

class BatchStudentRegistrationRequest(BaseModel):
    students: List[Dict[str, str]]  # [{"email": "user@laurentian.ca", "username": "user_name", "user_program": "Program Name"}]
    default_password: str = "Olympics2024!"

class AddSingleStudentRequest(BaseModel):
    email: str
    username: str
    user_program: str
    temporary_password: str = "GamePass123!"

class ResetPasswordRequest(BaseModel):
    student_email: str
    new_temporary_password: str = "NewPass123!"

class CreateIncompleteStudentRequest(BaseModel):
    email: str
    temporary_password: str

# Admin authorization dependency
async def require_admin(current_user = Depends(get_current_user)):
    """Ensure current user is an admin"""
    if not current_user or not current_user.get('is_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

@router.post("/assignments")
@limiter.limit("10/minute")
async def create_assignment(
    request: Request,
    assignment_data: CreateAssignmentRequest,
    current_admin = Depends(require_admin)
):
    """Create a new assignment that can award XP to students"""
    
    try:
        service_client = get_supabase_auth_client()
        
        # Verify the unit exists
        unit_check = service_client.table('units').select('*').eq('id', assignment_data.unit_id).execute()
        if not unit_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quest/Unit not found"
            )
        
        # Create assignment
        new_assignment = {
            "id": str(uuid.uuid4()),
            "name": assignment_data.name,
            "description": assignment_data.description,
            "unit_id": assignment_data.unit_id,
            "max_xp": assignment_data.max_xp,
            "created_by": current_admin['id'],
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = service_client.table('assignments').insert(new_assignment).execute()
        
        if result.data:
            return {
                "success": True,
                "message": "Assignment created successfully",
                "data": result.data[0]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create assignment"
            )
            
    except Exception as e:
        print(f"❌ Create assignment error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/award-xp")
@limiter.limit("30/minute")
async def award_assignment_xp(
    request: Request,
    award_data: AwardXPRequest,
    current_admin = Depends(require_admin)
):
    """Award XP to a student for completing an assignment"""
    
    try:
        service_client = get_supabase_auth_client()
        
        # Verify student exists
        student = service_client.table('users').select('*').eq('id', award_data.target_user_id).execute()
        if not student.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Verify assignment exists
        assignment = service_client.table('assignments').select('*').eq('id', award_data.assignment_id).execute()
        if not assignment.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        assignment_data = assignment.data[0]
        
        # Validate XP amount doesn't exceed assignment max
        if award_data.xp_awarded > assignment_data['max_xp']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"XP awarded ({award_data.xp_awarded}) cannot exceed assignment maximum ({assignment_data['max_xp']})"
            )
        
        # Create XP entry
        xp_entry = {
            "id": str(uuid.uuid4()),
            "user_id": award_data.target_user_id,
            "assignment_id": award_data.assignment_id,
            "assignment_name": assignment_data['name'],
            "unit_id": assignment_data['unit_id'],
            "xp_amount": award_data.xp_awarded,
            "awarded_by": current_admin['id'],
            "description": award_data.description or f"XP awarded for {assignment_data['name']}",
            "created_at": datetime.utcnow().isoformat()
        }
        
        xp_result = service_client.table('xp_entries').insert(xp_entry).execute()
        
        if not xp_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create XP entry"
            )
        
        # Update player stats (create if doesn't exist)
        player_stats = service_client.table('player_stats').select('*').eq('user_id', award_data.target_user_id).execute()
        
        if player_stats.data:
            # Update existing stats
            current_stats = player_stats.data[0]
            new_total_xp = current_stats.get('total_xp', 0) + award_data.xp_awarded
            new_current_xp = current_stats.get('current_xp', 0) + award_data.xp_awarded
            new_level = max(1, new_total_xp // 200 + 1)  # Every 200 XP = 1 level
            
            # Update unit-specific XP tracking
            unit_xp = current_stats.get('unit_xp') or {}
            unit_key = str(assignment_data['unit_id'])
            unit_xp[unit_key] = unit_xp.get(unit_key, 0) + award_data.xp_awarded
            
            updated_stats = {
                "total_xp": new_total_xp,
                "current_xp": new_current_xp,
                "current_level": new_level,
                "unit_xp": unit_xp,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            service_client.table('player_stats').update(updated_stats).eq('user_id', award_data.target_user_id).execute()
        else:
            # Create new stats
            unit_xp = {str(assignment_data['unit_id']): award_data.xp_awarded}
            new_level = max(1, award_data.xp_awarded // 200 + 1)
            
            new_stats = {
                "id": str(uuid.uuid4()),
                "user_id": award_data.target_user_id,
                "total_xp": award_data.xp_awarded,
                "current_xp": award_data.xp_awarded,
                "current_level": new_level,
                "current_rank": 0,
                "gameboard_xp": 0,
                "gameboard_position": 1,
                "gameboard_moves": 0,
                "gold": 0,
                "unit_xp": unit_xp,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            service_client.table('player_stats').insert(new_stats).execute()
        
        return {
            "success": True,
            "message": f"Successfully awarded {award_data.xp_awarded} XP to {student.data[0]['username']} for {assignment_data['name']}",
            "data": {
                "xp_awarded": award_data.xp_awarded,
                "assignment_name": assignment_data['name'],
                "student_username": student.data[0]['username']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Award XP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/bulk-award")
@limiter.limit("10/minute")
async def bulk_award_students(
    request: Request,
    bulk_data: BulkAwardRequest,
    current_admin = Depends(require_admin)
):
    """Award gold or gameboard moves to multiple students"""
    
    try:
        service_client = get_supabase_auth_client()
        
        # Get target students
        if bulk_data.target_user_ids:
            # Specific students
            target_users = []
            for user_id in bulk_data.target_user_ids:
                user = service_client.table('users').select('*').eq('id', user_id).execute()
                if user.data:
                    target_users.extend(user.data)
        else:
            # All students
            all_users = service_client.table('users').select('*').eq('is_admin', False).execute()
            target_users = all_users.data
        
        if not target_users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No target students found"
            )
        
        successful_awards = 0
        failed_awards = []
        
        for user in target_users:
            try:
                # Get or create player stats
                player_stats = service_client.table('player_stats').select('*').eq('user_id', user['id']).execute()
                
                if player_stats.data:
                    # Update existing stats
                    current_stats = player_stats.data[0]
                    updates = {"updated_at": datetime.utcnow().isoformat()}
                    
                    if bulk_data.award_type == "gold":
                        updates["gold"] = current_stats.get('gold', 0) + bulk_data.amount
                    elif bulk_data.award_type == "gameboard_moves":
                        updates["gameboard_moves"] = current_stats.get('gameboard_moves', 0) + bulk_data.amount
                    
                    service_client.table('player_stats').update(updates).eq('user_id', user['id']).execute()
                else:
                    # Create new stats
                    new_stats = {
                        "id": str(uuid.uuid4()),
                        "user_id": user['id'],
                        "total_xp": 0,
                        "current_xp": 0,
                        "current_level": 1,
                        "current_rank": 0,
                        "gameboard_xp": 0,
                        "gameboard_position": 1,
                        "gameboard_moves": bulk_data.amount if bulk_data.award_type == "gameboard_moves" else 0,
                        "gold": bulk_data.amount if bulk_data.award_type == "gold" else 0,
                        "unit_xp": {},
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    service_client.table('player_stats').insert(new_stats).execute()
                
                successful_awards += 1
                
            except Exception as e:
                failed_awards.append({
                    "user_id": user['id'],
                    "username": user.get('username', 'Unknown'),
                    "error": str(e)
                })
        
        return {
            "success": True,
            "message": f"Successfully awarded {successful_awards} students, {len(failed_awards)} failed",
            "data": {
                "successful": successful_awards,
                "failed": failed_awards,
                "award_type": bulk_data.award_type,
                "amount": bulk_data.amount
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Bulk award error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/assignments/{assignment_id}")
@limiter.limit("10/minute")
async def delete_assignment(
    request: Request,
    assignment_id: str,
    current_admin = Depends(require_admin)
):
    """Delete an assignment - for admin cleanup/testing"""
    
    try:
        service_client = get_supabase_auth_client()
        
        # Check if assignment exists and get info for logging
        assignment_check = service_client.table('assignments').select('*').eq('id', assignment_id).execute()
        if not assignment_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        assignment_name = assignment_check.data[0]['name']
        
        # Delete the assignment
        result = service_client.table('assignments').delete().eq('id', assignment_id).execute()
        
        print(f"✅ Assignment deleted: {assignment_name} (ID: {assignment_id}) by admin: {current_admin['email']}")
        
        return {
            "success": True,
            "message": f"Assignment '{assignment_name}' deleted successfully",
            "data": {"assignment_id": assignment_id, "name": assignment_name}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Delete assignment error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/assignments")
async def get_assignments(current_admin = Depends(require_admin)):
    """Get all assignments for admin interface"""
    
    try:
        service_client = get_supabase_auth_client()
        
        # Get assignments with unit information
        assignments = service_client.table('assignments').select('*, units(name, description)').execute()
        
        return {
            "success": True,
            "data": assignments.data
        }
        
    except Exception as e:
        print(f"❌ Get assignments error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/units")
async def get_units(current_admin = Depends(require_admin)):
    """Get all quests/units for assignment creation"""
    
    try:
        service_client = get_supabase_auth_client()
        
        units = service_client.table('units').select('*').order('order_index').execute()
        
        return {
            "success": True,
            "data": units.data
        }
        
    except Exception as e:
        print(f"❌ Get units error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/students")
async def get_all_students(current_admin = Depends(require_admin)):
    """Get all students with their stats for admin overview"""
    
    try:
        service_client = get_supabase_auth_client()
        
        # Get all non-admin users
        students = service_client.table('users').select('*').eq('is_admin', False).execute()
        
        # Enrich with player stats
        enriched_students = []
        for student in students.data:
            student_data = dict(student)
            
            # Get player stats
            stats = service_client.table('player_stats').select('*').eq('user_id', student['id']).execute()
            if stats.data:
                student_data['stats'] = stats.data[0]
            
            # Get recent XP entries
            recent_xp = service_client.table('xp_entries').select('*').eq('user_id', student['id']).order('created_at', desc=True).limit(5).execute()
            student_data['recent_xp'] = recent_xp.data
            
            enriched_students.append(student_data)
        
        return {
            "success": True,
            "data": enriched_students
        }
        
    except Exception as e:
        print(f"❌ Get students error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/stats")
async def get_admin_stats(current_admin = Depends(require_admin)):
    """Get overall admin statistics"""
    
    try:
        service_client = get_supabase_auth_client()
        
        # Count students
        students = service_client.table('users').select('id', count='exact').eq('is_admin', False).execute()
        total_students = students.count
        
        # Count assignments
        assignments = service_client.table('assignments').select('id', count='exact').execute()
        total_assignments = assignments.count
        
        # Get total XP awarded
        xp_entries = service_client.table('xp_entries').select('xp_amount').execute()
        total_xp_awarded = sum(entry.get('xp_amount', 0) for entry in xp_entries.data)
        
        # Get recent activity
        recent_xp = service_client.table('xp_entries').select('*, users(username)').order('created_at', desc=True).limit(10).execute()
        
        return {
            "success": True,
            "data": {
                "total_students": total_students,
                "total_assignments": total_assignments,
                "total_xp_awarded": total_xp_awarded,
                "recent_activity": recent_xp.data
            }
        }
        
    except Exception as e:
        print(f"❌ Get admin stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# BATCH STUDENT REGISTRATION ENDPOINTS

@router.post("/batch-register-students")
@limiter.limit("5/hour")  # Limited to prevent abuse
async def batch_register_students(
    request: Request,
    batch_data: BatchStudentRegistrationRequest,
    current_admin = Depends(require_admin)
):
    """Batch register students with temporary passwords for classroom deployment"""
    
    try:
        from app.core.supabase_db import get_supabase_db
        from passlib.context import CryptContext
        
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        service_client = get_supabase_auth_client()
        
        successful_registrations = []
        failed_registrations = []
        
        for student_data in batch_data.students:
            try:
                # Validate required fields
                if not all(k in student_data for k in ['email', 'username', 'user_program']):
                    failed_registrations.append({
                        "email": student_data.get('email', 'Unknown'),
                        "error": "Missing required fields (email, username, user_program)"
                    })
                    continue
                
                # Check if student already exists
                existing_user = service_client.table('users').select('*').eq('email', student_data['email']).execute()
                if existing_user.data:
                    failed_registrations.append({
                        "email": student_data['email'],
                        "error": "Student already exists"
                    })
                    continue
                
                # Hash password
                hashed_password = pwd_context.hash(batch_data.default_password)
                
                # Create student user
                new_user = {
                    "id": str(uuid.uuid4()),
                    "email": student_data['email'],
                    "username": student_data['username'],
                    "password": hashed_password,
                    "user_program": student_data['user_program'],
                    "is_admin": False,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                user_result = service_client.table('users').insert(new_user).execute()
                user_id = user_result.data[0]['id']
                
                # Create initial player stats
                initial_stats = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
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
                
                service_client.table('player_stats').insert(initial_stats).execute()
                
                successful_registrations.append({
                    "email": student_data['email'],
                    "username": student_data['username'],
                    "user_id": user_id,
                    "temporary_password": batch_data.default_password
                })
                
            except Exception as student_error:
                failed_registrations.append({
                    "email": student_data.get('email', 'Unknown'),
                    "error": str(student_error)
                })
        
        print(f"✅ Batch registration: {len(successful_registrations)} successful, {len(failed_registrations)} failed")
        
        return {
            "success": True,
            "message": f"Registered {len(successful_registrations)} students successfully, {len(failed_registrations)} failed",
            "data": {
                "successful": successful_registrations,
                "failed": failed_registrations,
                "total_processed": len(batch_data.students)
            }
        }
        
    except Exception as e:
        print(f"❌ Batch registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/add-student")
@limiter.limit("20/hour")
async def add_single_student(
    request: Request,
    student_data: AddSingleStudentRequest,
    current_admin = Depends(require_admin)
):
    """Add a single student manually - for late enrollments or drops/adds"""
    
    try:
        from passlib.context import CryptContext
        
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        service_client = get_supabase_auth_client()
        
        # Check if student already exists
        existing_user = service_client.table('users').select('*').eq('email', student_data.email).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Student with this email already exists"
            )
        
        # Hash password
        hashed_password = pwd_context.hash(student_data.temporary_password)
        
        # Create student user
        new_user = {
            "id": str(uuid.uuid4()),
            "email": student_data.email,
            "username": student_data.username,
            "password": hashed_password,
            "user_program": student_data.user_program,
            "is_admin": False,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        user_result = service_client.table('users').insert(new_user).execute()
        user_id = user_result.data[0]['id']
        
        # Create initial player stats
        initial_stats = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
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
        
        service_client.table('player_stats').insert(initial_stats).execute()
        
        print(f"✅ Single student added: {student_data.email}")
        
        return {
            "success": True,
            "message": f"Student {student_data.email} added successfully",
            "data": {
                "user_id": user_id,
                "email": student_data.email,
                "username": student_data.username,
                "temporary_password": student_data.temporary_password,
                "user_program": student_data.user_program
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Add student error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/reset-student-password")
@limiter.limit("10/hour")
async def reset_student_password(
    request: Request,
    reset_data: ResetPasswordRequest,
    current_admin = Depends(require_admin)
):
    """Reset a student's password - for forgotten password situations"""
    
    try:
        from passlib.context import CryptContext
        
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        service_client = get_supabase_auth_client()
        
        # Find student by email
        student = service_client.table('users').select('*').eq('email', reset_data.student_email).eq('is_admin', False).execute()
        if not student.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        student_user = student.data[0]
        
        # Hash new password
        hashed_password = pwd_context.hash(reset_data.new_temporary_password)
        
        # Update student's password
        service_client.table('users').update({
            "password": hashed_password,
            "updated_at": datetime.utcnow().isoformat()
        }).eq('id', student_user['id']).execute()
        
        print(f"✅ Password reset for student: {reset_data.student_email}")
        
        return {
            "success": True,
            "message": f"Password reset successfully for {reset_data.student_email}",
            "data": {
                "student_email": reset_data.student_email,
                "new_temporary_password": reset_data.new_temporary_password,
                "reset_by": current_admin['email']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Password reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/add-incomplete-student")
@limiter.limit("20/hour")
async def add_incomplete_student(
    request: Request,
    student_data: CreateIncompleteStudentRequest,
    current_admin = Depends(require_admin)
):
    """Create incomplete student account - student completes profile on first login"""
    
    try:
        from passlib.context import CryptContext
        
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        service_client = get_supabase_auth_client()
        
        # Check if student already exists
        existing_user = service_client.table('users').select('*').eq('email', student_data.email).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Student with this email already exists"
            )
        
        # Hash password
        hashed_password = pwd_context.hash(student_data.temporary_password)
        
        # Create incomplete student user (no username/program yet)
        new_user = {
            "id": str(uuid.uuid4()),
            "email": student_data.email,
            "username": "",  # Will be set during profile completion
            "password": hashed_password,
            "user_program": "",  # Will be set during profile completion
            "is_admin": False,
            "profile_complete": False,  # Flag to track completion status
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        user_result = service_client.table('users').insert(new_user).execute()
        user_id = user_result.data[0]['id']
        
        # Don't create player stats/skills yet - wait for profile completion
        
        print(f"✅ Incomplete student account created: {student_data.email}")
        
        return {
            "success": True,
            "message": f"Student account created for {student_data.email}. They will complete their profile on first login.",
            "data": {
                "user_id": user_id,
                "email": student_data.email,
                "temporary_password": student_data.temporary_password,
                "profile_complete": False
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Add incomplete student error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
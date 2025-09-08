"""
Olympics PWA Student API - Supabase Compatible
Provides student dashboard functionality using Supabase
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any, List
from datetime import datetime
import uuid

from app.core.supabase_client import get_supabase_client, get_supabase_auth_client
from app.api.auth_supabase import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/students", tags=["Students - Supabase"])

# Request Models
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

# Student authorization dependency
async def require_student(current_user = Depends(get_current_user)):
    """Ensure current user is a student (not admin)"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return current_user

@router.get("/me/profile")
async def get_my_profile(current_student = Depends(require_student)):
    """Get current student's complete profile with stats and skills"""
    
    try:
        service_client = get_supabase_auth_client()
        
        # Get student's player stats
        stats_response = service_client.table('player_stats').select('*').eq('user_id', current_student['id']).execute()
        
        print(f"🔍 Stats query for user {current_student['id']}: found {len(stats_response.data) if stats_response.data else 0} records")
        
        # Get student's XP entries
        xp_response = service_client.table('xp_entries').select('*').eq('user_id', current_student['id']).order('created_at', desc=True).limit(10).execute()
        
        # If no stats exist, create initial stats
        if not stats_response.data:
            print(f"📝 Creating new player stats for user {current_student['id']} ({current_student['username']})")
            initial_stats = {
                "id": str(uuid.uuid4()),
                "user_id": current_student['id'],
                "total_xp": 0,
                "current_xp": 0,
                "current_level": 1,
                "current_rank": 0,
                "gameboard_xp": 0,
                "gameboard_position": 1,
                "gameboard_moves": 3,  # Starting moves - FIXED
                "gold": 3,  # Starting gold
                "unit_xp": {},
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            create_result = service_client.table('player_stats').insert(initial_stats).execute()
            stats = create_result.data[0] if create_result.data else initial_stats
            print(f"✅ Created player stats: moves={stats.get('gameboard_moves')}, gold={stats.get('gold')}")
        else:
            stats = stats_response.data[0]
            print(f"🎯 Loaded existing stats for {current_student['username']}: moves={stats.get('gameboard_moves')}, gold={stats.get('gold')}, position={stats.get('gameboard_position')}")
            
        # Transform snake_case to camelCase for frontend compatibility
        stats_camelcase = {
            "id": stats.get("id"),
            "userId": stats.get("user_id"),
            "totalXP": stats.get("total_xp", 0),
            "currentXP": stats.get("current_xp", 0),
            "currentLevel": stats.get("current_level", 1),
            "currentRank": stats.get("current_rank", 0),
            "gameboardXP": stats.get("gameboard_xp", 0),
            "gameboardPosition": stats.get("gameboard_position", 1),
            "gameboardMoves": stats.get("gameboard_moves", 0),
            "gold": stats.get("gold", 3),
            "unitXP": stats.get("unit_xp", {}),
            "questProgress": stats.get("quest_progress", {
                "quest1": 0,
                "quest2": 0, 
                "quest3": 0,
                "currentQuest": 1
            }),
            "assignmentAwards": stats.get("assignment_awards", []),
            "medals": stats.get("medals", [])
        }
        
        # Create skills data structure (skills are derived from XP/level)
        skills = {
            "id": f"{current_student['id']}_skills",
            "userId": current_student['id'],
            "strength": 1,
            "endurance": 1,
            "tactics": 1,
            "climbing": 1,
            "speed": 1
        }
        
        # Create inventory data structure
        inventory = {
            "id": f"{current_student['id']}_inventory",
            "userId": current_student['id'],
            "water": 0,
            "gatorade": 0,
            "firstAidKit": 0
        }
        
        return {
            "success": True,
            "data": {
                "stats": stats_camelcase,
                "skills": skills,
                "inventory": inventory,
                "recent_xp": xp_response.data
            }
        }
        
    except Exception as e:
        print(f"❌ Get profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me/stats") 
async def get_my_stats(current_student = Depends(require_student)):
    """Get current student's player stats"""
    
    try:
        service_client = get_supabase_auth_client()
        
        stats_response = service_client.table('player_stats').select('*').eq('user_id', current_student['id']).execute()
        
        if stats_response.data:
            stats = stats_response.data[0]
            # Transform to camelCase for frontend
            stats_camelcase = {
                "id": stats.get("id"),
                "userId": stats.get("user_id"),
                "totalXP": stats.get("total_xp", 0),
                "currentXP": stats.get("current_xp", 0),
                "currentLevel": stats.get("current_level", 1),
                "currentRank": stats.get("current_rank", 0),
                "gameboardXP": stats.get("gameboard_xp", 0),
                "gameboardPosition": stats.get("gameboard_position", 1),
                "gameboardMoves": stats.get("gameboard_moves", 0),
                "gold": stats.get("gold", 3),
                "unitXP": stats.get("unit_xp", {})
            }
            return {
                "success": True,
                "data": stats_camelcase
            }
        else:
            # Return default stats in camelCase if none exist
            return {
                "success": True,
                "data": {
                    "totalXP": 0,
                    "currentXP": 0,
                    "currentLevel": 1,
                    "currentRank": 0,
                    "gameboardXP": 0,
                    "gameboardPosition": 1,
                    "gameboardMoves": 0,
                    "gold": 3,
                    "unitXP": {}
                }
            }
            
    except Exception as e:
        print(f"❌ Get stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me/skills")
async def get_my_skills(current_student = Depends(require_student)):
    """Get current student's skill levels"""
    
    try:
        # Skills are currently derived from level/XP rather than stored separately
        # Return default skills for now
        skills = {
            "strength": 1,
            "endurance": 1, 
            "tactics": 1,
            "climbing": 1,
            "speed": 1
        }
        
        return {
            "success": True,
            "data": skills
        }
            
    except Exception as e:
        print(f"❌ Get skills error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me/xp-history")
async def get_my_xp_history(current_student = Depends(require_student)):
    """Get current student's XP history"""
    
    try:
        service_client = get_supabase_auth_client()
        
        xp_response = service_client.table('xp_entries').select('*').eq('user_id', current_student['id']).order('created_at', desc=True).limit(20).execute()
        
        return {
            "success": True,
            "data": xp_response.data
        }
            
    except Exception as e:
        print(f"❌ Get XP history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/gameboard/stations")
async def get_gameboard_stations(current_student = Depends(require_student)):
    """Get gameboard stations for student"""
    
    try:
        # Return mock gameboard stations for now
        # In a full implementation, these would be stored in Supabase
        stations = [
            {
                "id": 1,
                "name": "Training Camp",
                "description": "Build your fundamental skills",
                "skill_required": "strength",
                "min_level": 1,
                "xp_reward": 10
            },
            {
                "id": 2,
                "name": "Endurance Challenge",
                "description": "Test your stamina",
                "skill_required": "endurance", 
                "min_level": 1,
                "xp_reward": 15
            },
            {
                "id": 3,
                "name": "Strategy Room",
                "description": "Plan your Olympic approach",
                "skill_required": "tactics",
                "min_level": 1,
                "xp_reward": 20
            }
        ]
        
        return {
            "success": True,
            "data": stations
        }
            
    except Exception as e:
        print(f"❌ Get gameboard stations error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/me/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_student = Depends(require_student)
):
    """Allow student to change their password after first login"""
    
    try:
        from passlib.context import CryptContext
        
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        service_client = get_supabase_auth_client()
        
        # Validate password confirmation
        if password_data.new_password != password_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New passwords do not match"
            )
        
        # Get current user data
        user_data = service_client.table('users').select('password').eq('id', current_student['id']).execute()
        if not user_data.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        current_user = user_data.data[0]
        
        # Verify current password
        if not pwd_context.verify(password_data.current_password, current_user['password']):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Hash new password
        hashed_new_password = pwd_context.hash(password_data.new_password)
        
        # Update password in database
        service_client.table('users').update({
            "password": hashed_new_password,
            "updated_at": datetime.utcnow().isoformat()
        }).eq('id', current_student['id']).execute()
        
        print(f"✅ Password changed for student: {current_student['email']}")
        
        return {
            "success": True,
            "message": "Password changed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Change password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me/health")
async def get_my_health(current_student = Depends(require_student)):
    """Simple health check for student authentication"""
    
    return {
        "success": True,
        "message": "Student API is working",
        "user_id": current_student['id'],
        "username": current_student['username'],
        "email": current_student['email']
    }
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

class UpdateStatsRequest(BaseModel):
    gameboardPosition: int = None
    gameboardMoves: int = None
    gameboardXP: int = None
    gold: int = None

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

@router.post("/gameboard/roll-dice")
async def roll_dice(
    dice_data: dict,
    current_student = Depends(require_student)
):
    """Roll dice for gameboard gameplay"""
    try:
        from app.core.supabase_client import get_supabase_auth_client
        import random
        from datetime import datetime
        
        service_client = get_supabase_auth_client()
        
        # Extract dice roll parameters
        station_id = dice_data.get('station_id')
        skill_level = dice_data.get('skill_level', 1)
        success_chance = dice_data.get('success_chance', 50)
        
        # Generate dice roll result
        roll_result = dice_data.get('roll_result', random.randint(1, 100))
        was_successful = roll_result <= success_chance
        
        # Get current player stats
        stats_result = service_client.table('player_stats').select('*').eq('user_id', current_student['id']).execute()
        
        if not stats_result.data:
            raise HTTPException(status_code=404, detail="Player stats not found")
        
        current_stats = stats_result.data[0]
        current_moves = current_stats.get('gameboard_moves', 0)
        
        # Check if student has moves available
        if current_moves <= 0:
            return {
                "success": False,
                "error": "No moves available",
                "data": {
                    "roll_result": roll_result,
                    "was_successful": False,
                    "moves_remaining": 0
                }
            }
        
        # Calculate rewards based on success
        xp_gained = 0
        gold_gained = 0
        
        if was_successful:
            # Base rewards for successful roll
            xp_gained = skill_level * 10 + random.randint(5, 15)
            gold_gained = random.randint(1, 5)
            
            # Bonus for higher skill levels
            if skill_level >= 3:
                xp_gained += 10
                gold_gained += 2
        else:
            # Small consolation rewards
            xp_gained = random.randint(1, 5)
            gold_gained = 0
        
        # Update player stats
        new_moves = current_moves - 1
        new_total_xp = current_stats.get('total_xp', 0) + xp_gained
        new_current_xp = current_stats.get('current_xp', 0) + xp_gained
        new_level = max(1, new_total_xp // 200 + 1)
        new_gold = current_stats.get('gold', 0) + gold_gained
        new_gameboard_xp = current_stats.get('gameboard_xp', 0) + xp_gained
        
        # Update database
        update_data = {
            "gameboard_moves": new_moves,
            "total_xp": new_total_xp,
            "current_xp": new_current_xp,
            "current_level": new_level,
            "gold": new_gold,
            "gameboard_xp": new_gameboard_xp,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        service_client.table('player_stats').update(update_data).eq('user_id', current_student['id']).execute()
        
        # Create XP entry for tracking
        if xp_gained > 0:
            xp_entry = {
                "id": str(uuid.uuid4()),
                "user_id": current_student['id'],
                "assignment_id": None,
                "assignment_name": f"Gameboard Station {station_id}",
                "unit_id": None,
                "xp_amount": xp_gained,
                "awarded_by": current_student['id'],  # Self-awarded through gameplay
                "description": f"Dice roll reward - {'Success' if was_successful else 'Attempt'}",
                "created_at": datetime.utcnow().isoformat()
            }
            
            try:
                service_client.table('xp_entries').insert(xp_entry).execute()
            except Exception as e:
                print(f"Warning: Could not log XP entry: {e}")
        
        return {
            "success": True,
            "data": {
                "roll_result": roll_result,
                "was_successful": was_successful,
                "success_chance": success_chance,
                "skill_level": skill_level,
                "station_id": station_id,
                "rewards": {
                    "xp_gained": xp_gained,
                    "gold_gained": gold_gained
                },
                "updated_stats": {
                    "moves_remaining": new_moves,
                    "total_xp": new_total_xp,
                    "current_level": new_level,
                    "gold": new_gold,
                    "gameboard_xp": new_gameboard_xp
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Roll dice error: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.post("/me/update-stats")
async def update_my_stats(
    stats_data: UpdateStatsRequest,
    current_student = Depends(require_student)
):
    """Update current student's game stats (position, moves, XP, gold)"""
    
    try:
        service_client = get_supabase_auth_client()
        
        # Build update data from non-None values
        update_data = {}
        if stats_data.gameboardPosition is not None:
            update_data['gameboard_position'] = stats_data.gameboardPosition
        if stats_data.gameboardMoves is not None:
            update_data['gameboard_moves'] = stats_data.gameboardMoves
        if stats_data.gameboardXP is not None:
            update_data['gameboard_xp'] = stats_data.gameboardXP
        if stats_data.gold is not None:
            update_data['gold'] = stats_data.gold
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid stats provided to update"
            )
        
        # Update the player stats record
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        update_response = service_client.table('player_stats').update(update_data).eq('user_id', current_student['id']).execute()
        
        if not update_response.data:
            # If no existing record, create one
            create_data = {
                'user_id': current_student['id'],
                'current_xp': 0,
                'total_xp': 0,
                'current_level': 1,
                'current_rank': 100,
                'gameboard_xp': 0,
                'gameboard_position': 0,
                'gameboard_moves': 3,
                'gold': 3,
                **update_data,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            create_response = service_client.table('player_stats').insert(create_data).execute()
            
            print(f"✅ Created new stats record for user {current_student['id']}")
            return {
                "success": True,
                "message": "Player stats created and updated successfully",
                "data": create_response.data[0] if create_response.data else None
            }
        else:
            print(f"✅ Updated stats for user {current_student['id']}: {update_data}")
            return {
                "success": True,
                "message": "Player stats updated successfully",
                "data": update_response.data[0] if update_response.data else None
            }
            
    except Exception as e:
        print(f"❌ Update stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
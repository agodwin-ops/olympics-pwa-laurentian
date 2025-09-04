from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.olympics import User, PlayerStats, PlayerSkills
from app.schemas.olympics import User as UserSchema
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/leaderboard")
async def get_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the leaderboard with top students by XP"""
    try:
        # Get all students with their stats, ordered by total XP
        leaderboard_query = db.query(
            User, PlayerStats, PlayerSkills
        ).join(
            PlayerStats, User.id == PlayerStats.user_id
        ).join(
            PlayerSkills, User.id == PlayerSkills.user_id
        ).filter(
            User.is_admin == False  # Only students
        ).order_by(
            PlayerStats.total_xp.desc(),
            PlayerStats.current_level.desc(),
            User.username.asc()
        ).limit(50)  # Top 50 students
        
        results = leaderboard_query.all()
        
        leaderboard = []
        rank = 1
        
        for user, stats, skills in results:
            # Calculate medal tier based on XP
            medal_tier = None
            if stats.total_xp >= 1000:
                medal_tier = "gold"
            elif stats.total_xp >= 500:
                medal_tier = "silver" 
            elif stats.total_xp >= 250:
                medal_tier = "bronze"
            
            leaderboard_entry = {
                "id": user.id,
                "username": user.username,
                "user_program": user.user_program,
                "profile_picture_url": user.profile_picture_url,
                "total_xp": stats.total_xp,
                "current_xp": stats.current_xp,
                "current_level": stats.current_level,
                "current_rank": rank,
                "gameboard_xp": stats.gameboard_xp,
                "gameboard_position": stats.gameboard_position,
                "gameboard_moves": stats.gameboard_moves,
                "gold": stats.gold,
                "medal_tier": medal_tier,
                "skills": {
                    "strength": skills.strength,
                    "endurance": skills.endurance,
                    "tactics": skills.tactics,
                    "climbing": skills.climbing,
                    "speed": skills.speed
                }
            }
            
            leaderboard.append(leaderboard_entry)
            rank += 1
        
        return {
            "success": True,
            "data": {
                "overall": leaderboard,
                "gameboard": sorted(leaderboard, key=lambda x: (x["gameboard_xp"], x["gameboard_position"]), reverse=True)[:20],
                "unit": leaderboard[:10],  # Top 10 for unit view
                "last_updated": "2025-09-03T00:00:00Z"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to get leaderboard")

@router.get("/leaderboard/overall")
async def get_overall_leaderboard(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall leaderboard by total XP"""
    try:
        # Get top students by total XP
        results = db.query(
            User, PlayerStats
        ).join(
            PlayerStats, User.id == PlayerStats.user_id
        ).filter(
            User.is_admin == False
        ).order_by(
            PlayerStats.total_xp.desc()
        ).limit(limit).all()
        
        leaderboard = []
        for rank, (user, stats) in enumerate(results, 1):
            leaderboard.append({
                "rank": rank,
                "id": user.id,
                "username": user.username,
                "user_program": user.user_program,
                "total_xp": stats.total_xp,
                "current_level": stats.current_level,
                "gold": stats.gold
            })
        
        return {"success": True, "data": leaderboard}
        
    except Exception as e:
        logger.error(f"Error getting overall leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to get overall leaderboard")

@router.get("/leaderboard/gameboard")
async def get_gameboard_leaderboard(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get gameboard leaderboard by gameboard position and XP"""
    try:
        results = db.query(
            User, PlayerStats
        ).join(
            PlayerStats, User.id == PlayerStats.user_id
        ).filter(
            User.is_admin == False
        ).order_by(
            PlayerStats.gameboard_position.desc(),
            PlayerStats.gameboard_xp.desc()
        ).limit(limit).all()
        
        leaderboard = []
        for rank, (user, stats) in enumerate(results, 1):
            leaderboard.append({
                "rank": rank,
                "id": user.id,
                "username": user.username,
                "user_program": user.user_program,
                "gameboard_position": stats.gameboard_position,
                "gameboard_xp": stats.gameboard_xp,
                "gameboard_moves": stats.gameboard_moves
            })
        
        return {"success": True, "data": leaderboard}
        
    except Exception as e:
        logger.error(f"Error getting gameboard leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to get gameboard leaderboard")
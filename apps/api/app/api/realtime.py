import json
import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.websocket_manager import connection_manager
from app.models.olympics import User
# from app.api.students import get_current_leaderboard

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/realtime/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time updates"""
    
    # Authenticate the user
    try:
        if not token:
            await websocket.close(code=4001, reason="Authentication token required")
            return
            
        # Verify token and get user (this would need to be implemented)
        user = await get_user_from_token(token, db)
        if not user or user.id != user_id:
            await websocket.close(code=4003, reason="Authentication failed")
            return
            
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        await websocket.close(code=4003, reason="Authentication failed")
        return

    # Accept connection
    await connection_manager.connect(websocket, user_id)
    
    try:
        # Send initial data
        await send_initial_data(websocket, user, db)
        
        # Handle incoming messages
        while True:
            try:
                # Wait for message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                await handle_client_message(websocket, user, message, db)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await connection_manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, websocket)
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                await connection_manager.send_personal_message({
                    "type": "error", 
                    "message": "Internal server error"
                }, websocket)
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        await connection_manager.disconnect(websocket)

async def send_initial_data(websocket: WebSocket, user: User, db: Session):
    """Send initial data when user connects"""
    try:
        # Send user's current progress
        from app.api.students import get_player_profile_data
        profile_data = await get_player_profile_data(user.id, db)
        
        await connection_manager.send_personal_message({
            "type": "initial_data",
            "data": {
                "user_profile": profile_data,
                "connection_status": "connected"
            }
        }, websocket)
        
        # Send current leaderboard
        leaderboard_data = await get_leaderboard_data(db)
        await connection_manager.send_personal_message({
            "type": "leaderboard_update",
            "data": leaderboard_data
        }, websocket)
        
    except Exception as e:
        logger.error(f"Error sending initial data: {e}")

async def handle_client_message(websocket: WebSocket, user: User, message: dict, db: Session):
    """Handle different types of messages from client"""
    message_type = message.get("type")
    
    if message_type == "ping":
        # Respond to ping with pong
        await connection_manager.send_personal_message({
            "type": "pong",
            "timestamp": message.get("timestamp")
        }, websocket)
        
    elif message_type == "request_leaderboard":
        # Send fresh leaderboard data
        leaderboard_data = await get_leaderboard_data(db)
        await connection_manager.send_personal_message({
            "type": "leaderboard_update",
            "data": leaderboard_data
        }, websocket)
        
    elif message_type == "request_profile":
        # Send fresh profile data
        from app.api.students import get_player_profile_data
        profile_data = await get_player_profile_data(user.id, db)
        await connection_manager.send_personal_message({
            "type": "progress_update",
            "data": profile_data
        }, websocket)
        
    elif message_type == "join_room":
        # Join a specific room (e.g., unit-specific updates)
        room_name = message.get("room")
        if room_name:
            await connection_manager.join_room(websocket, room_name)
            await connection_manager.send_personal_message({
                "type": "room_joined",
                "room": room_name
            }, websocket)
            
    elif message_type == "leave_room":
        # Leave a specific room
        room_name = message.get("room")
        if room_name:
            await connection_manager.leave_room(websocket, room_name)
            await connection_manager.send_personal_message({
                "type": "room_left",
                "room": room_name
            }, websocket)
    
    else:
        await connection_manager.send_personal_message({
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        }, websocket)

async def get_user_from_token(token: str, db: Session) -> Optional[User]:
    """Get user from JWT token"""
    try:
        from app.api.auth import jwt, SECRET_KEY, ALGORITHM
        from jose import JWTError
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            return user
    except JWTError as e:
        logger.error(f"Token validation error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error validating token: {e}")
    return None

async def get_leaderboard_data(db: Session):
    """Get current leaderboard data"""
    try:
        # Simple leaderboard query
        from app.models.olympics import User, PlayerStats
        
        leaderboard = db.query(User, PlayerStats)\
            .join(PlayerStats, User.id == PlayerStats.user_id)\
            .order_by(PlayerStats.total_xp.desc())\
            .limit(10)\
            .all()
        
        return {
            "overall": [
                {
                    "rank": idx + 1,
                    "user": {
                        "id": str(user.id),
                        "username": user.username,
                        "user_program": user.user_program,
                        "profile_picture_url": user.profile_picture_url
                    },
                    "stats": {
                        "total_xp": stats.total_xp,
                        "current_level": stats.current_level,
                        "current_rank": stats.current_rank,
                        "gold": stats.gold
                    }
                }
                for idx, (user, stats) in enumerate(leaderboard)
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching leaderboard: {e}")
        return {"overall": []}

async def get_player_profile_data(user_id: str, db: Session):
    """Get player profile data"""
    try:
        from app.models.olympics import User, PlayerStats, PlayerSkills
        
        user = db.query(User).filter(User.id == user_id).first()
        stats = db.query(PlayerStats).filter(PlayerStats.user_id == user_id).first()
        skills = db.query(PlayerSkills).filter(PlayerSkills.user_id == user_id).first()
        
        if not user:
            return None
            
        return {
            "user": {
                "id": str(user.id),
                "username": user.username,
                "user_program": user.user_program,
                "profile_picture_url": user.profile_picture_url
            },
            "stats": {
                "total_xp": stats.total_xp if stats else 0,
                "current_level": stats.current_level if stats else 1,
                "current_rank": stats.current_rank if stats else 999,
                "gold": stats.gold if stats else 0,
                "gameboard_position": stats.gameboard_position if stats else 1,
                "gameboard_moves": stats.gameboard_moves if stats else 0
            } if stats else {},
            "skills": {
                "strength": skills.strength if skills else 1,
                "endurance": skills.endurance if skills else 1,
                "tactics": skills.tactics if skills else 1,
                "climbing": skills.climbing if skills else 1,
                "speed": skills.speed if skills else 1
            } if skills else {}
        }
    except Exception as e:
        logger.error(f"Error fetching player profile: {e}")
        return None

# Admin endpoint to trigger system-wide updates
@router.post("/broadcast/leaderboard")
async def broadcast_leaderboard_update(
    db: Session = Depends(get_db)
):
    """Manually trigger leaderboard broadcast"""
    # Note: Admin auth would be handled by middleware or separate auth check
    
    try:
        leaderboard_data = await get_leaderboard_data(db)
        await connection_manager.send_leaderboard_update(leaderboard_data)
        
        return {
            "success": True,
            "message": "Leaderboard update broadcasted",
            "connections_notified": connection_manager.connection_count
        }
    except Exception as e:
        logger.error(f"Error broadcasting leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to broadcast update")

@router.post("/broadcast/announcement")
async def broadcast_announcement(
    message: str,
    announcement_type: str = "info"
):
    """Send system announcement to all connected users"""
    
    try:
        await connection_manager.send_system_announcement(message, announcement_type)
        
        return {
            "success": True,
            "message": "Announcement sent",
            "connections_notified": connection_manager.connection_count
        }
    except Exception as e:
        logger.error(f"Error sending announcement: {e}")
        raise HTTPException(status_code=500, detail="Failed to send announcement")

@router.get("/stats")
async def get_realtime_stats():
    """Get real-time connection statistics"""
    
    return connection_manager.get_connection_stats()

# Function to be called from other endpoints when data changes
async def notify_progress_update(user_id: str, progress_data: dict):
    """Called when user progress is updated"""
    await connection_manager.send_progress_update(user_id, progress_data)

async def notify_achievement_earned(user_id: str, achievement_data: dict):
    """Called when user earns an achievement"""
    await connection_manager.send_achievement_notification(user_id, achievement_data)

async def notify_award_received(user_id: str, award_data: dict):
    """Called when user receives an award"""
    await connection_manager.send_award_notification(user_id, award_data)

async def notify_leaderboard_update(leaderboard_data: dict):
    """Called when leaderboard data changes"""
    await connection_manager.send_leaderboard_update(leaderboard_data)
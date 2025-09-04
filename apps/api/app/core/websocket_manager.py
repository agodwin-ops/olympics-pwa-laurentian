import json
import asyncio
import logging
from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time features"""
    
    def __init__(self):
        # Active connections by user_id
        self.connections: Dict[str, Set[WebSocket]] = {}
        
        # Connection metadata
        self.connection_data: Dict[WebSocket, Dict[str, Any]] = {}
        
        # Room-based connections for targeted broadcasts
        self.rooms: Dict[str, Set[WebSocket]] = {}
        
        # Connection stats
        self.connection_count = 0
        self.message_count = 0

    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        if connection_id is None:
            connection_id = str(uuid.uuid4())
        
        # Store connection
        if user_id not in self.connections:
            self.connections[user_id] = set()
        self.connections[user_id].add(websocket)
        
        # Store connection metadata
        self.connection_data[websocket] = {
            "user_id": user_id,
            "connection_id": connection_id,
            "connected_at": datetime.utcnow(),
            "last_activity": datetime.utcnow()
        }
        
        self.connection_count += 1
        
        logger.info(f"User {user_id} connected via WebSocket (ID: {connection_id})")
        
        # Join default room (all users)
        await self.join_room(websocket, "all_users")
        
        # Send connection confirmation
        await self.send_personal_message({
            "type": "connection_established",
            "connection_id": connection_id,
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Connected to Olympics RPG real-time updates"
        }, websocket)

    async def disconnect(self, websocket: WebSocket):
        """Handle WebSocket disconnection"""
        if websocket not in self.connection_data:
            return
            
        data = self.connection_data[websocket]
        user_id = data["user_id"]
        connection_id = data.get("connection_id")
        
        # Remove from user connections
        if user_id in self.connections:
            self.connections[user_id].discard(websocket)
            if not self.connections[user_id]:
                del self.connections[user_id]
        
        # Remove from all rooms
        for room_connections in self.rooms.values():
            room_connections.discard(websocket)
        
        # Clean up metadata
        del self.connection_data[websocket]
        
        self.connection_count -= 1
        
        logger.info(f"User {user_id} disconnected from WebSocket (ID: {connection_id})")

    async def join_room(self, websocket: WebSocket, room_name: str):
        """Add connection to a room for targeted broadcasts"""
        if room_name not in self.rooms:
            self.rooms[room_name] = set()
        self.rooms[room_name].add(websocket)
        
        logger.debug(f"Connection joined room: {room_name}")

    async def leave_room(self, websocket: WebSocket, room_name: str):
        """Remove connection from a room"""
        if room_name in self.rooms:
            self.rooms[room_name].discard(websocket)
            if not self.rooms[room_name]:
                del self.rooms[room_name]
        
        logger.debug(f"Connection left room: {room_name}")

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send message to a specific connection"""
        try:
            await websocket.send_text(json.dumps(message, default=str))
            self.message_count += 1
            
            # Update last activity
            if websocket in self.connection_data:
                self.connection_data[websocket]["last_activity"] = datetime.utcnow()
                
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            await self.disconnect(websocket)

    async def send_to_user(self, message: Dict[str, Any], user_id: str):
        """Send message to all connections for a specific user"""
        if user_id not in self.connections:
            return
        
        # Send to all user's connections
        disconnected_connections = []
        for websocket in self.connections[user_id].copy():
            try:
                await websocket.send_text(json.dumps(message, default=str))
                self.message_count += 1
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                disconnected_connections.append(websocket)
        
        # Clean up disconnected connections
        for websocket in disconnected_connections:
            await self.disconnect(websocket)

    async def broadcast_to_room(self, message: Dict[str, Any], room_name: str):
        """Broadcast message to all connections in a room"""
        if room_name not in self.rooms:
            return
        
        disconnected_connections = []
        for websocket in self.rooms[room_name].copy():
            try:
                await websocket.send_text(json.dumps(message, default=str))
                self.message_count += 1
            except Exception as e:
                logger.error(f"Error broadcasting to room {room_name}: {e}")
                disconnected_connections.append(websocket)
        
        # Clean up disconnected connections
        for websocket in disconnected_connections:
            await self.disconnect(websocket)

    async def broadcast_to_all(self, message: Dict[str, Any]):
        """Broadcast message to all connected users"""
        await self.broadcast_to_room(message, "all_users")

    async def send_leaderboard_update(self, leaderboard_data: Dict[str, Any]):
        """Send leaderboard update to all connections"""
        message = {
            "type": "leaderboard_update",
            "timestamp": datetime.utcnow().isoformat(),
            "data": leaderboard_data
        }
        await self.broadcast_to_all(message)

    async def send_progress_update(self, user_id: str, progress_data: Dict[str, Any]):
        """Send progress update to a specific user"""
        message = {
            "type": "progress_update", 
            "timestamp": datetime.utcnow().isoformat(),
            "data": progress_data
        }
        await self.send_to_user(message, user_id)

    async def send_achievement_notification(self, user_id: str, achievement_data: Dict[str, Any]):
        """Send achievement notification to a specific user"""
        message = {
            "type": "achievement_notification",
            "timestamp": datetime.utcnow().isoformat(),
            "data": achievement_data
        }
        await self.send_to_user(message, user_id)

    async def send_award_notification(self, user_id: str, award_data: Dict[str, Any]):
        """Send award notification to a specific user and broadcast rank changes"""
        # Personal notification
        message = {
            "type": "award_notification",
            "timestamp": datetime.utcnow().isoformat(),
            "data": award_data
        }
        await self.send_to_user(message, user_id)
        
        # If this affects rankings, trigger leaderboard update
        if award_data.get("affects_ranking", True):
            # This would be called from the award endpoint
            pass

    async def send_system_announcement(self, announcement: str, announcement_type: str = "info"):
        """Send system-wide announcement"""
        message = {
            "type": "system_announcement",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "message": announcement,
                "type": announcement_type  # info, warning, success, error
            }
        }
        await self.broadcast_to_all(message)

    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "total_connections": self.connection_count,
            "unique_users": len(self.connections),
            "total_messages_sent": self.message_count,
            "rooms": {room: len(connections) for room, connections in self.rooms.items()},
            "timestamp": datetime.utcnow().isoformat()
        }

    def get_user_connections(self, user_id: str) -> int:
        """Get number of active connections for a user"""
        return len(self.connections.get(user_id, set()))

    async def ping_all_connections(self):
        """Send ping to all connections to check connectivity"""
        ping_message = {
            "type": "ping",
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_all(ping_message)

# Global connection manager instance
connection_manager = ConnectionManager()
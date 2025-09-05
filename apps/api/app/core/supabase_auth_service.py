"""
Olympics PWA - Supabase SDK Authentication Service
Complete replacement for SQLite auth using Supabase's built-in authentication
Bypasses all PostgreSQL connection issues by using REST API
"""

import os
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client
from supabase.client import ClientOptions

# Custom AuthError class - eliminates gotrue dependency
class AuthError(Exception):
    """Custom AuthError for authentication failures"""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code

load_dotenv()

class OlympicsSupabaseAuthService:
    """
    Complete Supabase SDK authentication service for Olympics PWA
    Uses Supabase Auth instead of custom password hashing
    """
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY") 
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not all([self.url, self.anon_key, self.service_key]):
            raise ValueError("Missing Supabase credentials in environment")
        
        # Client with anon key for user operations
        self.client = create_client(self.url, self.anon_key)
        
        # Admin client with service role for admin operations
        self.admin_client = create_client(self.url, self.service_key)
        
        print(f"🌐 Supabase Auth Service initialized: {self.url}")
    
    async def test_connection(self) -> bool:
        """Test Supabase connection and auth service"""
        try:
            # Test basic client connection
            response = self.client.auth.get_session()
            print("✅ Supabase Auth Service: Connected")
            return True
        except Exception as e:
            print(f"❌ Supabase Auth Service connection failed: {e}")
            return False
    
    # User Registration with Supabase Auth
    async def register_user(self, email: str, password: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Register user using Supabase Auth (no custom password hashing needed)
        """
        try:
            # Use Supabase built-in user registration
            auth_response = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "username": user_data.get("username"),
                        "user_program": user_data.get("user_program"),
                        "is_admin": user_data.get("is_admin", False),
                        "profile_picture_url": user_data.get("profile_picture_url")
                    }
                }
            })
            
            if auth_response.user:
                user_id = auth_response.user.id
                
                # Create user profile in public.users table
                profile_data = {
                    "id": user_id,
                    "email": email,
                    "username": user_data.get("username"),
                    "user_program": user_data.get("user_program"),
                    "is_admin": user_data.get("is_admin", False),
                    "profile_picture_url": user_data.get("profile_picture_url"),
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                # Insert into users table
                profile_response = self.admin_client.table("users").insert(profile_data).execute()
                
                # Create initial player data
                await self.create_initial_player_data(user_id)
                
                return {
                    "success": True,
                    "user": auth_response.user.model_dump(),
                    "session": auth_response.session.model_dump() if auth_response.session else None,
                    "message": "User registered successfully"
                }
            else:
                return {
                    "success": False,
                    "error": "Registration failed - no user returned",
                    "details": str(auth_response)
                }
                
        except AuthError as e:
            return {
                "success": False,
                "error": "Authentication error",
                "details": str(e)
            }
        except Exception as e:
            return {
                "success": False,
                "error": "Registration failed",
                "details": str(e)
            }
    
    async def create_initial_player_data(self, user_id: str):
        """Create initial player stats, skills, and inventory"""
        try:
            # Player stats
            stats_data = {
                "user_id": user_id,
                "level": 1,
                "experience_points": 0,
                "gold": 100,
                "health": 100,
                "max_health": 100,
                "energy": 100,
                "max_energy": 100,
                "strength": 10,
                "agility": 10,
                "intelligence": 10,
                "luck": 10,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            self.admin_client.table("player_stats").insert(stats_data).execute()
            
            # Player skills
            skills_data = {
                "user_id": user_id,
                "cooking": 1,
                "leadership": 1,
                "strategy": 1,
                "negotiation": 1,
                "athletics": 1,
                "knowledge": 1,
                "creativity": 1,
                "problem_solving": 1,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            self.admin_client.table("player_skills").insert(skills_data).execute()
            
            # Initial inventory items
            starter_items = [
                {"item_name": "Chef's Knife", "item_type": "tool", "quantity": 1, "description": "Basic cooking utensil"},
                {"item_name": "Notebook", "item_type": "tool", "quantity": 1, "description": "For planning and notes"},
                {"item_name": "Olympic Badge", "item_type": "badge", "quantity": 1, "description": "Participant identification"}
            ]
            
            for item in starter_items:
                inventory_data = {
                    "user_id": user_id,
                    "item_name": item["item_name"],
                    "item_type": item["item_type"],
                    "quantity": item["quantity"],
                    "description": item["description"],
                    "acquired_at": datetime.utcnow().isoformat(),
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                self.admin_client.table("player_inventory").insert(inventory_data).execute()
            
            print(f"✅ Initial player data created for user {user_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to create initial player data: {e}")
    
    # User Login with Supabase Auth
    async def login_user(self, email: str, password: str) -> Dict[str, Any]:
        """Login user using Supabase Auth"""
        try:
            auth_response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if auth_response.user and auth_response.session:
                # Get user profile from public.users table
                user_profile = self.admin_client.table("users")\
                    .select("*")\
                    .eq("id", auth_response.user.id)\
                    .execute()
                
                # Update last active
                self.admin_client.table("users")\
                    .update({"last_active": datetime.utcnow().isoformat()})\
                    .eq("id", auth_response.user.id)\
                    .execute()
                
                return {
                    "success": True,
                    "user": auth_response.user.model_dump(),
                    "session": auth_response.session.model_dump(),
                    "profile": user_profile.data[0] if user_profile.data else None,
                    "message": "Login successful"
                }
            else:
                return {
                    "success": False,
                    "error": "Login failed - invalid credentials"
                }
                
        except AuthError as e:
            return {
                "success": False,
                "error": "Authentication failed",
                "details": str(e)
            }
        except Exception as e:
            return {
                "success": False,
                "error": "Login failed",
                "details": str(e)
            }
    
    # Get Current User
    async def get_current_user(self, session_token: str) -> Dict[str, Any]:
        """Get current user from session token"""
        try:
            # Set session on client
            self.client.auth.set_session(session_token)
            
            # Get current user
            user = self.client.auth.get_user()
            
            if user:
                # Get user profile
                user_profile = self.admin_client.table("users")\
                    .select("*")\
                    .eq("id", user.id)\
                    .execute()
                
                return {
                    "success": True,
                    "user": user.model_dump(),
                    "profile": user_profile.data[0] if user_profile.data else None
                }
            else:
                return {"success": False, "error": "No current user"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Logout
    async def logout_user(self) -> Dict[str, Any]:
        """Logout current user"""
        try:
            self.client.auth.sign_out()
            return {"success": True, "message": "Logged out successfully"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Player Data Operations
    async def get_player_stats(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get player stats via Supabase SDK"""
        try:
            result = self.admin_client.table("player_stats")\
                .select("*")\
                .eq("user_id", user_id)\
                .execute()
            
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Failed to get player stats: {e}")
            return None
    
    async def get_player_skills(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get player skills via Supabase SDK"""
        try:
            result = self.admin_client.table("player_skills")\
                .select("*")\
                .eq("user_id", user_id)\
                .execute()
            
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Failed to get player skills: {e}")
            return None
    
    async def get_player_inventory(self, user_id: str) -> List[Dict[str, Any]]:
        """Get player inventory via Supabase SDK"""
        try:
            result = self.admin_client.table("player_inventory")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .execute()
            
            return result.data or []
        except Exception as e:
            print(f"❌ Failed to get player inventory: {e}")
            return []
    
    async def update_player_stats(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """Update player stats"""
        try:
            updates["updated_at"] = datetime.utcnow().isoformat()
            
            result = self.admin_client.table("player_stats")\
                .update(updates)\
                .eq("user_id", user_id)\
                .execute()
            
            return len(result.data) > 0
        except Exception as e:
            print(f"❌ Failed to update player stats: {e}")
            return False
    
    async def add_experience(self, user_id: str, activity: str, xp_gained: int, description: str = None) -> bool:
        """Add experience entry"""
        try:
            xp_entry = {
                "user_id": user_id,
                "activity": activity,
                "xp_gained": xp_gained,
                "description": description,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Insert experience entry
            self.admin_client.table("experience_entries").insert(xp_entry).execute()
            
            # Update total experience points
            current_stats = await self.get_player_stats(user_id)
            if current_stats:
                new_xp = current_stats.get("experience_points", 0) + xp_gained
                new_level = max(1, new_xp // 100 + 1)  # Level up every 100 XP
                
                await self.update_player_stats(user_id, {
                    "experience_points": new_xp,
                    "level": new_level
                })
            
            return True
        except Exception as e:
            print(f"❌ Failed to add experience: {e}")
            return False

# Global Supabase Auth Service instance
supabase_auth = OlympicsSupabaseAuthService()

# Test function
async def test_supabase_auth_service():
    """Test Supabase Auth Service"""
    try:
        connected = await supabase_auth.test_connection()
        print(f"🌐 Supabase Auth Service: {'✅ Ready' if connected else '❌ Failed'}")
        return connected
    except Exception as e:
        print(f"🌐 Supabase Auth Service Test Failed: {e}")
        return False
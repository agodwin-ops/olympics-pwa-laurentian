"""
Supabase Database Service - Complete replacement for SQLAlchemy
Provides all database operations using Supabase SDK for multi-user deployment
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
import bcrypt
from .supabase_client import supabase_client

class SupabaseDB:
    """Complete database service using Supabase SDK"""
    
    def __init__(self):
        self.client = supabase_client.admin_client  # Use admin client for all operations
    
    # ===== USER OPERATIONS =====
    
    async def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new user"""
        try:
            # Hash password
            if 'password' in user_data:
                password_hash = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                user_data['password_hash'] = password_hash
                del user_data['password']  # Remove plain password
            
            # Add timestamps
            now = datetime.utcnow().isoformat()
            user_data.update({
                'created_at': now,
                'updated_at': now,
                'last_active': now,
                'email_verified': True
            })
            
            result = self.client.table('users').insert(user_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ User creation failed: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            result = self.client.table('users').select('*').eq('email', email).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ User lookup failed: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            result = self.client.table('users').select('*').eq('id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ User lookup failed: {e}")
            return None
    
    async def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False
    
    # ===== PLAYER STATS OPERATIONS =====
    
    async def get_player_stats(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get player stats"""
        try:
            result = self.client.table('player_stats').select('*').eq('user_id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Player stats lookup failed: {e}")
            return None
    
    async def create_player_stats(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Create initial player stats"""
        try:
            stats_data = {
                'user_id': user_id,
                'current_xp': 0,
                'total_xp': 0,
                'current_level': 1,
                'current_rank': 0,
                'gameboard_xp': 0,
                'gameboard_position': 1,
                'gameboard_moves': 3,
                'gold': 100,
                'unit_xp': {},
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            result = self.client.table('player_stats').insert(stats_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Player stats creation failed: {e}")
            return None
    
    async def update_player_stats(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update player stats"""
        try:
            updates['updated_at'] = datetime.utcnow().isoformat()
            result = self.client.table('player_stats').update(updates).eq('user_id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Player stats update failed: {e}")
            return None
    
    # ===== PLAYER SKILLS OPERATIONS =====
    
    async def get_player_skills(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get player skills"""
        try:
            result = self.client.table('player_skills').select('*').eq('user_id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Player skills lookup failed: {e}")
            return None
    
    async def create_player_skills(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Create initial player skills"""
        try:
            skills_data = {
                'user_id': user_id,
                'strength': 1,
                'endurance': 1,
                'tactics': 1,
                'climbing': 1,
                'speed': 1,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            result = self.client.table('player_skills').insert(skills_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Player skills creation failed: {e}")
            return None
    
    # ===== LEADERBOARD OPERATIONS =====
    
    async def get_leaderboard(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get leaderboard data"""
        try:
            # Get users with their stats and skills
            result = self.client.table('users')\
                .select('id,username,user_program,profile_picture_url,player_stats(*),player_skills(*)')\
                .eq('is_admin', False)\
                .order('player_stats(total_xp)', desc=True)\
                .limit(limit)\
                .execute()
            
            leaderboard = []
            for rank, user in enumerate(result.data, 1):
                stats = user.get('player_stats', [{}])[0] if user.get('player_stats') else {}
                skills = user.get('player_skills', [{}])[0] if user.get('player_skills') else {}
                
                # Calculate medal tier
                total_xp = stats.get('total_xp', 0)
                medal_tier = None
                if total_xp >= 1000:
                    medal_tier = "gold"
                elif total_xp >= 500:
                    medal_tier = "silver"
                elif total_xp >= 250:
                    medal_tier = "bronze"
                
                entry = {
                    "id": user['id'],
                    "username": user['username'],
                    "user_program": user['user_program'],
                    "profile_picture_url": user.get('profile_picture_url'),
                    "current_rank": rank,
                    "medal_tier": medal_tier,
                    **stats,
                    "skills": skills
                }
                leaderboard.append(entry)
            
            return leaderboard
        except Exception as e:
            print(f"❌ Leaderboard query failed: {e}")
            return []
    
    # ===== ADMIN OPERATIONS =====
    
    async def get_all_students(self) -> List[Dict[str, Any]]:
        """Get all students with their stats"""
        try:
            result = self.client.table('users')\
                .select('*,player_stats(*),player_skills(*)')\
                .eq('is_admin', False)\
                .execute()
            return result.data
        except Exception as e:
            print(f"❌ Students query failed: {e}")
            return []

# Global instance
supabase_db = SupabaseDB()

def get_supabase_db() -> SupabaseDB:
    """Get Supabase database instance"""
    return supabase_db
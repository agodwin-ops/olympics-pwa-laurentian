"""
Supabase SDK Client for Olympics PWA
Provides REST API-based database operations bypassing PostgreSQL connection issues
"""

import os
from typing import Optional, Dict, Any, List
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

class OlympicsSupabaseClient:
    """Supabase client wrapper for Olympics PWA operations"""
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not all([self.url, self.anon_key, self.service_key]):
            raise ValueError("Supabase credentials not configured in environment")
        
        # Create clients for different access levels
        self.client = create_client(self.url, self.anon_key)  # For user operations
        self.admin_client = create_client(self.url, self.service_key)  # For admin operations
    
    def is_available(self) -> bool:
        """Check if Supabase is available and tables exist"""
        try:
            # Test basic connectivity
            result = self.admin_client.table('users').select('*').limit(1).execute()
            return True
        except Exception:
            return False
    
    # User Operations
    async def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new user via Supabase SDK"""
        try:
            result = self.admin_client.table('users').insert(user_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Supabase user creation failed: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email via Supabase SDK"""
        try:
            result = self.admin_client.table('users').select('*').eq('email', email).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Supabase user lookup failed: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID via Supabase SDK"""
        try:
            result = self.admin_client.table('users').select('*').eq('id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Supabase user lookup failed: {e}")
            return None
    
    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user via Supabase SDK"""
        try:
            updates['updated_at'] = datetime.utcnow().isoformat()
            result = self.admin_client.table('users').update(updates).eq('id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Supabase user update failed: {e}")
            return None
    
    # Player Stats Operations
    async def get_player_stats(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get player stats via Supabase SDK"""
        try:
            result = self.admin_client.table('player_stats').select('*').eq('user_id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Supabase player stats lookup failed: {e}")
            return None
    
    async def create_player_stats(self, stats_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create player stats via Supabase SDK"""
        try:
            result = self.admin_client.table('player_stats').insert(stats_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Supabase player stats creation failed: {e}")
            return None
    
    async def update_player_stats(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update player stats via Supabase SDK"""
        try:
            updates['updated_at'] = datetime.utcnow().isoformat()
            result = self.admin_client.table('player_stats').update(updates).eq('user_id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Supabase player stats update failed: {e}")
            return None
    
    # Experience Operations
    async def add_experience(self, user_id: str, activity: str, xp_gained: int, description: str = None) -> Optional[Dict[str, Any]]:
        """Add experience entry via Supabase SDK"""
        try:
            xp_entry = {
                'user_id': user_id,
                'activity': activity,
                'xp_gained': xp_gained,
                'description': description,
                'created_at': datetime.utcnow().isoformat()
            }
            result = self.admin_client.table('experience_entries').insert(xp_entry).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"❌ Supabase experience creation failed: {e}")
            return None
    
    async def get_user_experience(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get user experience history via Supabase SDK"""
        try:
            result = self.admin_client.table('experience_entries')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            return result.data or []
        except Exception as e:
            print(f"❌ Supabase experience lookup failed: {e}")
            return []

# Global instance
supabase_client = OlympicsSupabaseClient()

# Test connectivity function
def test_supabase_connectivity():
    """Test if Supabase SDK is working"""
    try:
        available = supabase_client.is_available()
        print(f"🌐 Supabase SDK: {'✅ Available' if available else '❌ Not available'}")
        return available
    except Exception as e:
        print(f"🌐 Supabase SDK: ❌ Error - {e}")
        return False

# Compatibility functions for database.py
def get_supabase_client():
    """Get Supabase client instance"""
    return supabase_client.client

def get_supabase_auth_client():
    """Get Supabase auth client instance"""
    return supabase_client.admin_client
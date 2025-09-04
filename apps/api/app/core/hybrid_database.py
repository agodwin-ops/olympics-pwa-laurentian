"""
Hybrid Database Service for Olympics PWA
Seamlessly switches between SQLite and Supabase SDK based on availability
Provides unified interface for all database operations
"""

import os
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

# Import our existing components
from .database import get_db, engine
from .supabase_client import supabase_client, test_supabase_connectivity
from ..models.olympics import User, PlayerStats, PlayerSkills, PlayerInventory

class HybridDatabaseService:
    """
    Hybrid database service that automatically chooses the best available backend:
    1. Supabase SDK (preferred) - Uses REST API, bypasses connection issues
    2. SQLite (fallback) - Local database with full functionality
    """
    
    def __init__(self):
        self.supabase_available = False
        self.using_supabase = False
        self._check_supabase_availability()
    
    def _check_supabase_availability(self):
        """Check if Supabase is available and has tables"""
        try:
            self.supabase_available = test_supabase_connectivity()
            self.using_supabase = self.supabase_available
            
            if self.using_supabase:
                print("🚀 Hybrid Database: Using Supabase SDK (REST API)")
            else:
                print("🛡️ Hybrid Database: Using SQLite (local fallback)")
                
        except Exception as e:
            print(f"⚠️ Hybrid Database: Supabase check failed, using SQLite: {e}")
            self.supabase_available = False
            self.using_supabase = False
    
    def get_status(self) -> Dict[str, Any]:
        """Get current database status"""
        return {
            "supabase_available": self.supabase_available,
            "using_supabase": self.using_supabase,
            "current_backend": "Supabase SDK" if self.using_supabase else "SQLite",
            "connectivity": "REST API" if self.using_supabase else "Direct file"
        }
    
    # User Operations
    async def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create user with hybrid backend"""
        if self.using_supabase:
            return await supabase_client.create_user(user_data)
        else:
            # Use SQLAlchemy/SQLite
            return self._create_user_sqlite(user_data)
    
    def _create_user_sqlite(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create user in SQLite"""
        try:
            db = next(get_db())
            
            # Create User object
            db_user = User(
                email=user_data['email'],
                username=user_data['username'],
                password_hash=user_data['password_hash'],
                user_program=user_data.get('user_program', ''),
                is_admin=user_data.get('is_admin', False),
                email_verified=user_data.get('email_verified', False),
                profile_picture_url=user_data.get('profile_picture_url')
            )
            
            db.add(db_user)
            db.flush()
            
            # Create associated player data
            player_stats = PlayerStats(user_id=db_user.id)
            player_skills = PlayerSkills(user_id=db_user.id)
            player_inventory = PlayerInventory(user_id=db_user.id)
            
            db.add_all([player_stats, player_skills, player_inventory])
            db.commit()
            db.refresh(db_user)
            
            # Convert to dict
            return {
                'id': str(db_user.id),
                'email': db_user.email,
                'username': db_user.username,
                'user_program': db_user.user_program,
                'is_admin': db_user.is_admin,
                'email_verified': db_user.email_verified,
                'profile_picture_url': db_user.profile_picture_url,
                'created_at': db_user.created_at.isoformat() if db_user.created_at else None,
                'updated_at': db_user.updated_at.isoformat() if db_user.updated_at else None
            }
            
        except Exception as e:
            print(f"❌ SQLite user creation failed: {e}")
            if 'db' in locals():
                db.rollback()
            return None
        finally:
            if 'db' in locals():
                db.close()
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email with hybrid backend"""
        if self.using_supabase:
            return await supabase_client.get_user_by_email(email)
        else:
            return self._get_user_by_email_sqlite(email)
    
    def _get_user_by_email_sqlite(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email from SQLite"""
        try:
            db = next(get_db())
            user = db.query(User).filter(User.email == email).first()
            
            if user:
                return {
                    'id': str(user.id),
                    'email': user.email,
                    'username': user.username,
                    'password_hash': user.password_hash,
                    'user_program': user.user_program,
                    'is_admin': user.is_admin,
                    'email_verified': user.email_verified,
                    'profile_picture_url': user.profile_picture_url,
                    'last_active': user.last_active.isoformat() if user.last_active else None,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'updated_at': user.updated_at.isoformat() if user.updated_at else None
                }
            return None
            
        except Exception as e:
            print(f"❌ SQLite user lookup failed: {e}")
            return None
        finally:
            if 'db' in locals():
                db.close()
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID with hybrid backend"""
        if self.using_supabase:
            return await supabase_client.get_user_by_id(user_id)
        else:
            return self._get_user_by_id_sqlite(user_id)
    
    def _get_user_by_id_sqlite(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID from SQLite"""
        try:
            db = next(get_db())
            user = db.query(User).filter(User.id == user_id).first()
            
            if user:
                return {
                    'id': str(user.id),
                    'email': user.email,
                    'username': user.username,
                    'password_hash': user.password_hash,
                    'user_program': user.user_program,
                    'is_admin': user.is_admin,
                    'email_verified': user.email_verified,
                    'profile_picture_url': user.profile_picture_url,
                    'last_active': user.last_active.isoformat() if user.last_active else None,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'updated_at': user.updated_at.isoformat() if user.updated_at else None
                }
            return None
            
        except Exception as e:
            print(f"❌ SQLite user lookup failed: {e}")
            return None
        finally:
            if 'db' in locals():
                db.close()
    
    async def update_user_last_active(self, user_id: str) -> bool:
        """Update user last active timestamp"""
        if self.using_supabase:
            result = await supabase_client.update_user(user_id, {'last_active': datetime.utcnow().isoformat()})
            return result is not None
        else:
            return self._update_user_last_active_sqlite(user_id)
    
    def _update_user_last_active_sqlite(self, user_id: str) -> bool:
        """Update user last active in SQLite"""
        try:
            db = next(get_db())
            user = db.query(User).filter(User.id == user_id).first()
            
            if user:
                user.last_active = datetime.utcnow()
                db.commit()
                return True
            return False
            
        except Exception as e:
            print(f"❌ SQLite user update failed: {e}")
            return False
        finally:
            if 'db' in locals():
                db.close()
    
    # Player Stats Operations
    async def get_player_stats(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get player stats with hybrid backend"""
        if self.using_supabase:
            return await supabase_client.get_player_stats(user_id)
        else:
            return self._get_player_stats_sqlite(user_id)
    
    def _get_player_stats_sqlite(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get player stats from SQLite"""
        try:
            db = next(get_db())
            stats = db.query(PlayerStats).filter(PlayerStats.user_id == user_id).first()
            
            if stats:
                return {
                    'id': str(stats.id),
                    'user_id': str(stats.user_id),
                    'level': stats.level,
                    'experience_points': stats.experience_points,
                    'gold': stats.gold,
                    'health': stats.health,
                    'max_health': stats.max_health,
                    'energy': stats.energy,
                    'max_energy': stats.max_energy,
                    'strength': stats.strength,
                    'agility': stats.agility,
                    'intelligence': stats.intelligence,
                    'luck': stats.luck,
                    'created_at': stats.created_at.isoformat() if stats.created_at else None,
                    'updated_at': stats.updated_at.isoformat() if stats.updated_at else None
                }
            return None
            
        except Exception as e:
            print(f"❌ SQLite player stats lookup failed: {e}")
            return None
        finally:
            if 'db' in locals():
                db.close()

# Global hybrid database instance
hybrid_db = HybridDatabaseService()

# Convenience function for getting database status
def get_database_status() -> Dict[str, Any]:
    """Get current database backend status"""
    return hybrid_db.get_status()
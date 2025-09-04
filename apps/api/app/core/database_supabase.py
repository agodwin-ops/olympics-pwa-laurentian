"""
Supabase-Only Database Configuration - Multi-User Deployment
Complete replacement for SQLAlchemy database.py
"""

import os
from dotenv import load_dotenv
from .supabase_client import test_supabase_connectivity, get_supabase_client, get_supabase_auth_client

load_dotenv()

# FORCE SUPABASE-ONLY CONFIGURATION - NO SQLITE FALLBACK
print("🚀 SUPABASE-ONLY MULTI-USER DEPLOYMENT MODE")
if not test_supabase_connectivity():
    raise Exception("❌ Supabase SDK not available - Cannot start in multi-user mode")
print("✅ Supabase SDK confirmed - Multi-user deployment ready")

# Supabase client setup for auth and storage
def get_supabase_client_instance():
    """Get Supabase client"""
    return get_supabase_client()

def get_supabase_auth_client_instance():
    """Get Supabase auth client"""
    return get_supabase_auth_client()

# Placeholder for FastAPI dependency compatibility
def get_db():
    """Placeholder - should not be used in Supabase mode"""
    raise Exception("❌ SQLAlchemy get_db() called in Supabase-only mode. Use get_supabase_db() instead.")
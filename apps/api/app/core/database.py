"""
Database Configuration - Supabase Only Mode
Complete migration from SQLAlchemy to Supabase SDK for multi-user deployment
"""

import os
from dotenv import load_dotenv
from .supabase_client import test_supabase_connectivity, get_supabase_client, get_supabase_auth_client

load_dotenv()

# FORCE SUPABASE-ONLY CONFIGURATION - NO SQLITE FALLBACK
print("🚀 FORCING SUPABASE SDK USAGE - MULTI-USER DEPLOYMENT MODE")
if not test_supabase_connectivity():
    raise Exception("❌ Supabase SDK not available - Cannot start in multi-user mode")
print("✅ Supabase SDK confirmed - Starting multi-user deployment")

# Supabase client functions (maintaining compatibility with existing imports)
def get_supabase_client_ref():
    """Get Supabase client"""
    return get_supabase_client()

def get_supabase_auth_client_ref():
    """Get Supabase auth client"""
    return get_supabase_auth_client()

# Dependency replacement - this will cause errors if SQLAlchemy is still used
def get_db():
    """DEPRECATED: This function should not be called in Supabase mode"""
    raise Exception("❌ SQLAlchemy get_db() called in Supabase-only mode. Use get_supabase_db() instead.")
#!/usr/bin/env python3
"""
CORRECTED Olympics PWA Database Schema Setup
Creates tables that the API actually uses (not theoretical ones)
Fixes the mismatch that prevents table editor access
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def get_supabase_client() -> Client:
    """Create Supabase client with service role key"""
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not service_key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    
    return create_client(url, service_key)

def create_actual_olympics_schema():
    """Create the ACTUAL tables that the API code uses (not theoretical ones)"""
    
    print("✅ CORRECTED OLYMPICS PWA DATABASE SCHEMA")
    print("=" * 60)
    print("Creating tables that the API actually uses (analyzed from codebase)")
    print()
    
    # SQL for tables that actually get used by the API
    actual_tables_sql = """
-- 1. Users table (already exists but ensuring correct structure)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_program VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    profile_complete BOOLEAN DEFAULT TRUE,
    profile_picture_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Units table (used by admin_supabase.py)
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Assignments table (heavily used by admin_supabase.py)
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_xp INTEGER DEFAULT 100,
    due_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Player Stats table (enhanced with missing columns API expects)
CREATE TABLE IF NOT EXISTS player_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    gold INTEGER DEFAULT 100,
    gameboard_moves INTEGER DEFAULT 3,
    health INTEGER DEFAULT 100,
    max_health INTEGER DEFAULT 100,
    energy INTEGER DEFAULT 100,
    max_energy INTEGER DEFAULT 100,
    strength INTEGER DEFAULT 10,
    agility INTEGER DEFAULT 10,
    intelligence INTEGER DEFAULT 10,
    luck INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 5. XP Entries table (API uses 'xp_entries' not 'experience_entries')
CREATE TABLE IF NOT EXISTS xp_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    xp_amount INTEGER NOT NULL,
    description TEXT,
    activity_type VARCHAR(100) DEFAULT 'assignment',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Lectures table (used by admin_supabase.py and main_olympics_only.py)
CREATE TABLE IF NOT EXISTS lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Lecture Resources table (used by main_olympics_only.py)
CREATE TABLE IF NOT EXISTS lecture_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default units that the system expects
INSERT INTO units (name, description, order_index) 
VALUES 
    ('Getting Started', 'Introduction to the Olympics PWA system', 1),
    ('Basic Skills', 'Fundamental skills and knowledge development', 2), 
    ('Advanced Challenges', 'Complex assignments and projects', 3),
    ('Final Projects', 'Culminating assignments and comprehensive assessments', 4)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_resources ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (allows API operations)
CREATE POLICY "Service role can do anything on users" ON users FOR ALL USING (true);
CREATE POLICY "Service role can do anything on units" ON units FOR ALL USING (true);
CREATE POLICY "Service role can do anything on assignments" ON assignments FOR ALL USING (true);
CREATE POLICY "Service role can do anything on player_stats" ON player_stats FOR ALL USING (true);
CREATE POLICY "Service role can do anything on xp_entries" ON xp_entries FOR ALL USING (true);
CREATE POLICY "Service role can do anything on lectures" ON lectures FOR ALL USING (true);
CREATE POLICY "Service role can do anything on lecture_resources" ON lecture_resources FOR ALL USING (true);
"""

    print("📋 COPY AND PASTE THIS SQL INTO SUPABASE DASHBOARD:")
    print("=" * 60)
    print("1. Go to your Supabase Dashboard")
    print("2. Navigate to SQL Editor")
    print("3. Paste the following SQL and run it:")
    print("=" * 60)
    print()
    print(actual_tables_sql)
    print("=" * 60)
    print()
    print("🎯 This creates ALL tables the API actually needs!")
    print("✅ Fixes table editor access issues")
    print("✅ Enables proper RLS policies for API access")
    print("✅ Includes default units data")
    print("✅ Matches exactly what the codebase expects")
    
    return True

def verify_api_expectations():
    """Show what the API expects vs what was previously created"""
    print("\n🔍 API EXPECTATIONS ANALYSIS")
    print("=" * 50)
    
    expected_by_api = [
        "users - ✅ Core user authentication and profiles",
        "player_stats - ✅ Game progression (needs total_xp, gameboard_moves columns)",
        "units - ✅ Course/quest organization",  
        "assignments - ✅ Admin-created assignments",
        "xp_entries - ✅ Experience point tracking (NOT experience_entries)",
        "lectures - ❌ MISSING - Admin resource management",
        "lecture_resources - ❌ MISSING - File attachments for lectures"
    ]
    
    print("TABLES THE API ACTUALLY USES:")
    for table in expected_by_api:
        print(f"  • {table}")
    
    print(f"\n🚨 WRONG TABLES IN ORIGINAL SCHEMA:")
    wrong_tables = [
        "experience_entries - API uses 'xp_entries' instead",
        "player_skills - Not used anywhere in API code", 
        "player_inventory - Not used anywhere in API code",
        "game_events - Not used anywhere in API code"
    ]
    
    for table in wrong_tables:
        print(f"  • {table}")
    
    print(f"\n💡 ROOT CAUSE:")
    print(f"  The original schema was designed theoretically")
    print(f"  But the API implementation uses different table names")
    print(f"  This is why table editors don't appear - tables don't exist!")

def main():
    """Generate corrected schema that matches API expectations"""
    print("🛠️ OLYMPICS PWA SCHEMA CORRECTION TOOL")
    print("Generates SQL that creates tables the API actually uses")
    print()
    
    # Show the problem
    verify_api_expectations()
    
    # Provide the solution
    create_actual_olympics_schema()
    
    print(f"\n{'='*60}")
    print("🎯 NEXT STEPS TO FIX TABLE EDITOR ISSUES:")
    print("1. Copy the SQL above into Supabase SQL Editor") 
    print("2. Execute the SQL to create missing tables")
    print("3. Verify all tables appear in Table Editor")
    print("4. Test API endpoints to confirm functionality")
    print("5. All features should now have proper table editor access!")

if __name__ == "__main__":
    main()
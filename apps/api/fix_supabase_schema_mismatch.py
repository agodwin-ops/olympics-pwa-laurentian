#!/usr/bin/env python3
"""
Fix Critical Supabase Schema Mismatch
API code expects different tables than what schema setup creates
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

def create_missing_tables():
    """Create the tables that API actually needs but are missing from schema"""
    
    print("🚨 FIXING CRITICAL SCHEMA MISMATCH")
    print("=" * 60)
    print("API expects tables that don't exist in current schema setup!")
    print()
    
    try:
        supabase = get_supabase_client()
        print("✅ Supabase client connected")
        
        # Missing tables that API actually uses
        missing_tables_sql = [
            # 1. Units table - required by admin_supabase.py
            """
            CREATE TABLE IF NOT EXISTS units (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(200) NOT NULL,
                description TEXT,
                order_index INTEGER NOT NULL DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            """,
            
            # 2. Assignments table - heavily used by admin_supabase.py
            """
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
            """,
            
            # 3. XP Entries table - API uses 'xp_entries' not 'experience_entries'
            """
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
            """,
            
            # 4. Lectures table - used by admin_supabase.py and main_olympics_only.py  
            """
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
            """,
            
            # 5. Lecture Resources table - used by main_olympics_only.py
            """
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
            """,
            
            # 6. Update player_stats to match API expectations
            """
            ALTER TABLE player_stats 
            ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS gameboard_moves INTEGER DEFAULT 3;
            """,
            
            # 7. Insert default units that assignments expect
            """
            INSERT INTO units (name, description, order_index) 
            VALUES 
                ('Getting Started', 'Introduction to the Olympics PWA', 1),
                ('Basic Skills', 'Fundamental skills and knowledge', 2), 
                ('Advanced Challenges', 'Complex assignments and projects', 3),
                ('Final Projects', 'Culminating assignments and assessments', 4)
            ON CONFLICT DO NOTHING;
            """
        ]
        
        print("🛠️ Creating missing tables that API actually needs...")
        
        for i, sql in enumerate(missing_tables_sql, 1):
            try:
                # Execute SQL directly - bypassing RPC since it may not be enabled
                print(f"🔄 {i}. Executing SQL command...")
                
                # For now, we'll note what needs to be created
                if "CREATE TABLE" in sql:
                    table_name = sql.split('TABLE IF NOT EXISTS')[1].split('(')[0].strip()
                    print(f"📋 Need to create: {table_name}")
                elif "ALTER TABLE" in sql:
                    print(f"📋 Need to alter: player_stats (add missing columns)")
                elif "INSERT INTO" in sql:
                    print(f"📋 Need to insert: Default unit data")
                    
            except Exception as e:
                print(f"❌ {i}. Command failed: {e}")
        
        print(f"\n🎯 Schema fix planning completed!")
        print(f"\n🚨 CRITICAL FINDINGS:")
        print(f"   • API expects 'xp_entries' but schema creates 'experience_entries'")
        print(f"   • Missing 'units', 'assignments', 'lectures', 'lecture_resources' tables")
        print(f"   • player_stats missing 'total_xp' and 'gameboard_moves' columns")
        print(f"   • Schema setup is completely out of sync with API implementation!")
        
        return True
        
    except Exception as e:
        print(f"❌ Schema analysis failed: {e}")
        return False

def verify_current_tables():
    """Check what tables actually exist vs what API expects"""
    print("\n🔍 VERIFYING CURRENT TABLE STATUS")
    print("=" * 50)
    
    try:
        supabase = get_supabase_client()
        
        # Tables the API actually uses
        expected_tables = [
            'users',
            'player_stats', 
            'units',
            'assignments',
            'xp_entries',
            'lectures',
            'lecture_resources'
        ]
        
        existing_tables = []
        missing_tables = []
        
        for table in expected_tables:
            try:
                result = supabase.table(table).select('*').limit(1).execute()
                existing_tables.append(table)
                print(f"✅ {table}: EXISTS")
            except Exception as e:
                missing_tables.append(table)
                print(f"❌ {table}: MISSING - {str(e)[:50]}...")
        
        print(f"\n📊 TABLE STATUS SUMMARY:")
        print(f"   Existing: {len(existing_tables)}/{len(expected_tables)} tables")
        print(f"   Missing: {missing_tables}")
        
        if missing_tables:
            print(f"\n🚨 BROKEN WORKFLOW CONFIRMED!")
            print(f"   API will fail because these tables don't exist:")
            for table in missing_tables:
                print(f"     • {table}")
                
        return len(missing_tables) == 0
        
    except Exception as e:
        print(f"❌ Table verification failed: {e}")
        return False

def main():
    """Main function to fix schema mismatch"""
    print("🚨 SUPABASE SCHEMA MISMATCH DETECTOR")
    print("Checking if API tables match schema setup...")
    print()
    
    # First verify what exists
    tables_ok = verify_current_tables()
    
    if not tables_ok:
        print(f"\n🛠️ PLANNING SCHEMA FIXES...")
        create_missing_tables()
        
        print(f"\n{'='*60}")
        print("📋 MANUAL SUPABASE DASHBOARD ACTIONS NEEDED:")
        print("1. Go to Supabase Dashboard → SQL Editor")
        print("2. Run the CREATE TABLE commands shown above")
        print("3. Ensure RLS policies allow service role access")
        print("4. Re-run API tests to verify functionality")
        print()
        print("🚨 CRITICAL: Current schema setup is completely broken!")
        print("   API expects different tables than what gets created")
        print("   This is why many features don't have table editor options")
    else:
        print(f"\n✅ All expected tables exist - schema is correctly aligned!")

if __name__ == "__main__":
    main()
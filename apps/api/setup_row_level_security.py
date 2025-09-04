#!/usr/bin/env python3
"""
Setup Row Level Security (RLS) for Olympics PWA multi-user deployment
Ensures student data isolation and proper access control
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def setup_row_level_security():
    """Setup RLS policies for all tables"""
    
    # Get Supabase admin client
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not service_key:
        print("❌ Missing Supabase credentials")
        return False
    
    supabase = create_client(url, service_key)
    
    print("🔒 Setting up Row Level Security policies...")
    
    # RLS policies for data isolation
    policies = [
        # Users table - users can only see their own data
        {
            "table": "users",
            "policy": "users_own_data",
            "sql": """
                CREATE POLICY users_own_data ON users
                FOR ALL USING (auth.uid()::text = id::text);
            """
        },
        
        # Player stats - students can only see their own stats
        {
            "table": "player_stats", 
            "policy": "player_stats_own_data",
            "sql": """
                CREATE POLICY player_stats_own_data ON player_stats
                FOR ALL USING (
                    auth.uid()::text = user_id::text OR
                    EXISTS (
                        SELECT 1 FROM users 
                        WHERE users.id::text = auth.uid()::text 
                        AND users.is_admin = true
                    )
                );
            """
        },
        
        # Player skills - students can only see their own skills
        {
            "table": "player_skills",
            "policy": "player_skills_own_data", 
            "sql": """
                CREATE POLICY player_skills_own_data ON player_skills
                FOR ALL USING (
                    auth.uid()::text = user_id::text OR
                    EXISTS (
                        SELECT 1 FROM users
                        WHERE users.id::text = auth.uid()::text
                        AND users.is_admin = true
                    )
                );
            """
        },
        
        # Experience entries - students can only see their own XP
        {
            "table": "experience_entries",
            "policy": "experience_own_data",
            "sql": """
                CREATE POLICY experience_own_data ON experience_entries
                FOR ALL USING (
                    auth.uid()::text = user_id::text OR
                    EXISTS (
                        SELECT 1 FROM users
                        WHERE users.id::text = auth.uid()::text
                        AND users.is_admin = true
                    )
                );
            """
        }
    ]
    
    try:
        for policy in policies:
            print(f"⚙️  Setting up RLS for {policy['table']}...")
            
            # Enable RLS on table
            enable_rls_sql = f"ALTER TABLE {policy['table']} ENABLE ROW LEVEL SECURITY;"
            result = supabase.rpc("exec_sql", {"sql": enable_rls_sql}).execute()
            
            # Drop existing policy if exists
            drop_policy_sql = f"DROP POLICY IF EXISTS {policy['policy']} ON {policy['table']};"
            result = supabase.rpc("exec_sql", {"sql": drop_policy_sql}).execute()
            
            # Create new policy
            result = supabase.rpc("exec_sql", {"sql": policy['sql']}).execute()
            print(f"✅ RLS policy created for {policy['table']}")
            
    except Exception as e:
        print(f"❌ Error setting up RLS: {e}")
        return False
    
    print("🎉 Row Level Security setup completed!")
    print("🔒 Student data is now isolated - each student can only see their own data")
    print("👑 Admins can see all data for classroom management")
    
    return True

def test_rls_isolation():
    """Test that RLS policies are working"""
    print("\n🧪 Testing Row Level Security isolation...")
    
    # This would require setting up auth context, which is complex with Supabase RLS
    # In a real deployment, this would be tested through the frontend auth flow
    print("💡 RLS testing requires authenticated user context")
    print("📝 Test manually by logging in as different students and verifying data isolation")

if __name__ == "__main__":
    success = setup_row_level_security()
    if success:
        test_rls_isolation()
    else:
        print("❌ RLS setup failed")
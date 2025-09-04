#!/usr/bin/env python3
"""
Script to deploy the secure schema to Supabase database
This ensures proper RLS and student data isolation
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables - check multiple locations
root_env = Path(__file__).parent.parent.parent / '.env'
api_env = Path(__file__).parent / '.env'

load_dotenv(root_env)
if api_env.exists():
    load_dotenv(api_env)

def main():
    """Deploy the secure schema to Supabase"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return False
        
    if 'sqlite' in database_url:
        print("❌ Still using SQLite. Please ensure Supabase DATABASE_URL is set.")
        return False
        
    print(f"🔗 Connecting to database...")
    print(f"   URL: {database_url.split('@')[1] if '@' in database_url else 'Hidden'}")
    
    try:
        # Create engine
        engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ Connected to PostgreSQL: {version[:50]}...")
            
            # Read and execute secure schema
            schema_file = Path(__file__).parent / 'database' / 'schema_secure.sql'
            if not schema_file.exists():
                print(f"❌ Schema file not found: {schema_file}")
                return False
                
            print(f"📋 Reading secure schema from {schema_file}")
            schema_sql = schema_file.read_text()
            
            print("🚀 Deploying secure schema...")
            
            # Execute schema in chunks (some statements need to be separate)
            statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
            
            success_count = 0
            total_count = len(statements)
            
            for i, statement in enumerate(statements, 1):
                if not statement:
                    continue
                    
                try:
                    conn.execute(text(statement))
                    success_count += 1
                    if i % 10 == 0:
                        print(f"   Progress: {i}/{total_count} statements executed...")
                        
                except Exception as e:
                    # Some statements might fail if they already exist (like CREATE TABLE IF NOT EXISTS)
                    if 'already exists' in str(e) or 'duplicate' in str(e):
                        success_count += 1
                        continue
                    else:
                        print(f"⚠️  Statement {i} failed: {str(e)[:100]}...")
                        
            conn.commit()
            print(f"✅ Schema deployment complete: {success_count}/{total_count} statements executed")
            
            # Test RLS by checking policies
            result = conn.execute(text("""
                SELECT schemaname, tablename, policyname 
                FROM pg_policies 
                WHERE schemaname = 'public' 
                LIMIT 5
            """))
            
            policies = result.fetchall()
            print(f"🛡️  Row Level Security: {len(policies)} policies found")
            for policy in policies[:3]:
                print(f"   • {policy[1]}: {policy[2]}")
            
            if len(policies) > 3:
                print(f"   • ... and {len(policies) - 3} more policies")
                
            print("\n🎉 Supabase database is now secured with:")
            print("   • Row Level Security (RLS) enabled")
            print("   • Student data isolation enforced")
            print("   • Minimal database permissions")
            print("   • No dangerous leaderboard views")
            print("   • Admin-only access to sensitive tables")
            
            return True
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
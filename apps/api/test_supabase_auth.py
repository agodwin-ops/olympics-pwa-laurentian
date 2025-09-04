#!/usr/bin/env python3
"""
Systematic Supabase Pooler Authentication Tester
Tests different authentication formats to find the working one
"""

import os
import sys
from urllib.parse import quote_plus

# Add current directory to path
sys.path.append('.')

def test_auth_format(format_name: str, database_url: str, description: str):
    """Test a specific authentication format"""
    print(f"\n{'='*60}")
    print(f"🧪 Testing {format_name}: {description}")
    print(f"📋 URL: {database_url[:80]}...")
    print('='*60)
    
    try:
        from app.core.connection_helper import create_wsl2_optimized_engine
        from sqlalchemy import text
        
        # Create engine with WSL2 optimization
        engine = create_wsl2_optimized_engine(database_url)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text('SELECT 1 as test, now() as current_time')).fetchone()
            print(f'✅ {format_name} SUCCESS!')
            print(f'🎉 Query result: test={result[0]}, time={result[1]}')
            
            # Test database info
            version_result = conn.execute(text('SELECT version()')).fetchone()
            print(f'🗄️ Database: {version_result[0][:50]}...')
            
            return True
            
    except Exception as e:
        error_msg = str(e)
        print(f'❌ {format_name} FAILED: {error_msg[:100]}...')
        
        if 'Tenant or user not found' in error_msg:
            print('🔍 Authentication format incorrect')
        elif 'connection' in error_msg.lower():
            print('🔍 Network connectivity issue')
        else:
            print(f'🔍 Other error: {error_msg}')
        
        return False

def main():
    print("🔐 SUPABASE POOLER AUTHENTICATION TESTER")
    print("Testing different authentication formats systematically")
    print(f"IPv4 pooler connectivity: ✅ WORKING (44.208.221.186:5432)")
    
    # Project configuration
    project_ref = "gcxryuuggxnnitesxzpq"
    password = "T8H^df4RT1!"  # Raw password
    encoded_password = quote_plus(password)  # URL-encoded password
    service_role_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeHJ5dXVnZ3hudml0ZXN4enBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDkzNjM5NCwiZXhwIjoyMDQwNTEyMzk0fQ.oCGDdcNL-T1pHDhJYZDJiKV6eFBczEjjmMqKIrHf-KE"
    
    pooler_host = "aws-0-us-east-1.pooler.supabase.com"
    
    # Format A: postgres.project:password (current failing format)
    format_a = f"postgresql://postgres.{project_ref}:{encoded_password}@{pooler_host}:5432/postgres?sslmode=require"
    
    # Format B: postgres:password with project parameter
    format_b = f"postgresql://postgres:{encoded_password}@{pooler_host}:5432/postgres?sslmode=require&options=project%3D{project_ref}"
    
    # Format C: Simple postgres:password (no project info)
    format_c = f"postgresql://postgres:{encoded_password}@{pooler_host}:5432/postgres?sslmode=require"
    
    # Format D: Role-based username
    format_d = f"postgresql://service_role.{project_ref}:{encoded_password}@{pooler_host}:5432/postgres?sslmode=require"
    
    # Format E: Using service role key as password
    format_e = f"postgresql://postgres:{service_role_key}@{pooler_host}:5432/postgres?sslmode=require"
    
    # Format F: Project as database name
    format_f = f"postgresql://postgres:{encoded_password}@{pooler_host}:5432/{project_ref}?sslmode=require"
    
    # Test each format
    formats_to_test = [
        ("Format A", format_a, "postgres.project:password (currently failing)"),
        ("Format B", format_b, "postgres:password with project parameter"),
        ("Format C", format_c, "Simple postgres:password"),
        ("Format D", format_d, "service_role.project:password"),
        ("Format E", format_e, "postgres with service_role key as password"),
        ("Format F", format_f, "postgres:password with project as database name"),
    ]
    
    successful_formats = []
    
    for format_name, url, description in formats_to_test:
        if test_auth_format(format_name, url, description):
            successful_formats.append(format_name)
            print(f"\n🎯 WORKING FORMAT FOUND: {format_name}")
            print("Stopping tests - using first working format")
            break
    
    print(f"\n{'='*60}")
    print("📊 AUTHENTICATION TEST RESULTS")
    print('='*60)
    
    if successful_formats:
        print(f"✅ Working formats: {', '.join(successful_formats)}")
        print("🎉 Supabase pooler authentication resolved!")
    else:
        print("❌ No working authentication formats found")
        print("💡 May need to check Supabase project settings or try additional formats")

if __name__ == "__main__":
    main()
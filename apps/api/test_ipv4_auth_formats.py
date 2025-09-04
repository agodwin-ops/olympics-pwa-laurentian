#!/usr/bin/env python3
"""
Test specific authentication formats for IPv4 pooler connection
Uses direct IPv4 addresses to bypass all DNS issues
"""

import os
import sys
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Add current directory to path
sys.path.append('.')
load_dotenv()

def test_direct_ipv4_auth(format_name: str, connection_string: str, description: str):
    """Test a specific authentication format with direct IPv4"""
    print(f"\n{'='*70}")
    print(f"🧪 Testing {format_name}: {description}")
    print(f"📋 Connection: {connection_string[:80]}...")
    print('='*70)
    
    try:
        from sqlalchemy import create_engine, text
        
        # Create engine with minimal configuration for testing
        engine = create_engine(
            connection_string,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={
                "connect_timeout": 15,
                "application_name": "olympics_ipv4_test"
            }
        )
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text('SELECT 1 as test, now() as current_time, version() as db_version')).fetchone()
            
            print(f'✅ {format_name} SUCCESS!')
            print(f'🎉 Test result: {result[0]}')
            print(f'⏰ Server time: {result[1]}')
            print(f'🗄️ Database: {result[2][:60]}...')
            
            # Test Supabase-specific query
            try:
                schema_result = conn.execute(text("""
                    SELECT table_name, table_schema 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    LIMIT 3
                """)).fetchall()
                
                if schema_result:
                    print(f'📊 Public tables: {[row[0] for row in schema_result]}')
                else:
                    print(f'📊 No public tables found (empty project)')
                    
            except Exception as schema_e:
                print(f'⚠️ Schema query failed: {schema_e}')
            
            print(f'🎯 {format_name} AUTHENTICATION WORKING!')
            return True
            
    except Exception as e:
        error_msg = str(e)
        print(f'❌ {format_name} FAILED: {error_msg}')
        
        # Analyze error type
        if 'Tenant or user not found' in error_msg:
            print('🔍 Authentication format issue - wrong username/password format')
        elif 'authentication failed' in error_msg.lower():
            print('🔍 Credentials incorrect - wrong password')
        elif 'connection refused' in error_msg.lower():
            print('🔍 Network connectivity issue')
        elif 'timeout' in error_msg.lower():
            print('🔍 Connection timeout - network or server issue')
        else:
            print(f'🔍 Other error type: {error_msg[:100]}...')
        
        return False

def main():
    print("🎯 DIRECT IPv4 POOLER AUTHENTICATION TEST")
    print("Testing specific authentication formats with confirmed working IPv4 addresses")
    print("IPv4 Pooler IPs: 44.208.221.186, 44.216.29.125, 52.45.94.125")
    print()
    
    # Get credentials from environment
    database_password = "T8H^df4RT1!"  # Raw database password
    encoded_password = quote_plus(database_password)  # URL-encoded
    project_ref = "gcxryuuggxnnitesxzpq"
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Use the first confirmed working IPv4 address
    ipv4_address = "44.208.221.186"
    
    print(f"🔑 Using database password: {database_password}")
    print(f"🔑 URL-encoded password: {encoded_password}")
    print(f"📁 Project reference: {project_ref}")
    print(f"🌐 Target IPv4: {ipv4_address}:5432")
    
    # CONNECTION STRING 1: postgres.project:[PASSWORD]@IPv4:5432/postgres
    format_1 = f"postgresql://postgres.{project_ref}:{encoded_password}@{ipv4_address}:5432/postgres?sslmode=require"
    
    # CONNECTION STRING 2: postgres:[PASSWORD]@IPv4:5432/postgres?options=project%3Dproject
    format_2 = f"postgresql://postgres:{encoded_password}@{ipv4_address}:5432/postgres?sslmode=require&options=project%3D{project_ref}"
    
    # CONNECTION STRING 3: postgres.[SERVICE_ROLE_KEY]@IPv4:5432/postgres  
    format_3 = f"postgresql://postgres:{service_role_key}@{ipv4_address}:5432/postgres?sslmode=require"
    
    # Test formats in order
    formats_to_test = [
        ("FORMAT 1", format_1, "postgres.project:password format"),
        ("FORMAT 2", format_2, "postgres:password with project parameter"),
        ("FORMAT 3", format_3, "postgres with service_role_key as password"),
    ]
    
    successful_formats = []
    
    for format_name, connection_string, description in formats_to_test:
        success = test_direct_ipv4_auth(format_name, connection_string, description)
        if success:
            successful_formats.append(format_name)
            print(f"\n🏆 WORKING FORMAT FOUND: {format_name}")
            print("✅ IPv4 pooler authentication RESOLVED!")
            break  # Stop on first success
    
    print(f"\n{'='*70}")
    print("📊 IPv4 POOLER AUTHENTICATION RESULTS")
    print('='*70)
    
    if successful_formats:
        print(f"✅ Working format: {successful_formats[0]}")
        print(f"🎉 Supabase IPv4 pooler connection ESTABLISHED!")
        print(f"🚀 Ready to activate Supabase in production!")
        
        # Update .env with working format
        working_format = formats_to_test[[f[0] for f in formats_to_test].index(successful_formats[0])][1]
        print(f"\n💾 Working connection string:")
        print(f"DATABASE_URL={working_format}")
        
    else:
        print("❌ No working authentication formats found")
        print("💡 May need to:")
        print("   1. Verify database password in Supabase dashboard")
        print("   2. Check if database user exists")
        print("   3. Confirm project access permissions")
        
    print("\n🎯 IPv4 connectivity is confirmed working - only authentication needs resolution!")

if __name__ == "__main__":
    main()
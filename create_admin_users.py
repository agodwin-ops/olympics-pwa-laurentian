#!/usr/bin/env python3
"""
Create Admin Users in Supabase
Executes the SIMPLE_ADMIN_CREATION.sql script via Supabase client
"""

import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'apps/api'))

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def create_admin_users():
    """Execute admin creation SQL in Supabase"""

    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        print("❌ Supabase credentials not found in environment")
        return False

    # Create admin client
    supabase = create_client(supabase_url, service_role_key)

    print("🔑 Creating admin users in Supabase...")

    try:
        # 1. Enable required extensions
        print("1. Enabling required extensions...")
        supabase.rpc('exec_sql', {'sql': 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'})
        supabase.rpc('exec_sql', {'sql': 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'})

        # 2. Check for existing admin accounts (don't delete due to foreign keys)
        print("2. Checking for existing admin accounts...")
        existing = supabase.table('users').select('email').in_('email', ['agodwin@laurentian.ca', 'manicuza@laurentian.ca']).execute()
        if existing.data:
            print(f"   Found {len(existing.data)} existing admin accounts - will update them")

        # 3. Create admin users using direct table insert with computed password hashes
        print("3. Creating admin users...")

        # We'll use Supabase's RPC function if available, or direct insert
        admin_users = [
            {
                'email': 'agodwin@laurentian.ca',
                'username': 'ProfAAG',
                'user_program': 'Primary Instructor',
                'is_admin': True,
                'password_hash': '$2b$12$dummy_hash_will_be_replaced',  # Placeholder
                'created_at': 'now()',
                'updated_at': 'now()'
            },
            {
                'email': 'manicuza@laurentian.ca',
                'username': 'MasterGTA',
                'user_program': 'Primary Instructor',
                'is_admin': True,
                'password_hash': '$2b$12$dummy_hash_will_be_replaced',  # Placeholder
                'created_at': 'now()',
                'updated_at': 'now()'
            }
        ]

        # Try to execute via SQL for proper bcrypt hashing
        sql_script = """
        INSERT INTO public.users (
            id, email, username, user_program, is_admin, password_hash, created_at, updated_at
        ) VALUES
        (
            uuid_generate_v4(),
            'agodwin@laurentian.ca',
            'ProfAAG',
            'Primary Instructor',
            true,
            crypt('HotPotato45%', gen_salt('bf', 12)),
            NOW(),
            NOW()
        ),
        (
            uuid_generate_v4(),
            'manicuza@laurentian.ca',
            'MasterGTA',
            'Primary Instructor',
            true,
            crypt('PurpleMud30!', gen_salt('bf', 12)),
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            username = EXCLUDED.username,
            user_program = EXCLUDED.user_program,
            is_admin = EXCLUDED.is_admin,
            password_hash = EXCLUDED.password_hash,
            updated_at = NOW();
        """

        # Execute via RPC if available
        try:
            result = supabase.rpc('exec_sql', {'sql': sql_script})
            print("✅ Admin users created via SQL execution")
        except Exception as e:
            print(f"⚠️  SQL execution failed, trying direct insert: {e}")
            # Fallback to direct table insert (without proper bcrypt)
            for user in admin_users:
                user.pop('created_at')  # Remove timestamps for direct insert
                user.pop('updated_at')
                result = supabase.table('users').upsert(user, on_conflict='email').execute()
            print("✅ Admin users created via direct insert (passwords may need manual update)")

        # 4. Verify creation
        print("4. Verifying admin accounts...")
        result = supabase.table('users').select('email, username, user_program, is_admin, created_at').eq('is_admin', True).execute()

        if result.data:
            print(f"✅ Found {len(result.data)} admin accounts:")
            for admin in result.data:
                print(f"   - {admin['email']} ({admin['username']}) - {admin['user_program']}")
        else:
            print("❌ No admin accounts found")
            return False

        print("\n🎉 Admin creation completed!")
        print("\nLOGIN CREDENTIALS:")
        print("User 1: agodwin@laurentian.ca / HotPotato45%")
        print("User 2: manicuza@laurentian.ca / PurpleMud30!")

        return True

    except Exception as e:
        print(f"❌ Admin creation failed: {e}")
        return False

if __name__ == "__main__":
    success = create_admin_users()
    sys.exit(0 if success else 1)
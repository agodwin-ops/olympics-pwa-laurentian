#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to Supabase
Run this once Supabase connectivity is restored
"""

import sqlite3
import sys
import os
from pathlib import Path

# Add the API directory to Python path
api_dir = Path(__file__).parent / "apps/api"
sys.path.append(str(api_dir))

def migrate_sqlite_to_supabase():
    """Migrate user data from SQLite to Supabase"""
    
    print("🔄 Starting SQLite to Supabase migration...")
    
    # Check if SQLite database exists
    sqlite_db = "olympics_local.db"
    if not os.path.exists(sqlite_db):
        print("❌ SQLite database not found!")
        return False
    
    try:
        # Connect to SQLite
        sqlite_conn = sqlite3.connect(sqlite_db)
        sqlite_cursor = sqlite_conn.cursor()
        
        # Get all users from SQLite
        sqlite_cursor.execute("""
            SELECT id, email, username, password_hash, user_program, is_admin, 
                   email_verified, profile_picture_url, created_at, updated_at 
            FROM users
        """)
        users = sqlite_cursor.fetchall()
        
        if not users:
            print("ℹ️ No users found in SQLite database")
            sqlite_conn.close()
            return True
            
        print(f"📊 Found {len(users)} users in SQLite")
        
        # Import Supabase connection (this will test connectivity)
        from app.core.database import engine
        from sqlalchemy.orm import sessionmaker
        from app.models.olympics import User
        
        # Test Supabase connection
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        print("✅ Supabase connection successful!")
        
        # Create session for Supabase
        Session = sessionmaker(bind=engine)
        supabase_session = Session()
        
        # Migrate each user
        migrated_count = 0
        for user_data in users:
            user_id, email, username, password_hash, user_program, is_admin, email_verified, profile_picture_url, created_at, updated_at = user_data
            
            # Check if user already exists in Supabase
            existing_user = supabase_session.query(User).filter(
                (User.email == email) | (User.username == username)
            ).first()
            
            if existing_user:
                print(f"⚠️ User {username} ({email}) already exists in Supabase - skipping")
                continue
                
            # Create new user in Supabase
            new_user = User(
                id=user_id,
                email=email,
                username=username,
                password_hash=password_hash,
                user_program=user_program,
                is_admin=bool(is_admin),
                email_verified=bool(email_verified),
                profile_picture_url=profile_picture_url
            )
            
            supabase_session.add(new_user)
            migrated_count += 1
            print(f"✅ Migrated user: {username} ({email})")
        
        # Commit all changes
        supabase_session.commit()
        supabase_session.close()
        sqlite_conn.close()
        
        print(f"🎉 Migration completed! {migrated_count} users migrated to Supabase")
        
        # Optionally backup SQLite file
        backup_file = f"olympics_local_backup_{int(time.time())}.db"
        import shutil
        shutil.copy2(sqlite_db, backup_file)
        print(f"💾 SQLite backup saved as: {backup_file}")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False


if __name__ == "__main__":
    import time
    
    print("=" * 60)
    print("🗄️  SQLITE TO SUPABASE MIGRATION TOOL")
    print("=" * 60)
    
    success = migrate_sqlite_to_supabase()
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("You can now restart the API server and it will connect to Supabase.")
    else:
        print("\n❌ Migration failed!")
        print("Please check the error messages above and try again.")
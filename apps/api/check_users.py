#!/usr/bin/env python3
"""
Simple script to check registered users in the Olympics database
"""
import sqlite3
from datetime import datetime

def check_database():
    db_path = "olympics_local.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all users
        cursor.execute("""
            SELECT email, username, user_program, is_admin, created_at, last_active 
            FROM users 
            ORDER BY created_at DESC
        """)
        
        users = cursor.fetchall()
        
        print("🏔️ Olympics PWA - Registered Users")
        print("=" * 60)
        
        if not users:
            print("No users registered yet.")
        else:
            print(f"Total Users: {len(users)}")
            print()
            
            for i, user in enumerate(users, 1):
                email, username, program, is_admin, created_at, last_active = user
                admin_badge = "👑 ADMIN" if is_admin else "👤 Student"
                
                print(f"{i}. {admin_badge}")
                print(f"   📧 Email: {email}")
                print(f"   👤 Username: {username}")
                print(f"   🎓 Program: {program}")
                print(f"   📅 Registered: {created_at}")
                print(f"   🕐 Last Active: {last_active}")
                print()
        
        # Get player stats count
        cursor.execute("SELECT COUNT(*) FROM player_stats")
        stats_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM player_skills")
        skills_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM player_inventory")
        inventory_count = cursor.fetchone()[0]
        
        print("📊 Player Data Summary")
        print("-" * 30)
        print(f"Player Stats: {stats_count}")
        print(f"Player Skills: {skills_count}")
        print(f"Player Inventory: {inventory_count}")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    except FileNotFoundError:
        print(f"❌ Database file not found: {db_path}")
        print("Make sure the API server has been started at least once.")

if __name__ == "__main__":
    check_database()
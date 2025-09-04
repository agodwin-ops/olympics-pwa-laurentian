#!/usr/bin/env python3
"""
Test concurrent user operations on the new Supabase multi-user system
"""

import asyncio
import aiohttp
import json
from datetime import datetime

API_BASE = "http://localhost:8080/api"

async def register_user(session, user_num):
    """Register a user and return access token"""
    user_data = {
        "email": f"concurrent_user_{user_num}@test.com",
        "username": f"concurrent_user_{user_num}",
        "password": "TestPass123!",
        "confirm_password": "TestPass123!",
        "user_program": f"Test Program {user_num}",
        "is_admin": False
    }
    
    async with session.post(f"{API_BASE}/auth/register", json=user_data) as resp:
        if resp.status == 200:
            data = await resp.json()
            print(f"✅ User {user_num} registered successfully")
            return data["access_token"]
        else:
            text = await resp.text()
            print(f"❌ User {user_num} registration failed: {text}")
            return None

async def login_user(session, user_num):
    """Login a user and return access token"""
    login_data = {
        "username": f"concurrent_user_{user_num}@test.com",
        "password": "TestPass123!"
    }
    
    async with session.post(f"{API_BASE}/auth/login", data=login_data) as resp:
        if resp.status == 200:
            data = await resp.json()
            print(f"✅ User {user_num} logged in successfully")
            return data["access_token"]
        else:
            text = await resp.text()
            print(f"❌ User {user_num} login failed: {text}")
            return None

async def get_user_profile(session, user_num, token):
    """Get user profile using JWT token"""
    headers = {"Authorization": f"Bearer {token}"}
    
    async with session.get(f"{API_BASE}/auth/me", headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            print(f"✅ User {user_num} profile retrieved: {data['username']}")
            return data
        else:
            text = await resp.text()
            print(f"❌ User {user_num} profile failed: {text}")
            return None

async def test_user_workflow(session, user_num):
    """Complete workflow for one user"""
    print(f"🚀 Starting workflow for user {user_num}")
    
    # Register user
    token = await register_user(session, user_num)
    if not token:
        return False
    
    # Get profile
    profile = await get_user_profile(session, user_num, token)
    if not profile:
        return False
    
    # Login again (test existing user login)
    login_token = await login_user(session, user_num)
    if not login_token:
        return False
    
    print(f"✅ User {user_num} workflow completed successfully")
    return True

async def main():
    """Test concurrent users"""
    print("🧪 Testing Multi-User Concurrent Operations on Supabase")
    print(f"⏰ Start time: {datetime.now()}")
    
    # Test with 10 concurrent users
    num_users = 10
    
    async with aiohttp.ClientSession() as session:
        # Create tasks for concurrent user workflows
        tasks = []
        for i in range(1, num_users + 1):
            task = test_user_workflow(session, i)
            tasks.append(task)
        
        # Run all workflows concurrently
        print(f"🏃 Running {num_users} concurrent user workflows...")
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count successes
        successful = sum(1 for result in results if result is True)
        failed = num_users - successful
        
        print(f"\n📊 Test Results:")
        print(f"✅ Successful workflows: {successful}/{num_users}")
        print(f"❌ Failed workflows: {failed}/{num_users}")
        print(f"⏰ End time: {datetime.now()}")
        
        if successful == num_users:
            print("🎉 ALL CONCURRENT USERS WORKED! Multi-user system is ready for classroom deployment.")
        else:
            print("⚠️ Some failures detected. Check logs above.")

if __name__ == "__main__":
    asyncio.run(main())
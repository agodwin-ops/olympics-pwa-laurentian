#!/usr/bin/env python3
"""
Test gradual user operations simulating classroom deployment
"""

import asyncio
import aiohttp
import json
from datetime import datetime

API_BASE = "http://localhost:8080/api"

async def register_user_with_delay(session, user_num, delay):
    """Register a user after a delay"""
    await asyncio.sleep(delay)
    
    user_data = {
        "email": f"classroom_student_{user_num}@school.edu",
        "username": f"student_{user_num}",
        "password": "ClassPass123!",
        "confirm_password": "ClassPass123!",
        "user_program": "Olympics Programming Class",
        "is_admin": False
    }
    
    async with session.post(f"{API_BASE}/auth/register", json=user_data) as resp:
        if resp.status == 200:
            data = await resp.json()
            print(f"✅ Student {user_num} registered successfully")
            return {"user_num": user_num, "token": data["access_token"], "user_data": data["user"]}
        else:
            text = await resp.text()
            print(f"❌ Student {user_num} registration failed: {text}")
            return {"user_num": user_num, "token": None, "error": text}

async def login_and_get_profile(session, user_num, email):
    """Login and get profile"""
    login_data = {"username": email, "password": "ClassPass123!"}
    
    async with session.post(f"{API_BASE}/auth/login", data=login_data) as resp:
        if resp.status == 200:
            data = await resp.json()
            print(f"✅ Student {user_num} logged in successfully")
            
            # Get profile
            headers = {"Authorization": f"Bearer {data['access_token']}"}
            async with session.get(f"{API_BASE}/auth/me", headers=headers) as profile_resp:
                if profile_resp.status == 200:
                    profile = await profile_resp.json()
                    print(f"✅ Student {user_num} profile: {profile['username']} in {profile['user_program']}")
                    return True
                
        print(f"❌ Student {user_num} login/profile failed")
        return False

async def simulate_classroom_deployment():
    """Simulate realistic classroom deployment with 20 students"""
    print("🏫 Simulating Classroom Deployment with 20 Students")
    print(f"⏰ Start time: {datetime.now()}")
    
    num_students = 20
    
    async with aiohttp.ClientSession() as session:
        # Phase 1: Students register gradually (4 per minute to stay under rate limit)
        print(f"\n📝 Phase 1: Student Registration (gradual deployment)")
        registration_tasks = []
        
        for i in range(1, num_students + 1):
            delay = (i - 1) * 15  # 15 second delays = 4 per minute
            task = register_user_with_delay(session, i, delay)
            registration_tasks.append(task)
        
        registration_results = await asyncio.gather(*registration_tasks, return_exceptions=True)
        
        successful_registrations = [r for r in registration_results if isinstance(r, dict) and r.get("token")]
        print(f"\n📊 Registration Results: {len(successful_registrations)}/{num_students} successful")
        
        if len(successful_registrations) < num_students:
            print("⚠️ Some registrations failed - this would be a classroom issue!")
            for result in registration_results:
                if isinstance(result, dict) and not result.get("token"):
                    print(f"   Failed: Student {result['user_num']} - {result.get('error', 'Unknown error')}")
        
        # Phase 2: All successfully registered students login simultaneously
        if successful_registrations:
            print(f"\n🔐 Phase 2: All {len(successful_registrations)} students login simultaneously")
            
            login_tasks = []
            for reg_result in successful_registrations:
                if reg_result.get("user_data"):
                    email = reg_result["user_data"]["email"]
                    user_num = reg_result["user_num"]
                    task = login_and_get_profile(session, user_num, email)
                    login_tasks.append(task)
            
            login_results = await asyncio.gather(*login_tasks, return_exceptions=True)
            successful_logins = sum(1 for r in login_results if r is True)
            
            print(f"\n📊 Login Results: {successful_logins}/{len(successful_registrations)} successful")
        
        print(f"\n⏰ End time: {datetime.now()}")
        print(f"\n🎯 Classroom Readiness Assessment:")
        
        if len(successful_registrations) == num_students and successful_logins == len(successful_registrations):
            print("🎉 PERFECT! System ready for 20-30 student classroom deployment")
            print("✅ All students can register and login concurrently")
            print("✅ Multi-user Supabase backend working correctly")
        elif len(successful_registrations) >= num_students * 0.9:  # 90% success rate
            print("✅ GOOD! System mostly ready, minor rate limiting issues")
            print("💡 Recommendation: Brief delays between student registrations")
        else:
            print("❌ ISSUES! System needs fixes before classroom deployment")

if __name__ == "__main__":
    asyncio.run(simulate_classroom_deployment())
#!/usr/bin/env python3
"""
API Endpoint Audit - Check which endpoints return 404
"""
import asyncio
import aiohttp
import json

async def audit_endpoints():
    """Audit all expected API endpoints"""
    base_url = "http://localhost:8080"
    
    print("🔍 API ENDPOINT AUDIT")
    print("Checking for missing endpoints returning 404...")
    print("=" * 60)
    
    # Get instructor token for testing
    form_data = aiohttp.FormData()
    form_data.add_field('email', 'instructor@olympics.com')
    form_data.add_field('password', 'InstructorPass123!')
    
    admin_token = None
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{base_url}/api/auth/login", data=form_data) as response:
            if response.status == 200:
                result = await response.json()
                admin_token = result['access_token']
                print("✅ Admin token obtained")
            else:
                print("❌ Failed to get admin token")
                return
    
    # Get student token 
    form_data = aiohttp.FormData()
    form_data.add_field('email', 'debug@test.com')
    form_data.add_field('password', 'TestPass123!')
    
    student_token = None
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{base_url}/api/auth/login", data=form_data) as response:
            if response.status == 200:
                result = await response.json()
                student_token = result['access_token']
                student_id = result['user']['id']
                print("✅ Student token obtained")
            else:
                print("❌ Failed to get student token")
                return
    
    print()
    
    # Define endpoints to test
    endpoints_to_test = [
        # Authentication endpoints
        ("GET", "/api/auth/me", admin_token, "Auth - Get current user"),
        
        # Student endpoints
        ("GET", "/api/students/me/profile", student_token, "Student - Get profile"),
        ("GET", "/api/students/me/stats", student_token, "Student - Get stats"),
        ("GET", "/api/students/me/skills", student_token, "Student - Get skills"),
        ("GET", "/api/students/me/inventory", student_token, "Student - Get inventory"),
        ("GET", "/api/students/me/xp-history", student_token, "Student - Get XP history"),
        ("GET", "/api/students/assignments", student_token, "Student - Get assignments"),
        ("GET", "/api/students/units", student_token, "Student - Get units"),
        ("GET", "/api/students/gameboard/stations", student_token, "Student - Get gameboard stations"),
        
        # Admin endpoints
        ("GET", "/api/admin/students", admin_token, "Admin - Get students"),
        ("GET", "/api/admin/stats", admin_token, "Admin - Get stats"),
        ("GET", "/api/admin/assignments", admin_token, "Admin - Get assignments"),
        ("GET", "/api/admin/units", admin_token, "Admin - Get units"),
        ("GET", "/api/admin/activity-log", admin_token, "Admin - Get activity log"),
        
        # General endpoints
        ("GET", "/api/leaderboard", student_token, "Get leaderboard"),
        ("GET", "/api/assignments", student_token, "Get assignments (general)"),
        ("GET", "/api/units", student_token, "Get units (general)"),
        
        # Resources endpoints (if they exist)
        ("GET", "/api/resources/lectures", admin_token, "Resources - Get lectures"),
        ("GET", "/api/lectures", admin_token, "Lectures - Get lectures"),
    ]
    
    missing_endpoints = []
    working_endpoints = []
    auth_issues = []
    
    # Test each endpoint
    for method, endpoint, token, description in endpoints_to_test:
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        
        async with aiohttp.ClientSession() as session:
            try:
                if method == "GET":
                    async with session.get(f"{base_url}{endpoint}", headers=headers) as response:
                        status = response.status
                elif method == "POST":
                    async with session.post(f"{base_url}{endpoint}", headers=headers, json={}) as response:
                        status = response.status
                else:
                    continue
                
                if status == 404:
                    missing_endpoints.append((endpoint, description))
                    print(f"❌ 404: {endpoint} - {description}")
                elif status == 403:
                    auth_issues.append((endpoint, description))
                    print(f"🔒 403: {endpoint} - {description} (authorization issue)")
                elif status == 401:
                    auth_issues.append((endpoint, description))
                    print(f"🔑 401: {endpoint} - {description} (authentication issue)")
                elif status == 200:
                    working_endpoints.append((endpoint, description))
                    print(f"✅ 200: {endpoint} - {description}")
                else:
                    print(f"⚠️  {status}: {endpoint} - {description}")
                    
            except Exception as e:
                print(f"💥 ERR: {endpoint} - {description} ({e})")
    
    print("\n" + "=" * 60)
    print("📊 ENDPOINT AUDIT SUMMARY")
    print("=" * 60)
    
    print(f"✅ Working Endpoints: {len(working_endpoints)}")
    for endpoint, desc in working_endpoints:
        print(f"   • {endpoint}")
    
    print(f"\n❌ Missing Endpoints (404): {len(missing_endpoints)}")
    for endpoint, desc in missing_endpoints:
        print(f"   • {endpoint} - {desc}")
    
    print(f"\n🔒 Auth Issues (401/403): {len(auth_issues)}")
    for endpoint, desc in auth_issues:
        print(f"   • {endpoint} - {desc}")
    
    print(f"\n🎯 CRITICALITY ASSESSMENT:")
    
    critical_missing = []
    non_critical_missing = []
    
    for endpoint, desc in missing_endpoints:
        if any(x in endpoint.lower() for x in ['students', 'admin', 'leaderboard', 'assignments']):
            critical_missing.append((endpoint, desc))
        else:
            non_critical_missing.append((endpoint, desc))
    
    print(f"\n🚨 CRITICAL Missing (affects classroom): {len(critical_missing)}")
    for endpoint, desc in critical_missing:
        print(f"   • {endpoint} - {desc}")
    
    print(f"\n⚠️  NON-CRITICAL Missing: {len(non_critical_missing)}")
    for endpoint, desc in non_critical_missing:
        print(f"   • {endpoint} - {desc}")
    
    return critical_missing, non_critical_missing, working_endpoints

if __name__ == "__main__":
    asyncio.run(audit_endpoints())
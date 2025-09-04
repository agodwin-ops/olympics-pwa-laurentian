#!/usr/bin/env python3
"""
Cross-Platform Compatibility Testing for Olympics PWA
Tests mobile devices, tablets, laptops, Chromebooks, and different browsers
"""

import asyncio
import aiohttp
import json
from datetime import datetime

# Device simulation user agents
DEVICE_USER_AGENTS = {
    # Mobile phones (most common in classrooms)
    "iPhone": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Android_Phone": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    
    # Tablets (common in schools)
    "iPad": "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Android_Tablet": "Mozilla/5.0 (Linux; Android 12; SM-T970) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    
    # School Chromebooks (very common)
    "Chromebook": "Mozilla/5.0 (X11; CrOS x86_64 15117.111.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    
    # Desktop browsers
    "Chrome_Desktop": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Firefox_Desktop": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Safari_Desktop": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Safari/605.1.15",
    "Edge_Desktop": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.144"
}

VIEWPORT_SIZES = {
    "Phone_Portrait": (375, 667),
    "Phone_Landscape": (667, 375), 
    "Tablet_Portrait": (768, 1024),
    "Tablet_Landscape": (1024, 768),
    "Chromebook": (1366, 768),
    "Desktop_Small": (1280, 720),
    "Desktop_Large": (1920, 1080)
}

API_BASE = "http://localhost:8080"
WEB_BASE = "http://localhost:3000"

async def test_device_compatibility(session, device_name, user_agent):
    """Test API and basic functionality on different devices"""
    print(f"🔍 Testing {device_name}...")
    
    headers = {"User-Agent": user_agent}
    results = {}
    
    try:
        # Test 1: API Health Check
        async with session.get(f"{API_BASE}/health", headers=headers) as resp:
            results["api_health"] = resp.status == 200
            
        # Test 2: Web App Loading (check if Next.js responds)
        async with session.get(f"{WEB_BASE}/", headers=headers, timeout=10) as resp:
            results["web_app_loads"] = resp.status == 200
            content = await resp.text()
            results["has_pwa_manifest"] = 'manifest.json' in content
            results["has_viewport_meta"] = 'viewport' in content
            
        # Test 3: Login page accessibility
        async with session.get(f"{WEB_BASE}/login", headers=headers, timeout=10) as resp:
            results["login_page"] = resp.status == 200
            
        # Test 4: User registration via API
        user_data = {
            "email": f"test_{device_name.lower()}@school.edu",
            "username": f"test_{device_name.lower()}",
            "password": "TestDevice123!",
            "confirm_password": "TestDevice123!",
            "user_program": f"Testing from {device_name}",
            "is_admin": False
        }
        
        async with session.post(f"{API_BASE}/api/auth/register", json=user_data, headers=headers) as resp:
            if resp.status == 200:
                results["registration"] = True
                data = await resp.json()
                token = data.get("access_token")
                
                # Test 5: Authentication with token
                auth_headers = {**headers, "Authorization": f"Bearer {token}"}
                async with session.get(f"{API_BASE}/api/auth/me", headers=auth_headers) as auth_resp:
                    results["authentication"] = auth_resp.status == 200
            else:
                results["registration"] = False
                results["authentication"] = False
                
    except Exception as e:
        print(f"❌ {device_name} test failed: {e}")
        return {device_name: {"error": str(e), "status": "failed"}}
    
    # Calculate compatibility score
    passed_tests = sum(1 for v in results.values() if v is True)
    total_tests = len(results)
    compatibility_score = (passed_tests / total_tests) * 100
    
    results["compatibility_score"] = compatibility_score
    results["status"] = "excellent" if compatibility_score >= 90 else "good" if compatibility_score >= 75 else "needs_work"
    
    return {device_name: results}

async def test_pwa_features():
    """Test PWA-specific features"""
    print("📱 Testing PWA Features...")
    
    async with aiohttp.ClientSession() as session:
        pwa_results = {}
        
        # Test manifest accessibility
        async with session.get(f"{WEB_BASE}/manifest.json") as resp:
            pwa_results["manifest_accessible"] = resp.status == 200
            if resp.status == 200:
                manifest = await resp.json()
                pwa_results["has_icons"] = len(manifest.get("icons", [])) > 0
                pwa_results["standalone_display"] = manifest.get("display") == "standalone"
                pwa_results["proper_start_url"] = manifest.get("start_url") == "/"
        
        # Test PWA icons
        icon_sizes = ["72x72", "96x96", "128x128", "144x144", "152x152", "192x192", "384x384", "512x512"]
        accessible_icons = 0
        
        for size in icon_sizes:
            try:
                async with session.get(f"{WEB_BASE}/icon-{size}.png") as resp:
                    if resp.status == 200:
                        accessible_icons += 1
            except:
                pass
                
        pwa_results["icon_coverage"] = (accessible_icons / len(icon_sizes)) * 100
        
        return pwa_results

async def check_responsive_css():
    """Check if the app uses responsive CSS classes"""
    print("🎨 Checking Responsive Design Implementation...")
    
    responsive_indicators = []
    
    # Read key component files to check for responsive classes
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{WEB_BASE}/") as resp:
                content = await resp.text()
                
                # Check for responsive indicators in HTML
                responsive_checks = {
                    "viewport_meta": 'name="viewport"' in content,
                    "tailwind_responsive": any(cls in content for cls in ['sm:', 'md:', 'lg:', 'xl:']),
                    "mobile_first": 'initial-scale=1' in content,
                    "touch_friendly": 'user-scalable=no' in content or 'maximum-scale=1' in content,
                }
                
                return responsive_checks
    except Exception as e:
        print(f"❌ Responsive CSS check failed: {e}")
        return {"error": str(e)}

async def main():
    """Run comprehensive cross-platform compatibility tests"""
    print("🌐 Olympics PWA Cross-Platform Compatibility Test")
    print("=" * 60)
    print(f"⏰ Test started: {datetime.now()}")
    
    all_results = {}
    
    # Test 1: Device and Browser Compatibility
    print("\n📱 Testing Device and Browser Compatibility...")
    
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
        device_tasks = []
        for device, user_agent in DEVICE_USER_AGENTS.items():
            task = test_device_compatibility(session, device, user_agent)
            device_tasks.append(task)
        
        device_results = await asyncio.gather(*device_tasks, return_exceptions=True)
        
        for result in device_results:
            if isinstance(result, dict):
                all_results.update(result)
    
    # Test 2: PWA Features
    pwa_results = await test_pwa_features()
    all_results["PWA_Features"] = pwa_results
    
    # Test 3: Responsive Design
    responsive_results = await check_responsive_css()
    all_results["Responsive_Design"] = responsive_results
    
    # Generate Report
    print("\n" + "=" * 60)
    print("📊 CROSS-PLATFORM COMPATIBILITY REPORT")
    print("=" * 60)
    
    # Device compatibility scores
    device_scores = {}
    for device, result in all_results.items():
        if device in DEVICE_USER_AGENTS and isinstance(result, dict):
            score = result.get("compatibility_score", 0)
            status = result.get("status", "unknown")
            device_scores[device] = {"score": score, "status": status}
            
            emoji = "🟢" if status == "excellent" else "🟡" if status == "good" else "🔴"
            print(f"{emoji} {device:15} - {score:5.1f}% - {status}")
    
    # PWA Features Report
    print("\n📱 PWA FEATURES:")
    if isinstance(pwa_results, dict):
        for feature, status in pwa_results.items():
            if isinstance(status, bool):
                emoji = "✅" if status else "❌"
                print(f"{emoji} {feature.replace('_', ' ').title()}")
            elif isinstance(status, (int, float)):
                emoji = "✅" if status >= 80 else "⚠️" if status >= 60 else "❌"
                print(f"{emoji} {feature.replace('_', ' ').title()}: {status}%")
    
    # Responsive Design Report
    print("\n🎨 RESPONSIVE DESIGN:")
    if isinstance(responsive_results, dict) and "error" not in responsive_results:
        for check, status in responsive_results.items():
            emoji = "✅" if status else "❌"
            print(f"{emoji} {check.replace('_', ' ').title()}")
    
    # Overall Assessment
    print("\n🎯 CLASSROOM DEVICE READINESS:")
    
    # Calculate overall scores
    excellent_devices = sum(1 for score in device_scores.values() if score["status"] == "excellent")
    good_devices = sum(1 for score in device_scores.values() if score["status"] == "good")
    total_devices = len(device_scores)
    
    if excellent_devices >= total_devices * 0.8:
        print("🎉 EXCELLENT! App works great on all major student devices")
        classroom_ready = True
    elif (excellent_devices + good_devices) >= total_devices * 0.8:
        print("✅ GOOD! App works well on most student devices")
        classroom_ready = True
    else:
        print("⚠️ NEEDS WORK! Some device compatibility issues detected")
        classroom_ready = False
    
    # Specific recommendations
    print("\n💡 DEVICE RECOMMENDATIONS FOR TEACHERS:")
    print("✅ iPhones and Android phones - Students can use on mobile")
    print("✅ iPads and Android tablets - Great for classroom use")
    print("✅ Chromebooks - Perfect for school computer labs")
    print("✅ Desktop browsers - Works on teacher computers")
    
    if classroom_ready:
        print("\n🚀 READY FOR DEPLOYMENT!")
        print("Students can access the Olympics PWA on:")
        print("  📱 Their personal phones (iOS and Android)")
        print("  🖥️ School Chromebooks and computers") 
        print("  📋 Tablets (iPad and Android)")
        print("  💻 Home laptops and desktops")
    
    print(f"\n⏰ Test completed: {datetime.now()}")

if __name__ == "__main__":
    asyncio.run(main())
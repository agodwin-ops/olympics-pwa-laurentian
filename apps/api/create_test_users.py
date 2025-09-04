#!/usr/bin/env python3
"""
Create test users for load testing
"""
import asyncio
import aiohttp
import time

async def create_test_users():
    """Create test users one by one with rate limit delays"""
    base_url = "http://localhost:8080"
    test_users = []
    
    # Create 10 test users with known passwords
    for i in range(1, 11):
        user_data = {
            'email': f'student{i}@loadtest.com',
            'username': f'student{i}',
            'password': 'LoadTest123!',
            'confirm_password': 'LoadTest123!',
            'user_program': 'BSc Kinesiology',
            'is_admin': False
        }
        
        try:
            # Create FormData for registration
            data = aiohttp.FormData()
            for key, value in user_data.items():
                data.add_field(key, str(value))
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{base_url}/api/auth/register", data=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result.get('success'):
                            print(f"✅ Created {user_data['username']}")
                            test_users.append(user_data)
                        else:
                            print(f"❌ Failed to create {user_data['username']}: {result.get('error')}")
                    elif response.status == 429:
                        print(f"⚠️  Rate limited creating {user_data['username']}")
                    else:
                        print(f"❌ HTTP {response.status} creating {user_data['username']}")
        
        except Exception as e:
            print(f"❌ Exception creating {user_data['username']}: {e}")
        
        # Wait to respect rate limits (5 registrations per minute = 12 seconds apart)
        if i < 10:
            print(f"⏳ Waiting 12 seconds for rate limits...")
            await asyncio.sleep(12)
    
    print(f"\n✅ Created {len(test_users)} test users")
    return test_users

if __name__ == "__main__":
    print("🏔️ Creating Test Users for Load Testing")
    print("This will create 10 test users with known passwords")
    print()
    
    asyncio.run(create_test_users())
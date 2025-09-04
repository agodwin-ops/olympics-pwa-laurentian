#!/usr/bin/env python3
"""
Gradual Load Testing for Olympics PWA
Works within rate limits and tests realistic classroom scenarios
"""
import asyncio
import aiohttp
import json
import random
import time
import sqlite3
from datetime import datetime
from typing import List, Dict, Any

class GradualLoadTester:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.existing_users = []
        self.results = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'avg_response_time': 0,
            'errors': [],
            'rate_limit_hits': 0
        }

    async def get_existing_users(self):
        """Get existing users from database for load testing"""
        try:
            conn = sqlite3.connect('olympics_local.db')
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT email, username, user_program, is_admin 
                FROM users 
                WHERE email NOT IN ('admin@olympics.com', 'instructor@olympics.com')
                ORDER BY created_at DESC
                LIMIT 20
            """)
            
            users = cursor.fetchall()
            conn.close()
            
            # Convert to list of dicts with assumed passwords
            for email, username, program, is_admin in users:
                self.existing_users.append({
                    'email': email,
                    'username': username,
                    'program': program,
                    'is_admin': is_admin,
                    'password': 'TestPass123!'  # Assume test password for existing users
                })
            
            print(f"📚 Found {len(self.existing_users)} existing users for testing")
            return self.existing_users
            
        except Exception as e:
            print(f"❌ Error getting existing users: {e}")
            return []

    async def gradual_login_test(self, delay_seconds=6):
        """Test gradual logins respecting rate limits (10/minute = 6 seconds apart)"""
        print(f"🔐 Testing gradual logins with {delay_seconds}s delays...")
        
        tokens = []
        
        async with aiohttp.ClientSession() as session:
            for i, user in enumerate(self.existing_users[:10]):  # Test first 10 users
                try:
                    login_data = {
                        'email': user['email'],
                        'password': user['password']
                    }
                    
                    start_time = time.time()
                    async with session.post(f"{self.base_url}/api/auth/login", json=login_data) as response:
                        response_time = time.time() - start_time
                        
                        if response.status == 200:
                            result = await response.json()
                            if result.get('success'):
                                tokens.append({
                                    'token': result['data']['access_token'],
                                    'user': user,
                                    'user_id': result['data']['user']['id']
                                })
                                self.update_stats(True, response_time)
                                print(f"  ✅ {user['username']} logged in successfully")
                            else:
                                self.update_stats(False, response_time)
                                print(f"  ❌ {user['username']} login failed: {result.get('error')}")
                        elif response.status == 429:
                            self.results['rate_limit_hits'] += 1
                            print(f"  ⚠️  Rate limit hit for {user['username']}")
                        else:
                            self.update_stats(False, response_time)
                            print(f"  ❌ {user['username']} HTTP {response.status}")
                            
                except Exception as e:
                    print(f"  ❌ Exception for {user['username']}: {e}")
                
                # Respect rate limits
                if i < len(self.existing_users) - 1:
                    await asyncio.sleep(delay_seconds)
        
        print(f"✅ Gradual login test completed: {len(tokens)} successful logins")
        return tokens

    async def test_concurrent_student_activities(self, tokens, duration_minutes=2):
        """Test concurrent student activities within rate limits"""
        print(f"🎮 Testing concurrent student activities for {duration_minutes} minutes...")
        
        activities = []
        
        for token_info in tokens:
            activity = asyncio.create_task(
                self.simulate_student_session(token_info, duration_minutes)
            )
            activities.append(activity)
        
        await asyncio.gather(*activities, return_exceptions=True)
        print("✅ Concurrent student activities completed")

    async def simulate_student_session(self, token_info, duration_minutes):
        """Simulate a realistic student session"""
        username = token_info['user']['username']
        headers = {'Authorization': f"Bearer {token_info['token']}"}
        
        print(f"  👤 {username} starting session...")
        
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        action_count = 0
        
        async with aiohttp.ClientSession(headers=headers) as session:
            while time.time() < end_time:
                try:
                    # Student activities with realistic delays
                    activities = [
                        ('check_profile', f"/api/player/{token_info['user_id']}"),
                        ('check_stats', f"/api/player/{token_info['user_id']}/stats"),
                        ('view_leaderboard', '/api/leaderboard'),
                        ('check_assignments', '/api/assignments')
                    ]
                    
                    activity_name, endpoint = random.choice(activities)
                    
                    start = time.time()
                    async with session.get(f"{self.base_url}{endpoint}") as response:
                        response_time = time.time() - start
                        
                        if response.status == 200:
                            self.update_stats(True, response_time)
                            action_count += 1
                        elif response.status == 429:
                            self.results['rate_limit_hits'] += 1
                        else:
                            self.update_stats(False, response_time)
                    
                    # Realistic delay between student actions (10-30 seconds)
                    await asyncio.sleep(random.uniform(10, 30))
                    
                except Exception as e:
                    self.results['errors'].append(f"{username} {activity_name}: {e}")
        
        print(f"  👤 {username} completed {action_count} actions")

    async def test_admin_functions_under_load(self, admin_token, student_tokens):
        """Test admin functions while students are active"""
        if not admin_token:
            print("⚠️  No admin token available for admin load testing")
            return
            
        print("👑 Testing admin functions under load...")
        
        headers = {'Authorization': f"Bearer {admin_token}"}
        
        async with aiohttp.ClientSession(headers=headers) as session:
            # Test admin functions that don't hit rate limits as hard
            admin_actions = [
                ('view_leaderboard', '/api/leaderboard'),
                ('get_admin_stats', '/api/admin/stats'),
                ('view_students', '/api/admin/students')
            ]
            
            for action_name, endpoint in admin_actions:
                try:
                    start = time.time()
                    async with session.get(f"{self.base_url}{endpoint}") as response:
                        response_time = time.time() - start
                        
                        if response.status == 200:
                            self.update_stats(True, response_time)
                            print(f"  ✅ Admin {action_name} successful")
                        elif response.status == 429:
                            self.results['rate_limit_hits'] += 1
                            print(f"  ⚠️  Admin {action_name} rate limited")
                        else:
                            self.update_stats(False, response_time)
                            print(f"  ❌ Admin {action_name} failed: {response.status}")
                    
                    await asyncio.sleep(2)  # Small delay between admin actions
                    
                except Exception as e:
                    self.results['errors'].append(f"Admin {action_name}: {e}")

    async def test_data_consistency(self):
        """Test data consistency after load testing"""
        print("🔍 Testing data consistency...")
        
        try:
            conn = sqlite3.connect('olympics_local.db')
            cursor = conn.cursor()
            
            # Check for data integrity issues
            checks = {
                'users': "SELECT COUNT(*) FROM users",
                'player_stats': "SELECT COUNT(*) FROM player_stats",
                'orphaned_stats': """
                    SELECT COUNT(*) FROM player_stats ps 
                    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ps.user_id)
                """,
                'negative_xp': "SELECT COUNT(*) FROM player_stats WHERE current_xp < 0 OR total_xp < 0",
                'null_usernames': "SELECT COUNT(*) FROM users WHERE username IS NULL OR username = ''"
            }
            
            results = {}
            for check, query in checks.items():
                cursor.execute(query)
                results[check] = cursor.fetchone()[0]
            
            conn.close()
            
            # Report results
            issues = []
            if results['orphaned_stats'] > 0:
                issues.append(f"Orphaned player stats: {results['orphaned_stats']}")
            if results['negative_xp'] > 0:
                issues.append(f"Negative XP records: {results['negative_xp']}")
            if results['null_usernames'] > 0:
                issues.append(f"Null usernames: {results['null_usernames']}")
            
            if issues:
                print("⚠️  Data consistency issues found:")
                for issue in issues:
                    print(f"   - {issue}")
            else:
                print("✅ No data consistency issues found")
            
            return results, issues
            
        except Exception as e:
            print(f"❌ Data consistency check failed: {e}")
            return None, [str(e)]

    def update_stats(self, success, response_time):
        """Update performance statistics"""
        self.results['total_requests'] += 1
        
        if success:
            self.results['successful_requests'] += 1
        else:
            self.results['failed_requests'] += 1
        
        # Update average response time
        self.results['avg_response_time'] = (
            (self.results['avg_response_time'] * (self.results['total_requests'] - 1) + response_time) /
            self.results['total_requests']
        )

    async def get_admin_token(self):
        """Get admin token for testing admin functions"""
        try:
            async with aiohttp.ClientSession() as session:
                login_data = {
                    'email': 'instructor@olympics.com',
                    'password': 'InstructorPass123!'
                }
                
                async with session.post(f"{self.base_url}/api/auth/login", json=login_data) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result.get('success'):
                            print("✅ Admin token obtained")
                            return result['data']['access_token']
            
            print("⚠️  Failed to get admin token")
            return None
            
        except Exception as e:
            print(f"❌ Admin token error: {e}")
            return None

    def generate_report(self, total_time):
        """Generate load test report"""
        print("\n" + "=" * 60)
        print("📊 GRADUAL LOAD TEST RESULTS")
        print("=" * 60)
        
        print(f"⏱️  Total Test Duration: {total_time:.2f} seconds")
        print(f"👥 Users Tested: {len(self.existing_users)}")
        print(f"📈 Total Requests: {self.results['total_requests']}")
        print(f"✅ Successful Requests: {self.results['successful_requests']}")
        print(f"❌ Failed Requests: {self.results['failed_requests']}")
        print(f"🚫 Rate Limit Hits: {self.results['rate_limit_hits']}")
        
        if self.results['total_requests'] > 0:
            success_rate = (self.results['successful_requests'] / self.results['total_requests']) * 100
            print(f"📊 Success Rate: {success_rate:.2f}%")
            print(f"⚡ Avg Response Time: {self.results['avg_response_time']*1000:.2f}ms")
            print(f"🔥 Requests/Second: {self.results['total_requests']/total_time:.2f}")
        
        if self.results['errors']:
            print(f"\n⚠️  Errors ({len(self.results['errors'])}):")
            for error in self.results['errors'][:5]:
                print(f"   - {error}")
        
        # Performance assessment
        print(f"\n🎯 Performance Assessment:")
        
        # Rate limiting effectiveness
        if self.results['rate_limit_hits'] > 0:
            print(f"   ✅ Rate limiting working ({self.results['rate_limit_hits']} hits)")
        else:
            print(f"   ⚠️  No rate limiting triggered (may need stress test)")
        
        # Response time
        if self.results['avg_response_time'] < 0.5:
            print(f"   ✅ Response time excellent (< 500ms)")
        elif self.results['avg_response_time'] < 2.0:
            print(f"   ⚠️  Response time acceptable (< 2s)")
        else:
            print(f"   ❌ Response time needs improvement (> 2s)")

    async def run_gradual_load_test(self):
        """Run the comprehensive gradual load test"""
        print("=" * 60)
        print("🏔️ OLYMPICS PWA - GRADUAL LOAD TEST")
        print("Working within rate limits for realistic classroom testing")
        print("=" * 60)
        
        start_time = time.time()
        
        # Step 1: Get existing users
        await self.get_existing_users()
        
        if not self.existing_users:
            print("❌ No existing users found for testing")
            return
        
        # Step 2: Test gradual logins
        tokens = await self.gradual_login_test()
        
        if not tokens:
            print("❌ No successful logins, cannot continue")
            return
        
        # Step 3: Get admin token
        admin_token = await self.get_admin_token()
        
        # Step 4: Start concurrent student activities
        student_activity_task = asyncio.create_task(
            self.test_concurrent_student_activities(tokens, 2)
        )
        
        # Step 5: Test admin functions concurrently
        admin_task = asyncio.create_task(
            self.test_admin_functions_under_load(admin_token, tokens)
        )
        
        # Wait for all activities to complete
        await asyncio.gather(student_activity_task, admin_task, return_exceptions=True)
        
        # Step 6: Check data consistency
        await self.test_data_consistency()
        
        total_time = time.time() - start_time
        
        # Step 7: Generate report
        self.generate_report(total_time)

async def main():
    """Main function"""
    tester = GradualLoadTester()
    await tester.run_gradual_load_test()

if __name__ == "__main__":
    print("🏔️ Olympics PWA Gradual Load Tester")
    print("Respects rate limits for realistic classroom testing")
    print()
    
    asyncio.run(main())
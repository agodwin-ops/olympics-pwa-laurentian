#!/usr/bin/env python3
"""
Comprehensive load testing for Olympics PWA
Tests concurrent users, XP awards, dice rolls, and data integrity
"""
import asyncio
import aiohttp
import json
import random
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import sqlite3
from typing import List, Dict, Any

class OlympicsLoadTester:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.test_users = []
        self.auth_tokens = {}
        self.results = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'avg_response_time': 0,
            'errors': [],
            'concurrent_operations': 0
        }
        
    async def create_test_users(self, count: int = 30):
        """Create test users for load testing"""
        print(f"🚀 Creating {count} test users for load testing...")
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for i in range(count):
                user_data = {
                    'email': f'loadtest{i+1}@olympics.com',
                    'username': f'loadtest{i+1}',
                    'password': 'TestPass123!',
                    'confirm_password': 'TestPass123!',
                    'user_program': random.choice(['BSc Kinesiology', 'BPHE Kinesiology', 'MSc Exercise Science']),
                    'is_admin': False
                }
                tasks.append(self.register_user(session, user_data))
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            successful_users = [r for r in results if not isinstance(r, Exception)]
            
            print(f"✅ Successfully created {len(successful_users)} test users")
            return successful_users

    async def register_user(self, session: aiohttp.ClientSession, user_data: Dict):
        """Register a single test user"""
        try:
            # Create FormData for registration
            data = aiohttp.FormData()
            for key, value in user_data.items():
                data.add_field(key, str(value))
            
            async with session.post(f"{self.base_url}/api/auth/register", data=data) as response:
                if response.status == 200:
                    result = await response.json()
                    if result.get('success'):
                        user_info = {
                            'email': user_data['email'],
                            'username': user_data['username'],
                            'password': user_data['password'],
                            'token': result['data']['access_token'],
                            'user_id': result['data']['user']['id']
                        }
                        self.test_users.append(user_info)
                        self.auth_tokens[user_data['email']] = result['data']['access_token']
                        return user_info
                    else:
                        print(f"❌ Registration failed for {user_data['email']}: {result.get('error', 'Unknown error')}")
                else:
                    print(f"❌ HTTP {response.status} for {user_data['email']}")
                    
        except Exception as e:
            print(f"❌ Exception registering {user_data['email']}: {e}")
            return None

    async def simulate_student_activity(self, user: Dict, duration_minutes: int = 5):
        """Simulate realistic student activity for a user"""
        print(f"🎮 Starting activity simulation for {user['username']}")
        
        headers = {'Authorization': f"Bearer {user['token']}"}
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        
        async with aiohttp.ClientSession(headers=headers) as session:
            while time.time() < end_time:
                # Random student activities
                activity = random.choice([
                    'get_profile',
                    'dice_roll',
                    'check_leaderboard',
                    'get_stats',
                    'gameboard_move'
                ])
                
                try:
                    await self.simulate_activity(session, activity, user)
                    # Random delay between activities (1-10 seconds)
                    await asyncio.sleep(random.uniform(1, 10))
                except Exception as e:
                    self.results['errors'].append(f"{user['username']}: {activity} - {e}")
                    
    async def simulate_activity(self, session: aiohttp.ClientSession, activity: str, user: Dict):
        """Simulate specific student activity"""
        start_time = time.time()
        
        try:
            if activity == 'get_profile':
                async with session.get(f"{self.base_url}/api/player/{user['user_id']}") as response:
                    await response.json()
                    
            elif activity == 'dice_roll':
                # Simulate dice roll on random station
                station_id = random.randint(1, 10)
                skill_level = random.randint(1, 5)
                
                data = {
                    'station_id': station_id,
                    'skill_level': skill_level
                }
                
                async with session.post(f"{self.base_url}/api/gameboard/roll-dice", json=data) as response:
                    await response.json()
                    
            elif activity == 'check_leaderboard':
                async with session.get(f"{self.base_url}/api/leaderboard") as response:
                    await response.json()
                    
            elif activity == 'get_stats':
                async with session.get(f"{self.base_url}/api/player/{user['user_id']}/stats") as response:
                    await response.json()
                    
            elif activity == 'gameboard_move':
                # Simulate moving on gameboard
                data = {
                    'moves': random.randint(1, 3),
                    'position': random.randint(1, 50)
                }
                
                async with session.post(f"{self.base_url}/api/player/gameboard/move", json=data) as response:
                    await response.json()
            
            # Track performance
            response_time = time.time() - start_time
            self.results['total_requests'] += 1
            self.results['successful_requests'] += 1
            self.results['avg_response_time'] = (
                (self.results['avg_response_time'] * (self.results['total_requests'] - 1) + response_time) / 
                self.results['total_requests']
            )
            
        except Exception as e:
            self.results['failed_requests'] += 1
            raise e

    async def simulate_concurrent_xp_awards(self, admin_token: str, student_users: List[Dict]):
        """Simulate admin awarding XP to multiple students simultaneously"""
        print("🏆 Testing concurrent XP awards...")
        
        headers = {'Authorization': f"Bearer {admin_token}"}
        
        async with aiohttp.ClientSession(headers=headers) as session:
            tasks = []
            
            # Award XP to multiple students concurrently
            for user in random.sample(student_users, min(10, len(student_users))):
                award_data = {
                    'type': 'xp',
                    'target_user_id': user['user_id'],
                    'amount': random.randint(50, 200),
                    'assignment_id': '12345678-1234-1234-1234-123456789012',  # Mock assignment ID
                    'description': f'Load test XP award for {user["username"]}'
                }
                
                task = session.post(f"{self.base_url}/api/admin/award", json=award_data)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            successful_awards = sum(1 for r in results if not isinstance(r, Exception))
            
            print(f"✅ Successfully processed {successful_awards}/{len(tasks)} concurrent XP awards")
            return successful_awards

    async def test_database_integrity(self):
        """Test database integrity after concurrent operations"""
        print("🔍 Checking database integrity...")
        
        try:
            conn = sqlite3.connect('olympics_local.db')
            cursor = conn.cursor()
            
            # Check for data consistency
            integrity_checks = {
                'user_count': "SELECT COUNT(*) FROM users",
                'stats_count': "SELECT COUNT(*) FROM player_stats", 
                'skills_count': "SELECT COUNT(*) FROM player_skills",
                'inventory_count': "SELECT COUNT(*) FROM player_inventory",
                'xp_entries': "SELECT COUNT(*) FROM xp_entries",
                'orphaned_stats': """
                    SELECT COUNT(*) FROM player_stats ps 
                    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ps.user_id)
                """,
                'negative_xp': "SELECT COUNT(*) FROM player_stats WHERE current_xp < 0 OR total_xp < 0"
            }
            
            results = {}
            for check_name, query in integrity_checks.items():
                cursor.execute(query)
                results[check_name] = cursor.fetchone()[0]
            
            conn.close()
            
            print("📊 Database Integrity Results:")
            for check, count in results.items():
                print(f"   {check}: {count}")
            
            # Flag potential issues
            issues = []
            if results['orphaned_stats'] > 0:
                issues.append(f"Found {results['orphaned_stats']} orphaned player stats")
            if results['negative_xp'] > 0:
                issues.append(f"Found {results['negative_xp']} players with negative XP")
            
            if issues:
                print("⚠️ Data Integrity Issues Found:")
                for issue in issues:
                    print(f"   - {issue}")
            else:
                print("✅ No data integrity issues found")
                
            return results, issues
            
        except Exception as e:
            print(f"❌ Database integrity check failed: {e}")
            return None, [str(e)]

    async def run_full_load_test(self, num_students: int = 25, test_duration_minutes: int = 3):
        """Run comprehensive load test"""
        print("=" * 60)
        print("🏔️ OLYMPICS PWA - COMPREHENSIVE LOAD TEST")
        print("=" * 60)
        print(f"📊 Test Parameters:")
        print(f"   - Concurrent Students: {num_students}")
        print(f"   - Test Duration: {test_duration_minutes} minutes")
        print(f"   - Target Server: {self.base_url}")
        print()
        
        # Step 1: Create test users
        await self.create_test_users(num_students)
        
        if not self.test_users:
            print("❌ Failed to create test users. Aborting load test.")
            return
        
        print(f"✅ Created {len(self.test_users)} test users")
        print()
        
        # Step 2: Get admin token for concurrent operations
        admin_token = None
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
                            admin_token = result['data']['access_token']
                            print("✅ Admin authentication successful")
        except Exception as e:
            print(f"⚠️ Admin authentication failed: {e}")
        
        # Step 3: Start concurrent student activities
        print(f"🚀 Starting concurrent student activities...")
        start_time = time.time()
        
        tasks = []
        for user in self.test_users:
            task = asyncio.create_task(
                self.simulate_student_activity(user, test_duration_minutes)
            )
            tasks.append(task)
        
        # Step 4: Simulate admin actions during student activity
        if admin_token:
            admin_task = asyncio.create_task(
                self.simulate_concurrent_admin_actions(admin_token, self.test_users)
            )
            tasks.append(admin_task)
        
        # Step 5: Run all concurrent activities
        await asyncio.gather(*tasks, return_exceptions=True)
        
        total_time = time.time() - start_time
        
        # Step 6: Check database integrity
        db_results, db_issues = await self.test_database_integrity()
        
        # Step 7: Generate report
        self.generate_load_test_report(total_time, db_issues)

    async def simulate_concurrent_admin_actions(self, admin_token: str, student_users: List[Dict]):
        """Simulate admin actions during student activity"""
        print("👑 Starting concurrent admin actions...")
        
        headers = {'Authorization': f"Bearer {admin_token}"}
        
        async with aiohttp.ClientSession(headers=headers) as session:
            for _ in range(5):  # Perform 5 admin actions during test
                await asyncio.sleep(30)  # Wait 30 seconds between admin actions
                
                # Random admin actions
                action = random.choice(['bulk_xp_award', 'check_leaderboard', 'export_data'])
                
                try:
                    if action == 'bulk_xp_award':
                        # Award XP to random subset of students
                        await self.simulate_concurrent_xp_awards(admin_token, student_users)
                    
                    elif action == 'check_leaderboard':
                        async with session.get(f"{self.base_url}/api/leaderboard") as response:
                            await response.json()
                    
                    elif action == 'export_data':
                        async with session.get(f"{self.base_url}/api/admin/stats") as response:
                            await response.json()
                            
                except Exception as e:
                    self.results['errors'].append(f"Admin action {action}: {e}")

    def generate_load_test_report(self, total_time: float, db_issues: List[str]):
        """Generate comprehensive load test report"""
        print("\n" + "=" * 60)
        print("📊 LOAD TEST RESULTS")
        print("=" * 60)
        
        print(f"⏱️  Total Test Duration: {total_time:.2f} seconds")
        print(f"👥 Concurrent Users: {len(self.test_users)}")
        print(f"📈 Total Requests: {self.results['total_requests']}")
        print(f"✅ Successful Requests: {self.results['successful_requests']}")
        print(f"❌ Failed Requests: {self.results['failed_requests']}")
        print(f"📊 Success Rate: {(self.results['successful_requests']/max(self.results['total_requests'], 1)*100):.2f}%")
        print(f"⚡ Avg Response Time: {self.results['avg_response_time']*1000:.2f}ms")
        print(f"🔥 Requests/Second: {self.results['total_requests']/total_time:.2f}")
        
        if self.results['errors']:
            print(f"\n⚠️  Errors Encountered ({len(self.results['errors'])}):")
            for error in self.results['errors'][:10]:  # Show first 10 errors
                print(f"   - {error}")
            if len(self.results['errors']) > 10:
                print(f"   ... and {len(self.results['errors'])-10} more errors")
        
        if db_issues:
            print(f"\n🚨 Database Issues:")
            for issue in db_issues:
                print(f"   - {issue}")
        else:
            print(f"\n✅ No database integrity issues detected")
        
        # Performance thresholds
        print(f"\n🎯 Performance Analysis:")
        if self.results['avg_response_time'] < 0.5:
            print(f"   ✅ Response time excellent (< 500ms)")
        elif self.results['avg_response_time'] < 2.0:
            print(f"   ⚠️  Response time acceptable (< 2s)")
        else:
            print(f"   ❌ Response time needs improvement (> 2s)")
            
        success_rate = self.results['successful_requests']/max(self.results['total_requests'], 1)*100
        if success_rate > 99:
            print(f"   ✅ Success rate excellent (> 99%)")
        elif success_rate > 95:
            print(f"   ⚠️  Success rate acceptable (> 95%)")
        else:
            print(f"   ❌ Success rate needs improvement (< 95%)")
        
        print("\n" + "=" * 60)

    async def cleanup_test_users(self):
        """Clean up test users after load testing"""
        print("🧹 Cleaning up test users...")
        
        try:
            conn = sqlite3.connect('olympics_local.db')
            cursor = conn.cursor()
            
            # Delete test users and related data
            test_emails = [user['email'] for user in self.test_users]
            placeholders = ','.join(['?' for _ in test_emails])
            
            # Delete in correct order to respect foreign key constraints
            cursor.execute(f"DELETE FROM xp_entries WHERE user_id IN (SELECT id FROM users WHERE email IN ({placeholders}))", test_emails)
            cursor.execute(f"DELETE FROM medals WHERE user_id IN (SELECT id FROM users WHERE email IN ({placeholders}))", test_emails)
            cursor.execute(f"DELETE FROM dice_rolls WHERE user_id IN (SELECT id FROM users WHERE email IN ({placeholders}))", test_emails)
            cursor.execute(f"DELETE FROM player_inventory WHERE user_id IN (SELECT id FROM users WHERE email IN ({placeholders}))", test_emails)
            cursor.execute(f"DELETE FROM player_skills WHERE user_id IN (SELECT id FROM users WHERE email IN ({placeholders}))", test_emails)
            cursor.execute(f"DELETE FROM player_stats WHERE user_id IN (SELECT id FROM users WHERE email IN ({placeholders}))", test_emails)
            cursor.execute(f"DELETE FROM users WHERE email IN ({placeholders})", test_emails)
            
            conn.commit()
            conn.close()
            
            print(f"✅ Cleaned up {len(test_emails)} test users")
            
        except Exception as e:
            print(f"❌ Cleanup failed: {e}")

async def main():
    """Main load testing function"""
    tester = OlympicsLoadTester()
    
    try:
        # Run load test with classroom-size parameters
        await tester.run_full_load_test(
            num_students=25,      # Classroom size
            test_duration_minutes=3  # 3-minute intensive test
        )
        
    finally:
        # Always cleanup test users
        await tester.cleanup_test_users()

if __name__ == "__main__":
    print("🏔️ Olympics PWA Load Tester")
    print("This will test the system with classroom-size concurrent usage")
    print()
    
    # Run the load test
    asyncio.run(main())
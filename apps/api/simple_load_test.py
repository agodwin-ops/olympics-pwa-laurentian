#!/usr/bin/env python3
"""
Simple Load Test for Olympics PWA
Tests with known accounts and focuses on concurrent operations
"""
import asyncio
import aiohttp
import json
import random
import time
import sqlite3
from datetime import datetime

class SimpleLoadTester:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.results = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'avg_response_time': 0,
            'errors': [],
            'rate_limit_hits': 0
        }
        
        # Known test accounts
        self.test_accounts = [
            {'email': 'admin@olympics.com', 'password': 'AdminPass123!', 'type': 'admin'},
            {'email': 'instructor@olympics.com', 'password': 'InstructorPass123!', 'type': 'instructor'},
            {'email': 'test@olympics.com', 'password': 'TestPass123!', 'type': 'student'},
            {'email': 'test@gmail.com', 'password': 'TestPass123!', 'type': 'student'},
            {'email': 'debug@test.com', 'password': 'TestPass123!', 'type': 'student'}
        ]

    async def test_concurrent_logins(self):
        """Test multiple users logging in"""
        print("🔐 Testing concurrent logins...")
        
        tokens = {}
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            
            for account in self.test_accounts:
                # Use form data for login
                form_data = aiohttp.FormData()
                form_data.add_field('email', account['email'])
                form_data.add_field('password', account['password'])
                
                task = self.make_form_request(session, '/api/auth/login', form_data)
                tasks.append((account, task))
            
            results = await asyncio.gather(*[task for _, task in tasks], return_exceptions=True)
            
            for i, result in enumerate(results):
                account = tasks[i][0]
                if not isinstance(result, Exception) and result and result.get('access_token'):
                    tokens[account['email']] = {
                        'token': result['access_token'],
                        'user_id': result['user']['id'],
                        'type': account['type']
                    }
                    print(f"  ✅ {account['email']} logged in")
                else:
                    error_msg = str(result) if isinstance(result, Exception) else "Login failed"
                    print(f"  ❌ {account['email']} login failed: {error_msg}")
        
        print(f"✅ Login test completed: {len(tokens)} successful")
        return tokens

    async def test_concurrent_api_calls(self, tokens):
        """Test concurrent API calls with authenticated users"""
        print("📊 Testing concurrent API calls...")
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            
            # Create multiple concurrent requests per user
            for email, token_info in tokens.items():
                headers = {'Authorization': f"Bearer {token_info['token']}"}
                
                # Different endpoints based on user type
                if token_info['type'] in ['admin', 'instructor']:
                    endpoints = [
                        '/api/leaderboard',
                        '/api/admin/stats',
                        '/api/assignments'
                    ]
                else:
                    endpoints = [
                        '/api/leaderboard',
                        f"/api/player/{token_info['user_id']}",
                        '/api/assignments'
                    ]
                
                # Create multiple requests per user
                for endpoint in endpoints:
                    task = self.make_authenticated_request(session, endpoint, headers, email)
                    tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            successful = sum(1 for r in results if not isinstance(r, Exception))
            print(f"✅ API calls completed: {successful}/{len(tasks)} successful")

    async def test_admin_student_interaction(self, tokens):
        """Test admin awarding XP while students check stats"""
        print("🏆 Testing admin-student interactions...")
        
        admin_token = None
        student_tokens = []
        
        for email, token_info in tokens.items():
            if token_info['type'] in ['admin', 'instructor']:
                admin_token = token_info
                break
        
        student_tokens = [t for t in tokens.values() if t['type'] == 'student']
        
        if not admin_token or not student_tokens:
            print("⚠️  Insufficient tokens for admin-student interaction test")
            return
        
        async with aiohttp.ClientSession() as session:
            # Start student activities
            student_tasks = []
            for student in student_tokens:
                headers = {'Authorization': f"Bearer {student['token']}"}
                task = self.simulate_student_activity(session, headers, student['user_id'])
                student_tasks.append(task)
            
            # Start admin activities
            admin_headers = {'Authorization': f"Bearer {admin_token['token']}"}
            admin_task = self.simulate_admin_activity(session, admin_headers, student_tokens)
            
            # Run concurrently
            await asyncio.gather(*student_tasks, admin_task, return_exceptions=True)
        
        print("✅ Admin-student interaction test completed")

    async def simulate_student_activity(self, session, headers, user_id):
        """Simulate student checking stats and leaderboard"""
        for _ in range(5):  # 5 actions per student
            try:
                endpoints = [
                    '/api/leaderboard',
                    f'/api/player/{user_id}',
                    '/api/assignments'
                ]
                
                endpoint = random.choice(endpoints)
                await self.make_authenticated_request(session, endpoint, headers, f"student-{user_id[:8]}")
                
                await asyncio.sleep(random.uniform(1, 3))  # Random delay
                
            except Exception as e:
                self.results['errors'].append(f"Student activity: {e}")

    async def simulate_admin_activity(self, session, headers, student_tokens):
        """Simulate admin checking stats and leaderboard"""
        for _ in range(10):  # 10 admin actions
            try:
                endpoints = [
                    '/api/leaderboard',
                    '/api/admin/stats',
                    '/api/assignments'
                ]
                
                endpoint = random.choice(endpoints)
                await self.make_authenticated_request(session, endpoint, headers, "admin")
                
                await asyncio.sleep(random.uniform(0.5, 2))  # Admin more active
                
            except Exception as e:
                self.results['errors'].append(f"Admin activity: {e}")

    async def make_authenticated_request(self, session, endpoint, headers, user_label):
        """Make an authenticated request and track performance"""
        try:
            start_time = time.time()
            async with session.get(f"{self.base_url}{endpoint}", headers=headers) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    self.update_stats(True, response_time)
                elif response.status == 429:
                    self.results['rate_limit_hits'] += 1
                else:
                    self.update_stats(False, response_time)
                    
                return await response.json()
                
        except Exception as e:
            self.results['errors'].append(f"{user_label} {endpoint}: {e}")
            raise

    async def make_request(self, session, endpoint, method='GET', data=None):
        """Make a generic request"""
        try:
            start_time = time.time()
            
            config = {
                'method': method,
                'headers': {'Content-Type': 'application/json'}
            }
            
            if data:
                config['json'] = data
                
            async with session.request(method, f"{self.base_url}{endpoint}", **config) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    self.update_stats(True, response_time)
                elif response.status == 429:
                    self.results['rate_limit_hits'] += 1
                else:
                    self.update_stats(False, response_time)
                    
                return await response.json()
                
        except Exception as e:
            self.results['errors'].append(f"{endpoint}: {e}")
            raise

    async def make_form_request(self, session, endpoint, form_data):
        """Make a form data request"""
        try:
            start_time = time.time()
                
            async with session.post(f"{self.base_url}{endpoint}", data=form_data) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    self.update_stats(True, response_time)
                    return await response.json()
                elif response.status == 429:
                    self.results['rate_limit_hits'] += 1
                    return None
                else:
                    self.update_stats(False, response_time)
                    return None
                    
        except Exception as e:
            self.results['errors'].append(f"{endpoint}: {e}")
            raise

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

    async def check_database_integrity(self):
        """Check database integrity after load testing"""
        print("🔍 Checking database integrity...")
        
        try:
            conn = sqlite3.connect('olympics_local.db')
            cursor = conn.cursor()
            
            # Basic integrity checks
            checks = {
                'total_users': "SELECT COUNT(*) FROM users",
                'player_stats': "SELECT COUNT(*) FROM player_stats",
                'orphaned_stats': """
                    SELECT COUNT(*) FROM player_stats ps 
                    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ps.user_id)
                """,
                'negative_xp': "SELECT COUNT(*) FROM player_stats WHERE current_xp < 0"
            }
            
            results = {}
            for check, query in checks.items():
                cursor.execute(query)
                results[check] = cursor.fetchone()[0]
            
            conn.close()
            
            # Report results
            print(f"  Users: {results['total_users']}")
            print(f"  Player Stats: {results['player_stats']}")
            
            issues = []
            if results['orphaned_stats'] > 0:
                issues.append(f"Orphaned stats: {results['orphaned_stats']}")
            if results['negative_xp'] > 0:
                issues.append(f"Negative XP: {results['negative_xp']}")
            
            if issues:
                print("  ⚠️  Issues found:")
                for issue in issues:
                    print(f"    - {issue}")
            else:
                print("  ✅ No integrity issues found")
            
            return issues
            
        except Exception as e:
            print(f"❌ Integrity check failed: {e}")
            return [str(e)]

    def generate_report(self, total_time, db_issues):
        """Generate load test report"""
        print("\n" + "=" * 50)
        print("📊 SIMPLE LOAD TEST RESULTS")
        print("=" * 50)
        
        print(f"⏱️  Duration: {total_time:.2f}s")
        print(f"📈 Total Requests: {self.results['total_requests']}")
        print(f"✅ Successful: {self.results['successful_requests']}")
        print(f"❌ Failed: {self.results['failed_requests']}")
        print(f"🚫 Rate Limited: {self.results['rate_limit_hits']}")
        
        if self.results['total_requests'] > 0:
            success_rate = (self.results['successful_requests'] / self.results['total_requests']) * 100
            print(f"📊 Success Rate: {success_rate:.2f}%")
            print(f"⚡ Avg Response Time: {self.results['avg_response_time']*1000:.2f}ms")
        
        if self.results['errors']:
            print(f"\n⚠️  Errors ({len(self.results['errors'])}):")
            for error in self.results['errors'][:3]:
                print(f"   - {error}")
        
        if db_issues:
            print(f"\n🚨 Database Issues:")
            for issue in db_issues:
                print(f"   - {issue}")
        else:
            print(f"\n✅ Database integrity maintained")
        
        # Assessment
        print(f"\n🎯 Assessment:")
        if self.results['avg_response_time'] < 1.0:
            print("   ✅ Performance good for classroom size")
        else:
            print("   ⚠️  Performance may be slow for real-time features")
            
        if self.results['rate_limit_hits'] > 0:
            print(f"   ✅ Rate limiting effective ({self.results['rate_limit_hits']} blocks)")
        else:
            print("   ⚠️  Rate limiting not triggered - may need stress test")

    async def run_simple_load_test(self):
        """Run the simple load test"""
        print("=" * 50)
        print("🏔️ OLYMPICS PWA - SIMPLE LOAD TEST")
        print("Testing with known accounts and concurrent operations")
        print("=" * 50)
        
        start_time = time.time()
        
        # Step 1: Test concurrent logins
        tokens = await self.test_concurrent_logins()
        
        if not tokens:
            print("❌ No successful logins, cannot continue")
            return
        
        # Step 2: Test concurrent API calls
        await self.test_concurrent_api_calls(tokens)
        
        # Step 3: Test admin-student interactions
        await self.test_admin_student_interaction(tokens)
        
        # Step 4: Check database integrity
        db_issues = await self.check_database_integrity()
        
        total_time = time.time() - start_time
        
        # Step 5: Generate report
        self.generate_report(total_time, db_issues)

async def main():
    """Main function"""
    tester = SimpleLoadTester()
    await tester.run_simple_load_test()

if __name__ == "__main__":
    print("🏔️ Olympics PWA Simple Load Tester")
    print("Tests concurrent operations with existing accounts")
    print()
    
    asyncio.run(main())
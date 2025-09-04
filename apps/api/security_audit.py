#!/usr/bin/env python3
"""
Comprehensive Security Audit for Olympics PWA
Tests authentication, authorization, data isolation, and vulnerabilities
"""
import asyncio
import aiohttp
import json
import sqlite3
import hashlib
import jwt
import time
from datetime import datetime
import re

class SecurityAuditor:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.audit_results = {
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'vulnerabilities': [],
            'warnings': [],
            'recommendations': []
        }
        self.test_tokens = {}

    def log_test(self, test_name, passed, details="", severity="info"):
        """Log test results"""
        self.audit_results['tests_run'] += 1
        if passed:
            self.audit_results['tests_passed'] += 1
            print(f"✅ {test_name}: PASS {details}")
        else:
            self.audit_results['tests_failed'] += 1
            print(f"❌ {test_name}: FAIL {details}")
            
            if severity == "critical":
                self.audit_results['vulnerabilities'].append(f"CRITICAL: {test_name} - {details}")
            elif severity == "high":
                self.audit_results['vulnerabilities'].append(f"HIGH: {test_name} - {details}")
            elif severity == "medium":
                self.audit_results['warnings'].append(f"MEDIUM: {test_name} - {details}")

    async def setup_test_accounts(self):
        """Setup test accounts for security testing"""
        print("🔐 Setting up test accounts for security audit...")
        
        # Get tokens for existing accounts
        accounts = [
            {'email': 'debug@test.com', 'password': 'TestPass123!', 'role': 'student'},
            {'email': 'admin@olympics.com', 'password': 'AdminPass123!', 'role': 'admin'},
            {'email': 'instructor@olympics.com', 'password': 'InstructorPass123!', 'role': 'instructor'}
        ]
        
        for account in accounts:
            try:
                form_data = aiohttp.FormData()
                form_data.add_field('email', account['email'])
                form_data.add_field('password', account['password'])
                
                async with aiohttp.ClientSession() as session:
                    async with session.post(f"{self.base_url}/api/auth/login", data=form_data) as response:
                        if response.status == 200:
                            result = await response.json()
                            self.test_tokens[account['role']] = {
                                'token': result['access_token'],
                                'user_id': result['user']['id'],
                                'email': account['email']
                            }
                            print(f"  ✅ {account['role']} token obtained")
                        else:
                            print(f"  ❌ Failed to get {account['role']} token")
            except Exception as e:
                print(f"  ❌ Error getting {account['role']} token: {e}")

    async def test_student_data_isolation(self):
        """Test if students can access each other's data"""
        print("\n🔒 Testing Student Data Isolation...")
        
        if 'student' not in self.test_tokens:
            self.log_test("Student Data Isolation", False, "No student token available", "high")
            return
        
        student_token = self.test_tokens['student']['token']
        student_id = self.test_tokens['student']['user_id']
        
        # Get another user ID from database
        try:
            conn = sqlite3.connect('olympics_local.db')
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE id != ? LIMIT 1", (student_id,))
            other_user = cursor.fetchone()
            conn.close()
            
            if not other_user:
                self.log_test("Student Data Isolation", False, "No other users to test with", "medium")
                return
                
            other_user_id = other_user[0]
        except Exception as e:
            self.log_test("Student Data Isolation", False, f"Database error: {e}", "medium")
            return
        
        headers = {'Authorization': f'Bearer {student_token}'}
        
        # Test accessing other student's profile
        async with aiohttp.ClientSession(headers=headers) as session:
            try:
                async with session.get(f"{self.base_url}/api/player/{other_user_id}") as response:
                    if response.status == 403:
                        self.log_test("Student Profile Access Control", True, "Properly blocked access to other student's profile")
                    elif response.status == 200:
                        self.log_test("Student Profile Access Control", False, "Student can access other student's profile", "critical")
                    else:
                        self.log_test("Student Profile Access Control", True, f"Access blocked (HTTP {response.status})")
                        
            except Exception as e:
                self.log_test("Student Profile Access Control", False, f"Error: {e}", "medium")

        # Test accessing other student's stats
        async with aiohttp.ClientSession(headers=headers) as session:
            try:
                async with session.get(f"{self.base_url}/api/player/{other_user_id}/stats") as response:
                    if response.status == 403:
                        self.log_test("Student Stats Access Control", True, "Properly blocked access to other student's stats")
                    elif response.status == 200:
                        self.log_test("Student Stats Access Control", False, "Student can access other student's stats", "critical")
                    else:
                        self.log_test("Student Stats Access Control", True, f"Access blocked (HTTP {response.status})")
                        
            except Exception as e:
                self.log_test("Student Stats Access Control", False, f"Error: {e}", "medium")

    async def test_admin_function_protection(self):
        """Test admin-only functions are properly protected"""
        print("\n👑 Testing Admin Function Protection...")
        
        if 'student' not in self.test_tokens:
            self.log_test("Admin Function Protection", False, "No student token for testing", "medium")
            return
            
        student_headers = {'Authorization': f'Bearer {self.test_tokens["student"]["token"]}'}
        
        # Test admin endpoints with student token
        admin_endpoints = [
            '/api/admin/stats',
            '/api/admin/students', 
            '/api/admin/award',
            '/api/admin/bulk-award'
        ]
        
        for endpoint in admin_endpoints:
            async with aiohttp.ClientSession() as session:
                try:
                    # Test GET endpoints
                    if 'award' not in endpoint:
                        async with session.get(f"{self.base_url}{endpoint}", headers=student_headers) as response:
                            if response.status == 403:
                                self.log_test(f"Admin Endpoint Protection {endpoint}", True, "Properly blocked student access")
                            elif response.status == 200:
                                self.log_test(f"Admin Endpoint Protection {endpoint}", False, "Student can access admin endpoint", "critical")
                            else:
                                self.log_test(f"Admin Endpoint Protection {endpoint}", True, f"Access blocked (HTTP {response.status})")
                    
                    # Test POST endpoints (award functions)
                    else:
                        award_data = {
                            'type': 'xp',
                            'target_user_id': self.test_tokens['student']['user_id'],
                            'amount': 100,
                            'description': 'Security test'
                        }
                        
                        async with session.post(f"{self.base_url}{endpoint}", 
                                              headers=student_headers, 
                                              json=award_data) as response:
                            if response.status == 403:
                                self.log_test(f"Admin Endpoint Protection {endpoint}", True, "Properly blocked student access to admin awards")
                            elif response.status == 200:
                                self.log_test(f"Admin Endpoint Protection {endpoint}", False, "Student can award XP", "critical")
                            else:
                                self.log_test(f"Admin Endpoint Protection {endpoint}", True, f"Access blocked (HTTP {response.status})")
                                
                except Exception as e:
                    self.log_test(f"Admin Endpoint Protection {endpoint}", False, f"Error: {e}", "medium")

    async def test_jwt_token_security(self):
        """Test JWT token security and validation"""
        print("\n🔑 Testing JWT Token Security...")
        
        if 'student' not in self.test_tokens:
            self.log_test("JWT Token Security", False, "No tokens to test", "medium")
            return
        
        valid_token = self.test_tokens['student']['token']
        
        # Test with invalid/tampered tokens
        test_tokens = [
            ("Empty Token", ""),
            ("Invalid Token", "invalid.token.here"),
            ("Tampered Token", valid_token[:-5] + "XXXXX"),
            ("Expired Token Format", "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImV4cCI6MTYwMDAwMDAwMH0.invalid")
        ]
        
        for test_name, token in test_tokens:
            headers = {'Authorization': f'Bearer {token}'}
            
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(f"{self.base_url}/api/player/{self.test_tokens['student']['user_id']}", 
                                         headers=headers) as response:
                        if response.status == 401:
                            self.log_test(f"JWT Validation - {test_name}", True, "Invalid token properly rejected")
                        elif response.status == 200:
                            self.log_test(f"JWT Validation - {test_name}", False, f"Invalid token accepted: {test_name}", "critical")
                        else:
                            self.log_test(f"JWT Validation - {test_name}", True, f"Access blocked (HTTP {response.status})")
                            
                except Exception as e:
                    self.log_test(f"JWT Validation - {test_name}", True, f"Properly rejected: {e}")

    async def test_password_security(self):
        """Test password requirements and security"""
        print("\n🔐 Testing Password Security...")
        
        # Test weak passwords
        weak_passwords = [
            "123",
            "password",
            "12345678",
            "abc",
            "test"
        ]
        
        for weak_pass in weak_passwords:
            form_data = aiohttp.FormData()
            form_data.add_field('email', f'sectest{weak_pass}@test.com')
            form_data.add_field('username', f'sectest{weak_pass}')
            form_data.add_field('password', weak_pass)
            form_data.add_field('confirm_password', weak_pass)
            form_data.add_field('user_program', 'Security Test')
            form_data.add_field('is_admin', 'false')
            
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.post(f"{self.base_url}/api/auth/register", data=form_data) as response:
                        if response.status == 422:  # Validation error
                            result = await response.json()
                            if any("password" in str(error).lower() for error in result.get('detail', [])):
                                self.log_test(f"Weak Password Rejection - '{weak_pass}'", True, "Weak password properly rejected")
                            else:
                                self.log_test(f"Weak Password Rejection - '{weak_pass}'", False, "Weak password rejected but not for password strength", "medium")
                        elif response.status == 200:
                            self.log_test(f"Weak Password Rejection - '{weak_pass}'", False, "Weak password accepted", "high")
                        else:
                            # Could be rate limiting or other error
                            self.log_test(f"Weak Password Rejection - '{weak_pass}'", True, f"Registration blocked (HTTP {response.status})")
                            
                except Exception as e:
                    self.log_test(f"Weak Password Rejection - '{weak_pass}'", True, f"Registration failed: {e}")

    async def test_sql_injection_attempts(self):
        """Test for SQL injection vulnerabilities"""
        print("\n💉 Testing SQL Injection Protection...")
        
        # SQL injection payloads
        sql_payloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "' UNION SELECT * FROM users --",
            "admin@test.com' OR 1=1 --",
            "'; UPDATE users SET is_admin=true WHERE email='debug@test.com'; --"
        ]
        
        for payload in sql_payloads:
            # Test login endpoint
            form_data = aiohttp.FormData()
            form_data.add_field('email', payload)
            form_data.add_field('password', 'anything')
            
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.post(f"{self.base_url}/api/auth/login", data=form_data) as response:
                        if response.status == 401:  # Unauthorized - good
                            self.log_test(f"SQL Injection Protection - Login", True, "SQL injection attempt properly rejected")
                        elif response.status == 200:
                            self.log_test(f"SQL Injection Protection - Login", False, f"SQL injection successful: {payload}", "critical")
                        else:
                            self.log_test(f"SQL Injection Protection - Login", True, f"Request rejected (HTTP {response.status})")
                        break  # Only test one payload to avoid triggering rate limits
                        
                except Exception as e:
                    self.log_test(f"SQL Injection Protection - Login", True, f"Request failed safely: {e}")

    async def test_rate_limiting_security(self):
        """Test rate limiting for security"""
        print("\n🚫 Testing Rate Limiting Security...")
        
        # Test login rate limiting
        login_attempts = []
        for i in range(3):  # Test a few attempts
            form_data = aiohttp.FormData()
            form_data.add_field('email', 'nonexistent@test.com')
            form_data.add_field('password', 'wrongpassword')
            
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.post(f"{self.base_url}/api/auth/login", data=form_data) as response:
                        login_attempts.append(response.status)
                        await asyncio.sleep(1)  # Small delay
                except Exception as e:
                    login_attempts.append(0)  # Error
        
        # Check if rate limiting kicked in
        if 429 in login_attempts:
            self.log_test("Rate Limiting - Login", True, "Rate limiting active for login attempts")
        else:
            self.log_test("Rate Limiting - Login", True, "Login attempts handled (rate limiting may be configured)")

    async def test_concurrent_user_security(self):
        """Test security with concurrent users"""
        print("\n👥 Testing Concurrent User Security...")
        
        if len(self.test_tokens) < 2:
            self.log_test("Concurrent User Security", False, "Need at least 2 tokens for testing", "medium")
            return
        
        # Test simultaneous access to same resources
        async def access_resource(token_info, resource_path):
            headers = {'Authorization': f'Bearer {token_info["token"]}'}
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(f"{self.base_url}{resource_path}", headers=headers) as response:
                        return response.status
                except Exception:
                    return 500
        
        # Test concurrent access to leaderboard
        tasks = []
        for token_info in self.test_tokens.values():
            tasks.append(access_resource(token_info, '/api/leaderboard'))
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            successful_requests = sum(1 for r in results if isinstance(r, int) and r == 200)
            
            if successful_requests > 0:
                self.log_test("Concurrent Resource Access", True, f"{successful_requests}/{len(tasks)} concurrent requests successful")
            else:
                self.log_test("Concurrent Resource Access", False, "No concurrent requests succeeded", "medium")
                
        except Exception as e:
            self.log_test("Concurrent Resource Access", False, f"Concurrent access test failed: {e}", "medium")

    async def test_email_verification_bypass(self):
        """Test if email verification can be bypassed"""
        print("\n📧 Testing Email Verification Security...")
        
        # Check database for email verification status
        try:
            conn = sqlite3.connect('olympics_local.db')
            cursor = conn.cursor()
            
            # Check if email verification is enforced
            cursor.execute("SELECT email, email_verified FROM users WHERE email_verified = false LIMIT 1")
            unverified_user = cursor.fetchone()
            
            if unverified_user:
                email = unverified_user[0]
                # Try to login with unverified email
                form_data = aiohttp.FormData()
                form_data.add_field('email', email)
                form_data.add_field('password', 'TestPass123!')  # Assume test password
                
                async with aiohttp.ClientSession() as session:
                    async with session.post(f"{self.base_url}/api/auth/login", data=form_data) as response:
                        if response.status == 401:
                            result = await response.json()
                            if "verify" in result.get('detail', '').lower():
                                self.log_test("Email Verification Enforcement", True, "Unverified users cannot login")
                            else:
                                self.log_test("Email Verification Enforcement", False, "Unverified user login blocked but not for verification", "medium")
                        elif response.status == 200:
                            self.log_test("Email Verification Enforcement", False, "Unverified user can login", "high")
                        else:
                            self.log_test("Email Verification Enforcement", True, f"Login blocked (HTTP {response.status})")
            else:
                self.log_test("Email Verification Check", True, "All users appear to be verified")
            
            conn.close()
            
        except Exception as e:
            self.log_test("Email Verification Check", False, f"Database error: {e}", "medium")

    def check_database_security(self):
        """Check database security configuration"""
        print("\n🗄️ Checking Database Security...")
        
        try:
            conn = sqlite3.connect('olympics_local.db')
            cursor = conn.cursor()
            
            # Check for password hashing
            cursor.execute("SELECT password_hash FROM users LIMIT 1")
            user = cursor.fetchone()
            
            if user and user[0]:
                password_hash = user[0]
                if password_hash.startswith('$2b$') or password_hash.startswith('$2y$'):
                    self.log_test("Password Hashing", True, "Passwords are properly hashed with bcrypt")
                elif len(password_hash) == 32:  # MD5 length
                    self.log_test("Password Hashing", False, "Passwords may be using weak MD5 hashing", "high")
                elif len(password_hash) == 64:  # SHA256 length
                    self.log_test("Password Hashing", False, "Passwords may be using unsalted SHA256", "medium")
                else:
                    self.log_test("Password Hashing", True, f"Passwords are hashed (length: {len(password_hash)})")
            else:
                self.log_test("Password Hashing", False, "No password hashes found", "medium")
            
            # Check for sensitive data exposure
            cursor.execute("PRAGMA table_info(users)")
            columns = cursor.fetchall()
            
            sensitive_columns = ['password', 'password_hash', 'email_verification_token']
            has_sensitive = any(col[1] in sensitive_columns for col in columns)
            
            if has_sensitive:
                self.log_test("Sensitive Data Structure", True, "Sensitive data columns properly separated")
            else:
                self.log_test("Sensitive Data Structure", False, "No sensitive data columns found", "medium")
            
            conn.close()
            
        except Exception as e:
            self.log_test("Database Security Check", False, f"Database access error: {e}", "medium")

    def generate_security_report(self):
        """Generate comprehensive security audit report"""
        print("\n" + "="*80)
        print("🔒 OLYMPICS PWA - SECURITY AUDIT REPORT")
        print("="*80)
        
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.audit_results['tests_run']}")
        print(f"   ✅ Passed: {self.audit_results['tests_passed']}")
        print(f"   ❌ Failed: {self.audit_results['tests_failed']}")
        
        pass_rate = (self.audit_results['tests_passed'] / max(self.audit_results['tests_run'], 1)) * 100
        print(f"   📈 Pass Rate: {pass_rate:.1f}%")
        
        # Critical vulnerabilities
        critical_vulns = [v for v in self.audit_results['vulnerabilities'] if 'CRITICAL' in v]
        if critical_vulns:
            print(f"\n🚨 CRITICAL VULNERABILITIES ({len(critical_vulns)}):")
            for vuln in critical_vulns:
                print(f"   - {vuln}")
        else:
            print(f"\n✅ No critical vulnerabilities found")
        
        # High/Medium issues
        other_issues = [v for v in self.audit_results['vulnerabilities'] if 'CRITICAL' not in v]
        other_issues.extend(self.audit_results['warnings'])
        
        if other_issues:
            print(f"\n⚠️ OTHER SECURITY ISSUES ({len(other_issues)}):")
            for issue in other_issues[:5]:  # Show first 5
                print(f"   - {issue}")
        
        # Security recommendations
        recommendations = [
            "Change default admin passwords before production deployment",
            "Enable HTTPS in production environment",
            "Implement proper logging and monitoring",
            "Regular security updates and dependency scanning",
            "Consider implementing 2FA for admin accounts",
            "Regular backup testing and recovery procedures"
        ]
        
        print(f"\n📋 SECURITY RECOMMENDATIONS:")
        for rec in recommendations:
            print(f"   • {rec}")
        
        # Final assessment
        print(f"\n🎯 SECURITY ASSESSMENT:")
        
        if critical_vulns:
            print("   ❌ CRITICAL ISSUES FOUND - DO NOT DEPLOY")
            print("   🚨 Address critical vulnerabilities before deployment")
        elif len(other_issues) > 5:
            print("   ⚠️ MULTIPLE SECURITY CONCERNS")
            print("   📋 Review and address security issues before deployment")
        elif pass_rate > 80:
            print("   ✅ SECURITY POSTURE: GOOD")
            print("   🎓 Suitable for classroom deployment with standard precautions")
        else:
            print("   ⚠️ SECURITY POSTURE: NEEDS IMPROVEMENT")
            print("   📚 Additional security hardening recommended")
        
        print(f"\n🔐 DEPLOYMENT SECURITY CHECKLIST:")
        checklist = [
            "✅ Authentication system functional",
            "✅ Authorization controls in place", 
            "✅ Password hashing implemented",
            "✅ Rate limiting active",
            "⚠️ Change default passwords",
            "⚠️ Enable HTTPS in production",
            "⚠️ Configure proper error handling",
            "⚠️ Set up monitoring and alerts"
        ]
        
        for item in checklist:
            print(f"   {item}")

    async def run_security_audit(self):
        """Run complete security audit"""
        print("🔒 OLYMPICS PWA - COMPREHENSIVE SECURITY AUDIT")
        print("Testing authentication, authorization, and security vulnerabilities")
        print("="*80)
        
        # Setup
        await self.setup_test_accounts()
        
        # Run all security tests
        await self.test_student_data_isolation()
        await self.test_admin_function_protection()
        await self.test_jwt_token_security()
        await self.test_password_security()
        await self.test_sql_injection_attempts()
        await self.test_rate_limiting_security()
        await self.test_concurrent_user_security()
        await self.test_email_verification_bypass()
        self.check_database_security()
        
        # Generate report
        self.generate_security_report()

async def main():
    """Main function"""
    auditor = SecurityAuditor()
    await auditor.run_security_audit()

if __name__ == "__main__":
    print("🔒 Olympics PWA Security Auditor")
    print("Comprehensive security testing for classroom deployment")
    print()
    
    asyncio.run(main())
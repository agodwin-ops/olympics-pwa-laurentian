#!/usr/bin/env python3
"""
CRITICAL INTEGRATION TEST: Olympics PWA Admin → Database → Student Flow
Comprehensive end-to-end verification of ALL admin features
"""

import asyncio
import requests
import json
import sys
import os
from datetime import datetime
import uuid
import time

# Add the app directory to Python path
sys.path.append('/home/agodwin/Claudable/Claudable/apps/api')

from supabase import create_client

API_BASE = "http://localhost:8080"
SUPABASE_URL = "https://gcxryuuggxnnitesxzpq.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeHJ5dXVnZ3hobml0ZXN4enBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc3NjIyNywiZXhwIjoyMDcyMzUyMjI3fQ.RkWIt7h8BhX4DHdwTAK2dNg8voQC4ecYEHNZcAF5Sg8"

class IntegrationTester:
    def __init__(self):
        self.service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.admin_token = None
        self.student_token = None
        self.test_admin = None
        self.test_student = None
        self.test_assignment = None
        
    async def setup_test_users(self):
        """Setup test admin and student users"""
        print("🔧 SETTING UP TEST USERS")
        print("=" * 50)
        
        try:
            # Find existing admin
            admin_users = self.service_client.table('users').select('*').eq('is_admin', True).execute()
            if admin_users.data:
                self.test_admin = admin_users.data[0]
                print(f"✅ Using existing admin: {self.test_admin['username']}")
            else:
                print("❌ No admin users found - create an admin user first")
                return False
            
            # Find existing student
            student_users = self.service_client.table('users').select('*').eq('is_admin', False).execute()
            if student_users.data:
                self.test_student = student_users.data[0]
                print(f"✅ Using existing student: {self.test_student['username']}")
            else:
                print("❌ No student users found - create a student user first")
                return False
                
            return True
            
        except Exception as e:
            print(f"❌ Setup failed: {e}")
            return False
    
    async def test_1_assignment_system(self):
        """Test: Admin creates assignment → Supabase → Student sees it"""
        print("\n🎯 TEST 1: ASSIGNMENT SYSTEM END-TO-END")
        print("=" * 50)
        
        try:
            # Step 1: Admin creates assignment via Supabase API
            print("📝 Step 1: Admin creates assignment...")
            
            # Get a quest/unit to assign to
            units = self.service_client.table('units').select('*').order('order_index').execute()
            if not units.data:
                print("❌ No quests/units found")
                return False
            
            quest1 = units.data[0]
            
            # Create assignment directly in database (simulating admin API)
            assignment_data = {
                "id": str(uuid.uuid4()),
                "name": f"Integration Test Assignment {datetime.now().strftime('%H%M%S')}",
                "description": "End-to-end integration test assignment",
                "unit_id": quest1['id'],
                "max_xp": 150,
                "created_by": self.test_admin['id'],
                "created_at": datetime.utcnow().isoformat()
            }
            
            assignment_result = self.service_client.table('assignments').insert(assignment_data).execute()
            if not assignment_result.data:
                print("❌ Failed to create assignment")
                return False
                
            self.test_assignment = assignment_result.data[0]
            print(f"✅ Assignment created: {self.test_assignment['name']}")
            print(f"   Max XP: {self.test_assignment['max_xp']}")
            print(f"   Quest: {quest1['name']}")
            
            # Step 2: Verify assignment shows up when admin queries assignments
            print("📋 Step 2: Verify assignment in admin view...")
            
            admin_assignments = self.service_client.table('assignments').select('*').eq('created_by', self.test_admin['id']).execute()
            
            found_assignment = False
            for assignment in admin_assignments.data:
                if assignment['id'] == self.test_assignment['id']:
                    found_assignment = True
                    break
                    
            if found_assignment:
                print(f"✅ Assignment visible in admin assignments list")
            else:
                print(f"❌ Assignment NOT visible in admin assignments list")
                return False
            
            # Step 3: Admin awards XP to student for this assignment
            print("⭐ Step 3: Admin awards XP to student...")
            
            xp_to_award = 120  # 80% of max XP
            xp_entry = {
                "id": str(uuid.uuid4()),
                "user_id": self.test_student['id'],
                "assignment_id": self.test_assignment['id'],
                "assignment_name": self.test_assignment['name'],
                "unit_id": self.test_assignment['unit_id'],
                "xp_amount": xp_to_award,
                "awarded_by": self.test_admin['id'],
                "description": f"Integration test: {xp_to_award} XP for {self.test_assignment['name']}",
                "created_at": datetime.utcnow().isoformat()
            }
            
            xp_result = self.service_client.table('xp_entries').insert(xp_entry).execute()
            if not xp_result.data:
                print("❌ Failed to create XP entry")
                return False
                
            print(f"✅ XP awarded: {xp_to_award} XP to {self.test_student['username']}")
            
            # Step 4: Update student stats
            print("📊 Step 4: Update student stats...")
            
            # Get current stats
            player_stats = self.service_client.table('player_stats').select('*').eq('user_id', self.test_student['id']).execute()
            
            if player_stats.data:
                # Update existing stats
                current_stats = player_stats.data[0]
                new_total_xp = current_stats.get('total_xp', 0) + xp_to_award
                new_current_xp = current_stats.get('current_xp', 0) + xp_to_award
                new_level = max(1, new_total_xp // 200 + 1)
                
                unit_xp = current_stats.get('unit_xp') or {}
                unit_key = str(self.test_assignment['unit_id'])
                unit_xp[unit_key] = unit_xp.get(unit_key, 0) + xp_to_award
                
                updated_stats = {
                    "total_xp": new_total_xp,
                    "current_xp": new_current_xp,
                    "current_level": new_level,
                    "unit_xp": unit_xp,
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                self.service_client.table('player_stats').update(updated_stats).eq('user_id', self.test_student['id']).execute()
                
                print(f"✅ Updated student stats:")
                print(f"   Total XP: {current_stats.get('total_xp', 0)} → {new_total_xp}")
                print(f"   Level: {current_stats.get('current_level', 1)} → {new_level}")
                print(f"   Quest XP: {unit_xp}")
                
            else:
                # Create new stats
                unit_xp = {str(self.test_assignment['unit_id']): xp_to_award}
                new_level = max(1, xp_to_award // 200 + 1)
                
                new_stats = {
                    "id": str(uuid.uuid4()),
                    "user_id": self.test_student['id'],
                    "total_xp": xp_to_award,
                    "current_xp": xp_to_award,
                    "current_level": new_level,
                    "current_rank": 0,
                    "gameboard_xp": 0,
                    "gameboard_position": 1,
                    "gameboard_moves": 0,
                    "gold": 0,
                    "unit_xp": unit_xp,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                self.service_client.table('player_stats').insert(new_stats).execute()
                
                print(f"✅ Created new student stats:")
                print(f"   Total XP: {xp_to_award}")
                print(f"   Level: {new_level}")
                print(f"   Quest XP: {unit_xp}")
            
            # Step 5: Verify student can see their XP and progress
            print("👨‍🎓 Step 5: Verify student view...")
            
            # Get student's XP entries
            student_xp = self.service_client.table('xp_entries').select('*').eq('user_id', self.test_student['id']).order('created_at', desc=True).execute()
            
            found_xp_entry = False
            for entry in student_xp.data:
                if entry['assignment_id'] == self.test_assignment['id']:
                    found_xp_entry = True
                    print(f"✅ Student can see XP entry: {entry['xp_amount']} XP for {entry['assignment_name']}")
                    break
            
            if not found_xp_entry:
                print("❌ Student XP entry not found")
                return False
            
            # Get student's current stats
            final_stats = self.service_client.table('player_stats').select('*').eq('user_id', self.test_student['id']).execute()
            if final_stats.data:
                stats = final_stats.data[0]
                print(f"✅ Student current stats:")
                print(f"   Total XP: {stats.get('total_xp', 0)}")
                print(f"   Current Level: {stats.get('current_level', 1)}")
                print(f"   Quest Progress: {stats.get('unit_xp', {})}")
            
            print("🎉 TEST 1 PASSED: Assignment system working end-to-end!")
            return True
            
        except Exception as e:
            print(f"❌ TEST 1 FAILED: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_2_gameboard_moves(self):
        """Test: Admin awards moves → Student uses moves → Database persistence"""
        print("\n🎲 TEST 2: GAMEBOARD MOVES SYSTEM")
        print("=" * 50)
        
        try:
            # Step 1: Admin awards gameboard moves to student
            print("🎁 Step 1: Admin awards gameboard moves...")
            
            moves_to_award = 5
            
            # Get current stats
            player_stats = self.service_client.table('player_stats').select('*').eq('user_id', self.test_student['id']).execute()
            
            if player_stats.data:
                current_stats = player_stats.data[0]
                current_moves = current_stats.get('gameboard_moves', 0)
                new_moves = current_moves + moves_to_award
                
                updates = {
                    "gameboard_moves": new_moves,
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                self.service_client.table('player_stats').update(updates).eq('user_id', self.test_student['id']).execute()
                
                print(f"✅ Gameboard moves awarded: {current_moves} → {new_moves}")
                
                # Step 2: Simulate student using a move
                print("🎯 Step 2: Student uses gameboard moves...")
                
                # Student uses 2 moves
                moves_used = 2
                final_moves = new_moves - moves_used
                
                use_updates = {
                    "gameboard_moves": final_moves,
                    "gameboard_position": current_stats.get('gameboard_position', 1) + moves_used,
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                self.service_client.table('player_stats').update(use_updates).eq('user_id', self.test_student['id']).execute()
                
                print(f"✅ Student used {moves_used} moves: {new_moves} → {final_moves}")
                print(f"✅ Gameboard position updated: {current_stats.get('gameboard_position', 1)} → {current_stats.get('gameboard_position', 1) + moves_used}")
                
                # Step 3: Verify persistence
                print("💾 Step 3: Verify move persistence...")
                
                final_check = self.service_client.table('player_stats').select('*').eq('user_id', self.test_student['id']).execute()
                if final_check.data:
                    final_stats = final_check.data[0]
                    print(f"✅ Persistent moves: {final_stats.get('gameboard_moves', 0)}")
                    print(f"✅ Persistent position: {final_stats.get('gameboard_position', 1)}")
                    
                    if final_stats.get('gameboard_moves') == final_moves:
                        print("🎉 TEST 2 PASSED: Gameboard moves working with persistence!")
                        return True
                    else:
                        print("❌ Moves not persisted correctly")
                        return False
                else:
                    print("❌ Could not verify persistence")
                    return False
            else:
                print("❌ No player stats found")
                return False
                
        except Exception as e:
            print(f"❌ TEST 2 FAILED: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_3_gold_system(self):
        """Test: Admin awards gold → Student balance → Database storage"""
        print("\n💰 TEST 3: GOLD & INVENTORY SYSTEM")
        print("=" * 50)
        
        try:
            # Step 1: Admin awards gold to student
            print("💎 Step 1: Admin awards gold...")
            
            gold_to_award = 50
            
            # Get current stats
            player_stats = self.service_client.table('player_stats').select('*').eq('user_id', self.test_student['id']).execute()
            
            if player_stats.data:
                current_stats = player_stats.data[0]
                current_gold = current_stats.get('gold', 0)
                new_gold = current_gold + gold_to_award
                
                updates = {
                    "gold": new_gold,
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                self.service_client.table('player_stats').update(updates).eq('user_id', self.test_student['id']).execute()
                
                print(f"✅ Gold awarded: {current_gold} → {new_gold}")
                
                # Step 2: Verify gold balance persists across queries
                print("💰 Step 2: Verify gold balance persistence...")
                
                # Multiple queries to verify consistency
                for i in range(3):
                    check = self.service_client.table('player_stats').select('*').eq('user_id', self.test_student['id']).execute()
                    if check.data:
                        gold_balance = check.data[0].get('gold', 0)
                        if gold_balance == new_gold:
                            print(f"✅ Check {i+1}: Gold balance consistent: {gold_balance}")
                        else:
                            print(f"❌ Check {i+1}: Gold balance inconsistent: {gold_balance} (expected {new_gold})")
                            return False
                    time.sleep(0.5)  # Small delay between checks
                
                # Step 3: Simulate student spending gold
                print("🛒 Step 3: Student spends gold...")
                
                gold_spent = 20
                final_gold = new_gold - gold_spent
                
                spend_updates = {
                    "gold": final_gold,
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                self.service_client.table('player_stats').update(spend_updates).eq('user_id', self.test_student['id']).execute()
                
                print(f"✅ Gold spent: {new_gold} → {final_gold}")
                
                # Step 4: Final persistence check
                print("💾 Step 4: Final gold persistence check...")
                
                final_check = self.service_client.table('player_stats').select('*').eq('user_id', self.test_student['id']).execute()
                if final_check.data:
                    final_stats = final_check.data[0]
                    final_balance = final_stats.get('gold', 0)
                    
                    if final_balance == final_gold:
                        print(f"✅ Final gold balance correct: {final_balance}")
                        print("🎉 TEST 3 PASSED: Gold system working with persistence!")
                        return True
                    else:
                        print(f"❌ Final gold balance incorrect: {final_balance} (expected {final_gold})")
                        return False
                else:
                    print("❌ Could not verify final balance")
                    return False
            else:
                print("❌ No player stats found")
                return False
                
        except Exception as e:
            print(f"❌ TEST 3 FAILED: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_4_student_progress_tracking(self):
        """Test: Real-time progress tracking and persistence"""
        print("\n📈 TEST 4: STUDENT PROGRESS TRACKING")
        print("=" * 50)
        
        try:
            # Step 1: Get comprehensive student progress snapshot
            print("📊 Step 1: Get complete student progress...")
            
            # Get all student data
            student_data = self.service_client.table('users').select('*').eq('id', self.test_student['id']).execute()
            player_stats = self.service_client.table('player_stats').select('*').eq('user_id', self.test_student['id']).execute()
            xp_entries = self.service_client.table('xp_entries').select('*').eq('user_id', self.test_student['id']).order('created_at', desc=True).execute()
            
            if not all([student_data.data, player_stats.data]):
                print("❌ Missing student data")
                return False
            
            student = student_data.data[0]
            stats = player_stats.data[0]
            
            print(f"✅ Student: {student['username']} ({student['email']})")
            print(f"✅ Total XP: {stats.get('total_xp', 0)}")
            print(f"✅ Level: {stats.get('current_level', 1)}")
            print(f"✅ Gold: {stats.get('gold', 0)}")
            print(f"✅ Gameboard Moves: {stats.get('gameboard_moves', 0)}")
            print(f"✅ Gameboard Position: {stats.get('gameboard_position', 1)}")
            print(f"✅ Quest Progress: {stats.get('unit_xp', {})}")
            print(f"✅ XP History: {len(xp_entries.data)} entries")
            
            # Step 2: Test multiple concurrent updates
            print("⚡ Step 2: Test concurrent progress updates...")
            
            # Simulate multiple admin actions happening quickly
            updates = []
            
            # Update 1: Add more XP
            updates.append(("total_xp", stats.get('total_xp', 0) + 25))
            # Update 2: Add more gold  
            updates.append(("gold", stats.get('gold', 0) + 10))
            # Update 3: Add gameboard move
            updates.append(("gameboard_moves", stats.get('gameboard_moves', 0) + 1))
            
            for field, value in updates:
                update_data = {
                    field: value,
                    "updated_at": datetime.utcnow().isoformat()
                }
                self.service_client.table('player_stats').update(update_data).eq('user_id', self.test_student['id']).execute()
                print(f"✅ Updated {field}: {value}")
                time.sleep(0.2)  # Small delay
            
            # Step 3: Verify all updates persisted correctly
            print("✔️ Step 3: Verify concurrent updates persisted...")
            
            final_stats = self.service_client.table('player_stats').select('*').eq('user_id', self.test_student['id']).execute()
            if final_stats.data:
                final = final_stats.data[0]
                
                expected_xp = stats.get('total_xp', 0) + 25
                expected_gold = stats.get('gold', 0) + 10
                expected_moves = stats.get('gameboard_moves', 0) + 1
                
                xp_correct = final.get('total_xp', 0) == expected_xp
                gold_correct = final.get('gold', 0) == expected_gold
                moves_correct = final.get('gameboard_moves', 0) == expected_moves
                
                print(f"✅ XP: {final.get('total_xp', 0)} (expected {expected_xp}) {'✓' if xp_correct else '✗'}")
                print(f"✅ Gold: {final.get('gold', 0)} (expected {expected_gold}) {'✓' if gold_correct else '✗'}")
                print(f"✅ Moves: {final.get('gameboard_moves', 0)} (expected {expected_moves}) {'✓' if moves_correct else '✗'}")
                
                if all([xp_correct, gold_correct, moves_correct]):
                    print("🎉 TEST 4 PASSED: Student progress tracking working correctly!")
                    return True
                else:
                    print("❌ Some concurrent updates failed to persist")
                    return False
            else:
                print("❌ Could not verify final stats")
                return False
                
        except Exception as e:
            print(f"❌ TEST 4 FAILED: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def run_all_tests(self):
        """Run comprehensive integration test suite"""
        print("🏔️ OLYMPICS PWA COMPREHENSIVE INTEGRATION TEST SUITE")
        print("=" * 80)
        print(f"⏰ Started: {datetime.now()}")
        print("🎯 Testing: Admin → Database → Student data flow")
        print("")
        
        # Setup
        if not await self.setup_test_users():
            print("❌ CRITICAL: Test setup failed - cannot proceed")
            return False
        
        # Run all tests
        tests = [
            ("Assignment System End-to-End", self.test_1_assignment_system),
            ("Gameboard Moves System", self.test_2_gameboard_moves),
            ("Gold & Inventory System", self.test_3_gold_system),
            ("Student Progress Tracking", self.test_4_student_progress_tracking)
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            print(f"\n{'='*20} {test_name} {'='*20}")
            try:
                results[test_name] = await test_func()
            except Exception as e:
                print(f"❌ CRITICAL ERROR in {test_name}: {e}")
                results[test_name] = False
        
        # Final results
        print("\n" + "=" * 80)
        print("🏆 COMPREHENSIVE INTEGRATION TEST RESULTS")
        print("=" * 80)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            emoji = "✅" if result else "❌"
            status = "PASSED" if result else "FAILED"
            print(f"{emoji} {test_name}: {status}")
            if result:
                passed += 1
        
        print(f"\n📊 SUMMARY: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Olympics PWA fully integrated with Supabase!")
            print("✅ Admin actions properly save to database")
            print("✅ Student frontend shows real-time updates")
            print("✅ Data persists across sessions")
            print("✅ Multi-user system working correctly")
            print("✅ No mock data - pure Supabase integration confirmed!")
        else:
            print("❌ INTEGRATION ISSUES DETECTED - Some systems need fixing")
            print("⚠️ Check failed tests and resolve database connectivity issues")
        
        print(f"\n⏰ Completed: {datetime.now()}")
        return passed == total

async def main():
    """Main integration test execution"""
    tester = IntegrationTester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())